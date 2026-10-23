"use client";

import { useState } from "react";
import Link from "next/link";
import { BOT_EMAIL } from "@/lib/botEmail";

/** "Inviter boten"-kortet: én adresse, én knapp. Laget for at alle skal få det til. */
export default function InviteBotCard({ showGuideLink = true }: { showGuideLink?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(BOT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Kopiering blokkert - adressen står uansett synlig og kan markeres.
    }
  }

  return (
    <section className="w-full rounded-2xl border-2 border-ember/40 bg-ember/[0.06] p-5 sm:p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber">Nytt: inviter boten</p>
      <h2 className="mt-1 text-xl sm:text-2xl font-bold text-foreground">
        Få Møtebrenneren med i Teams-møtet
      </h2>
      <p className="mt-2 text-sm sm:text-base text-muted">
        Legg til denne adressen i møteinvitasjonen – akkurat som en kollega. Den dukker opp i
        møtet med kostnaden live på kameraet.
      </p>
      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
        <span className="select-all break-all rounded-xl border border-line bg-background-raised px-4 py-3 text-lg sm:text-xl font-bold text-foreground">
          {BOT_EMAIL}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-xl bg-ember px-6 py-3 text-lg font-bold text-[#1a0d05] transition hover:bg-ember-hot active:scale-[0.98]"
        >
          {copied ? "Kopiert ✅" : "Kopier"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Virker med Teams, Zoom, Google Meet og Webex. Ingen app å installere. Ingen opptak.
        {showGuideLink && (
          <>
            {" "}
            <Link href="/teams" className="underline hover:text-foreground">
              Slik virker det
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
