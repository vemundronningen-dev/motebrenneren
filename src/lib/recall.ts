import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tynn klient mot Recall.ai (møtebot-API-et som sender "🔥 Møtebrenneren"
 * inn i Teams/Zoom/Meet med kameravisningen som video). Formatene er
 * verifisert mot Recall sin dokumentasjon og en produksjonsintegrasjon:
 * base-URL per region, rå API-nøkkel i Authorization, Svix-signerte webhooks.
 */

const REGIONS = ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"] as const;
type Region = (typeof REGIONS)[number];

export function recallConfigured(): boolean {
  return Boolean(process.env.RECALL_API_KEY);
}

function baseUrl(): string {
  const region = (process.env.RECALL_REGION ?? "eu-central-1") as Region;
  if (!REGIONS.includes(region)) throw new Error(`Ukjent RECALL_REGION: ${region}`);
  return `https://${region}.recall.ai/api/v1`;
}

async function recallFetch(method: string, path: string, body?: unknown): Promise<Response> {
  const apiKey = process.env.RECALL_API_KEY;
  if (!apiKey) throw new Error("Mangler RECALL_API_KEY");
  return fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      accept: "application/json",
      Authorization: apiKey,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
}

export interface CreateBotInput {
  meetingUrl: string;
  /** Når møtet starter. Boten bookes til å komme litt før. */
  start: Date;
  durationSeconds: number;
  cameraUrl: string;
  liveUrl: string;
  metadata: Record<string, string>;
}

// Recall avviser join_at i fortiden; for møter som starter (nesten) nå
// sendes boten inn umiddelbart i stedet.
const JOIN_EARLY_MS = 60_000;
const IMMEDIATE_MARGIN_MS = 2 * 60_000;

export async function createBot(input: CreateBotInput): Promise<{ id: string }> {
  const joinAt = new Date(input.start.getTime() - JOIN_EARLY_MS);
  const scheduled = joinAt.getTime() > Date.now() + IMMEDIATE_MARGIN_MS;
  // Uten opptak sparkes en bot ut etter 1 time som standard - gi den god
  // margin over planlagt varighet, med et tak slik at en glemt bot ikke blir
  // sittende i evigheter.
  const maxInCallSeconds = Math.min(input.durationSeconds + 3 * 3600, 10 * 3600);

  const res = await recallFetch("POST", "/bot/", {
    meeting_url: input.meetingUrl,
    bot_name: "🔥 Møtebrenneren",
    ...(scheduled ? { join_at: joinAt.toISOString() } : {}),
    // Ingen opptak, ingen transkripsjon: boten skal kun VISE noe.
    recording_config: null,
    output_media: {
      camera: { kind: "webpage", config: { url: input.cameraUrl } },
    },
    chat: {
      on_bot_join: {
        send_to: "everyone",
        message: `🔥 Møtebrenneren er med. Ingen opptak – den viser bare hva møtet koster. Følg med live: ${input.liveUrl}`,
        pin: false,
      },
    },
    automatic_leave: {
      waiting_room_timeout: 1800,
      noone_joined_timeout: 1800,
      everyone_left_timeout: { timeout: 30 },
      in_call_not_recording_timeout: maxInCallSeconds,
    },
    metadata: input.metadata,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Recall create bot feilet (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as { id?: string };
  if (!json.id) throw new Error("Recall create bot returnerte ingen id");
  return { id: json.id };
}

/** Avbestiller en bot som ikke har blitt med ennå, eller ber den forlate møtet. */
export async function cancelBot(botId: string): Promise<void> {
  const del = await recallFetch("DELETE", `/bot/${encodeURIComponent(botId)}/`);
  if (del.ok || del.status === 404) return;
  // Allerede i møtet (kan ikke slettes) - be den gå i stedet.
  await recallFetch("POST", `/bot/${encodeURIComponent(botId)}/leave_call/`, {});
}

/** Svix-signatur: HMAC-SHA256 over `${id}.${timestamp}.${body}` med base64-dekodet whsec_-nøkkel. */
export function verifyRecallWebhook(headers: Headers, rawBody: string): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return false;
  const id = headers.get("webhook-id") ?? headers.get("svix-id");
  const timestamp = headers.get("webhook-timestamp") ?? headers.get("svix-timestamp");
  const signatures = headers.get("webhook-signature") ?? headers.get("svix-signature");
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signatures.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    const candidate = Buffer.from(sig, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

/**
 * Kort signatur i kamera-URL-en boten laster. Lar kamerasiden selv tenne
 * lunta hvis webhooken fra Recall skulle utebli, uten at en vilkårlig
 * besøkende kan starte andres møter.
 */
export function signCameraSlug(slug: string): string {
  const key = process.env.RECALL_API_KEY ?? "";
  return createHmac("sha256", key).update(`camera:${slug}`).digest("base64url").slice(0, 22);
}

export function verifyCameraSlug(slug: string, signature: string): boolean {
  if (!process.env.RECALL_API_KEY) return false;
  const expected = Buffer.from(signCameraSlug(slug));
  const candidate = Buffer.from(signature);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
