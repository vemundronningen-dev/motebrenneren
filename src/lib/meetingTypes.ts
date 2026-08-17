/** Hurtigvalg for møtetype/-navn - rent frivillig, brukes til å spore hva slags møter som brenner mest. */
export const MEETING_TYPE_PRESETS: string[] = [
  "Allmøte",
  "Statusmøte",
  "Salgsmøte",
  "Kundemøte",
  "1:1",
  "Retro",
  "Idémyldring",
  "Styremøte",
  "Onboarding",
  "Workshop",
];

export const MEETING_LABEL_MAX_LENGTH = 60;

export function sanitizeMeetingLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, MEETING_LABEL_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}
