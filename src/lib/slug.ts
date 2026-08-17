const ADJECTIVES = [
  "gul",
  "rød",
  "blå",
  "grønn",
  "sur",
  "sen",
  "trøtt",
  "rask",
  "stille",
  "høy",
  "lav",
  "gammel",
  "ny",
  "sint",
  "glad",
  "kald",
  "varm",
  "tørr",
  "våt",
  "sliten",
  "skeptisk",
  "ivrig",
  "forsinket",
  "digital",
  "analog",
];

const NOUNS = [
  "elg",
  "laks",
  "ørn",
  "rev",
  "bjørn",
  "ulv",
  "hare",
  "måke",
  "torsk",
  "geit",
  "sau",
  "elgokse",
  "gaupe",
  "kaffekopp",
  "flipover",
  "projektor",
  "agenda",
  "kalender",
  "epost",
  "møterom",
];

/** "gul-elg-42" – kort og delbar. */
export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${noun}-${num}`;
}
