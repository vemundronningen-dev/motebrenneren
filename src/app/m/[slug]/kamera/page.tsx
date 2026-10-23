import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMeetingBySlug } from "@/lib/meetings";
import CameraView from "./CameraView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kameravisning",
  robots: { index: false, follow: false },
};

export default async function CameraPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bot?: string }>;
}) {
  const { slug } = await params;
  const { bot } = await searchParams;
  const meeting = await getMeetingBySlug(slug);
  if (!meeting) notFound();

  return <CameraView slug={slug} initialMeeting={meeting} botSignature={bot ?? null} />;
}
