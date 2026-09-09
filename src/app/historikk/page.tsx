"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMeetingHistory, type HistoryEntry } from "@/lib/useMeetingHistory";
import { formatDuration, formatKr, formatNumber } from "@/lib/format";

const UNLABELED = "Uten møtetype";

interface Group {
  label: string;
  amount: number;
  count: number;
}

function groupByLabel(entries: HistoryEntry[]): Group[] {
  const map = new Map<string, Group>();
  for (const e of entries) {
    const key = e.label ?? UNLABELED;
    const existing = map.get(key);
    if (existing) {
      existing.amount += e.amount;
      existing.count += 1;
    } else {
      map.set(key, { label: key, amount: e.amount, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export default function HistorikkPage() {
  const { entries, hydrated, removeEntry, clearAll } = useMeetingHistory();

  const totalAmount = useMemo(
    () => entries.reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );
  const groups = useMemo(() => groupByLabel(entries), [entries]);

  return (
    <main className="flex-1 px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Møtehistorikk</h1>
          <p className="mt-1 text-sm text-muted">
            Lagres kun i denne nettleseren - ingen andre kan se dette, og det
            sendes ikke til noen server utover selve beløpet (helt anonymt,
            se Personvern).
          </p>
        </div>

        {!hydrated ? null : entries.length === 0 ? (
          <div className="rounded-2xl border border-line bg-background-raised p-6 text-center text-sm text-muted">
            Ingen møter lagret ennå. Møter du fullfører fra denne enheten
            dukker opp her.
            <div className="mt-4">
              <Link
                href="/start"
                className="inline-block rounded-full bg-ember px-5 py-2.5 text-sm font-bold text-[#1a0d05]"
              >
                Start ditt første møte
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-ember/30 bg-ember/[0.06] p-5 text-center">
              <div className="text-xs text-muted">Totalt brent, alle møter</div>
              <div className="tabular mt-1 text-3xl font-black counter-glow">
                {formatKr(totalAmount)} kr
              </div>
              <div className="mt-1 text-xs text-muted">
                {formatNumber(entries.length)} møter registrert
              </div>
            </div>

            {groups.length > 1 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-muted">
                  Fordelt på møtetype
                </h2>
                <div className="flex flex-col gap-2">
                  {groups.map((g) => (
                    <div
                      key={g.label}
                      className="flex items-center justify-between rounded-xl border border-line bg-background-raised px-4 py-2.5"
                    >
                      <span className="text-sm text-foreground">
                        {g.label}{" "}
                        <span className="text-muted">
                          ({formatNumber(g.count)} møter)
                        </span>
                      </span>
                      <span className="tabular text-sm font-bold text-amber">
                        {formatKr(g.amount)} kr
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted">Alle møter</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Slette hele møtehistorikken på denne enheten?")) {
                      clearAll();
                    }
                  }}
                  className="text-xs text-muted underline hover:text-danger"
                >
                  Tøm historikk
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-background-raised px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {e.label ?? UNLABELED}
                        </span>
                        {e.wentOvertime && (
                          <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                            Overtid
                          </span>
                        )}
                        {e.caseValue != null && e.caseValue > 0 && e.amount >= e.caseValue && (
                          <span
                            className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger"
                            title={`Saken var verdt ${formatKr(e.caseValue)} kr`}
                          >
                            🚩 Dyrere enn saken
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {new Date(e.endedAt).toLocaleDateString("nb-NO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {formatDuration(e.durationSeconds)} · {e.participants}{" "}
                        deltakere
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-sm font-bold text-foreground">
                        {formatKr(e.amount)} kr
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        aria-label="Slett fra historikk"
                        className="text-muted hover:text-danger"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Link href="/start" className="text-sm text-muted underline hover:text-foreground">
          ← Tilbake til møtebrenneren
        </Link>
      </div>
    </main>
  );
}
