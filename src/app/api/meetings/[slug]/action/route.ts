import { NextResponse } from "next/server";
import { performMeetingAction, MeetingError, type MeetingAction } from "@/lib/meetings";
import { describeDbError } from "@/lib/dbErrorMessage";

const VALID_ACTIONS: MeetingAction[] = ["start", "pause", "resume", "stop"];

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

  const { hostToken, action, overrideDurationSeconds } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof hostToken !== "string" || !hostToken) {
    return NextResponse.json({ error: "Mangler vert-token" }, { status: 401 });
  }
  if (typeof action !== "string" || !VALID_ACTIONS.includes(action as MeetingAction)) {
    return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
  }

  try {
    const meeting = await performMeetingAction(
      slug,
      hostToken,
      action as MeetingAction,
      typeof overrideDurationSeconds === "number" ? overrideDurationSeconds : undefined,
    );
    return NextResponse.json(meeting);
  } catch (err) {
    if (err instanceof MeetingError) {
      const status =
        err.code === "not_found" ? 404 : err.code === "forbidden" ? 403 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("POST /api/meetings/[slug]/action", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}
