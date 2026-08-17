/**
 * Sanntidssynkronisering skjer via Supabase Realtime Broadcast (ikke
 * postgres_changes). Grunnen: postgres_changes sender hele raden til
 * abonnenter når RLS SELECT-policyen tillater lesing – RLS er radnivå, ikke
 * kolonnenivå, så host_token på live_meetings ville i praksis kunne lekke
 * gjennom en postgres_changes-payload. Broadcast lar serveren (API-rutene,
 * som allerede har validert host_token) bestemme nøyaktig hvilke felter som
 * sendes ut, så hemmeligheten aldri forlater serveren.
 */

export const NATIONAL_COUNTER_CHANNEL = "national-counter";

export function meetingChannelName(slug: string): string {
  return `meeting:${slug}`;
}

export const BURN_EVENT = "burn";
export const MEETING_UPDATED_EVENT = "meeting-updated";
