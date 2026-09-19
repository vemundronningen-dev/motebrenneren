import "server-only";
import { sql } from "./db/client";
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
  try {
    const rows = await sql<Record<string, number>>`
      select
        coalesce(sum(amount), 0)::float8 as total_sum,
        count(*)::int as total_meetings,
        -- "I dag" skal følge norsk kalenderdag, ikke UTC (Neon sin
        -- serverklokke) - ellers hopper "møter i dag" feil time på
        -- kvelden/natta sett fra Norge.
        count(*) filter (
          where created_at >= date_trunc('day', now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo'
        )::int as meetings_today,
        coalesce(sum(amount) filter (
          where created_at >= now() - interval '24 hours'
        ), 0)::float8 as sum_last_24h,
        coalesce(round(avg(amount)), 0)::float8 as avg_cost,
        coalesce(round(
          100.0 * count(*) filter (
            where estimated_seconds is not null
              and duration_seconds > estimated_seconds
          ) / nullif(count(*) filter (where estimated_seconds is not null), 0)
        ), 0)::float8 as pct_over_time
      from burns
    `;
    const row = rows[0];
    if (!row) return EMPTY_STATS;
    return {
      total_sum: Number(row.total_sum),
      total_meetings: Number(row.total_meetings),
      meetings_today: Number(row.meetings_today),
      sum_last_24h: Number(row.sum_last_24h),
      avg_cost: Number(row.avg_cost),
      pct_over_time: Number(row.pct_over_time),
    };
  } catch (err) {
    console.error("getNationalStats", err);
    return EMPTY_STATS;
  }
}
