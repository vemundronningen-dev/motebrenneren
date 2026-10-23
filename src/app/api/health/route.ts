import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { describeDbError } from "@/lib/dbErrorMessage";

/**
 * Enkel helsesjekk for å feilsøke oppsettet uten å måtte reprodusere hele
 * flyten. Lekker ingen hemmeligheter - kun om de er satt og om databasen
 * svarer.
 */
export async function GET() {
  const bot = {
    recallApiKeySet: !!process.env.RECALL_API_KEY,
    recallWebhookSecretSet: !!process.env.RECALL_WEBHOOK_SECRET?.startsWith("whsec_"),
    inboundEmailTokenSet: !!process.env.INBOUND_EMAIL_TOKEN,
    confirmationEmailsEnabled: !!process.env.POSTMARK_SERVER_TOKEN,
    botTableExists: false,
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        databaseUrlSet: false,
        bot,
        error: "DATABASE_URL er ikke satt på denne serveren/deploymenten. Se README.md.",
      },
      { status: 500 },
    );
  }

  try {
    await sql`select 1`;
  } catch (err) {
    return NextResponse.json(
      { ok: false, databaseUrlSet: true, bot, error: describeDbError(err) },
      { status: 500 },
    );
  }

  try {
    await sql`select 1 from bot_invites limit 1`;
    bot.botTableExists = true;
  } catch {
    // Migrasjon 0005 ikke kjørt ennå - resten av appen virker uansett.
  }

  return NextResponse.json({ ok: true, databaseUrlSet: true, bot });
}
