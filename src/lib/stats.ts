import "server-only";
import { getSupabaseAnonServerClient } from "./supabase/server";
import type { NationalStats } from "./types";

const EMPTY_STATS: NationalStats = {
  total_sum: 0,
  total_meetings: 0,
  meetings_today: 0,
  sum_last_24h: 0,
  avg_cost: 0,
  pct_over_time: 0,
};

export async function getNationalStats(): Promise<NationalStats> {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase.rpc("get_national_stats").single();
  if (error || !data) {
    console.error("get_national_stats", error);
    return EMPTY_STATS;
  }
  return data as NationalStats;
}
