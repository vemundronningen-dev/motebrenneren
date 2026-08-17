"use client";

import { useEffect, useState } from "react";
import { saveHostToken } from "@/lib/hostToken";

interface Props {
  participants: number;
  ratePerHour: number;
  estimatedSeconds: number;
  alreadyStartedAt?: string | null;
  estimatedCost: number;
  existingSlug?: string | null;
  label?: string | null;
  onShared: (slug: string) => void;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export default function ShareButton({
  participants,
  ratePerHour,
  estimatedSeconds,
  alreadyStartedAt,
  estimatedCost,
  existingSlug,
  label,
  onShared,
  className,
  disabled,
  disabledReason,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState<string | null>(existingSlug ?? null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Satt i en effekt (ikke lest direkte fra window under render) for å
  // unngå hydrerings-mismatch mellom server- og klient-render.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleClick() {
    if (slug || disabled) return; // allerede delt, eller ikke klar ennå
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participants,
          ratePerHour,
          estimatedSeconds,
          alreadyStartedAt: alreadyStartedAt ?? null,
          label: label ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke opprette møte");
      saveHostToken(data.slug, data.hostToken);
      setSlug(data.slug);
      onShared(data.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
    } finally {
      setLoading(false);
    }
  }

  // Bruker faktisk opprinnelse (window.location.origin) i stedet for en
  // hardkodet motebrenneren.no - ellers peker delte lenker feil sted når
  // appen kjører på en Vercel preview-URL eller før det egendefinerte
  // domenet er koblet til.
  const url = slug && origin ? `${origin}/m/${slug}` : "";
  const linkDisplay = slug ? `${origin.replace(/^https?:\/\//, "")}/m/${slug}` : "";
  const labelPrefix = label ? `${label}: ` : "";
  const teamsText = slug
    ? `⚠️ ${labelPrefix}Dette møtet brenner penger LIVE: ${url} – følg med på hva det koster oss.`
    : "";

  async function copyLink() {
    if (!teamsText) return;
    try {
      await navigator.clipboard.writeText(teamsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kunne ikke kopiere. Kopier lenken manuelt.");
    }
  }

  async function webShare() {
    if (!slug || !url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Møtebrenneren",
          text: teamsText,
          url,
        });
      } catch {
        // brukeren avbrøt - ingen feil å vise
      }
    } else {
      copyLink();
    }
  }

  if (slug) {
    return (
      <div
        className={`rounded-xl border border-ember/30 bg-ember/[0.06] p-4 ${className ?? ""}`}
      >
        <p className="text-sm text-muted mb-2">Møtet er delbart:</p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="tabular flex-1 min-w-0 truncate rounded bg-ash px-2 py-1.5 text-sm text-foreground">
            {linkDisplay || "Laster lenke…"}
          </code>
          <button
            type="button"
            onClick={copyLink}
            disabled={!url}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-ember/50 disabled:opacity-50"
          >
            {copied ? "Kopiert! ✅" : "Kopier lenke"}
          </button>
          <button
            type="button"
            onClick={webShare}
            disabled={!url}
            className="rounded-lg bg-ember px-3 py-1.5 text-sm font-medium text-[#1a0d05] disabled:opacity-50"
          >
            Del
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className="w-full rounded-xl border border-line bg-background-raised px-4 py-3 text-sm font-semibold text-foreground transition hover:border-ember/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Oppretter møterom…" : "🔗 Del møtet med kollegaer"}
      </button>
      {disabled && disabledReason && (
        <p className="mt-1.5 text-center text-xs text-muted">{disabledReason}</p>
      )}
      {!disabled && estimatedCost > 0 && (
        <p className="mt-1.5 text-center text-xs text-muted">
          Kollegaer ser samme brennende teller, live.
        </p>
      )}
      {error && <p className="mt-1.5 text-center text-xs text-danger">{error}</p>}
    </div>
  );
}
