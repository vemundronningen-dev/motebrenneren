import "server-only";
import { getSupabaseServiceClient } from "./supabase/server";
import { generateSlug } from "./slug";
import { meetingChannelName, MEETING_UPDATED_EVENT } from "./realtime";
import { insertBurn } from "./burns";
import { costForDuration } from "./calc";
import type { MeetingStatus, PublicMeeting } from "./types";

const MAX_ESTIMATED_SECONDS = 24 * 3600;
const ABANDONED_AFTER_MS = 12 * 3600 * 1000;

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
  rate_per_hour: number;
  participants: number;
  status: MeetingStatus;
  paused_total_seconds: number;
  paused_at: string | null;
  ended_at: string | null;
  host_token: string;
  created_at: string;
}

function toPublic(row: Row): PublicMeeting {
  return {
    id: row.id,
    slug: row.slug,
    started_at: row.started_at,
    estimated_seconds: row.estimated_seconds,
    rate_per_hour: row.rate_per_hour,
    participants: row.participants,
    status: row.status,
    paused_total_seconds: row.paused_total_seconds,
    paused_at: row.paused_at,
    ended_at: row.ended_at,
    created_at: row.created_at,
  };
}

async function broadcastUpdate(slug: string, meeting: PublicMeeting) {
  const supabase = getSupabaseServiceClient();
  const channel = supabase.channel(meetingChannelName(slug));
  await channel.httpSend(MEETING_UPDATED_EVENT, meeting).catch(() => {
    // best effort - klienter faller tilbake til polling ved neste fetch
  });
}

/** Lazy-avslutter møter som er eldre enn 12 timer og fortsatt ikke er ferdige. */
async function cleanupIfAbandoned(row: Row): Promise<Row> {
  if (row.status === "ended") return row;
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs < ABANDONED_AFTER_MS) return row;

  const supabase = getSupabaseServiceClient();
  const endedAt = new Date(row.created_at).toISOString();
  const { data } = await supabase
    .from("live_meetings")
    .update({ status: "ended", ended_at: endedAt, paused_at: null })
    .eq("id", row.id)
    .neq("status", "ended")
    .select()
    .maybeSingle();

  return (data as Row) ?? { ...row, status: "ended", ended_at: endedAt, paused_at: null };
}

export interface CreateMeetingInput {
  participants: number;
  ratePerHour: number;
  estimatedSeconds: number;
  /** Hvis møtet allerede kjører lokalt når "Del møtet" trykkes. */
  alreadyStartedAt?: string | null;
}

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<{ slug: string; hostToken: string }> {
  const { participants, ratePerHour, estimatedSeconds, alreadyStartedAt } = input;

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

  const supabase = getSupabaseServiceClient();

  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = generateSlug();
    const { data, error } = await supabase
      .from("live_meetings")
      .insert({
        slug,
        participants,
        rate_per_hour: ratePerHour,
        estimated_seconds: estimatedSeconds,
        started_at: startedAt,
        status,
      })
      .select("slug, host_token")
      .single();

    if (!error && data) {
      return { slug: data.slug as string, hostToken: data.host_token as string };
    }
    // 23505 = unique_violation (slug-kollisjon) - prøv igjen med ny slug.
    if (error && error.code !== "23505") {
      throw new Error(`Kunne ikke opprette møte: ${error.message}`);
    }
  }

  throw new Error("Kunne ikke generere unik møtekode, prøv igjen.");
}

export async function getMeetingBySlug(slug: string): Promise<PublicMeeting | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("live_meetings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  const cleaned = await cleanupIfAbandoned(data as Row);
  return toPublic(cleaned);
}

export type MeetingAction = "start" | "pause" | "resume" | "stop";

export async function performMeetingAction(
  slug: string,
  hostToken: string,
  action: MeetingAction,
): Promise<PublicMeeting> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("live_meetings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    throw new MeetingError("not_found", "Fant ikke møtet");
  }

  let row = data as Row;
  row = await cleanupIfAbandoned(row);

  if (row.host_token !== hostToken) {
    throw new MeetingError("forbidden", "Ugyldig vert-token");
  }
  if (row.status === "ended") {
    throw new MeetingError("invalid_state", "Møtet er allerede avsluttet");
  }

  const nowIso = new Date().toISOString();

  if (action === "start") {
    if (row.status !== "lobby") {
      throw new MeetingError("invalid_state", "Møtet er allerede startet");
    }
    const { data: updated, error: updErr } = await supabase
      .from("live_meetings")
      .update({ status: "running", started_at: nowIso })
      .eq("id", row.id)
      .eq("status", "lobby")
      .select()
      .maybeSingle();
    if (updErr || !updated) {
      throw new MeetingError("invalid_state", "Kunne ikke starte møtet");
    }
    row = updated as Row;
  } else if (action === "pause") {
    if (row.status !== "running") {
      throw new MeetingError("invalid_state", "Møtet kjører ikke");
    }
    const { data: updated, error: updErr } = await supabase
      .from("live_meetings")
      .update({ status: "paused", paused_at: nowIso })
      .eq("id", row.id)
      .eq("status", "running")
      .select()
      .maybeSingle();
    if (updErr || !updated) {
      throw new MeetingError("invalid_state", "Kunne ikke sette møtet på pause");
    }
    row = updated as Row;
  } else if (action === "resume") {
    if (row.status !== "paused" || !row.paused_at) {
      throw new MeetingError("invalid_state", "Møtet er ikke på pause");
    }
    const pausedFor = Math.max(
      0,
      (Date.now() - new Date(row.paused_at).getTime()) / 1000,
    );
    const { data: updated, error: updErr } = await supabase
      .from("live_meetings")
      .update({
        status: "running",
        paused_total_seconds: Math.round(row.paused_total_seconds + pausedFor),
        paused_at: null,
      })
      .eq("id", row.id)
      .eq("status", "paused")
      .select()
      .maybeSingle();
    if (updErr || !updated) {
      throw new MeetingError("invalid_state", "Kunne ikke gjenoppta møtet");
    }
    row = updated as Row;
  } else if (action === "stop") {
    if (row.status !== "running" && row.status !== "paused") {
      throw new MeetingError("invalid_state", "Møtet kan ikke stoppes nå");
    }
    const extraPause =
      row.status === "paused" && row.paused_at
        ? Math.max(0, (Date.now() - new Date(row.paused_at).getTime()) / 1000)
        : 0;
    const finalPausedTotal = Math.round(row.paused_total_seconds + extraPause);
    const startedAtMs = row.started_at ? new Date(row.started_at).getTime() : Date.now();
    const elapsed = Math.max(0, (Date.now() - startedAtMs) / 1000 - finalPausedTotal);

    const { data: updated, error: updErr } = await supabase
      .from("live_meetings")
      .update({
        status: "ended",
        ended_at: nowIso,
        paused_total_seconds: finalPausedTotal,
        paused_at: null,
      })
      .eq("id", row.id)
      .neq("status", "ended")
      .select()
      .maybeSingle();

    if (updErr || !updated) {
      throw new MeetingError("invalid_state", "Kunne ikke stoppe møtet");
    }
    row = updated as Row;

    // Kun vertens/serverens stopp-kall sender inn beløpet - garantert
    // maks én innsending per møte siden update-en over er atomisk
    // (neq('status','ended') sørger for at bare ett kall vinner racet).
    const amount = costForDuration(row.rate_per_hour, elapsed);
    await insertBurn({
      amount,
      durationSeconds: elapsed,
      estimatedSeconds: row.estimated_seconds,
      participants: row.participants,
    });
  }

  const publicMeeting = toPublic(row);
  await broadcastUpdate(slug, publicMeeting);
  return publicMeeting;
}
