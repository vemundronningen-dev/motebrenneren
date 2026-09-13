// Rent ASCII (ingen æøå) med hensikt: en slug havner rått i URL-stien
// (/m/<slug>), og en ikke-ASCII bokstav der har vist seg å kunne 404 i
// praksis avhengig av hvordan lenken navigeres til (adressefelt,
// nettleserhistorikk, deling via Teams/Slack) - trolig et encoding-avvik
// et sted i den kjeden. ASCII er alltid trygt, så vi transkriberer heller
// æ/ø/å bort her enn å risikere at delte lenker feiler tilfeldig.
const ADJECTIVES = [
  "gul",
  "rod",
  "bla",
  "gronn",
  "sur",
  "sen",
  "trott",
  "rask",
  "stille",
  "hoy",
  "lav",
  "gammel",
  "ny",
  "sint",
  "glad",
  "kald",
  "varm",
  "torr",
  "vat",
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
  "orn",
  "rev",
  "bjorn",
  "ulv",
  "hare",
  "make",
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
  "moterom",
];

/** "gul-elg-42" – kort og delbar. */
export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${noun}-${num}`;
}
