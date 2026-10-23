import "server-only";
import { sql } from "./db/client";
import { createMeeting, startMeetingFromBot, stopMeetingFromBot } from "./meetings";
import { cancelBot, createBot, signCameraSlug } from "./recall";
import { nextOccurrence, type ParsedInvite } from "./ics";
import { MEETING_TYPE_PRESETS } from "./meetingTypes";

/** Invitasjoner sier ingenting om roller - et nøkternt snitt per deltaker. */
export const DEFAULT_RATE_PER_PERSON = 1000;
const MAX_DURATION_SECONDS = 8 * 3600;
// Vern mot at noen spammer adressen med invitasjoner (hver bot koster).
const DAILY_NEW_INVITE_LIMIT = Number(process.env.BOT_DAILY_LIMIT ?? 300);

interface InviteRow {
  id: string;
  invite_key: string;
  sequence: number;
  meeting_url: string | null;
  rrule: string | null;
  exdates_json: string;
  time_zone: string;
  series_start: string;
  occurrence_start: string | null;
  duration_seconds: number;
  participants: number;
  label: string | null;
  slug: string | null;
  bot_id: string | null;
  status: "scheduled" | "cancelled" | "done" | "failed";
}

export type InviteResult =
  | {
      kind: "scheduled";
      slug: string;
      start: Date;
      participants: number;
      durationSeconds: number;
      ratePerHour: number;
      recurring: boolean;
      updated: boolean;
    }
  | { kind: "duplicate" }
  | { kind: "cancelled" }
  | { kind: "rejected"; reason: "no_meeting_url" | "past" | "limit" };

/** Kun kjente møtetyper hentes fra emnefeltet - aldri selve møtetittelen (personvern). */
export function labelFromSummary(summary: string | null): string | null {
  if (!summary) return null;
  const lower = summary.toLowerCase();
  return MEETING_TYPE_PRESETS.find((p) => lower.includes(p.toLowerCase())) ?? null;
}

function inviteKey(invite: ParsedInvite): string {
  return invite.recurrenceId ? `${invite.uid}#${invite.recurrenceId}` : invite.uid;
}

async function findByKey(key: string): Promise<InviteRow | null> {
  const rows = await sql<InviteRow>`
    select *, array_to_json(exdates)::text as exdates_json
    from bot_invites where invite_key = ${key} limit 1
  `;
  return rows[0] ?? null;
}

interface Occurrence {
  meetingUrl: string;
  start: Date;
  durationSeconds: number;
  participants: number;
  label: string | null;
}

/** Oppretter selve møterommet og booker boten til én forekomst. */
async function scheduleOccurrence(occ: Occurrence, origin: string) {
  const ratePerHour = occ.participants * DEFAULT_RATE_PER_PERSON;
  const { slug } = await createMeeting({
    participants: occ.participants,
    ratePerHour,
    estimatedSeconds: occ.durationSeconds,
    label: occ.label,
  });
  // Møtet "finnes" fra planlagt start - ellers ville oppryddingen av
  // forlatte møter (12 t etter opprettelse) avsluttet et møte som er
  // booket flere dager frem i tid før boten rakk å bli med.
  await sql`update live_meetings set created_at = ${occ.start.toISOString()} where slug = ${slug}`;

  const bot = await createBot({
    meetingUrl: occ.meetingUrl,
    start: occ.start,
    durationSeconds: occ.durationSeconds,
    cameraUrl: `${origin}/m/${slug}/kamera?bot=${signCameraSlug(slug)}`,
    liveUrl: `${origin}/m/${slug}`,
    metadata: { slug },
  });
  return { slug, botId: bot.id, ratePerHour };
}

export async function handleInvite(invite: ParsedInvite, origin: string): Promise<InviteResult> {
  const key = inviteKey(invite);
  const existing = await findByKey(key);

  if (invite.method === "CANCEL") {
    if (existing && existing.status === "scheduled") {
      if (existing.bot_id) await cancelBot(existing.bot_id).catch(() => {});
      await sql`
        update bot_invites
        set status = 'cancelled', bot_id = null, meeting_url = null, updated_at = now()
        where id = ${existing.id}
      `;
    }
    return { kind: "cancelled" };
  }

  if (!invite.meetingUrl) return { kind: "rejected", reason: "no_meeting_url" };

  const durationSeconds = Math.min(Math.max(invite.durationSeconds, 60), MAX_DURATION_SECONDS);
  const start = nextOccurrence({ ...invite, durationSeconds }, new Date());
  if (!start) return { kind: "rejected", reason: "past" };

  const participants = Math.min(Math.max(invite.attendeeCount, 1), 500);
  const label = labelFromSummary(invite.summary);

  if (existing) {
    // Eldre versjon av invitasjonen enn den vi allerede har.
    if (existing.sequence > invite.sequence) return { kind: "duplicate" };
    // Samme invitasjon levert på nytt (e-post-retry, eller sendt til flere).
    const unchanged =
      existing.status === "scheduled" &&
      existing.meeting_url === invite.meetingUrl &&
      existing.participants === participants &&
      existing.duration_seconds === durationSeconds &&
      existing.occurrence_start != null &&
      new Date(existing.occurrence_start).getTime() === start.getTime();
    if (unchanged) return { kind: "duplicate" };
    if (existing.bot_id) await cancelBot(existing.bot_id).catch(() => {});
  } else {
    const recent = await sql<{ count: number }>`
      select count(*)::int as count from bot_invites where created_at > now() - interval '24 hours'
    `;
    if ((recent[0]?.count ?? 0) >= DAILY_NEW_INVITE_LIMIT) return { kind: "rejected", reason: "limit" };
  }

  const scheduled = await scheduleOccurrence(
    { meetingUrl: invite.meetingUrl, start, durationSeconds, participants, label },
    origin,
  );

  const exdates = JSON.stringify(invite.exdates.map((d) => d.toISOString()));
  await sql`
    insert into bot_invites (
      invite_key, sequence, meeting_url, rrule, exdates, time_zone, series_start,
      occurrence_start, duration_seconds, participants, label, slug, bot_id, status
    ) values (
      ${key}, ${invite.sequence}, ${invite.meetingUrl}, ${invite.rrule},
      (select coalesce(array_agg(x::timestamptz), '{}') from jsonb_array_elements_text(${exdates}::jsonb) x),
      ${invite.timeZone}, ${invite.start.toISOString()}, ${start.toISOString()},
      ${durationSeconds}, ${participants}, ${label}, ${scheduled.slug}, ${scheduled.botId}, 'scheduled'
    )
    on conflict (invite_key) do update set
      sequence = excluded.sequence, meeting_url = excluded.meeting_url, rrule = excluded.rrule,
      exdates = excluded.exdates, time_zone = excluded.time_zone, series_start = excluded.series_start,
      occurrence_start = excluded.occurrence_start, duration_seconds = excluded.duration_seconds,
      participants = excluded.participants, label = excluded.label, slug = excluded.slug,
      bot_id = excluded.bot_id, status = 'scheduled', updated_at = now()
  `;

  return {
    kind: "scheduled",
    slug: scheduled.slug,
    start,
    participants,
    durationSeconds,
    ratePerHour: scheduled.ratePerHour,
    recurring: Boolean(invite.rrule),
    updated: Boolean(existing),
  };
}

const IN_CALL_EVENTS = new Set(["bot.in_call_not_recording", "bot.in_call_recording"]);
const FINISHED_EVENTS = new Set(["bot.call_ended", "bot.done", "bot.fatal"]);

/** Statusendringer fra Recall: tenn lunta når boten er inne, stopp og book neste når den går. */
export async function handleBotEvent(event: string, botId: string, origin: string): Promise<void> {
  if (!IN_CALL_EVENTS.has(event) && !FINISHED_EVENTS.has(event)) return;

  const rows = await sql<InviteRow>`
    select *, array_to_json(exdates)::text as exdates_json
    from bot_invites where bot_id = ${botId} limit 1
  `;
  const row = rows[0];
  if (!row?.slug) return;

  if (IN_CALL_EVENTS.has(event)) {
    await startMeetingFromBot(row.slug, new Date(row.occurrence_start ?? Date.now()));
    return;
  }

  // call_ended og done kommer begge - kun den første får lov å rydde opp.
  const claimed = await sql<{ id: string }>`
    update bot_invites set bot_id = null, updated_at = now()
    where id = ${row.id} and bot_id = ${botId}
    returning id
  `;
  if (!claimed[0]) return;

  await stopMeetingFromBot(row.slug);

  if (event !== "bot.fatal" && row.status === "scheduled" && row.rrule && row.meeting_url) {
    const previousEnd = new Date(
      new Date(row.occurrence_start ?? Date.now()).getTime() + row.duration_seconds * 1000 + 1000,
    );
    const next = nextOccurrence(
      {
        start: new Date(row.series_start),
        durationSeconds: row.duration_seconds,
        timeZone: row.time_zone,
        rrule: row.rrule,
        exdates: (JSON.parse(row.exdates_json || "[]") as string[]).map((d) => new Date(d)),
      },
      new Date(Math.max(previousEnd.getTime(), Date.now())),
    );
    if (next) {
      const scheduled = await scheduleOccurrence(
        {
          meetingUrl: row.meeting_url,
          start: next,
          durationSeconds: row.duration_seconds,
          participants: row.participants,
          label: row.label,
        },
        origin,
      );
      await sql`
        update bot_invites
        set slug = ${scheduled.slug}, bot_id = ${scheduled.botId},
            occurrence_start = ${next.toISOString()}, updated_at = now()
        where id = ${row.id}
      `;
      return;
    }
  }

  // Ferdig: slett møtelenken, den trengs ikke lenger.
  await sql`
    update bot_invites
    set status = ${event === "bot.fatal" ? "failed" : "done"}, meeting_url = null, updated_at = now()
    where id = ${row.id} and status = 'scheduled'
  `;
}

/** Reserveløsning fra kameraet: tenner lunta selv om webhooken fra Recall skulle utebli. */
export async function startFromCamera(slug: string): Promise<boolean> {
  const rows = await sql<{ occurrence_start: string | null }>`
    select occurrence_start from bot_invites where slug = ${slug} limit 1
  `;
  const row = rows[0];
  if (!row) return false;
  await startMeetingFromBot(slug, new Date(row.occurrence_start ?? Date.now()));
  return true;
}
