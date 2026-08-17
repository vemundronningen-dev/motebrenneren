import { NextResponse } from "next/server";
import { recordHeartbeat } from "@/lib/meetings";
import { describeDbError } from "@/lib/dbErrorMessage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { sessionId } = (body ?? {}) as Record<string, unknown>;
  if (typeof sessionId !== "string" || sessionId.length < 6 || sessionId.length > 64) {
    return NextResponse.json({ error: "Ugyldig sesjons-id" }, { status: 400 });
  }

  try {
    await recordHeartbeat(slug, sessionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/meetings/[slug]/heartbeat", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}
