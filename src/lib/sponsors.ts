export interface Sponsor {
  name: string;
  url: string;
  tagline: string;
}

/** Egenreklame - eierens andre nettbutikker. */
export const SPONSORS: Sponsor[] = [
  {
    name: "Proffdeler",
    url: "https://proffdeler.no",
    tagline: "Deler til proffen",
  },
  {
    name: "Redskapsfabrikken",
    url: "https://redskapsfabrikken.no",
    tagline: "Redskap som varer",
  },
];
