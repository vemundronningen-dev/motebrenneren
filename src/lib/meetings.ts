import "server-only";
import { NeonDbError } from "@neondatabase/serverless";
import { sql } from "./db/client";
import { generateSlug } from "./slug";
import { insertBurn } from "./burns";
import { costForDuration } from "./calc";
import { sanitizeMeetingLabel } from "./meetingTypes";
import type { MeetingStatus, PublicMeeting } from "./types";

const MAX_ESTIMATED_SECONDS = 24 * 3600;
const ABANDONED_AFTER_MS = 12 * 3600 * 1000;
const UNIQUE_VIOLATION = "23505";

export class MeetingError extends Error {
  code: "not_found" | "forbidden" | "invalid_state" | "validation";
  constructor(code: MeetingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

interface Row {
  id: string;
  slug: string;
  started_at: string | null;
  estimated_seconds: number;
  rate_per_hour: string;
  participants: number;
  status: MeetingStatus;
  paused_total_seconds: number;
  paused_at: string | null;
  ended_at: string | null;
  host_token: string;
  created_at: string;
  label: string | null;
}

async function toPublic(row: Row): Promise<PublicMeeting> {
  const viewerCount = await getViewerCount(row.id);
  return {
    id: row.id,
    slug: row.slug,
    started_at: row.started_at,
    estimated_seconds: row.estimated_seconds,
    rate_per_hour: Number(row.rate_per_hour),
    participants: row.participants,
    status: row.status,
    paused_total_seconds: row.paused_total_seconds,
    paused_at: row.paused_at,
    ended_at: row.ended_at,
    created_at: row.created_at,
    viewer_count: viewerCount,
    label: row.label,
  };
}

async function getViewerCount(meetingId: string): Promise<number> {
  const rows = await sql<{ count: number }>`
    select count(*)::int as count
    from meeting_presence
    where meeting_id = ${meetingId}
      and last_seen > now() - interval '25 seconds'
  `;
  return Number(rows[0]?.count ?? 0);
}

/** Lazy-avslutter møter som er eldre enn 12 timer og fortsatt ikke er ferdige. */
async function cleanupIfAbandoned(row: Row): Promise<Row> {
  if (row.status === "ended") return row;
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs < ABANDONED_AFTER_MS) return row;

  const endedAt = new Date(row.created_at).toISOString();
  const rows = await sql<Row>`
    update live_meetings
    set status = 'ended', ended_at = ${endedAt}, paused_at = null
    where id = ${row.id} and status <> 'ended'
    returning *
  `;
  return rows[0] ?? { ...row, status: "ended", ended_at: endedAt, paused_at: null };
}

export interface CreateMeetingInput {
  participants: number;
  ratePerHour: number;
  estimatedSeconds: number;
  /** Hvis møtet allerede kjører lokalt når "Del møtet" trykkes. */
  alreadyStartedAt?: string | null;
  /** Valgfritt møtenavn/-type (f.eks. "Salgsmøte") - aldri agenda/tittel. */
  label?: string | null;
}

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<{ slug: string; hostToken: string }> {
  const { participants, ratePerHour, estimatedSeconds, alreadyStartedAt } = input;
  const label = sanitizeMeetingLabel(input.label);

  if (!Number.isInteger(participants) || participants < 1 || participants > 500) {
    throw new MeetingError("validation", "Ugyldig antall deltakere");
  }
  if (!Number.isFinite(ratePerHour) || ratePerHour <= 0 || ratePerHour > 5_000_000) {
    throw new MeetingError("validation", "Ugyldig timepris");
  }
  if (
    !Number.isInteger(estimatedSeconds) ||
    estimatedSeconds <= 0 ||
    estimatedSeconds > MAX_ESTIMATED_SECONDS
  ) {
    throw new MeetingError("validation", "Ugyldig estimert varighet");
  }

  let startedAt: string | null = null;
  let status: MeetingStatus = "lobby";
  if (alreadyStartedAt) {
    const ts = new Date(alreadyStartedAt).getTime();
    if (Number.isFinite(ts) && ts <= Date.now()) {
      startedAt = new Date(ts).toISOString();
      status = "running";
    }
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = generateSlug();
    try {
      const rows = await sql<{ slug: string; host_token: string }>`
        insert into live_meetings
          (slug, participants, rate_per_hour, estimated_seconds, started_at, status, label)
        values
          (${slug}, ${participants}, ${ratePerHour}, ${estimatedSeconds}, ${startedAt}, ${status}, ${label})
        returning slug, host_token
      `;
      const row = rows[0];
      if (!row) throw new Error("Ingen rad returnert fra insert");
      return { slug: row.slug, hostToken: row.host_token };
    } catch (err) {
      // Slug-kollisjon (unique_violation) - prøv igjen med en ny slug.
      if (err instanceof NeonDbError && err.code === UNIQUE_VIOLATION) continue;
      throw new Error(`Kunne ikke opprette møte: ${err instanceof Error ? err.message : err}`);
    }
  }

  throw new Error("Kunne ikke generere unik møtekode, prøv igjen.");
}

export async function getMeetingBySlug(slug: string): Promise<PublicMeeting | null> {
  const rows = await sql<Row>`select * from live_meetings where slug = ${slug} limit 1`;
  const row = rows[0];
  if (!row) return null;

  const cleaned = await cleanupIfAbandoned(row);
  return toPublic(cleaned);
}

export async function recordHeartbeat(slug: string, sessionId: string): Promise<void> {
  const rows = await sql<{ meeting_id: string }>`
    insert into meeting_presence (meeting_id, session_id, last_seen)
    select id, ${sessionId}, now() from live_meetings where slug = ${slug}
    on conflict (meeting_id, session_id) do update set last_seen = now()
    returning meeting_id
  `;
  const row = rows[0];
  if (!row) return;
  // Opportunistisk opprydding av gamle rader for dette møtet.
  await sql`
    delete from meeting_presence
    where meeting_id = ${row.meeting_id} and last_seen < now() - interval '5 minutes'
  `;
}

export type MeetingAction = "start" | "pause" | "resume" | "stop";

export async function performMeetingAction(
  slug: string,
  hostToken: string,
  action: MeetingAction,
): Promise<PublicMeeting> {
  const rows = await sql<Row>`select * from live_meetings where slug = ${slug} limit 1`;
  let row = rows[0];
  if (!row) {
    throw new MeetingError("not_found", "Fant ikke møtet");
  }

  row = await cleanupIfAbandoned(row);

  if (row.host_token !== hostToken) {
    throw new MeetingError("forbidden", "Ugyldig vert-token");
  }
  if (row.status === "ended") {
    throw new MeetingError("invalid_state", "Møtet er allerede avsluttet");
  }

  if (action === "start") {
    if (row.status !== "lobby") {
      throw new MeetingError("invalid_state", "Møtet er allerede startet");
    }
    const updated = await sql<Row>`
      update live_meetings
      set status = 'running', started_at = now()
      where id = ${row.id} and status = 'lobby'
      returning *
    `;
    const next = updated[0];
    if (!next) throw new MeetingError("invalid_state", "Kunne ikke starte møtet");
    row = next;
  } else if (action === "pause") {
    if (row.status !== "running") {
      throw new MeetingError("invalid_state", "Møtet kjører ikke");
    }
    const updated = await sql<Row>`
      update live_meetings
      set status = 'paused', paused_at = now()
      where id = ${row.id} and status = 'running'
      returning *
    `;
    const next = updated[0];
    if (!next) throw new MeetingError("invalid_state", "Kunne ikke sette møtet på pause");
    row = next;
  } else if (action === "resume") {
    if (row.status !== "paused" || !row.paused_at) {
      throw new MeetingError("invalid_state", "Møtet er ikke på pause");
    }
    const updated = await sql<Row>`
      update live_meetings
      set
        status = 'running',
        paused_total_seconds = paused_total_seconds
          + round(extract(epoch from (now() - paused_at)))::int,
        paused_at = null
      where id = ${row.id} and status = 'paused'
      returning *
    `;
    const next = updated[0];
    if (!next) throw new MeetingError("invalid_state", "Kunne ikke gjenoppta møtet");
    row = next;
  } else if (action === "stop") {
    if (row.status !== "running" && row.status !== "paused") {
      throw new MeetingError("invalid_state", "Møtet kan ikke stoppes nå");
    }
    // Atomisk: regner ut endelig paused_total_seconds og setter status til
    // 'ended' i samme setning. `status <> 'ended'` garanterer at kun ett
    // samtidig stopp-kall vinner racet - dermed inserer vi burns nøyaktig
    // én gang uansett hvor mange ganger stopp skulle bli trigget parallelt.
    const updated = await sql<Row>`
      update live_meetings
      set
        status = 'ended',
        ended_at = now(),
        paused_total_seconds = paused_total_seconds
          + case
              when status = 'paused' and paused_at is not null
                then round(extract(epoch from (now() - paused_at)))::int
              else 0
            end,
        paused_at = null
      where id = ${row.id} and status <> 'ended'
      returning *
    `;
    const next = updated[0];
    if (!next) throw new MeetingError("invalid_state", "Kunne ikke stoppe møtet");
    row = next;

    const startedAtMs = row.started_at ? new Date(row.started_at).getTime() : Date.now();
    const endedAtMs = row.ended_at ? new Date(row.ended_at).getTime() : Date.now();
    const elapsed = Math.max(
      0,
      (endedAtMs - startedAtMs) / 1000 - row.paused_total_seconds,
    );
    const amount = costForDuration(Number(row.rate_per_hour), elapsed);
    await insertBurn({
      amount,
      durationSeconds: elapsed,
      estimatedSeconds: row.estimated_seconds,
      participants: row.participants,
      label: row.label,
    });
  }

  return toPublic(row);
}
