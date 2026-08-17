import type { PublicMeeting } from "./types";

export function ratePerSecond(ratePerHour: number): number {
  return ratePerHour / 3600;
}

export function ratePerMinute(ratePerHour: number): number {
  return ratePerHour / 60;
}

export function costForDuration(ratePerHour: number, seconds: number): number {
  return Math.max(0, ratePerHour * (seconds / 3600));
}

/**
 * Antall sekunder møtet faktisk har "gått" akkurat nå, basert på
 * server-tid (started_at / paused_at / paused_total_seconds / status),
 * ikke en strømmet telleverdi. Alle klienter regner ut samme tall lokalt
 * fra de samme feltene, uansett nettverkslag.
 *
 * For et avsluttet møte brukes final_duration_seconds hvis satt, i stedet
 * for å regne ut på nytt fra de rå tidsstemplene - verten kan ha korrigert
 * varigheten ved stopp (f.eks. glemte å stoppe i tide), og da stemmer ikke
 * lenger started_at→ended_at med det som faktisk telles.
 */
export function elapsedSeconds(
  meeting: Pick<
    PublicMeeting,
    | "started_at"
    | "status"
    | "paused_total_seconds"
    | "paused_at"
    | "ended_at"
    | "final_duration_seconds"
  >,
  now: number = Date.now(),
): number {
  if (meeting.status === "ended" && meeting.final_duration_seconds != null) {
    return meeting.final_duration_seconds;
  }
  if (!meeting.started_at) return 0;

  const startedAtMs = new Date(meeting.started_at).getTime();
  const pausedTotal = meeting.paused_total_seconds ?? 0;

  let endMs: number;
  if (meeting.status === "ended" && meeting.ended_at) {
    endMs = new Date(meeting.ended_at).getTime();
  } else if (meeting.status === "paused" && meeting.paused_at) {
    endMs = new Date(meeting.paused_at).getTime();
  } else {
    endMs = now;
  }

  const rawSeconds = (endMs - startedAtMs) / 1000;
  return Math.max(0, rawSeconds - pausedTotal);
}

export function isOvertime(elapsed: number, estimatedSeconds: number): boolean {
  return elapsed > estimatedSeconds;
}

export function overtimeSeconds(elapsed: number, estimatedSeconds: number): number {
  return Math.max(0, elapsed - estimatedSeconds);
}

export function progressFraction(elapsed: number, estimatedSeconds: number): number {
  if (estimatedSeconds <= 0) return 0;
  return Math.min(1, elapsed / estimatedSeconds);
}
