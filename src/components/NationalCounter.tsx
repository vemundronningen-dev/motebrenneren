"use client";

import { useEffect, useRef, useState } from "react";
import { formatKr, formatNumber, formatPercent } from "@/lib/format";
import type { NationalStats } from "@/lib/types";

const MIN_RATE_PER_SECOND = 0.35;
// Ingen realtime-infrastruktur tilgjengelig i denne oppsett (ren Postgres
// via Neon, ingen pub/sub-lag) - vi henter derfor ferske tall med jevne
// mellomrom i stedet for å motta en push når noen andre stopper et møte.
// Telleren fortsetter å tikke jevnt lokalt mellom hver henting, så det
// merkes ikke som et "hopp" i praksis, bare litt mindre umiddelbart enn en
// ekte push ville vært.
const POLL_INTERVAL_MS = 7_000;

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
  const baselineRef = useRef<Baseline | null>(null);

  // Jevn oppover-animasjon, alltid i bevegelse. Baseline settes i en effekt
  // (ikke under render) siden Date.now() er en urein verdi.
  useEffect(() => {
    baselineRef.current = {
      total: initialStats.total_sum,
      atMs: Date.now(),
      ratePerSecond: computeRate(initialStats),
    };

    let raf: number;
    const tick = () => {
      const b = baselineRef.current;
      if (b) {
        const elapsed = (Date.now() - b.atMs) / 1000;
        setDisplayed(b.total + b.ratePerSecond * elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodisk resync mot databasen - dette er "pushen" i praksis her.
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
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h1 className="text-balance text-2xl sm:text-3xl font-medium text-muted">
        Norge har brent
      </h1>
      <div
        className="tabular font-black leading-none counter-glow counter-pulse"
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
