"use client";

import { MEETING_LABEL_MAX_LENGTH, MEETING_TYPE_PRESETS } from "@/lib/meetingTypes";

export default function MeetingLabelPicker({
  label,
  onChange,
}: {
  label: string;
  onChange: (label: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MEETING_TYPE_PRESETS.map((preset) => {
          const active = label === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(active ? "" : preset)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-ember text-[#1a0d05]"
                  : "border border-line bg-background-raised text-foreground hover:border-ember/50"
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      <input
        value={label}
        onChange={(e) => onChange(e.target.value.slice(0, MEETING_LABEL_MAX_LENGTH))}
        placeholder="Eller skriv eget navn (valgfritt)"
        className="mt-3 w-full rounded-lg border border-line bg-background-raised px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ember"
      />
      <p className="mt-1 text-xs text-muted">
        Vises på lunta og i delingen - selve agendaen forblir fortsatt bare
        deres.
      </p>
    </div>
  );
}
