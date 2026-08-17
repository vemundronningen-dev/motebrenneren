import { NextResponse } from "next/server";
import { createMeeting, MeetingError } from "@/lib/meetings";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { participants, ratePerHour, estimatedSeconds, alreadyStartedAt, label } =
    (body ?? {}) as Record<string, unknown>;

  try {
    const result = await createMeeting({
      participants: Number(participants),
      ratePerHour: Number(ratePerHour),
      estimatedSeconds: Number(estimatedSeconds),
      alreadyStartedAt:
        typeof alreadyStartedAt === "string" ? alreadyStartedAt : null,
      label: typeof label === "string" ? label : null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof MeetingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/meetings", err);
    return NextResponse.json(
      { error: "Kunne ikke opprette møte" },
      { status: 500 },
    );
  }
}
