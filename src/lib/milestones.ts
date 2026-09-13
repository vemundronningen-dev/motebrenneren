export interface Milestone {
  amount: number;
  emoji: string;
  text: string;
}

interface MilestoneDef {
  emoji: string;
  text: string;
  /**
   * Fast kr-beløp, uavhengig av antall deltakere - for enkeltvarer og
   * generiske eksempler ("familien", "en tredjeklassing") som ikke er ment
   * å representere akkurat dette møtets gruppe.
   */
  amount?: number;
  /**
   * Kr per hode, ganget med møtets faktiske deltakerantall - for goder som
   * eksplisitt skaleres med gruppestørrelsen ("til teamet", "til gjengen").
   * Uten dette ville f.eks. "pizza til teamet" vist en useriøst lav
   * terskel for et møte med 50 deltakere. Prisene er satt til realistiske
   * 2025-nivåer, ikke det de kostet for ti år siden.
   */
  perPerson?: number;
}

/**
 * Stigende milepæler for tidslinje-markører, "brent-trail", "neste
 * opp"-teaseren og toasts. Tett i det vanlige møte-sjiktet (100–20 000 kr)
 * med gjenkjennelige, catchy norske referanser, og gradvis grovere videre
 * oppover for de virkelig eksklusive møtene. Terskler beregnes dynamisk
 * per møte via `resolveMilestones()` - se `perPerson` over.
 */
const MILESTONE_DEFS: MilestoneDef[] = [
  { perPerson: 75, emoji: "☕", text: "Runde kaffe fra Kaffebrenneriet til gjengen" },
  { perPerson: 55, emoji: "🥐", text: "Bakervarer til hele avdelingen" },
  { perPerson: 220, emoji: "🍕", text: "Fredagspizza fra Peppes til teamet" },
  { amount: 600, emoji: "🍔", text: "Big Mac-meny til hele familien" },
  { amount: 869, emoji: "🚌", text: "Månedskort på kollektivtransport" },
  { amount: 1200, emoji: "🛒", text: "Ukas dagligvarehandel for fire" },
  { amount: 1400, emoji: "🔊", text: "Ny Bluetooth-høyttaler til stua" },
  { amount: 1700, emoji: "💇", text: "Klipp og styling til hele familien" },
  { amount: 1900, emoji: "🎤", text: "Konsertbillett med drikke inkludert" },
  { amount: 2200, emoji: "🧥", text: "Ny vinterjakke, midt på treet" },
  { amount: 2500, emoji: "📺", text: "Alle strømmetjenestene i et helt år" },
  { amount: 2800, emoji: "🚗", text: "Årsavgiften på bilen" },
  { amount: 3000, emoji: "🎧", text: "Skikkelige støydempende hodetelefoner" },
  { amount: 3300, emoji: "✈️", text: "Tur-retur-billett til Syden" },
  { amount: 3600, emoji: "🎮", text: "Splitter ny spillkonsoll" },
  { amount: 4000, emoji: "🍷", text: "En kasse ordentlig god vin" },
  { amount: 4500, emoji: "👶", text: "Halvannen måned med barnehageplass" },
  { amount: 5000, emoji: "⌚", text: "Ny smartklokke, øverste hylle" },
  { amount: 5500, emoji: "📱", text: "En ny iPhone har forlatt chatten" },
  { amount: 6000, emoji: "🍽️", text: "Bordet for ti på den fine restauranten" },
  { amount: 6500, emoji: "⚡", text: "Strømregningen for en vintermåned" },
  { amount: 7000, emoji: "⛷️", text: "Utstyrspakke for en skisesong" },
  { amount: 7500, emoji: "🕹️", text: "Toppmodell-konsoll med tre spill på kjøpet" },
  { amount: 8500, emoji: "🛋️", text: "Ny sofa til pauserommet" },
  { perPerson: 7500, emoji: "🏋️", text: "Årskort på treningssenter til hele teamet" },
  { amount: 9500, emoji: "🚁", text: "Drone med 4K-kamera" },
  { amount: 10000, emoji: "🇬🇧", text: "Helgetur til London for to" },
  { amount: 10500, emoji: "🔥", text: "Ny peis til hytta" },
  { amount: 11000, emoji: "📧", text: "Dette møtet kunne vært en e-post" },
  { amount: 12500, emoji: "📺", text: "65 tommers OLED rett i stua" },
  { amount: 14000, emoji: "📸", text: "Billigste pakke hos bryllupsfotografen" },
  { amount: 15500, emoji: "🥂", text: "Bryllupsmiddag for de aller nærmeste" },
  { amount: 17000, emoji: "🚲", text: "En skikkelig god el-sykkel" },
  { amount: 19000, emoji: "💻", text: "Ny toppmodell-laptop" },
  { amount: 20000, emoji: "🚪", text: "Nye skapdører på kjøkkenet (ikke hele kjøkkenet)" },
  { amount: 23000, emoji: "🏔️", text: "Ukes hyttetur for hele familien" },
  { amount: 26000, emoji: "🌴", text: "To ukers bryllupsreise til Bali" },
  { amount: 29000, emoji: "🏠", text: "En måneds husleie i Oslo" },
  { amount: 33000, emoji: "🏍️", text: "Førerkort og utstyr til motorsykkel" },
  { amount: 36000, emoji: "🚌", text: "Russebuss-andelen til en tredjeklassing" },
  { amount: 42000, emoji: "🍳", text: "Ny benkeplate og hvitevarer på kjøkkenet" },
  { amount: 48000, emoji: "🎓", text: "Et semester studieavgift i utlandet" },
  { amount: 55000, emoji: "☀️", text: "Solcellepanel på taket" },
  { amount: 65000, emoji: "🚗", text: "En brukbar bruktbil" },
  { amount: 80000, emoji: "🍳", text: "Nytt kjøkken, for ordentlig denne gangen" },
  { amount: 95000, emoji: "💍", text: "En solid forlovelsesring" },
  { amount: 110000, emoji: "🐴", text: "Et helt års hesteeierskap" },
  { amount: 130000, emoji: "👔", text: "Nå kunne dere ansatt noen i en måned" },
  { amount: 160000, emoji: "⚓", text: "Båtplass og en liten fritidsbåt" },
  { amount: 200000, emoji: "🚤", text: "En brukt fritidsbåt" },
  { amount: 260000, emoji: "🎓", text: "Et helt års studielån" },
  { amount: 320000, emoji: "🏦", text: "Egenkapital til en liten leilighet" },
  { amount: 420000, emoji: "🔋", text: "Brukt elbil, kontant" },
  { amount: 550000, emoji: "🔋", text: "Ny elbil, kontant" },
  { amount: 800000, emoji: "🏔️", text: "Tomt til hytte i fjellet" },
  { amount: 1100000, emoji: "🏡", text: "Dere kunne kjøpt en hytte på Sørlandet" },
  { amount: 1600000, emoji: "🏠", text: "Full oppussing av en enebolig" },
  { amount: 2200000, emoji: "🏦", text: "Kontantinnskudd på en enebolig" },
];

export const OVERTIME_TOASTS: string[] = [
  "Møtet er nå offisielt over tiden. Klassisk. ⏰",
  "Overtiden alene har kostet en middag 🍽️",
  "Noen burde nevne at møtet skulle vært ferdig nå 👀",
  "Overtid: den eneste tiden ingen har estimert riktig 📈",
];

/**
 * Regner ut de faktiske kr-tersklene for et gitt møte: goder merket
 * `perPerson` skaleres med deltakerantallet, resten står fast. Sortert
 * stigende - nødvendig fordi rekkefølgen kan endre seg avhengig av
 * gruppestørrelsen (f.eks. hopper treningskort-milepælen langt frem i
 * store møter).
 */
export function resolveMilestones(participantCount: number): Milestone[] {
  const count = Math.max(1, Math.round(participantCount) || 1);
  const resolved = MILESTONE_DEFS.map((m) => ({
    amount: m.perPerson != null ? Math.round(m.perPerson * count) : (m.amount ?? 0),
    emoji: m.emoji,
    text: m.text,
  }));
  resolved.sort((a, b) => a.amount - b.amount);

  // To milepæler kan i sjeldne tilfeller havne på nøyaktig samme beløp
  // etter skalering - behold kun den første, ellers ser det ut som en feil.
  const seen = new Set<number>();
  return resolved.filter((m) => {
    if (seen.has(m.amount)) return false;
    seen.add(m.amount);
    return true;
  });
}

export function milestonesUpTo(amount: number, participantCount: number): Milestone[] {
  return resolveMilestones(participantCount).filter((m) => m.amount <= amount);
}

/** Milepæler som er relevante å vise som markører på lunta (innenfor rimelig overtidssone også). */
export function milestonesForTimeline(
  estimatedTotalCost: number,
  participantCount: number,
): Milestone[] {
  const ceiling = Math.max(estimatedTotalCost * 1.5, 500);
  return resolveMilestones(participantCount).filter((m) => m.amount <= ceiling);
}

/** Den nærmeste milepælen som ennå ikke er nådd - grunnlaget for "neste opp"-teaseren. */
export function nextUpcomingMilestone(amount: number, participantCount: number): Milestone | null {
  return resolveMilestones(participantCount).find((m) => m.amount > amount) ?? null;
}
