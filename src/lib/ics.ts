/**
 * Leser akkurat det vi trenger fra en kalenderinvitasjon (iCalendar/.ics):
 * når møtet er, hvor lenge det varer, hvor mange som er invitert, og
 * lenken til Teams/Zoom/Meet/Webex. Ingen navn eller e-poster tas vare på.
 */

export interface ParsedInvite {
  method: string | null;
  uid: string;
  recurrenceId: string | null;
  sequence: number;
  start: Date;
  durationSeconds: number;
  timeZone: string;
  meetingUrl: string | null;
  attendeeCount: number;
  summary: string | null;
  rrule: string | null;
  exdates: Date[];
}

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

const DEFAULT_TIME_ZONE = "Europe/Oslo";

// Outlook/Exchange bruker Windows-navn på tidssoner. Kun de vanligste for
// et norsk publikum - ukjente faller tilbake til norsk tid.
const WINDOWS_TIME_ZONES: Record<string, string> = {
  "w. europe standard time": "Europe/Berlin",
  "romance standard time": "Europe/Paris",
  "central europe standard time": "Europe/Budapest",
  "central european standard time": "Europe/Warsaw",
  "gmt standard time": "Europe/London",
  "greenwich standard time": "Atlantic/Reykjavik",
  "fle standard time": "Europe/Helsinki",
  "gtb standard time": "Europe/Bucharest",
  "e. europe standard time": "Europe/Chisinau",
  "russian standard time": "Europe/Moscow",
  utc: "UTC",
  "coordinated universal time": "UTC",
  "eastern standard time": "America/New_York",
  "central standard time": "America/Chicago",
  "mountain standard time": "America/Denver",
  "pacific standard time": "America/Los_Angeles",
  "india standard time": "Asia/Kolkata",
  "china standard time": "Asia/Shanghai",
  "tokyo standard time": "Asia/Tokyo",
};

const MEETING_URL_PATTERNS = [
  /https:\/\/teams\.(?:microsoft|live)\.com\/(?:l\/meetup-join|meet)\/[^\s"'<>\\]+/i,
  /https:\/\/teams\.cloud\.microsoft\/(?:l\/meetup-join|meet)\/[^\s"'<>\\]+/i,
  /https:\/\/(?:[\w-]+\.)?zoom\.us\/(?:j|my|w)\/[^\s"'<>\\]+/i,
  /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i,
  /https:\/\/[\w-]+\.webex\.com\/[^\s"'<>\\]+/i,
];

export function findMeetingUrl(text: string): string | null {
  for (const pattern of MEETING_URL_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[0].replace(/[).,;\]>]+$/, "").replace(/&amp;/g, "&");
  }
  return null;
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

function parseProperty(line: string): Property | null {
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuotes = !inQuotes;
    else if (line[i] === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon <= 0) return null;
  const head = line.slice(0, colon);
  const segments = head.match(/(?:[^;"]+|"[^"]*")+/g) ?? [];
  const params: Record<string, string> = {};
  for (const seg of segments.slice(1)) {
    const eq = seg.indexOf("=");
    if (eq > 0) params[seg.slice(0, eq).toUpperCase()] = seg.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: (segments[0] ?? "").toUpperCase(), params, value: line.slice(colon + 1) };
}

export function resolveTimeZone(tzid: string | undefined): string {
  if (!tzid) return DEFAULT_TIME_ZONE;
  const cleaned = tzid.replace(/^"|"$/g, "").trim();
  const windows = WINDOWS_TIME_ZONES[cleaned.toLowerCase()];
  if (windows) return windows;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: cleaned });
    return cleaned;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Hvor mange millisekunder `zone` ligger foran UTC ved tidspunktet `utcMs`. */
function zoneOffsetMs(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - (utcMs - (utcMs % 1000));
}

/** Lokal "veggklokke"-tid i en tidssone -> faktisk tidspunkt (håndterer sommertid). */
export function zonedTimeToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  zone: string,
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let utc = guess - zoneOffsetMs(guess, zone);
  utc = guess - zoneOffsetMs(utc, zone);
  return new Date(utc);
}

function parseDateValue(value: string, zone: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", z] = m;
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  return zonedTimeToUtc(+y, +mo, +d, +h, +mi, +s, zone);
}

function parseDuration(value: string): number | null {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, w = "0", d = "0", h = "0", mi = "0", s = "0"] = m;
  return (+w * 7 + +d) * 86400 + +h * 3600 + +mi * 60 + +s;
}

function emailOf(value: string): string {
  return value.replace(/^mailto:/i, "").trim().toLowerCase();
}

export interface ParseOptions {
  /** Domenet til boten selv, slik at boten ikke telles som deltaker. */
  ignoreDomain?: string;
}

/** Returnerer null hvis invitasjonen mangler noe vi trenger (f.eks. heldagshendelse). */
export function parseInvite(ics: string, options: ParseOptions = {}): ParsedInvite | null {
  const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  let method: string | null = null;
  const stack: string[] = [];
  let event: Property[] | null = null;
  const events: Property[][] = [];

  for (const line of lines) {
    if (!line) continue;
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:")) {
      const kind = upper.slice(6).trim();
      stack.push(kind);
      if (kind === "VEVENT" && stack.length <= 2) event = [];
      continue;
    }
    if (upper.startsWith("END:")) {
      const kind = stack.pop();
      if (kind === "VEVENT" && event) {
        events.push(event);
        event = null;
      }
      continue;
    }
    const prop = parseProperty(line);
    if (!prop) continue;
    if (stack.length === 1 && prop.name === "METHOD") method = prop.value.trim().toUpperCase();
    // Kun egenskaper direkte på VEVENT (ikke f.eks. VALARM inni den).
    if (event && stack[stack.length - 1] === "VEVENT") event.push(prop);
  }

  // Foretrekk hovedhendelsen i en serie fremfor unntak (RECURRENCE-ID).
  const props = events.find((e) => !e.some((p) => p.name === "RECURRENCE-ID")) ?? events[0];
  if (!props) return null;

  const get = (name: string) => props.find((p) => p.name === name);
  const uid = get("UID")?.value.trim();
  const dtstart = get("DTSTART");
  if (!uid || !dtstart || dtstart.params.VALUE === "DATE" || /^\d{8}$/.test(dtstart.value.trim())) {
    return null;
  }

  const timeZone = resolveTimeZone(dtstart.params.TZID);
  const start = parseDateValue(dtstart.value, timeZone);
  if (!start) return null;

  let durationSeconds: number | null = null;
  const dtend = get("DTEND");
  if (dtend) {
    const end = parseDateValue(dtend.value, resolveTimeZone(dtend.params.TZID ?? dtstart.params.TZID));
    if (end) durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
  }
  if (durationSeconds == null) {
    const dur = get("DURATION");
    if (dur) durationSeconds = parseDuration(dur.value);
  }
  if (!durationSeconds || durationSeconds <= 0) durationSeconds = 3600;

  const ignoreDomain = options.ignoreDomain?.toLowerCase();
  const people = new Set<string>();
  for (const p of props) {
    if (p.name !== "ATTENDEE" && p.name !== "ORGANIZER") continue;
    const cutype = (p.params.CUTYPE ?? "INDIVIDUAL").toUpperCase();
    if (cutype === "ROOM" || cutype === "RESOURCE") continue;
    const email = emailOf(p.value);
    if (!email || (ignoreDomain && email.endsWith(`@${ignoreDomain}`))) continue;
    people.add(email);
  }

  const textForUrl = [
    get("X-MICROSOFT-SKYPETEAMSMEETINGURL")?.value,
    get("X-MICROSOFT-ONLINEMEETINGCONFLINK")?.value,
    get("LOCATION")?.value,
    get("URL")?.value,
    get("DESCRIPTION")?.value,
    get("X-ALT-DESC")?.value,
  ]
    .filter(Boolean)
    .map((v) => unescapeText(v as string))
    .join("\n");

  const exdates: Date[] = [];
  for (const p of props.filter((p) => p.name === "EXDATE")) {
    const zone = resolveTimeZone(p.params.TZID ?? dtstart.params.TZID);
    for (const v of p.value.split(",")) {
      const d = parseDateValue(v, zone);
      if (d) exdates.push(d);
    }
  }

  const summary = get("SUMMARY")?.value;
  return {
    method,
    uid,
    recurrenceId: get("RECURRENCE-ID")?.value.trim() ?? null,
    sequence: Number(get("SEQUENCE")?.value ?? 0) || 0,
    start,
    durationSeconds,
    timeZone,
    meetingUrl: findMeetingUrl(textForUrl),
    attendeeCount: people.size,
    summary: summary ? unescapeText(summary) : null,
    rrule: get("RRULE")?.value.trim() ?? null,
    exdates,
  };
}

// ---------------------------------------------------------------------------
// Gjentakende møter: DAILY og WEEKLY (INTERVAL, BYDAY, UNTIL, COUNT, EXDATE)
// dekker så godt som alle faste møter. Andre regler gir kun første forekomst.
// ---------------------------------------------------------------------------

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function localParts(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

export function isSupportedRecurrence(rrule: string | null): boolean {
  if (!rrule) return false;
  return /FREQ=(DAILY|WEEKLY)/i.test(rrule);
}

/**
 * Første forekomst som slutter etter `after` (dvs. også et møte som pågår
 * akkurat nå). Null hvis serien er ferdig.
 */
export function nextOccurrence(
  invite: Pick<ParsedInvite, "start" | "durationSeconds" | "timeZone" | "rrule" | "exdates">,
  after: Date,
): Date | null {
  const endsAfter = (start: Date) => start.getTime() + invite.durationSeconds * 1000 > after.getTime();

  if (!invite.rrule || !isSupportedRecurrence(invite.rrule)) {
    return endsAfter(invite.start) ? invite.start : null;
  }

  const rule: Record<string, string> = {};
  for (const part of invite.rrule.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) rule[k.toUpperCase()] = v.toUpperCase();
  }
  const freq = rule.FREQ;
  const interval = Math.max(1, Number(rule.INTERVAL ?? 1) || 1);
  const count = rule.COUNT ? Number(rule.COUNT) : null;
  const until = rule.UNTIL ? parseDateValue(rule.UNTIL, invite.timeZone) : null;
  const zone = invite.timeZone;
  const base = localParts(invite.start, zone);
  const baseDayUtc = Date.UTC(base.y, base.mo - 1, base.d);
  const baseWeekday = new Date(baseDayUtc).getUTCDay();
  const byDay =
    freq === "WEEKLY" && rule.BYDAY
      ? new Set(rule.BYDAY.split(",").map((d) => WEEKDAYS.indexOf(d.slice(-2))))
      : new Set([baseWeekday]);
  const excluded = new Set(invite.exdates.map((d) => d.getTime()));
  // Uker regnes fra mandagen i uka serien startet.
  const baseMonday = baseDayUtc - ((baseWeekday + 6) % 7) * 86400000;

  let seen = 0;
  for (let i = 0; i < 366 * 3; i++) {
    const dayUtc = baseDayUtc + i * 86400000;
    const day = new Date(dayUtc);
    let matches: boolean;
    if (freq === "DAILY") {
      matches = i % interval === 0;
    } else {
      const week = Math.floor((dayUtc - baseMonday) / (7 * 86400000));
      matches = week % interval === 0 && byDay.has(day.getUTCDay());
    }
    if (!matches) continue;

    const occurrence = zonedTimeToUtc(
      day.getUTCFullYear(),
      day.getUTCMonth() + 1,
      day.getUTCDate(),
      base.h,
      base.mi,
      base.s,
      zone,
    );
    if (until && occurrence.getTime() > until.getTime()) return null;
    seen += 1;
    if (count != null && seen > count) return null;
    if (excluded.has(occurrence.getTime())) continue;
    if (endsAfter(occurrence)) return occurrence;
  }
  return null;
}
