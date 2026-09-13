"use client";

import { useEffect, useRef, useState } from "react";
import { formatKr, formatMinutes } from "@/lib/format";
import { milestonesForTimeline, nextUpcomingMilestone, type Milestone } from "@/lib/milestones";
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
  participants,
  onMilestoneReached,
  showNextTeaser,
}: {
  elapsedSeconds: number;
  estimatedSeconds: number;
  ratePerHour: number;
  /** Antall deltakere - avgjør tersklene for gruppeskalerte milepæler (pizza, kaffe, treningskort m.m). */
  participants: number;
  onMilestoneReached?: (m: Milestone) => void;
  /** Vis "neste opp"-teaseren - kun for et faktisk pågående møte, ikke en frosset oppsummering. */
  showNextTeaser?: boolean;
}) {
  const rps = ratePerSecond(ratePerHour);
  const estimatedTotalCost = costForDuration(ratePerHour, estimatedSeconds);
  const milestones = milestonesForTimeline(estimatedTotalCost, participants);
  const isOvertime = elapsedSeconds > estimatedSeconds;
  const currentAmount = costForDuration(ratePerHour, elapsedSeconds);

  // "Sneak peek": den kommende milepælen tegnes uskarp og skjerpes gradvis
  // inn jo nærmere flammen kommer - avslører akkurat nok til å bygge
  // spenning uten å spoile poenget for tidlig. Jo nærmere 0 kr igjen, jo
  // skarpere, varmere og mer pulserende blir den - selve nedtellingen skal
  // føles som en opptrapping, ikke et binært av/på.
  const nextMilestone = showNextTeaser ? nextUpcomingMilestone(currentAmount, participants) : null;
  const remainingToNext = nextMilestone ? Math.max(0, nextMilestone.amount - currentAmount) : 0;
  const revealWindow = nextMilestone ? Math.max(150, nextMilestone.amount * 0.18) : 1;
  const revealProgress = nextMilestone
    ? Math.min(1, Math.max(0, 1 - remainingToNext / revealWindow))
    : 0;
  // Ease-in slik at det meste av skjerpingen skjer helt på tampen - de
  // siste kronene skal føles som et crescendo.
  const revealEased = revealProgress ** 2;
  const teaserBlurPx = (1 - revealEased) * 7;
  const teaserScale = 1 + revealEased * 0.05;
  const teaserGlow = 0.55 * revealEased;
  const teaserAlmostThere = revealProgress > 0.85;
  const teaserPulseDuration = 1.6 - revealEased * 1.1;

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
      {nextMilestone && (
        <div
          className={`relative mb-3 overflow-hidden rounded-xl border px-4 py-2.5 transition-[transform,background-color,border-color,box-shadow] duration-300 ${
            teaserAlmostThere ? "animate-pulse border-ember/60" : "border-ember/20"
          }`}
          style={{
            backgroundColor: `rgba(232, 120, 58, ${0.04 + teaserGlow * 0.14})`,
            transform: `scale(${teaserScale})`,
            boxShadow: teaserGlow > 0.05 ? `0 0 ${teaserGlow * 22}px rgba(232, 120, 58, ${teaserGlow * 0.5})` : "none",
            animationDuration: teaserAlmostThere ? `${teaserPulseDuration}s` : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Neste opp
              </span>
              <span
                className="shrink-0 text-lg leading-none transition-[filter] duration-300"
                style={{ filter: `blur(${teaserBlurPx}px)` }}
              >
                {nextMilestone.emoji}
              </span>
              <span
                className="truncate text-xs transition-[filter,color] duration-300"
                style={{
                  filter: `blur(${teaserBlurPx}px)`,
                  color: teaserAlmostThere ? "var(--color-amber)" : "var(--color-muted)",
                }}
              >
                {nextMilestone.text}
              </span>
            </div>
            <span
              className="tabular shrink-0 text-xs font-bold text-amber"
              style={{ transform: `scale(${1 + teaserGlow * 0.15})` }}
            >
              {remainingToNext > 0 ? `${formatKr(remainingToNext)} kr igjen` : "nå!"}
            </span>
          </div>
          <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-ember/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember to-amber transition-[width] duration-300"
              style={{ width: `${revealEased * 100}%` }}
            />
          </div>
        </div>
      )}

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
