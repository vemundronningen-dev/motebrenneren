import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMeetingBySlug } from "@/lib/meetings";
import { costForDuration } from "@/lib/calc";
import { formatKr } from "@/lib/format";
import MeetingRoom from "./MeetingRoom";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meeting = await getMeetingBySlug(slug);

  if (!meeting) {
    return { title: "Møtet finnes ikke" };
  }

  const prognosis = costForDuration(meeting.rate_per_hour, meeting.estimated_seconds);
  const minutes = Math.round(meeting.estimated_seconds / 60);
  const title = `🔥 Møte pågår – prognose ${formatKr(prognosis)} kr`;
  const description = `${meeting.participants} deltakere, ca. ${minutes} minutter. Følg med på hva møtet koster – live og anonymt.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description, card: "summary_large_image" },
  };
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meeting = await getMeetingBySlug(slug);

  if (!meeting) {
    notFound();
  }

  return <MeetingRoom slug={slug} initialMeeting={meeting} />;
}
