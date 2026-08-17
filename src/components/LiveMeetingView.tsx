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
  onStop?: () => void;
  actionLoading?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
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

      {isHost && (
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
            onClick={onStop}
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
