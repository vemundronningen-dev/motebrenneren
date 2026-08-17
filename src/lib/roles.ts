import type { RoleDef } from "./types";

/**
 * Norske snittrater i kr/time – total kostnad inkl. sosiale kostnader og
 * overhead (arbeidsgiveravgift, pensjon, kontorplass, verktøy o.l.), ikke
 * bare bruttolønn. Grove anslag – se info-ikonet i UI og footer-disclaimer.
 */
export const DEFAULT_ROLES: RoleDef[] = [
  { id: "senior-konsulent", name: "Konsulent (senior)", defaultRate: 1900 },
  { id: "junior-konsulent", name: "Konsulent (junior)", defaultRate: 1200 },
  { id: "utvikler", name: "Ingeniør/utvikler", defaultRate: 950 },
  { id: "leder", name: "Leder/mellomleder", defaultRate: 1100 },
  { id: "direktor", name: "Direktør/C-nivå", defaultRate: 2200 },
  { id: "prosjektleder", name: "Prosjektleder", defaultRate: 1000 },
  { id: "radgiver-offentlig", name: "Rådgiver (offentlig)", defaultRate: 800 },
  { id: "selger", name: "Selger", defaultRate: 850 },
  { id: "designer", name: "Designer", defaultRate: 900 },
  { id: "hr-admin", name: "HR/administrasjon", defaultRate: 700 },
  { id: "advokat", name: "Advokat", defaultRate: 2800 },
  {
    id: "unodvendig",
    name: "Person som ikke trengte å være her",
    defaultRate: 750,
    isEasterEgg: true,
  },
];

export const ROLE_BY_ID: Record<string, RoleDef> = Object.fromEntries(
  DEFAULT_ROLES.map((r) => [r.id, r]),
);

export const MIN_RATE = 1;
export const MAX_RATE = 10000;
export const HIGH_RATE_WARNING = 3000;

/** Maks kr/time per deltaker som godtas mot den nasjonale telleren. */
export const NATIONAL_MAX_RATE_PER_HOUR = 3000;

export interface QuickAddPreset {
  label: string;
  counts: Record<string, number>;
}

export const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  { label: "+5 utviklere", counts: { utvikler: 5 } },
  { label: "+3 konsulenter", counts: { "senior-konsulent": 3 } },
  {
    label: "Klassisk statusmøte",
    counts: {
      leder: 1,
      prosjektleder: 1,
      utvikler: 4,
      unodvendig: 1,
    },
  },
];

export const DURATION_PRESETS_MIN = [15, 30, 45, 60, 90, 120];
