"use client";

import { useEffect, useRef, useState } from "react";
import { formatKr, formatMinutes } from "@/lib/format";
import { milestonesForTimeline, type Milestone } from "@/lib/milestones";
import { ratePerSecond, costForDuration } from "@/lib/calc";

const MAIN_FRACTION = 0.76;
const OVERTIME_FRACTION = 0.24;

function timeToFraction(seconds: number, estimatedSeconds: number): number {
  if (seconds <= estimatedSeconds) {
    return (seconds / Math.max(1, estimatedSeconds)) * MAIN_FRACTION;
  }
  const extraRatio = (seconds - estimatedSeconds) / Math.max(1, estimatedSeconds);
  return MAIN_FRACTION + OVERTIME_FRACTION * (1 - Math.exp(-extraRatio * 2.5));
}

interface Poff {
  id: string;
  leftPct: number;
}

export default function Timeline({
  elapsedSeconds,
  estimatedSeconds,
  ratePerHour,
  onMilestoneReached,
}: {
  elapsedSeconds: number;
  estimatedSeconds: number;
  ratePerHour: number;
  onMilestoneReached?: (m: Milestone) => void;
}) {
  const rps = ratePerSecond(ratePerHour);
  const estimatedTotalCost = costForDuration(ratePerHour, estimatedSeconds);
  const milestones = milestonesForTimeline(estimatedTotalCost);
  const isOvertime = elapsedSeconds > estimatedSeconds;

  const flamePct = timeToFraction(elapsedSeconds, estimatedSeconds) * 100;

  const consumedRef = useRef<Set<number>>(new Set());
  const poffIdRef = useRef(0);
  const [poffs, setPoffs] = useState<Poff[]>([]);
  const [trail, setTrail] = useState<Milestone[]>([]);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    for (const m of milestones) {
      const milestoneSeconds = rps > 0 ? m.amount / rps : Infinity;
      if (elapsedSeconds >= milestoneSeconds && !consumedRef.current.has(m.amount)) {
        consumedRef.current.add(m.amount);
        const leftPct = timeToFraction(milestoneSeconds, estimatedSeconds) * 100;
        const id = `${m.amount}-${poffIdRef.current++}`;
        setPoffs((prev) => [...prev, { id, leftPct }]);
        setTimeout(() => {
          setPoffs((prev) => prev.filter((p) => p.id !== id));
        }, 550);
        setTrail((prev) => [...prev, m]);
        onMilestoneReached?.(m);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds]);

  useEffect(() => {
    const el = trailRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [trail.length]);

  const quarterMarks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    leftPct: f * MAIN_FRACTION * 100,
    label: formatMinutes(f * estimatedSeconds),
  }));

  return (
    <div className="w-full select-none">
      <div className="relative h-14 sm:h-16">
        {/* Spor */}
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full overflow-hidden bg-ash">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1a1512] to-[#3a2a1f]"
            style={{ width: `${Math.min(flamePct, MAIN_FRACTION * 100)}%` }}
          />
          <div
            className="absolute inset-y-0 bg-gradient-to-r from-[#caa06b] to-[#e8c895]"
            style={{
              left: `${Math.min(flamePct, MAIN_FRACTION * 100)}%`,
              right: `${100 - MAIN_FRACTION * 100}%`,
            }}
          />
          {/* Overtidssone med advarselstriper */}
          <div
            className="absolute inset-y-0"
            style={{
              left: `${MAIN_FRACTION * 100}%`,
              right: 0,
              background:
                "repeating-linear-gradient(135deg, rgba(209,48,31,0.4) 0 8px, rgba(26,20,15,0.92) 8px 16px)",
            }}
          />
          {isOvertime && (
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-[#3a1410] to-[#5c1a12]"
              style={{
                left: `${MAIN_FRACTION * 100}%`,
                width: `${Math.max(0, flamePct - MAIN_FRACTION * 100)}%`,
              }}
            />
          )}
        </div>

        {/* Milepæl-markører: diskrete prikker på selve lunta */}
        {milestones.map((m) => {
          const sec = rps > 0 ? m.amount / rps : Infinity;
          const pct = timeToFraction(sec, estimatedSeconds) * 100;
          const consumed = elapsedSeconds >= sec;
          return (
            <div
              key={m.amount}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${pct}%` }}
              title={`${formatKr(m.amount)} kr – ${m.text}`}
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                  consumed ? "bg-[#241a10]/60" : "bg-[#5b4632]"
                }`}
              />
            </div>
          );
        })}

        {/* Flamme */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
          style={{ left: `${Math.min(100, Math.max(0, flamePct))}%` }}
        >
          <div className="relative">
            <span className="flame-flicker text-2xl sm:text-3xl">🔥</span>
            <EmberParticles active={rps > 0} />
          </div>
        </div>

        {/* Poff-animasjoner */}
        {poffs.map((p) => (
          <span
            key={p.id}
            className="poff absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg"
            style={{ left: `${p.leftPct}%` }}
          >
            💥
          </span>
        ))}
      </div>

      {/* Tidsmerker */}
      <div className="relative mt-1 h-4 text-[10px] text-muted">
        {quarterMarks.map((q, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 tabular"
            style={{ left: `${q.leftPct}%` }}
          >
            {q.label}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>Estimert totalkostnad</span>
        <span className="tabular font-semibold text-foreground">
          {formatKr(estimatedTotalCost)} kr
        </span>
      </div>

      {/* Brent-trail: milepæler dukker opp her etter hvert som flammen når dem */}
      {trail.length > 0 && (
        <div
          ref={trailRef}
          className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {trail.map((m, i) => (
            <div
              key={`${m.amount}-${i}`}
              className="milestone-in flex shrink-0 items-center gap-2 rounded-xl border border-ember/25 bg-background-raised px-3 py-2"
              style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
            >
              <span className="text-lg leading-none">{m.emoji}</span>
              <div className="leading-tight">
                <div className="tabular text-xs font-bold text-amber">
                  {formatKr(m.amount)} kr
                </div>
                <div className="max-w-[11rem] text-[11px] text-muted">{m.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmberParticles({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<{ id: number; drift: number }[]>([]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setParticles((prev) => [
        ...prev.slice(-4),
        { id: Date.now() + Math.random(), drift: (Math.random() - 0.5) * 16 },
      ]);
    }, 500);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="ember-particle absolute left-1/2 top-0 h-1 w-1 rounded-full bg-ember-hot"
          style={{ ["--drift" as string]: `${p.drift}px` }}
        />
      ))}
    </>
  );
}
