import { NextResponse } from "next/server";
import { verifyCameraSlug } from "@/lib/recall";
import { startFromCamera } from "@/lib/botInvites";

/** Kalt av kamerasiden når boten laster den - reserve hvis Recall-webhooken uteblir. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { sig } = ((await request.json().catch(() => ({}))) ?? {}) as { sig?: unknown };
  if (typeof sig !== "string" || !verifyCameraSlug(slug, sig)) {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 403 });
  }
  try {
    const started = await startFromCamera(slug);
    return NextResponse.json({ ok: started });
  } catch (err) {
    console.error("bot-start", err);
    return NextResponse.json({ error: "Kunne ikke starte" }, { status: 500 });
  }
}
