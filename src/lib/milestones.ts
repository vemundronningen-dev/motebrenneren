export interface Milestone {
  amount: number;
  emoji: string;
  text: string;
}

/**
 * Stigende milepæler for tidslinje-markører, "brent-trail" og toasts.
 * Tett i det vanlige møte-sjiktet (500–20 000 kr, om lag hver 500.–1500.
 * krone) med gjenkjennelige norske referanser, og gradvis grovere videre
 * oppover for de virkelig eksklusive møtene.
 */
export const MILESTONES: Milestone[] = [
  { amount: 300, emoji: "☕", text: "Kaffe og lunsj til hele teamet" },
  { amount: 600, emoji: "🍔", text: "Big Mac-meny til hele familien på McDonald's" },
  { amount: 1000, emoji: "🛒", text: "Ukas dagligvarehandel for en familie på fire" },
  { amount: 1500, emoji: "💇", text: "Klipp og styling til hele familien" },
  { amount: 2000, emoji: "🧥", text: "Ny vinterjakke, midt på treet" },
  { amount: 2500, emoji: "🚗", text: "Årsavgiften på bilen" },
  { amount: 3000, emoji: "✈️", text: "Tur-retur-billett til Syden" },
  { amount: 3500, emoji: "🍕", text: "Peppes til hele gjengen, med drikke" },
  { amount: 4000, emoji: "👶", text: "Halvannen måned med barnehageplass" },
  { amount: 4500, emoji: "🎮", text: "Nytt gaming-headset og en ekstra kontroller" },
  { amount: 5000, emoji: "📱", text: "En ny iPhone har forlatt chatten" },
  { amount: 6000, emoji: "⚡", text: "Strømregningen for en vintermåned" },
  { amount: 7000, emoji: "🎮", text: "Nintendo Switch OLED med tre spill" },
  { amount: 7500, emoji: "🛋️", text: "Ny sofa til pauserommet" },
  { amount: 8000, emoji: "🏋️", text: "Årskort på treningssenter, til hele teamet" },
  { amount: 9000, emoji: "🇬🇧", text: "Helgetur til London for to" },
  { amount: 10000, emoji: "📧", text: "Dette møtet kunne vært en e-post" },
  { amount: 12000, emoji: "📸", text: "Billigste pakke hos bryllupsfotografen" },
  { amount: 15000, emoji: "🚲", text: "En skikkelig god el-sykkel" },
  { amount: 18000, emoji: "🚪", text: "Nye skapdører på kjøkkenet (ikke hele kjøkkenet)" },
  { amount: 20000, emoji: "🏔️", text: "Ukes hyttetur for hele familien" },
  { amount: 25000, emoji: "🏠", text: "En måneds husleie i Oslo" },
  { amount: 30000, emoji: "🚌", text: "Russebuss-andelen til en tredjeklassing" },
  { amount: 40000, emoji: "🎓", text: "Et semester studieavgift i utlandet" },
  { amount: 50000, emoji: "🚗", text: "En brukbar bruktbil" },
  { amount: 65000, emoji: "🍳", text: "Nytt kjøkken, for ordentlig denne gangen" },
  { amount: 75000, emoji: "💍", text: "En solid forlovelsesring" },
  { amount: 100000, emoji: "👔", text: "Nå kunne dere ansatt noen i en måned" },
  { amount: 150000, emoji: "🚤", text: "En brukt fritidsbåt" },
  { amount: 200000, emoji: "🎓", text: "Et helt års studielån" },
  { amount: 250000, emoji: "🏦", text: "Egenkapital til en liten leilighet" },
  { amount: 500000, emoji: "🔋", text: "Ny elbil, kontant" },
  { amount: 1000000, emoji: "🏡", text: "Dere kunne kjøpt en hytte på Sørlandet" },
];

export const OVERTIME_TOASTS: string[] = [
  "Møtet er nå offisielt over tiden. Klassisk. ⏰",
  "Overtiden alene har kostet en middag 🍽️",
  "Noen burde nevne at møtet skulle vært ferdig nå 👀",
  "Overtid: den eneste tiden ingen har estimert riktig 📈",
];

export function milestonesUpTo(amount: number): Milestone[] {
  return MILESTONES.filter((m) => m.amount <= amount);
}

/** Milepæler som er relevante å vise som markører på lunta (innenfor rimelig overtidssone også). */
export function milestonesForTimeline(estimatedTotalCost: number): Milestone[] {
  const ceiling = Math.max(estimatedTotalCost * 1.5, 500);
  return MILESTONES.filter((m) => m.amount <= ceiling);
}
