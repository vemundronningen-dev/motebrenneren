import { NextResponse } from "next/server";
import { insertBurn, BurnValidationError } from "@/lib/burns";
import { describeDbError } from "@/lib/dbErrorMessage";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { amount, durationSeconds, estimatedSeconds, participants, label, caseValue } = (body ??
    {}) as Record<string, unknown>;

  try {
    const result = await insertBurn({
      amount: Number(amount),
      durationSeconds: Number(durationSeconds),
      estimatedSeconds:
        estimatedSeconds == null ? null : Number(estimatedSeconds),
      participants: Number(participants),
      label: typeof label === "string" ? label : null,
      caseValue: typeof caseValue === "number" ? caseValue : null,
    });
    return NextResponse.json({ ok: true, amount: result.amount });
  } catch (err) {
    if (err instanceof BurnValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/burns", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}
