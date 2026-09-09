"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "motebrenneren:historikk:v1";
const MAX_ENTRIES = 200;

export interface HistoryEntry {
  id: string;
  label: string | null;
  amount: number;
  durationSeconds: number;
  estimatedSeconds: number;
  participants: number;
  wentOvertime: boolean;
  endedAt: string;
  slug: string | null;
  caseValue: number | null;
}

function readEntries(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // localStorage kan feile (privat modus, full kvote) – ignorer stille.
  }
}

export function useMeetingHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(readEntries());
    setHydrated(true);
  }, []);

  const addEntry = useCallback((entry: Omit<HistoryEntry, "id">) => {
    setEntries((prev) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const next = [{ ...entry, id }, ...prev].slice(0, MAX_ENTRIES);
      writeEntries(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeEntries(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    writeEntries([]);
  }, []);

  return { entries, hydrated, addEntry, removeEntry, clearAll };
}
