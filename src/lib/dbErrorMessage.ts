import "server-only";
import { NeonDbError } from "@neondatabase/serverless";

/**
 * Oversetter en databasefeil til en konkret, handlingsrettet norsk
 * feilmelding i stedet for en generisk "noe gikk galt" - slik at man kan
 * feilsøke selv (feil/manglende DATABASE_URL, migrasjoner som ikke er
 * kjørt ennå) uten å måtte lese server-logger.
 */
export function describeDbError(err: unknown): string {
  if (err instanceof Error && err.message.includes("Mangler miljøvariabelen DATABASE_URL")) {
    return "DATABASE_URL er ikke satt opp på serveren. Sjekk miljøvariablene (lokalt: .env.local, Vercel: Project Settings → Environment Variables).";
  }

  // Sjekkes uansett feiltype først: selv nettverksfeil (feil vert, DNS,
  // avvist tilkobling) kommer fra Neon-driveren pakket inn som en
  // NeonDbError uten noen bruksbar .code, så meldingsinnholdet må sjekkes
  // før vi eventuelt faller tilbake på .code-baserte grener under.
  const message = err instanceof Error ? err.message : String(err);
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout|allowlist|getaddrinfo/i.test(message)) {
    return "Kunne ikke koble til databasen. Sjekk at DATABASE_URL er riktig og at nettverkstilgangen til Neon er åpen.";
  }

  if (err instanceof NeonDbError) {
    if (err.code === "42P01") {
      return "Databasen mangler en tabell den trenger. Har du kjørt db/migrations/0001_init.sql mot databasen din?";
    }
    if (err.code === "42703") {
      const column = err.column ? ` ("${err.column}")` : "";
      return `Databasen mangler en kolonne${column} den trenger. Har du kjørt alle migrasjonsfilene i db/migrations/ (0001, 0002, 0003) mot databasen din, i rekkefølge?`;
    }
    return `Databasefeil: ${err.message}`;
  }

  return "Noe gikk galt på serveren. Prøv igjen om litt.";
}
