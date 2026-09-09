export interface CaseValueVerdict {
  badge: "shame" | "warning" | "fine";
  title: string;
  text: string;
}

/** Prosentandel av sakens verdi møtet har kostet så langt (kan gå over 100). */
export function caseValuePercent(amount: number, caseValue: number): number {
  if (caseValue <= 0) return 0;
  return (amount / caseValue) * 100;
}

/**
 * Dom basert på hvor møtekostnaden står i forhold til verdien av saken
 * som faktisk skal avgjøres - klassikeren er ti konsulenter som bruker
 * timevis på å avgjøre hulltaking av ti hull i et bygg til 5 000 kr.
 */
export function judgeCaseValue(amount: number, caseValue: number): CaseValueVerdict {
  const ratio = caseValue > 0 ? amount / caseValue : Infinity;

  if (ratio >= 1) {
    return {
      badge: "shame",
      title: "🚩 Møtet kostet mer enn saken er verdt",
      text: "Dere brukte mer på å diskutere det enn selve saken koster. Kunne vært en mynt som kastes.",
    };
  }
  if (ratio >= 0.5) {
    return {
      badge: "warning",
      title: "Nesten like dyrt som saken selv",
      text: "Møtet spiste over halvparten av verdien det skulle avgjøre noe om.",
    };
  }
  if (ratio >= 0.1) {
    return {
      badge: "warning",
      title: "En anstendig bit av sakens verdi",
      text: "Ikke krise, men verdt å legge merke til neste gang.",
    };
  }
  return {
    badge: "fine",
    title: "Forsvarlig i forhold til saken",
    text: "Møtet kostet bare en brøkdel av det som faktisk sto på spill.",
  };
}
