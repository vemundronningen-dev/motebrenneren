"use client";

import { useEffect, useState } from "react";
import type { PublicMeeting } from "./types";

// Ingen pub/sub i Neon - statusendringer (start/pause/stopp) hentes med
// polling. Selve kr-telleren regnes lokalt fra server-tidsstemplene, så
// bare statusbytter er avhengig av dette intervallet.
const POLL_INTERVAL_MS = 3_000;

export function useLiveMeeting(slug: string, initialMeeting: PublicMeeting) {
  const [meeting, setMeeting] = useState(initialMeeting);

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

  return [meeting, setMeeting] as const;
}
