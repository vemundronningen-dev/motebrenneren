export interface Milestone {
  amount: number;
  emoji: string;
  text: string;
}

/** Stigende milepæler for lunte-markører og toasts. */
export const MILESTONES: Milestone[] = [
  { amount: 500, emoji: "🍽️", text: "Der røyk en middag for to" },
  { amount: 1000, emoji: "🍷", text: "En god flaske vin, eller ti dårlige" },
  { amount: 1500, emoji: "⛷️", text: "En helgetur til fjells" },
  { amount: 3000, emoji: "✈️", text: "En tur-retur-billett til Syden" },
  { amount: 5000, emoji: "📱", text: "En ny iPhone har forlatt chatten" },
  { amount: 7500, emoji: "🛋️", text: "Ny sofa til pauserommet" },
  { amount: 10000, emoji: "📧", text: "Dette møtet kunne vært en e-post" },
  { amount: 15000, emoji: "🚲", text: "En skikkelig god el-sykkel" },
  { amount: 25000, emoji: "🏠", text: "En måneds husleie i Oslo" },
  { amount: 40000, emoji: "🎓", text: "Et semester studieavgift i utlandet" },
  { amount: 50000, emoji: "🚗", text: "En brukbar bruktbil" },
  { amount: 75000, emoji: "💍", text: "En solid forlovelsesring" },
  {
    amount: 100000,
    emoji: "👔",
    text: "Nå kunne dere ansatt noen i en måned",
  },
  { amount: 150000, emoji: "🚤", text: "En brukt fritidsbåt" },
  { amount: 250000, emoji: "🏦", text: "Egenkapital til en liten leilighet" },
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
