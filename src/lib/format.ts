/** Norsk tallformat: mellomrom som tusenskille, ingen desimaler for kroner. */
export function formatKr(amount: number): string {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(
    rounded,
  );
}

export function formatKrOre(amount: number): string {
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("nb-NO").format(Math.round(n));
}

export function formatPercent(n: number): string {
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(
    n,
  );
}

/** "1 t 12 min 03 s" / "12 min 03 s" / "42 s" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} t`);
  if (h > 0 || m > 0) parts.push(`${m} min`);
  parts.push(`${String(sec).padStart(2, "0")} s`);
  return parts.join(" ");
}

/** "12:03" / "1:12:03" – for tabular-nums-teller */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatMinutes(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  return `${m} min`;
}
