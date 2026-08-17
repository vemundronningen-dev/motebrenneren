"use client";

const KEY = "motebrenneren:hostTokens:v1";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignorer
  }
}

export function saveHostToken(slug: string, hostToken: string) {
  const map = readMap();
  map[slug] = hostToken;
  writeMap(map);
}

export function getHostToken(slug: string): string | null {
  const map = readMap();
  return map[slug] ?? null;
}
