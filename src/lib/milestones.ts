export interface Milestone {
  amount: number;
  emoji: string;
  text: string;
}

/**
 * Stigende milepæler for tidslinje-markører, "brent-trail", "neste
 * opp"-teaseren og toasts. Tett i det vanlige møte-sjiktet (100–20 000 kr)
 * med gjenkjennelige, catchy norske referanser, og gradvis grovere videre
 * oppover for de virkelig eksklusive møtene.
 */
export const MILESTONES: Milestone[] = [
  { amount: 100, emoji: "☕", text: "Runde kaffe fra Kaffebrenneriet til gjengen" },
  { amount: 250, emoji: "🥐", text: "Bakervarer til hele avdelingen" },
  { amount: 400, emoji: "🍕", text: "Fredagspizza fra Peppes til teamet" },
  { amount: 600, emoji: "🍔", text: "Big Mac-meny til hele familien" },
  { amount: 800, emoji: "🚌", text: "Månedskort på kollektivtransport" },
  { amount: 1000, emoji: "🛒", text: "Ukas dagligvarehandel for fire" },
  { amount: 1200, emoji: "🔊", text: "Ny Bluetooth-høyttaler til stua" },
  { amount: 1500, emoji: "💇", text: "Klipp og styling til hele familien" },
  { amount: 1800, emoji: "🎤", text: "Konsertbillett med drikke inkludert" },
  { amount: 2000, emoji: "🧥", text: "Ny vinterjakke, midt på treet" },
  { amount: 2300, emoji: "📺", text: "Alle strømmetjenestene i et helt år" },
  { amount: 2500, emoji: "🚗", text: "Årsavgiften på bilen" },
  { amount: 2800, emoji: "🎧", text: "Skikkelige støydempende hodetelefoner" },
  { amount: 3000, emoji: "✈️", text: "Tur-retur-billett til Syden" },
  { amount: 3300, emoji: "🎮", text: "Splitter ny spillkonsoll" },
  { amount: 3600, emoji: "🍷", text: "En kasse ordentlig god vin" },
  { amount: 4000, emoji: "👶", text: "Halvannen måned med barnehageplass" },
  { amount: 4500, emoji: "⌚", text: "Ny smartklokke, øverste hylle" },
  { amount: 5000, emoji: "📱", text: "En ny iPhone har forlatt chatten" },
  { amount: 5500, emoji: "🍽️", text: "Bordet for ti på den fine restauranten" },
  { amount: 6000, emoji: "⚡", text: "Strømregningen for en vintermåned" },
  { amount: 6500, emoji: "⛷️", text: "Utstyrspakke for en skisesong" },
  { amount: 7000, emoji: "🕹️", text: "Toppmodell-konsoll med tre spill på kjøpet" },
  { amount: 7500, emoji: "🛋️", text: "Ny sofa til pauserommet" },
  { amount: 8000, emoji: "🏋️", text: "Årskort på treningssenter til hele teamet" },
  { amount: 8500, emoji: "🚁", text: "Drone med 4K-kamera" },
  { amount: 9000, emoji: "🇬🇧", text: "Helgetur til London for to" },
  { amount: 9500, emoji: "🔥", text: "Ny peis til hytta" },
  { amount: 10000, emoji: "📧", text: "Dette møtet kunne vært en e-post" },
  { amount: 11000, emoji: "📺", text: "65 tommers OLED rett i stua" },
  { amount: 12000, emoji: "📸", text: "Billigste pakke hos bryllupsfotografen" },
  { amount: 13500, emoji: "🥂", text: "Bryllupsmiddag for de aller nærmeste" },
  { amount: 15000, emoji: "🚲", text: "En skikkelig god el-sykkel" },
  { amount: 17000, emoji: "💻", text: "Ny toppmodell-laptop" },
  { amount: 18000, emoji: "🚪", text: "Nye skapdører på kjøkkenet (ikke hele kjøkkenet)" },
  { amount: 20000, emoji: "🏔️", text: "Ukes hyttetur for hele familien" },
  { amount: 22000, emoji: "🌴", text: "To ukers bryllupsreise til Bali" },
  { amount: 25000, emoji: "🏠", text: "En måneds husleie i Oslo" },
  { amount: 28000, emoji: "🏍️", text: "Førerkort og utstyr til motorsykkel" },
  { amount: 30000, emoji: "🚌", text: "Russebuss-andelen til en tredjeklassing" },
  { amount: 35000, emoji: "🍳", text: "Ny benkeplate og hvitevarer på kjøkkenet" },
  { amount: 40000, emoji: "🎓", text: "Et semester studieavgift i utlandet" },
  { amount: 45000, emoji: "☀️", text: "Solcellepanel på taket" },
  { amount: 50000, emoji: "🚗", text: "En brukbar bruktbil" },
  { amount: 65000, emoji: "🍳", text: "Nytt kjøkken, for ordentlig denne gangen" },
  { amount: 75000, emoji: "💍", text: "En solid forlovelsesring" },
  { amount: 90000, emoji: "🐴", text: "Et helt års hesteeierskap" },
  { amount: 100000, emoji: "👔", text: "Nå kunne dere ansatt noen i en måned" },
  { amount: 120000, emoji: "⚓", text: "Båtplass og en liten fritidsbåt" },
  { amount: 150000, emoji: "🚤", text: "En brukt fritidsbåt" },
  { amount: 200000, emoji: "🎓", text: "Et helt års studielån" },
  { amount: 250000, emoji: "🏦", text: "Egenkapital til en liten leilighet" },
  { amount: 350000, emoji: "🔋", text: "Brukt elbil, kontant" },
  { amount: 500000, emoji: "🔋", text: "Ny elbil, kontant" },
  { amount: 750000, emoji: "🏔️", text: "Tomt til hytte i fjellet" },
  { amount: 1000000, emoji: "🏡", text: "Dere kunne kjøpt en hytte på Sørlandet" },
  { amount: 1500000, emoji: "🏠", text: "Full oppussing av en enebolig" },
  { amount: 2000000, emoji: "🏦", text: "Kontantinnskudd på en enebolig" },
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

/** Den nærmeste milepælen som ennå ikke er nådd - grunnlaget for "neste opp"-teaseren. */
export function nextUpcomingMilestone(amount: number): Milestone | null {
  return MILESTONES.find((m) => m.amount > amount) ?? null;
}
