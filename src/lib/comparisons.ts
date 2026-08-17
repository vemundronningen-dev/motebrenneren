interface Comparison {
  max: number;
  text: string;
}

const COMPARISONS: Comparison[] = [
  { max: 300, text: "en dyr kaffekopp med kake til" },
  { max: 800, text: "en pizza-bestilling til hele avdelingen" },
  { max: 2000, text: "en middag for to på en ordentlig restaurant" },
  { max: 4000, text: "et helt gavekort til systembolaget for et lite kontor" },
  { max: 8000, text: "en ny iPhone" },
  { max: 15000, text: "en skikkelig god stereoanlegg-oppgradering" },
  { max: 30000, text: "en måneds husleie for en toroms i Oslo" },
  { max: 60000, text: "en brukbar bruktbil" },
  { max: 100000, text: "en full månedslønn for en nyansatt" },
  { max: 200000, text: "et bad-renovering på hytta" },
  { max: 500000, text: "egenkapitalen til en leilighet" },
  { max: Infinity, text: "en ansatt i et helt år" },
];

export function costComparison(amount: number): string {
  const match = COMPARISONS.find((c) => amount <= c.max);
  return match?.text ?? COMPARISONS[COMPARISONS.length - 1].text;
}
