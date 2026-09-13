"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Timeline from "./Timeline";
import { costComparison } from "@/lib/comparisons";
import { judgeMeeting } from "@/lib/verdicts";
import { judgeCaseValue } from "@/lib/caseValueComparison";
import { generateShareImage } from "@/lib/shareImage";
import { useMeetingHistory } from "@/lib/useMeetingHistory";
import {
  costForDuration,
  elapsedSeconds as calcElapsed,
  isOvertime as calcIsOvertime,
  overtimeSeconds as calcOvertimeSeconds,
  progressFraction,
} from "@/lib/calc";
import { formatDuration, formatKr } from "@/lib/format";
import type { PublicMeeting } from "@/lib/types";

export default function SummaryView({ meeting }: { meeting: PublicMeeting }) {
  const [imgLoading, setImgLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const { addEntry } = useMeetingHistory();
  const savedRef = useRef(false);

  const duration = calcElapsed(meeting);
  // Bruk det lagrede endelige beløpet når det finnes (kan avvike fra en
  // rå ny utregning med noen øre pga. avrunding av korrigert varighet).
  const amount = meeting.final_amount ?? costForDuration(meeting.rate_per_hour, duration);
  const overtime = calcIsOvertime(duration, meeting.estimated_seconds);
  const overtimeSec = calcOvertimeSeconds(duration, meeting.estimated_seconds);
  const overtimeAmount = costForDuration(meeting.rate_per_hour, overtimeSec);
  const finishedEarly = !overtime && duration < meeting.estimated_seconds * 0.9;
  const costPerHead = amount / Math.max(1, meeting.participants);
  const comparison = costComparison(amount);
  const verdict = judgeMeeting({
    amount,
    wentOvertime: overtime,
    overtimeSeconds: overtimeSec,
    finishedEarly,
  });
  const caseValueVerdict =
    meeting.case_value != null && meeting.case_value > 0
      ? judgeCaseValue(amount, meeting.case_value)
      : null;

  const summaryText = `🔥 Møtebrenneren-oppsummering${meeting.label ? ` – ${meeting.label}` : ""}\n${formatKr(amount)} kr brent på ${formatDuration(duration)} med ${meeting.participants} deltakere.\n${verdict.title}\nLike mye som ${comparison}.${caseValueVerdict ? `\n${caseValueVerdict.title} (saken var verdt ${formatKr(meeting.case_value ?? 0)} kr)` : ""}\nmotebrenneren.no`;

  // Lagre i den lokale møtehistorikken - én gang per gang oppsummeringen
  // faktisk vises (både solo-flyten og delte møter render denne samme
  // komponenten når status blir "ended").
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    addEntry({
      label: meeting.label,
      amount,
      durationSeconds: duration,
      estimatedSeconds: meeting.estimated_seconds,
      participants: meeting.participants,
      wentOvertime: overtime,
      endedAt: meeting.ended_at ?? new Date().toISOString(),
      slug: meeting.slug || null,
      caseValue: meeting.case_value,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setImgError("Kunne ikke kopiere teksten.");
    }
  }

  async function handleDownloadImage() {
    setImgLoading(true);
    setImgError(null);
    try {
      const blob = await generateShareImage({
        amount,
        verdictTitle: verdict.title,
        comparison,
        participants: meeting.participants,
        durationLabel: formatDuration(duration),
        progressFraction: progressFraction(duration, meeting.estimated_seconds),
        label: meeting.label,
      });
      const file = new File([blob], "motebrenneren.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "Møtebrenneren", text: summaryText });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "motebrenneren.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      setImgError("Kunne ikke lage bildet. Prøv kopier-som-tekst i stedet.");
    } finally {
      setImgLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <div>
        {meeting.label && (
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber">
            {meeting.label}
          </p>
        )}
        <p className="text-sm text-muted">Møtet er over. Regningen er klar.</p>
        <div className="tabular mt-2 text-5xl sm:text-6xl font-black counter-glow counter-pop-in">
          {formatKr(amount)} kr
        </div>
      </div>

      <div
        className={`rounded-2xl border px-5 py-3 ${
          verdict.badge === "hyllest"
            ? "border-ember/40 bg-ember/10"
            : verdict.badge === "skam"
              ? "border-danger/40 bg-danger/10"
              : "border-line bg-background-raised"
        }`}
      >
        <div className="font-bold text-foreground">{verdict.title}</div>
        <div className="mt-1 text-sm text-muted">{verdict.text}</div>
      </div>

      <div className="w-full">
        <Timeline
          elapsedSeconds={duration}
          estimatedSeconds={meeting.estimated_seconds}
          ratePerHour={meeting.rate_per_hour}
          participants={meeting.participants}
        />
      </div>

      <div className="grid w-full grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Varighet" value={formatDuration(duration)} />
        <Stat
          label="Estimert"
          value={formatDuration(meeting.estimated_seconds)}
        />
        <Stat label="Deltakere" value={String(meeting.participants)} />
        <Stat label="Kr per hode" value={`${formatKr(costPerHead)} kr`} />
      </div>

      {overtime && (
        <div className="w-full rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          <span className="font-semibold text-danger">
            Overtid: {formatDuration(overtimeSec)} = {formatKr(overtimeAmount)} kr
          </span>
        </div>
      )}

      {caseValueVerdict && (
        <div
          className={`w-full rounded-xl border px-4 py-3 text-sm ${
            caseValueVerdict.badge === "shame"
              ? "border-danger/40 bg-danger/10"
              : caseValueVerdict.badge === "warning"
                ? "border-amber/40 bg-amber/10"
                : "border-ember/40 bg-ember/10"
          }`}
        >
          <div
            className={`font-semibold ${caseValueVerdict.badge === "shame" ? "text-danger" : "text-foreground"}`}
          >
            {caseValueVerdict.title}
          </div>
          <div className="mt-0.5 text-muted">
            {caseValueVerdict.text} Saken var verdt{" "}
            {formatKr(meeting.case_value ?? 0)} kr.
          </div>
        </div>
      )}

      <p className="text-sm text-muted">
        Dette møtet kostet like mye som{" "}
        <span className="text-foreground font-medium">{comparison}</span>.
      </p>

      <div className="toast-in flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-sm">
        <span>🇳🇴</span>
        <span>Beløpet er lagt til Norges teller</span>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={imgLoading}
          className="flex-1 rounded-xl bg-ember px-4 py-3 text-sm font-bold text-[#1a0d05] disabled:opacity-50"
        >
          {imgLoading ? "Lager bilde…" : "📤 Del som bilde"}
        </button>
        <button
          type="button"
          onClick={handleCopyText}
          className="flex-1 rounded-xl border border-line px-4 py-3 text-sm font-bold text-foreground hover:border-ember/50"
        >
          {copied ? "Kopiert! ✅" : "📋 Kopier som tekst"}
        </button>
      </div>
      {imgError && <p className="text-xs text-danger">{imgError}</p>}

      <div className="mt-2 flex items-center gap-4 text-sm">
        <Link href="/start" className="text-muted underline hover:text-foreground">
          Start et nytt møte
        </Link>
        <Link href="/historikk" className="text-muted underline hover:text-foreground">
          Se møtehistorikk
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-background-raised px-3 py-3">
      <div className="tabular font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}
