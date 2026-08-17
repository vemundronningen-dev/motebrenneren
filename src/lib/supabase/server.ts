import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Mangler miljøvariabelen ${name}. Se README.md.`);
  }
  return value;
}

/**
 * Anon-klient brukt server-side (API-routes, server components). Har
 * nøyaktig samme rettigheter som en nettleser-klient – RLS og
 * kolonne-grants gjelder fullt ut. Brukes for /api/burns (insert) og
 * get_national_stats().
 */
export function getSupabaseAnonServerClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

/**
 * Service-role-klient. Omgår RLS fullstendig. Brukes KUN i API-routes for
 * live_meetings, der applikasjonskoden selv verifiserer host_token før en
 * privilegert skriveoperasjon utføres. Må aldri importeres i klientkode –
 * "server-only"-importen over kaster en build-feil hvis noen prøver.
 */
export function getSupabaseServiceClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
