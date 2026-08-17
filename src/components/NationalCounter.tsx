"use client";

import { useEffect, useRef, useState } from "react";
import { formatKr, formatNumber, formatPercent } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { NATIONAL_COUNTER_CHANNEL, BURN_EVENT } from "@/lib/realtime";
import type { NationalStats } from "@/lib/types";

const MIN_RATE_PER_SECOND = 0.35;
const RESYNC_INTERVAL_MS = 45_000;

interface Baseline {
  total: number;
  atMs: number;
  ratePerSecond: number;
}

function computeRate(stats: NationalStats): number {
  const rate = stats.sum_last_24h / 86400;
  return Math.max(rate, MIN_RATE_PER_SECOND);
}

export default function NationalCounter({
  initialStats,
}: {
  initialStats: NationalStats;
}) {
  const [displayed, setDisplayed] = useState(initialStats.total_sum);
  const [stats, setStats] = useState(initialStats);
  const baselineRef = useRef<Baseline>({
    total: initialStats.total_sum,
    atMs: Date.now(),
    ratePerSecond: computeRate(initialStats),
  });

  // Jevn oppover-animasjon, alltid i bevegelse.
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const b = baselineRef.current;
      const elapsed = (Date.now() - b.atMs) / 1000;
      setDisplayed(b.total + b.ratePerSecond * elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Realtime: hver gang et møte et sted i Norge stoppes, hopper telleren.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(NATIONAL_COUNTER_CHANNEL);
    channel
      .on("broadcast", { event: BURN_EVENT }, (msg: { payload?: { amount?: number } }) => {
        const amount = Number(msg.payload?.amount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const b = baselineRef.current;
        const elapsed = (Date.now() - b.atMs) / 1000;
        const currentValue = b.total + b.ratePerSecond * elapsed;
        baselineRef.current = {
          total: currentValue + amount,
          atMs: Date.now(),
          ratePerSecond: b.ratePerSecond,
        };
        setStats((prev) => ({
          ...prev,
          total_sum: currentValue + amount,
          total_meetings: prev.total_meetings + 1,
          meetings_today: prev.meetings_today + 1,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Periodisk resync mot databasen for å rette opp evt. avdrift.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const fresh = (await res.json()) as NationalStats;
        baselineRef.current = {
          total: fresh.total_sum,
          atMs: Date.now(),
          ratePerSecond: computeRate(fresh),
        };
        setStats(fresh);
      } catch {
        // stille feiler - prøver igjen neste runde
      }
    }, RESYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h1 className="text-balance text-2xl sm:text-3xl font-medium text-muted">
        Norge har brent
      </h1>
      <div
        className="tabular font-black leading-none text-ember flame-flicker"
        style={{ fontSize: "clamp(2.75rem, 13vw, 7rem)" }}
      >
        {formatKr(displayed)} kr
      </div>
      <p className="text-lg sm:text-xl text-muted -mt-2">i møter. Totalt.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        <StatTile
          label="Møter brent i dag"
          value={formatNumber(stats.meetings_today)}
        />
        <StatTile
          label="Snittmøtet koster"
          value={`${formatKr(stats.avg_cost)} kr`}
        />
        <StatTile
          label="Går over tiden"
          value={`${formatPercent(stats.pct_over_time)} %`}
        />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-background-raised px-4 py-4">
      <div className="tabular text-xl sm:text-2xl font-bold text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
