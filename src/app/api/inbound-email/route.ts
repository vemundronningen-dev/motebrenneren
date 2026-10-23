import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { parseMime } from "@/lib/mime";
import { findMeetingUrl, parseInvite, type ParsedInvite } from "@/lib/ics";
import { handleInvite, type InviteResult } from "@/lib/botInvites";
import { getHostTokenForSlug } from "@/lib/meetings";
import { costForDuration } from "@/lib/calc";
import { formatKr } from "@/lib/format";
import { BOT_DOMAIN, BOT_EMAIL, sendEmail } from "@/lib/email";
import { recallConfigured } from "@/lib/recall";

export const maxDuration = 60;

/**
 * Mottar e-post sendt til boten (typisk fra Postmark Inbound, med
 * "Include raw email content" på). Webhook-URL-en må inneholde
 * ?token=<INBOUND_EMAIL_TOKEN>.
 */

interface PostmarkInbound {
  From?: string;
  FromFull?: { Email?: string };
  TextBody?: string;
  HtmlBody?: string;
  RawEmail?: string;
  Headers?: { Name: string; Value: string }[];
  Attachments?: { Name?: string; Content?: string; ContentType?: string }[];
}

function tokenOk(provided: string | null): boolean {
  const expected = process.env.INBOUND_EMAIL_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function senderAddress(payload: PostmarkInbound, rawHeaders: string): string | null {
  const from = payload.FromFull?.Email ?? payload.From ?? /^From:(.*)$/im.exec(rawHeaders)?.[1] ?? "";
  const match = /[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/.exec(from);
  return match ? match[0].toLowerCase() : null;
}

/** Svar aldri til oss selv, robotavsendere eller automatiske svar (unngår e-postløkker). */
function shouldReply(sender: string | null, payload: PostmarkInbound, raw: string): sender is string {
  if (!sender || sender.endsWith(`@${BOT_DOMAIN}`)) return false;
  if (/^(mailer-daemon|postmaster|no-?reply|donotreply)@/i.test(sender)) return false;
  const autoHeader =
    payload.Headers?.some((h) => /^auto-submitted$/i.test(h.Name) && !/^no$/i.test(h.Value.trim())) ||
    /^Auto-Submitted:\s*(?!no\b)/im.test(raw.slice(0, 20_000));
  return !autoHeader;
}

const dateFormat = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

async function replyText(result: InviteResult, origin: string): Promise<{ subject: string; text: string } | null> {
  switch (result.kind) {
    case "duplicate":
    case "cancelled":
      return null;
    case "rejected": {
      const reasons = {
        no_meeting_url:
          "Jeg fant ingen Teams-, Zoom-, Google Meet- eller Webex-lenke i invitasjonen. Sjekk at møtet er et nettmøte (\"Teams-møte\" skrudd på i Outlook), og send invitasjonen på nytt.",
        past: "Møtet ser ut til å være over allerede, så jeg blir ikke med.",
        limit: "Møtebrenneren har nådd dagens kapasitet. Prøv igjen i morgen.",
      } as const;
      return { subject: "Møtebrenneren kunne ikke bli med", text: `Hei!\n\n${reasons[result.reason]}\n\n– Møtebrenneren 🔥` };
    }
    case "scheduled": {
      const hostToken = await getHostTokenForSlug(result.slug);
      const prognosis = costForDuration(result.ratePerHour, result.durationSeconds);
      const live = `${origin}/m/${result.slug}`;
      const lines = [
        "Hei!",
        "",
        `🔥 Møtebrenneren ${result.updated ? "har oppdatert bookingen og kommer" : "kommer"} ${dateFormat.format(result.start)}.`,
        "",
        `• ${result.participants} deltakere · ${Math.round(result.durationSeconds / 60)} minutter`,
        `• Prognose: ${formatKr(prognosis)} kr (regnet med ${formatKr(result.ratePerHour / result.participants)} kr/t per person)`,
        result.recurring ? "• Gjentakende møte: jeg kommer automatisk hver gang." : "",
        "",
        "Hva skjer nå:",
        "1. Jeg dukker opp i møtet som «🔥 Møtebrenneren», med kostnaden live på kameraet.",
        "2. Slipp meg inn fra lobbyen (ett klikk på «Slipp inn»).",
        "3. Telleren starter ved møtestart og stopper av seg selv når alle har gått.",
        "",
        "Jeg tar ikke opp lyd, bilde eller tekst – jeg viser bare hva møtet koster.",
        "",
        `Følg med live: ${live}`,
        hostToken ? `Styr møtet (pause/stopp) – kun for deg: ${live}?vert=${hostToken}` : "",
        "",
        "Vil du avbestille meg? Fjern meg fra invitasjonen, eller avlys møtet.",
        "",
        "– Møtebrenneren 🔥",
      ];
      return {
        subject: `🔥 Møtebrenneren kommer ${dateFormat.format(result.start)}`,
        text: lines.filter((l, i, all) => l !== "" || all[i - 1] !== "").join("\n"),
      };
    }
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!tokenOk(url.searchParams.get("token"))) {
    return NextResponse.json({ error: "Ugyldig token" }, { status: 401 });
  }
  if (!recallConfigured()) {
    console.error("inbound-email: RECALL_API_KEY er ikke satt");
    return NextResponse.json({ error: "Boten er ikke satt opp" }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let payload: PostmarkInbound = {};
  let raw = "";
  if (contentType.includes("application/json")) {
    payload = (await request.json().catch(() => ({}))) as PostmarkInbound;
    raw = payload.RawEmail ?? "";
  } else {
    raw = await request.text();
  }

  const calendars: string[] = [];
  const bodies: string[] = [payload.TextBody ?? "", payload.HtmlBody ?? ""];
  if (raw) {
    for (const leaf of parseMime(raw)) {
      if (leaf.contentType === "text/calendar" || leaf.contentType === "application/ics" || leaf.filename?.toLowerCase().endsWith(".ics")) {
        calendars.push(leaf.text);
      } else {
        bodies.push(leaf.text);
      }
    }
  }
  for (const a of payload.Attachments ?? []) {
    const isCalendar = /calendar|ics/i.test(a.ContentType ?? "") || a.Name?.toLowerCase().endsWith(".ics");
    if (isCalendar && a.Content) calendars.push(Buffer.from(a.Content, "base64").toString("utf-8"));
  }

  const sender = senderAddress(payload, raw.slice(0, 20_000));
  const canReply = shouldReply(sender, payload, raw);

  let invite: ParsedInvite | null = null;
  for (const ics of calendars) {
    invite = parseInvite(ics, { ignoreDomain: BOT_DOMAIN });
    if (invite) break;
  }

  if (!invite) {
    if (canReply) {
      await sendEmail(
        sender,
        "Møtebrenneren fant ingen møteinvitasjon",
        `Hei!\n\nFor at jeg skal bli med, legg til ${BOT_EMAIL} som deltaker i selve møteinvitasjonen (i Outlook/Teams-kalenderen) – ikke send en vanlig e-post.\n\n– Møtebrenneren 🔥`,
      );
    }
    return NextResponse.json({ ok: true, handled: "no_invite" });
  }

  // Svar på invitasjoner (godta/avslå) og motforslag skal bare ignoreres.
  if (invite.method === "REPLY" || invite.method === "COUNTER") {
    return NextResponse.json({ ok: true, handled: "ignored_reply" });
  }
  if (!invite.meetingUrl) invite.meetingUrl = findMeetingUrl(bodies.join("\n"));

  try {
    const result = await handleInvite(invite, url.origin);
    if (canReply) {
      const reply = await replyText(result, url.origin);
      if (reply) await sendEmail(sender, reply.subject, reply.text);
    }
    return NextResponse.json({ ok: true, handled: result.kind });
  } catch (err) {
    // 500 => Postmark prøver igjen senere (f.eks. hvis Recall var nede).
    console.error("inbound-email", err);
    return NextResponse.json({ error: "Kunne ikke booke boten" }, { status: 500 });
  }
}
