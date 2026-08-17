"use client";

import { useEffect, useRef, useState } from "react";
import LiveMeetingView from "@/components/LiveMeetingView";
import SummaryView from "@/components/SummaryView";
import ShareButton from "@/components/ShareButton";
import type { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { meetingChannelName, MEETING_UPDATED_EVENT } from "@/lib/realtime";
import { getHostToken } from "@/lib/hostToken";
import { costForDuration } from "@/lib/calc";
import { formatKr } from "@/lib/format";
import type { PublicMeeting } from "@/lib/types";

const POLL_INTERVAL_MS = 20_000;

function presenceKey(): string {
  return Math.random().toString(36).slice(2);
}

export default function MeetingRoom({
  slug,
  initialMeeting,
}: {
  slug: string;
  initialMeeting: PublicMeeting;
}) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const hostTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = getHostToken(slug);
    hostTokenRef.current = token;
    setIsHost(token != null);
  }, [slug]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(meetingChannelName(slug), {
      config: { presence: { key: presenceKey() } },
    });

    channel
      .on("broadcast", { event: MEETING_UPDATED_EVENT }, (msg: { payload: PublicMeeting }) => {
        setMeeting(msg.payload);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status: REALTIME_SUBSCRIBE_STATES) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online: true });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  // Fallback: poll av og til i tilfelle en broadcast skulle forsvinne.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/meetings/${slug}`, { cache: "no-store" });
        if (res.ok) setMeeting(await res.json());
      } catch {
        // stille - prøver igjen neste runde
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slug]);

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
        <h1 className="text-2xl font-bold">Møtet har ikke startet</h1>
        <p className="text-muted max-w-sm">
          Prognose:{" "}
          <span className="font-bold text-ember">{formatKr(prognosis)} kr</span>.
          Grue deg.
        </p>
        <p className="text-xs text-muted max-w-xs">
          Ingen ser hva møtet handler om. Bare hva det koster.
        </p>
        {viewerCount != null && (
          <p className="text-xs text-muted">👀 {viewerCount} kolleger ser på</p>
        )}
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
        viewerCount={viewerCount}
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
            onShared={() => {}}
            className="w-full max-w-sm"
          />
        }
      />
      {actionError && <p className="mt-2 text-xs text-danger">{actionError}</p>}
    </main>
  );
}
