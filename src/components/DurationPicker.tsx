"use client";

import { useState } from "react";
import { DURATION_PRESETS_MIN } from "@/lib/roles";

export default function DurationPicker({
  minutes,
  onChange,
}: {
  minutes: number | null;
  onChange: (minutes: number) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");

  const isCustomSelected = minutes != null && !DURATION_PRESETS_MIN.includes(minutes);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS_MIN.map((m) => {
          const label = m < 60 ? `${m} min` : m === 60 ? "1 time" : `${m / 60} timer`;
          const active = minutes === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setCustomOpen(false);
                onChange(m);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-ember text-[#1a0d05]"
                  : "border border-line bg-background-raised text-foreground hover:border-ember/50"
              }`}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustomDraft(isCustomSelected ? String(minutes) : "");
            setCustomOpen((v) => !v);
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            isCustomSelected
              ? "bg-ember text-[#1a0d05]"
              : "border border-line bg-background-raised text-foreground hover:border-ember/50"
          }`}
        >
          {isCustomSelected ? `${minutes} min (egendefinert)` : "Egendefinert"}
        </button>
      </div>

      {customOpen && (
        <div className="mt-3 flex items-center gap-2">
          <input
            autoFocus
            inputMode="numeric"
            placeholder="Antall minutter"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            className="w-40 rounded-lg border border-line bg-background-raised px-3 py-2 text-sm text-foreground outline-none ring-ember focus:ring-1"
          />
          <button
            type="button"
            onClick={() => {
              const n = Math.round(Number(customDraft));
              if (Number.isFinite(n) && n > 0) {
                onChange(Math.min(n, 24 * 60));
                setCustomOpen(false);
              }
            }}
            className="rounded-lg bg-ember px-3 py-2 text-sm font-semibold text-[#1a0d05]"
          >
            Bruk
          </button>
        </div>
      )}
    </div>
  );
}
