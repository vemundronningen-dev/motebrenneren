import "server-only";
import { neon } from "@neondatabase/serverless";

let cached: ReturnType<typeof neon> | null = null;

/**
 * Neon HTTP-driver – kjører hver spørring som ett HTTPS-kall i stedet for en
 * lang-levd TCP-forbindelse. Det er nødvendig i serverless/edge-miljøer
 * (Vercel-funksjoner har ingen garantert levetid til å holde en
 * poolet Postgres-forbindelse åpen), og fungerer identisk lokalt.
 *
 * DATABASE_URL er hemmelig (inneholder passord) og skal ALDRI ha
 * NEXT_PUBLIC_-prefiks eller nås fra klientkode – "server-only"-importen
 * over kaster en build-feil hvis noen prøver å importere denne filen fra en
 * "use client"-komponent.
 */
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Mangler miljøvariabelen DATABASE_URL. Se README.md.");
    }
    cached = neon(url);
  }
  return cached(strings, ...values) as Promise<T[]>;
}
