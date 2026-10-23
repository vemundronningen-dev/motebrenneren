import { NextResponse } from "next/server";
import { verifyRecallWebhook } from "@/lib/recall";
import { handleBotEvent } from "@/lib/botInvites";

export const maxDuration = 60;

interface RecallEvent {
  event?: string;
  data?: { bot?: { id?: string } };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyRecallWebhook(request.headers, rawBody)) {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 401 });
  }

  let payload: RecallEvent;
  try {
    payload = JSON.parse(rawBody) as RecallEvent;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const botId = payload.data?.bot?.id;
  if (!payload.event || !botId) return NextResponse.json({ ok: true });

  try {
    await handleBotEvent(payload.event, botId, new URL(request.url).origin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("recall webhook", payload.event, err);
    return NextResponse.json({ error: "Feil ved behandling" }, { status: 500 });
  }
}
