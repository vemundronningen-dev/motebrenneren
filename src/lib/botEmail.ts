/** Adressen man legger til i møteinvitasjonen for å få boten med. ASCII med vilje (ø i e-postadresser er upålitelig). */
export const BOT_EMAIL = process.env.NEXT_PUBLIC_BOT_EMAIL ?? "gronntorsk@motebrenneren.no";
export const BOT_DOMAIN = BOT_EMAIL.split("@")[1]?.toLowerCase() ?? "motebrenneren.no";
