import "server-only";

import { BOT_EMAIL } from "./botEmail";

export { BOT_EMAIL, BOT_DOMAIN } from "./botEmail";

/** Sender en enkel tekst-e-post via Postmark. Gjør ingenting hvis Postmark ikke er satt opp. */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) return false;
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: process.env.BOT_EMAIL_FROM ?? `Møtebrenneren <${BOT_EMAIL}>`,
      To: to,
      Subject: subject,
      TextBody: text,
      MessageStream: "outbound",
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("sendEmail feilet", res?.status);
    return false;
  }
  return true;
}
