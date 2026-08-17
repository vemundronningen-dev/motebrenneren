"use client";

import { useState } from "react";
import { useHoldRepeat } from "@/lib/useHoldRepeat";
import { formatKr } from "@/lib/format";
import { HIGH_RATE_WARNING, MAX_RATE, MIN_RATE } from "@/lib/roles";

export default function RoleRow({
  name,
  rate,
  count,
  isEdited,
  isCustom,
  onIncrement,
  onDecrement,
  onSetCount,
  onRateChange,
  onResetRate,
  onRenameCustom,
  onRemoveCustom,
}: {
  name: string;
  rate: number;
  count: number;
  isEdited: boolean;
  isCustom?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onSetCount: (n: number) => void;
  onRateChange: (rate: number) => void;
  onResetRate?: () => void;
  onRenameCustom?: (name: string) => void;
  onRemoveCustom?: () => void;
}) {
  const [editingRate, setEditingRate] = useState(false);
  const [editingCount, setEditingCount] = useState(false);
  const [rateDraft, setRateDraft] = useState(String(rate));
  const [countDraft, setCountDraft] = useState(String(count));
  const [nameDraft, setNameDraft] = useState(name);
  const [editingName, setEditingName] = useState(false);

  const incHold = useHoldRepeat(onIncrement);
  const decHold = useHoldRepeat(onDecrement);

  function commitRate() {
    const n = Math.round(Number(rateDraft.replace(",", ".")));
    if (Number.isFinite(n)) {
      onRateChange(Math.min(MAX_RATE, Math.max(MIN_RATE, n)));
    }
    setEditingRate(false);
  }

  function commitCount() {
    const n = Math.round(Number(countDraft));
    if (Number.isFinite(n)) {
      onSetCount(Math.min(500, Math.max(0, n)));
    }
    setEditingCount(false);
  }

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed) onRenameCustom?.(trimmed);
    else setNameDraft(name);
    setEditingName(false);
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        count > 0
          ? "border-ember/40 bg-ember/[0.06]"
          : "border-line bg-background-raised"
      }`}
    >
      <div className="min-w-0 flex-1">
        {isCustom && editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && commitName()}
            className="w-full rounded bg-ash px-1.5 py-0.5 text-sm font-medium text-foreground outline-none ring-1 ring-ember"
          />
        ) : (
          <button
            type="button"
            onClick={() => isCustom && setEditingName(true)}
            className="truncate text-left text-sm font-medium text-foreground"
          >
            {name}
          </button>
        )}

        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          {editingRate ? (
            <input
              autoFocus
              inputMode="numeric"
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              onBlur={commitRate}
              onKeyDown={(e) => e.key === "Enter" && commitRate()}
              className="w-20 rounded bg-ash px-1.5 py-0.5 tabular text-foreground outline-none ring-1 ring-ember"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setRateDraft(String(rate));
                setEditingRate(true);
              }}
              className="tabular underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              {formatKr(rate)} kr/t
            </button>
          )}
          {rate > HIGH_RATE_WARNING && <span title="Høy timepris">💸</span>}
          {isEdited && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-ember"
              title="Endret fra standard"
            />
          )}
          {isEdited && onResetRate && (
            <button
              type="button"
              onClick={onResetRate}
              className="text-[11px] text-muted underline hover:text-foreground"
            >
              tilbakestill
            </button>
          )}
          {isCustom && onRemoveCustom && (
            <button
              type="button"
              onClick={onRemoveCustom}
              className="text-[11px] text-muted underline hover:text-danger"
            >
              fjern
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          {...decHold}
          disabled={count === 0}
          aria-label={`Færre ${name}`}
          className="h-8 w-8 rounded-full border border-line text-lg leading-none text-foreground disabled:opacity-30 active:bg-ash select-none"
        >
          –
        </button>

        {editingCount ? (
          <input
            autoFocus
            inputMode="numeric"
            value={countDraft}
            onChange={(e) => setCountDraft(e.target.value)}
            onBlur={commitCount}
            onKeyDown={(e) => e.key === "Enter" && commitCount()}
            className="tabular w-10 rounded bg-ash text-center text-sm text-foreground outline-none ring-1 ring-ember"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setCountDraft(String(count));
              setEditingCount(true);
            }}
            className="tabular w-8 text-center text-sm font-semibold text-foreground"
          >
            {count}
          </button>
        )}

        <button
          type="button"
          {...incHold}
          aria-label={`Flere ${name}`}
          className="h-8 w-8 rounded-full border border-ember/50 bg-ember/10 text-lg leading-none text-ember active:bg-ember/20 select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
