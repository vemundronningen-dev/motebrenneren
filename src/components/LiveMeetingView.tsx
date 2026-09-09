"use client";

import { useEffect, useRef, useState } from "react";
import RollingNumber from "./RollingNumber";
import Timeline from "./Timeline";
import ToastStack from "./ToastStack";
import { useToasts } from "@/lib/useToasts";
import {
  elapsedSeconds as calcElapsed,
  costForDuration,
  isOvertime as calcIsOvertime,
  overtimeSeconds as calcOvertimeSeconds,
  progressFraction,
  ratePerMinute,
  ratePerSecond,
} from "@/lib/calc";
import { formatKr, formatPercent } from "@/lib/format";
import { OVERTIME_TOASTS } from "@/lib/milestones";
import { caseValuePercent } from "@/lib/caseValueComparison";
import type { PublicMeeting } from "@/lib/types";

const OVERTIME_TOAST_TRIGGERS_SEC = [0, 10 * 60];

export default function LiveMeetingView({
  meeting,
  isHost,
  viewerCount,
  shareSlot,
  onPause,
  onResume,
  onStop,
  actionLoading,
}: {
  meeting: PublicMeeting;
  isHost: boolean;
  viewerCount?: number | null;
  shareSlot?: React.ReactNode;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: (overrideDurationSeconds?: number) => void;
  actionLoading?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [confirmingStop, setConfirmingStop] = useState(false);
  const { toasts, push } = useToasts();
  const overtimeConsumedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const elapsed = calcElapsed(meeting, now);
  const amount = costForDuration(meeting.rate_per_hour, elapsed);
  const overtime = calcIsOvertime(elapsed, meeting.estimated_seconds);
  const overtimeSec = calcOvertimeSeconds(elapsed, meeting.estimated_seconds);
  const overtimeAmount = costForDuration(meeting.rate_per_hour, overtimeSec);
  const progressPct = progressFraction(elapsed, meeting.estimated_seconds) * 100;
  const caseValuePct =
    meeting.case_value != null && meeting.case_value > 0
      ? caseValuePercent(amount, meeting.case_value)
      : null;
  const caseValueExceeded = caseValuePct != null && caseValuePct >= 100;

  useEffect(() => {
    if (!overtime) return;
    for (const trigger of OVERTIME_TOAST_TRIGGERS_SEC) {
      if (overtimeSec >= trigger && !overtimeConsumedRef.current.has(trigger)) {
        overtimeConsumedRef.current.add(trigger);
        const idx = OVERTIME_TOAST_TRIGGERS_SEC.indexOf(trigger) % OVERTIME_TOASTS.length;
        push(OVERTIME_TOASTS[idx]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overtime, overtimeSec]);

  const caseValueCrossedRef = useRef(false);
  useEffect(() => {
    if (caseValueExceeded && !caseValueCrossedRef.current) {
      caseValueCrossedRef.current = true;
      push("🚩 Møtet koster nå mer enn saken det skal avgjøre er verdt.");
    }
  }, [caseValueExceeded, push]);

  const isPaused = meeting.status === "paused";

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full transition-colors ${
        overtime ? "overtime-pulse" : ""
      }`}
    >
      {viewerCount != null && (
        <div className="text-xs text-muted">👀 {viewerCount} kolleger ser på</div>
      )}

      {isPaused && (
        <div className="rounded-full bg-ash px-4 py-1 text-xs font-medium text-muted">
          ⏸ Møtet er på pause
        </div>
      )}

      {meeting.label && (
        <p className="-mb-3 text-sm font-semibold uppercase tracking-wide text-amber">
          {meeting.label}
        </p>
      )}

      <div
        className={`flex items-baseline counter-pulse ${overtime ? "counter-glow-danger" : "counter-glow"}`}
        style={{ fontSize: "clamp(2.5rem, 11vw, 5.5rem)" }}
      >
        <RollingNumber value={amount} className="font-black leading-none" />
      </div>

      <div className="flex gap-6 text-sm text-muted tabular">
        <span>{formatKr(ratePerSecond(meeting.rate_per_hour))} kr/sek</span>
        <span>{formatKr(ratePerMinute(meeting.rate_per_hour))} kr/min</span>
      </div>

      {overtime && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-center">
          <div className="text-xs text-danger font-semibold uppercase tracking-wide">
            Overtid
          </div>
          <div className="tabular text-xl font-bold text-foreground">
            +{formatKr(overtimeAmount)} kr
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        <Timeline
          elapsedSeconds={elapsed}
          estimatedSeconds={meeting.estimated_seconds}
          ratePerHour={meeting.rate_per_hour}
          onMilestoneReached={(m) => push(`${m.emoji} ${m.text}`)}
        />
      </div>

      <div className="text-xs text-muted tabular">
        {formatPercent(Math.min(progressPct, 999))} % av møtet brukt
      </div>

      {caseValuePct != null && (
        <div
          className={`text-xs tabular ${caseValueExceeded ? "font-semibold text-danger" : "text-muted"}`}
        >
          {caseValueExceeded && "🚩 "}
          {formatPercent(Math.min(caseValuePct, 999))} % av sakens verdi (
          {formatKr(meeting.case_value ?? 0)} kr) brukt
        </div>
      )}

      {isHost && confirmingStop && (
        <StopConfirmPanel
          elapsedSeconds={elapsed}
          actionLoading={actionLoading}
          onCancel={() => setConfirmingStop(false)}
          onConfirm={(overrideSeconds) => onStop?.(overrideSeconds)}
        />
      )}

      {isHost && !confirmingStop && (
        <div className="flex gap-3">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              disabled={actionLoading}
              className="rounded-full bg-ember px-6 py-3 text-sm font-bold text-[#1a0d05] disabled:opacity-50"
            >
              ▶ Fortsett
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              disabled={actionLoading}
              className="rounded-full border border-line px-6 py-3 text-sm font-bold text-foreground disabled:opacity-50"
            >
              ⏸ Pause
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmingStop(true)}
            disabled={actionLoading}
            className="rounded-full bg-danger px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            ⏹ Stopp møtet
          </button>
        </div>
      )}

      {shareSlot}

      <ToastStack toasts={toasts} />
    </div>
  );
}

function StopConfirmPanel({
  elapsedSeconds,
  actionLoading,
  onCancel,
  onConfirm,
}: {
  elapsedSeconds: number;
  actionLoading?: boolean;
  onCancel: () => void;
  onConfirm: (overrideDurationSeconds?: number) => void;
}) {
  // Fryses ved åpning - ellers ville "grensen" krype oppover mens
  // bekreftelsespanelet står åpent, siden møtet fortsatt tikker i
  // bakgrunnen helt til handlingen faktisk bekreftes.
  const [measuredMinutes] = useState(() => Math.max(1, Math.round(elapsedSeconds / 60)));
  const [minutes, setMinutes] = useState(String(measuredMinutes));

  // Under 2 minutter er det ingenting fornuftig å korrigere til (nedre
  // grense er uansett 1 min) - da bare forvirrer et redigerbart felt med
  // "mellom 1 og 1" mer enn det hjelper, så vis kun en enkel bekreftelse.
  const canAdjust = measuredMinutes >= 2;

  const parsed = Math.round(Number(minutes));
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= measuredMinutes;
  const edited = canAdjust && parsed !== measuredMinutes;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-background-raised p-4">
      <p className="text-sm font-semibold text-foreground">
        {canAdjust
          ? `Møtet har vart i ${measuredMinutes} min. Stemmer det?`
          : "Møtet har akkurat startet. Sikker på at du vil stoppe?"}
      </p>
      {canAdjust && (
        <>
          <p className="mt-1 text-xs text-muted">
            Glemte du å stoppe i tide? Sett inn hvor lenge møtet egentlig
            varte - du kan bare korte ned, ikke forlenge.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={measuredMinutes}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="tabular w-24 rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ember"
            />
            <span className="text-sm text-muted">min</span>
          </div>
          {!valid && (
            <p className="mt-1.5 text-xs text-danger">
              Kan ikke være mer enn {measuredMinutes} min.
            </p>
          )}
        </>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={actionLoading}
          className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={() => onConfirm(edited ? parsed * 60 : undefined)}
          disabled={actionLoading || !valid}
          className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {actionLoading ? "Stopper…" : "Bekreft og avslutt"}
        </button>
      </div>
    </div>
  );
}
