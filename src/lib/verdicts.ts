export interface Verdict {
  badge: "hyllest" | "skam" | "nøytral";
  title: string;
  text: string;
}

export function judgeMeeting(params: {
  amount: number;
  wentOvertime: boolean;
  overtimeSeconds: number;
  finishedEarly: boolean;
}): Verdict {
  const { amount, wentOvertime, overtimeSeconds, finishedEarly } = params;

  if (finishedEarly && amount < 5000) {
    return {
      badge: "hyllest",
      title: "Ferdig før tiden?! Rammes inn. 🏆",
      text: "Dette er sjeldnere enn en solformørkelse. Send skjermbilde til hele avdelingen.",
    };
  }

  if (wentOvertime && overtimeSeconds > 15 * 60) {
    return {
      badge: "skam",
      title: "Send regningen til møteinnkalleren",
      text: "Overtiden alene forteller hele historien. Neste gang: sett en timer og hold den hellig.",
    };
  }

  if (wentOvertime) {
    return {
      badge: "skam",
      title: "Godkjent – så vidt",
      text: "Møtet sneik seg over tiden. Klassisk siste-punkt-på-agendaen-syndrom.",
    };
  }

  if (amount >= 50000) {
    return {
      badge: "nøytral",
      title: "Dyrt, men i det minste presist",
      text: "Beløpet er svimlende, men dere holdt faktisk tiden. Halvveis imponerende.",
    };
  }

  return {
    badge: "nøytral",
    title: "Godkjent møte",
    text: "Innenfor budsjett og tid. Ingen vil skrive om dette på LinkedIn, men bra jobba.",
  };
}
