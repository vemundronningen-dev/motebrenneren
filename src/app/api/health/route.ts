import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { describeDbError } from "@/lib/dbErrorMessage";

/**
 * Enkel helsesjekk for å feilsøke DATABASE_URL/tilkobling uten å måtte
 * reprodusere hele del-møte-flyten. Lekker ikke selve connection-strengen -
 * kun om den er satt og om databasen faktisk svarer.
 */
export async function GET() {
  const databaseUrlSet = !!process.env.DATABASE_URL;
  if (!databaseUrlSet) {
    return NextResponse.json(
      {
        ok: false,
        databaseUrlSet: false,
        error:
          "DATABASE_URL er ikke satt på denne serveren/deploymenten. Se README.md.",
      },
      { status: 500 },
    );
  }

  try {
    await sql`select 1`;
    return NextResponse.json({ ok: true, databaseUrlSet: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, databaseUrlSet: true, error: describeDbError(err) },
      { status: 500 },
    );
  }
}
