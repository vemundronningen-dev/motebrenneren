"use client";

import { useEffect, useRef, useState } from "react";
import LiveMeetingView from "@/components/LiveMeetingView";
import SummaryView from "@/components/SummaryView";
import ShareButton from "@/components/ShareButton";
import { getHostToken } from "@/lib/hostToken";
import { costForDuration } from "@/lib/calc";
import { formatKr } from "@/lib/format";
import type { PublicMeeting } from "@/lib/types";

// Ingen realtime-infrastruktur i denne oppsett (ren Postgres via Neon) -
// status og seertall hentes derfor med jevn polling i stedet for en push
// når verten endrer status. Selve kr-telleren er upåvirket av dette: den
// regnes lokalt 10x/sekund ut fra started_at/paused-feltene (server-tid),
// så bare statusendringer (start/pause/resume/stopp) og seertallet er
// avhengig av pollingen - et par sekunders forsinkelse på de er umerkelig.
const POLL_INTERVAL_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 10_000;

function newSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function MeetingRoom({
  slug,
  initialMeeting,
}: {
  slug: string;
  initialMeeting: PublicMeeting;
}) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const hostTokenRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const token = getHostToken(slug);
    hostTokenRef.current = token;
    setIsHost(token != null);
    sessionIdRef.current = newSessionId();
  }, [slug]);

  // Poll for fersk status (og seertall) mens møtet ikke er avsluttet.
  useEffect(() => {
    if (meeting.status === "ended") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/meetings/${slug}`, { cache: "no-store" });
        if (res.ok) setMeeting(await res.json());
      } catch {
        // stille - prøver igjen neste runde
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slug, meeting.status]);

  // Heartbeat for "X kolleger ser på" mens møtet ikke er avsluttet.
  useEffect(() => {
    if (meeting.status === "ended") return;
    const send = () => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      fetch(`/api/meetings/${slug}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    };
    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slug, meeting.status]);

  async function performAction(action: "start" | "pause" | "resume" | "stop") {
    const hostToken = hostTokenRef.current;
    if (!hostToken) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/meetings/${slug}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt");
      setMeeting(data as PublicMeeting);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Noe gikk galt");
    } finally {
      setActionLoading(false);
    }
  }

  if (meeting.status === "ended") {
    return (
      <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-16">
        <SummaryView meeting={meeting} />
      </main>
    );
  }

  if (meeting.status === "lobby") {
    const prognosis = costForDuration(meeting.rate_per_hour, meeting.estimated_seconds);
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center gap-6">
        <div className="text-4xl">⏳</div>
        {meeting.label && (
          <p className="-mb-2 text-sm font-semibold uppercase tracking-wide text-amber">
            {meeting.label}
          </p>
        )}
        <h1 className="text-2xl font-bold">Møtet har ikke startet</h1>
        <p className="text-muted max-w-sm">
          Prognose:{" "}
          <span className="font-bold text-amber">{formatKr(prognosis)} kr</span>.
          Grue deg.
        </p>
        <p className="text-xs text-muted max-w-xs">
          Ingen ser hva møtet handler om. Bare hva det koster.
        </p>
        <p className="text-xs text-muted">
          👀 {meeting.viewer_count} kolleger ser på
        </p>
        {isHost ? (
          <button
            type="button"
            onClick={() => performAction("start")}
            disabled={actionLoading}
            className="rounded-full bg-ember px-8 py-4 text-lg font-bold text-[#1a0d05] shadow-[0_0_40px_-6px_var(--ember)] disabled:opacity-50"
          >
            START 🔥
          </button>
        ) : (
          <p className="text-sm text-muted">
            Venter på at verten trykker start…
          </p>
        )}
        <ShareButton
          participants={meeting.participants}
          ratePerHour={meeting.rate_per_hour}
          estimatedSeconds={meeting.estimated_seconds}
          estimatedCost={prognosis}
          existingSlug={slug}
          label={meeting.label}
          onShared={() => {}}
          className="w-full max-w-sm"
        />
        {actionError && <p className="text-xs text-danger">{actionError}</p>}
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-16">
      <LiveMeetingView
        meeting={meeting}
        isHost={isHost}
        viewerCount={meeting.viewer_count}
        actionLoading={actionLoading}
        onPause={() => performAction("pause")}
        onResume={() => performAction("resume")}
        onStop={() => performAction("stop")}
        shareSlot={
          <ShareButton
            participants={meeting.participants}
            ratePerHour={meeting.rate_per_hour}
            estimatedSeconds={meeting.estimated_seconds}
            estimatedCost={0}
            existingSlug={slug}
            label={meeting.label}
            onShared={() => {}}
            className="w-full max-w-sm"
          />
        }
      />
      {actionError && <p className="mt-2 text-xs text-danger">{actionError}</p>}
    </main>
  );
}
