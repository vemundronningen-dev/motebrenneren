"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RoleRow from "@/components/RoleRow";
import DurationPicker from "@/components/DurationPicker";
import MeetingLabelPicker from "@/components/MeetingLabelPicker";
import ShareButton from "@/components/ShareButton";
import LiveMeetingView from "@/components/LiveMeetingView";
import SummaryView from "@/components/SummaryView";
import { useLocalRates } from "@/lib/useLocalRates";
import { DEFAULT_ROLES, MAX_RATE, MIN_RATE, QUICK_ADD_PRESETS } from "@/lib/roles";
import { formatKr } from "@/lib/format";
import { costForDuration } from "@/lib/calc";
import type { PublicMeeting } from "@/lib/types";

type Phase = "setup" | "live" | "summary";

export default function StartPage() {
  const router = useRouter();
  const rates = useLocalRates();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [meeting, setMeeting] = useState<PublicMeeting | null>(null);
  const [customName, setCustomName] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allRoles = useMemo(
    () => [
      ...DEFAULT_ROLES.map((r) => ({ id: r.id, name: r.name, isCustom: false })),
      ...rates.customRoles.map((r) => ({ id: r.id, name: r.name, isCustom: true })),
    ],
    [rates.customRoles],
  );

  const totalParticipants = allRoles.reduce(
    (sum, r) => sum + (counts[r.id] ?? 0),
    0,
  );
  const totalRatePerHour = allRoles.reduce(
    (sum, r) => sum + (counts[r.id] ?? 0) * rates.rateFor(r.id),
    0,
  );
  const estimatedSeconds = estimatedMinutes ? estimatedMinutes * 60 : 0;
  const estimatedCost = costForDuration(totalRatePerHour, estimatedSeconds);

  const canStart = totalParticipants > 0 && estimatedMinutes != null;

  function setCount(roleId: string, n: number) {
    setCounts((prev) => ({ ...prev, [roleId]: Math.max(0, Math.min(500, n)) }));
  }
  function inc(roleId: string) {
    setCounts((prev) => ({ ...prev, [roleId]: Math.min(500, (prev[roleId] ?? 0) + 1) }));
  }
  function dec(roleId: string) {
    setCounts((prev) => ({ ...prev, [roleId]: Math.max(0, (prev[roleId] ?? 0) - 1) }));
  }

  function applyPreset(counts_: Record<string, number>) {
    setCounts((prev) => {
      const next = { ...prev };
      for (const [id, n] of Object.entries(counts_)) {
        next[id] = (next[id] ?? 0) + n;
      }
      return next;
    });
  }

  function addCustomRole() {
    const name = customName.trim();
    const rate = Math.round(Number(customRate));
    if (!name || !Number.isFinite(rate)) return;
    const clamped = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
    const id = rates.addCustomRole(name, clamped);
    setCounts((prev) => ({ ...prev, [id]: 1 }));
    setCustomName("");
    setCustomRate("");
  }

  function handleStart() {
    if (!canStart) return;
    const startedAt = new Date().toISOString();
    setMeeting({
      id: "local",
      slug: "",
      started_at: startedAt,
      estimated_seconds: estimatedSeconds,
      rate_per_hour: totalRatePerHour,
      participants: totalParticipants,
      status: "running",
      paused_total_seconds: 0,
      viewer_count: 0,
      paused_at: null,
      ended_at: null,
      created_at: startedAt,
      label: label.trim() || null,
    });
    setPhase("live");
  }

  function handlePause() {
    setMeeting((prev) =>
      prev ? { ...prev, status: "paused", paused_at: new Date().toISOString() } : prev,
    );
  }

  function handleResume() {
    setMeeting((prev) => {
      if (!prev || !prev.paused_at) return prev;
      const pausedFor = (Date.now() - new Date(prev.paused_at).getTime()) / 1000;
      return {
        ...prev,
        status: "running",
        paused_total_seconds: Math.round(prev.paused_total_seconds + pausedFor),
        paused_at: null,
      };
    });
  }

  async function handleStop() {
    if (!meeting) return;
    setSubmitting(true);
    const endedAt = new Date().toISOString();
    const extraPause =
      meeting.status === "paused" && meeting.paused_at
        ? (Date.now() - new Date(meeting.paused_at).getTime()) / 1000
        : 0;
    const finalPausedTotal = Math.round(meeting.paused_total_seconds + extraPause);
    const startedAtMs = meeting.started_at
      ? new Date(meeting.started_at).getTime()
      : Date.now();
    const elapsed = Math.max(0, (Date.now() - startedAtMs) / 1000 - finalPausedTotal);
    const amount = costForDuration(meeting.rate_per_hour, elapsed);

    const ended: PublicMeeting = {
      ...meeting,
      status: "ended",
      ended_at: endedAt,
      paused_total_seconds: finalPausedTotal,
      paused_at: null,
    };

    try {
      await fetch("/api/burns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          durationSeconds: elapsed,
          estimatedSeconds: meeting.estimated_seconds,
          participants: meeting.participants,
          label: meeting.label,
        }),
      });
    } catch {
      // Best effort - brukeren får uansett se oppsummeringen sin.
    } finally {
      setMeeting(ended);
      setPhase("summary");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-16">
      {phase === "setup" && (
        <div className="w-full max-w-2xl flex flex-col gap-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Sett opp møtet</h1>
            <p className="mt-1 text-sm text-muted">
              Legg til hvem som sitter i møtet, velg varighet, og se hva det
              kommer til å koste.
            </p>
          </div>

          <section>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_ADD_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.counts)}
                  className="rounded-full border border-line bg-background-raised px-3 py-1.5 text-xs font-medium text-foreground hover:border-ember/50"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted">Deltakere</h2>
              {Object.keys(rates.overrides).length > 0 && (
                <button
                  type="button"
                  onClick={rates.resetAll}
                  className="text-xs text-muted underline hover:text-foreground"
                >
                  Tilbakestill alle rater
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {allRoles.map((r) => (
                <RoleRow
                  key={r.id}
                  name={r.name}
                  rate={rates.rateFor(r.id)}
                  count={counts[r.id] ?? 0}
                  isEdited={rates.isOverridden(r.id) && !r.isCustom}
                  isCustom={r.isCustom}
                  onIncrement={() => inc(r.id)}
                  onDecrement={() => dec(r.id)}
                  onSetCount={(n) => setCount(r.id, n)}
                  onRateChange={(rate) => rates.setRate(r.id, rate)}
                  onResetRate={!r.isCustom ? () => rates.resetRate(r.id) : undefined}
                  onRenameCustom={
                    r.isCustom ? (name) => rates.updateCustomRole(r.id, { name }) : undefined
                  }
                  onRemoveCustom={
                    r.isCustom
                      ? () => {
                          rates.removeCustomRole(r.id);
                          setCounts((prev) => {
                            const next = { ...prev };
                            delete next[r.id];
                            return next;
                          });
                        }
                      : undefined
                  }
                />
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                placeholder="Egen rolle (f.eks. Praktikant)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-line bg-background-raised px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ember"
              />
              <input
                placeholder="kr/t"
                inputMode="numeric"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                className="w-20 rounded-lg border border-line bg-background-raised px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ember"
              />
              <button
                type="button"
                onClick={addCustomRole}
                className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-ember/50"
              >
                Legg til
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-ember/30 bg-ember/[0.06] px-4 py-3">
              <span className="text-sm text-muted">
                {totalParticipants} deltakere · løpende total
              </span>
              <span className="tabular text-lg font-bold text-amber">
                {formatKr(totalRatePerHour)} kr/t
              </span>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted mb-2">
              Møtetype (valgfritt)
            </h2>
            <MeetingLabelPicker label={label} onChange={setLabel} />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted mb-2">
              Estimert varighet
            </h2>
            <DurationPicker minutes={estimatedMinutes} onChange={setEstimatedMinutes} />
          </section>

          {estimatedMinutes != null && totalParticipants > 0 && (
            <p className="toast-in text-center text-sm text-muted">
              Dette møtet kommer til å koste ca.{" "}
              <span className="font-bold text-amber">
                {formatKr(estimatedCost)} kr
              </span>
            </p>
          )}

          <ShareButton
            participants={totalParticipants}
            ratePerHour={totalRatePerHour}
            estimatedSeconds={estimatedSeconds || 900}
            estimatedCost={estimatedCost}
            label={label}
            onShared={(slug) => router.push(`/m/${slug}`)}
          />

          <button
            type="button"
            disabled={!canStart}
            onClick={handleStart}
            className="rounded-full bg-ember px-8 py-4 text-lg font-bold text-[#1a0d05] shadow-[0_0_40px_-6px_var(--ember)] transition hover:bg-ember-hot disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            START 🔥
          </button>
          {!canStart && (
            <p className="-mt-4 text-center text-xs text-muted">
              Legg til minst én deltaker og velg varighet for å starte.
            </p>
          )}
        </div>
      )}

      {phase === "live" && meeting && (
        <LiveMeetingView
          meeting={meeting}
          isHost
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          actionLoading={submitting}
          shareSlot={
            <ShareButton
              participants={meeting.participants}
              ratePerHour={meeting.rate_per_hour}
              estimatedSeconds={meeting.estimated_seconds}
              alreadyStartedAt={meeting.started_at}
              estimatedCost={estimatedCost}
              label={meeting.label}
              onShared={(slug) => router.push(`/m/${slug}`)}
              className="w-full max-w-sm"
            />
          }
        />
      )}

      {phase === "summary" && meeting && <SummaryView meeting={meeting} />}
    </main>
  );
}
