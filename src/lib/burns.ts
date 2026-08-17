import "server-only";
import { sql } from "./db/client";
import { NATIONAL_MAX_RATE_PER_HOUR } from "./roles";

export interface InsertBurnInput {
  amount: number;
  durationSeconds: number;
  estimatedSeconds: number | null;
  participants: number;
}

export class BurnValidationError extends Error {}

/**
 * Validerer og setter inn en møteforbrenning i burns-tabellen. Brukes både
 * av POST /api/burns (solo-flyt) og av stopp-handlingen for delte møter
 * (kalt direkte fra server-koden, ingen ekstra HTTP-hopp).
 *
 * Uavhengig av hva brukeren har satt lokalt (egne rater kan være hva som
 * helst), klippes beløpet som faktisk telles mot Norge til makssatsen
 * 3000 kr/t per deltaker. Det holder det nasjonale tallet troverdig.
 */
export async function insertBurn(input: InsertBurnInput): Promise<{ amount: number }> {
  const { durationSeconds, estimatedSeconds, participants } = input;

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new BurnValidationError("Ugyldig varighet");
  }
  if (!Number.isInteger(participants) || participants < 1 || participants > 500) {
    throw new BurnValidationError("Ugyldig antall deltakere");
  }
  if (
    estimatedSeconds != null &&
    (!Number.isFinite(estimatedSeconds) || estimatedSeconds <= 0)
  ) {
    throw new BurnValidationError("Ugyldig estimert varighet");
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new BurnValidationError("Ugyldig beløp");
  }

  const maxAllowed = participants * NATIONAL_MAX_RATE_PER_HOUR * (durationSeconds / 3600);
  const amount = Math.min(input.amount, maxAllowed, 9999999);

  await sql`
    insert into burns (amount, duration_seconds, estimated_seconds, participants)
    values (
      ${amount},
      ${Math.round(durationSeconds)},
      ${estimatedSeconds != null ? Math.round(estimatedSeconds) : null},
      ${participants}
    )
  `;

  return { amount };
}
