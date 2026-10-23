"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveMeeting } from "@/lib/useLiveMeeting";
import {
  costForDuration,
  elapsedSeconds as calcElapsed,
  overtimeSeconds as calcOvertimeSeconds,
  ratePerMinute,
} from "@/lib/calc";
import { formatClock, formatKr, formatPercent } from "@/lib/format";
import {
  lastReachedMilestone,
  nextUpcomingMilestone,
  teaserReveal,
  type Milestone,
} from "@/lib/milestones";
import { judgeMeeting } from "@/lib/verdicts";
import { costComparison } from "@/lib/comparisons";
import type { PublicMeeting } from "@/lib/types";

const BURST_MS = 5_000;

/**
 * Fullskjerm-visning laget for å fanges som et webkamera (OBS Browser Source
 * -> OBS Virtual Camera -> Teams). Alt skaleres med `em` ut fra en rot-
 * skriftstørrelse som følger 16:9-flaten, slik at det ser likt ut i
 * 1280x720, 1920x1080 eller et vilkårlig nettleservindu. Mørk bakgrunn og
 * store, feite tall fordi Teams komprimerer video hardt og ofte viser
 * deltakere som små ruter. Innholdet holdes innenfor en sentrert "safe
 * area", siden Teams beskjærer kamerabildet for å fylle rutene sine.
 */
export default function CameraView({
  slug,
  initialMeeting,
  botSignature,
}: {
  slug: string;
  initialMeeting: PublicMeeting;
  /** Satt når siden lastes av møteboten (signert lenke fra serveren). */
  botSignature?: string | null;
}) {
  const [meeting] = useLiveMeeting(slug, initialMeeting);

  // Boten laster siden når den er i møtet: tenn lunta herfra også, i tilfelle
  // webhooken fra Recall er forsinket eller feilkonfigurert. Serveren venter
  // uansett til planlagt start, og gjør ingenting hvis møtet alt er i gang.
  useEffect(() => {
    if (!botSignature || initialMeeting.status !== "lobby") return;
    fetch(`/api/meetings/${slug}/bot-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sig: botSignature }),
    }).catch(() => {});
  }, [slug, botSignature, initialMeeting.status]);
  // null til komponenten er montert i nettleseren: server og klient har
  // ulik Date.now(), og et klokkeslett rendret på serveren gir hydrerings-
  // feil. Et tomt bilde i én frame er usynlig i en kamerastrøm.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  // Dekker over footer/sponsorlinje fra rot-layouten, og hindrer scroll -
  // ingenting annet enn selve visningen skal havne i kamerabildet.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const elapsed = calcElapsed(meeting, now ?? undefined);
  const amount = meeting.final_amount ?? costForDuration(meeting.rate_per_hour, elapsed);
  const mounted = now != null;
  // Boten ble sluppet inn før planlagt start: started_at ligger i fremtiden.
  const startsInSeconds =
    mounted && meeting.status === "running" && meeting.started_at
      ? Math.max(0, (new Date(meeting.started_at).getTime() - now) / 1000)
      : 0;
  const countingDown = startsInSeconds > 0;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#140d08] text-[#fff4ea] select-none"
      style={{ fontSize: "min(1.5625vw, 2.7778vh)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 42%, rgba(255,106,31,0.28), rgba(255,106,31,0) 70%)",
        }}
      />
      <div className="relative mx-auto flex h-full w-[82%] flex-col justify-between py-[2.4em]">
        <Header meeting={meeting} countingDown={countingDown} />
        {(meeting.status === "lobby" || countingDown) && (
          <LobbyBody meeting={meeting} startsInSeconds={countingDown ? startsInSeconds : null} />
        )}
        {mounted && !countingDown && (meeting.status === "running" || meeting.status === "paused") && (
          <LiveBody meeting={meeting} elapsed={elapsed} amount={amount} />
        )}
        {mounted && meeting.status === "ended" && (
          <EndedBody meeting={meeting} elapsed={elapsed} amount={amount} />
        )}
        <p className="text-center text-[0.8em] tracking-wide text-[#fff4ea]/45">
          motebrenneren.no
        </p>
      </div>
    </div>
  );
}

function Header({ meeting, countingDown }: { meeting: PublicMeeting; countingDown: boolean }) {
  const status = countingDown
    ? { text: "Starter snart", dot: "bg-[#ffc24d]", pulse: true }
    : {
        lobby: { text: "Venter på start", dot: "bg-[#fff4ea]/50", pulse: false },
        running: { text: "Live", dot: "bg-[#ff3b1f]", pulse: true },
        paused: { text: "Pause", dot: "bg-[#ffc24d]", pulse: false },
        ended: { text: "Avsluttet", dot: "bg-[#fff4ea]/50", pulse: false },
      }[meeting.status];

  return (
    <div className="flex items-start justify-between gap-[1em]">
      <div className="min-w-0">
        <div className="text-[1.1em] font-extrabold uppercase tracking-[0.18em] text-[#ff8a3d]">
          🔥 Møtebrenneren
        </div>
        {meeting.label && (
          <div className="mt-[0.2em] truncate text-[1.2em] font-semibold text-[#fff4ea]/80">
            {meeting.label}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-[0.5em] rounded-full border border-[#fff4ea]/20 bg-[#fff4ea]/[0.06] px-[0.9em] py-[0.35em] text-[1em] font-bold uppercase tracking-wider">
        <span
          className={`inline-block h-[0.6em] w-[0.6em] rounded-full ${status.dot} ${
            status.pulse ? "animate-pulse" : ""
          }`}
        />
        {status.text}
      </div>
    </div>
  );
}

function LobbyBody({
  meeting,
  startsInSeconds,
}: {
  meeting: PublicMeeting;
  startsInSeconds: number | null;
}) {
  const prognosis = costForDuration(meeting.rate_per_hour, meeting.estimated_seconds);
  return (
    <div className="flex flex-col items-center text-center">
      {startsInSeconds != null && (
        <div className="tabular mb-[0.8em] rounded-full bg-[#ffc24d] px-[1em] py-[0.25em] text-[1.4em] font-black text-[#140d08]">
          Lunta tennes om {formatClock(startsInSeconds)}
        </div>
      )}
      <div className="text-[1.5em] font-semibold text-[#fff4ea]/70">Prognose for dette møtet</div>
      <div className="tabular mt-[0.1em] text-[5.2em] font-black leading-none text-[#ff6a1f]">
        {formatKr(prognosis)} kr
      </div>
      <div className="mt-[0.8em] text-[1.4em] text-[#fff4ea]/70">
        {meeting.participants} deltakere · {Math.round(meeting.estimated_seconds / 60)} min ·{" "}
        {formatKr(ratePerMinute(meeting.rate_per_hour))} kr/min
      </div>
      <div className="mt-[1.2em] text-[1.3em] font-semibold text-[#fff4ea]/55">
        Lunta tennes når møtet starter.
      </div>
    </div>
  );
}

function LiveBody({
  meeting,
  elapsed,
  amount,
}: {
  meeting: PublicMeeting;
  elapsed: number;
  amount: number;
}) {
  const paused = meeting.status === "paused";
  const estimated = meeting.estimated_seconds;
  const overtime = elapsed > estimated;
  const overtimeAmount = costForDuration(meeting.rate_per_hour, calcOvertimeSeconds(elapsed, estimated));
  const progress = Math.min(1, elapsed / Math.max(1, estimated));
  const caseValuePct =
    meeting.case_value != null && meeting.case_value > 0
      ? (amount / meeting.case_value) * 100
      : null;

  const last = lastReachedMilestone(amount, meeting.participants);
  const next = nextUpcomingMilestone(amount, meeting.participants);
  const burst = useMilestoneBurst(last);

  return (
    <div className="relative flex flex-col items-center">
      {paused && (
        <span className="mb-[0.6em] rounded-full bg-[#ffc24d] px-[1em] py-[0.25em] text-[1.3em] font-black uppercase tracking-wider text-[#140d08]">
          ⏸ Møtet er på pause
        </span>
      )}
      <div
        className={`tabular text-[6.4em] font-black leading-none transition-opacity ${
          overtime ? "text-[#ff3b1f]" : "text-[#ff6a1f]"
        } ${paused ? "opacity-50" : ""}`}
        style={{ textShadow: "0 0 0.35em rgba(255,106,31,0.45)" }}
      >
        {formatKr(amount)} kr
      </div>

      <div className="tabular mt-[0.5em] flex items-baseline gap-[0.6em] text-[1.6em] font-bold">
        <span>{formatClock(elapsed)}</span>
        <span className="text-[0.75em] font-semibold text-[#fff4ea]/55">
          av {formatClock(estimated)} · {formatKr(ratePerMinute(meeting.rate_per_hour))} kr/min
        </span>
      </div>

      <div className="mt-[0.9em] h-[0.7em] w-full overflow-hidden rounded-full bg-[#fff4ea]/10">
        <div
          className={`h-full rounded-full ${
            overtime
              ? "bg-[#ff3b1f]"
              : "bg-gradient-to-r from-[#ff6a1f] to-[#ffb347]"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="mt-[0.45em] flex w-full justify-between text-[1em] font-semibold">
        {overtime ? (
          <span className="text-[#ff3b1f]">⏰ Overtid: +{formatKr(overtimeAmount)} kr</span>
        ) : (
          <span className="text-[#fff4ea]/55">{formatPercent(progress * 100)} % av tiden brukt</span>
        )}
        {caseValuePct != null && (
          <span className={caseValuePct >= 100 ? "text-[#ff3b1f]" : "text-[#fff4ea]/55"}>
            {caseValuePct >= 100 ? "🚩 " : ""}
            {formatPercent(Math.min(caseValuePct, 999))} % av sakens verdi
          </span>
        )}
      </div>

      <div className="mt-[1.1em] grid w-full grid-cols-2 gap-[0.8em]">
        <MilestoneCard heading="Sist brent" milestone={last} empty="Ingenting ennå…" />
        <NextCard amount={amount} next={next} />
      </div>

      {burst && <BurstOverlay key={burst.key} milestone={burst.milestone} />}
    </div>
  );
}

function MilestoneCard({
  heading,
  milestone,
  empty,
}: {
  heading: string;
  milestone: Milestone | null;
  empty: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-[0.7em] rounded-[0.8em] border border-[#fff4ea]/15 bg-[#fff4ea]/[0.05] px-[1em] py-[0.7em]">
      <span className="shrink-0 text-[2.2em] leading-none">{milestone?.emoji ?? "🕯️"}</span>
      <div className="min-w-0">
        <div className="text-[0.8em] font-bold uppercase tracking-wider text-[#fff4ea]/50">
          {heading}
          {milestone && <span className="tabular"> · {formatKr(milestone.amount)} kr</span>}
        </div>
        <div className="truncate text-[1.15em] font-semibold">{milestone?.text ?? empty}</div>
      </div>
    </div>
  );
}

function NextCard({ amount, next }: { amount: number; next: Milestone | null }) {
  if (!next) {
    return <MilestoneCard heading="Neste opp" milestone={null} empty="Alt er brent. Alt." />;
  }
  const reveal = teaserReveal(amount, next);
  const blur = `blur(${(1 - reveal) * 0.45}em)`;
  const remaining = Math.max(0, next.amount - amount);
  const hot = reveal > 0.72;

  return (
    <div
      className={`flex min-w-0 items-center gap-[0.7em] rounded-[0.8em] border px-[1em] py-[0.7em] ${
        hot ? "animate-pulse border-[#ff6a1f]/70" : "border-[#ff6a1f]/30"
      }`}
      style={{
        backgroundColor: `rgba(255,106,31,${0.06 + reveal * 0.16})`,
        boxShadow: reveal > 0.05 ? `0 0 ${reveal * 1.6}em rgba(255,106,31,${reveal * 0.45})` : "none",
      }}
    >
      <span className="shrink-0 text-[2.2em] leading-none" style={{ filter: blur }}>
        {next.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-[0.5em] text-[0.8em] font-bold uppercase tracking-wider">
          <span className="text-[#fff4ea]/50">Neste opp</span>
          <span className="tabular text-[#ffb347]">{formatKr(remaining)} kr igjen</span>
        </div>
        <div className="truncate text-[1.15em] font-semibold" style={{ filter: blur }}>
          {next.text}
        </div>
      </div>
    </div>
  );
}

/** Slår inn i noen sekunder hver gang en ny milepæl passeres - ikke ved første visning. */
function useMilestoneBurst(last: Milestone | null) {
  const [burst, setBurst] = useState<{ milestone: Milestone; key: number } | null>(null);
  const previousRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    const current = last?.amount ?? null;
    const previous = previousRef.current;
    previousRef.current = current;
    if (previous === undefined || current === previous || !last) return;

    setBurst({ milestone: last, key: Date.now() });
    const timeout = setTimeout(() => setBurst(null), BURST_MS);
    return () => clearTimeout(timeout);
  }, [last]);

  return burst;
}

function BurstOverlay({ milestone }: { milestone: Milestone }) {
  return (
    <div className="cam-burst pointer-events-none absolute inset-x-[-4%] top-1/2 flex -translate-y-1/2 items-center gap-[1em] rounded-[1.2em] border-2 border-[#ff6a1f] bg-[#1f130b]/95 px-[1.6em] py-[1.2em] shadow-[0_0_3em_rgba(255,106,31,0.55)]">
      <span className="shrink-0 text-[4.5em] leading-none">{milestone.emoji}</span>
      <div className="min-w-0">
        <div className="text-[1.1em] font-black uppercase tracking-[0.2em] text-[#ff8a3d]">
          💥 Brent: {formatKr(milestone.amount)} kr
        </div>
        <div className="mt-[0.15em] text-[2em] font-extrabold leading-tight">{milestone.text}</div>
      </div>
    </div>
  );
}

function EndedBody({
  meeting,
  elapsed,
  amount,
}: {
  meeting: PublicMeeting;
  elapsed: number;
  amount: number;
}) {
  const overtimeSec = calcOvertimeSeconds(elapsed, meeting.estimated_seconds);
  const verdict = useMemo(
    () =>
      judgeMeeting({
        amount,
        wentOvertime: overtimeSec > 0,
        overtimeSeconds: overtimeSec,
        finishedEarly: overtimeSec === 0 && elapsed < meeting.estimated_seconds * 0.9,
      }),
    [amount, overtimeSec, elapsed, meeting.estimated_seconds],
  );

  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-[1.5em] font-semibold text-[#fff4ea]/70">Møtet er over. Regningen:</div>
      <div
        className="tabular mt-[0.1em] text-[6em] font-black leading-none text-[#ff6a1f]"
        style={{ textShadow: "0 0 0.35em rgba(255,106,31,0.45)" }}
      >
        {formatKr(amount)} kr
      </div>
      <div className="tabular mt-[0.5em] text-[1.4em] text-[#fff4ea]/70">
        {formatClock(elapsed)} · {meeting.participants} deltakere
      </div>
      <div className="mt-[0.9em] text-[1.8em] font-extrabold">{verdict.title}</div>
      <div className="mt-[0.3em] text-[1.25em] text-[#fff4ea]/70">
        Like mye som {costComparison(amount)}.
      </div>
    </div>
  );
}
