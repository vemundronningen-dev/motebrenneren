import { NextResponse } from "next/server";
import { getMeetingBySlug } from "@/lib/meetings";
import { describeDbError } from "@/lib/dbErrorMessage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const meeting = await getMeetingBySlug(slug);
    if (!meeting) {
      return NextResponse.json({ error: "Fant ikke møtet" }, { status: 404 });
    }
    return NextResponse.json(meeting);
  } catch (err) {
    console.error("GET /api/meetings/[slug]", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}
