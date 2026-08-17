import { ImageResponse } from "next/og";
import { getMeetingBySlug } from "@/lib/meetings";
import { costForDuration } from "@/lib/calc";
import { formatKr } from "@/lib/format";

export const alt = "Møtebrenneren – møte pågår";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meeting = await getMeetingBySlug(slug);

  const prognosis = meeting
    ? costForDuration(meeting.rate_per_hour, meeting.estimated_seconds)
    : 0;
  const minutes = meeting ? Math.round(meeting.estimated_seconds / 60) : 0;
  const kind = meeting?.label ?? "Møtet";
  const statusLabel = !meeting
    ? "Møtet finnes ikke lenger"
    : meeting.status === "ended"
      ? `${kind} er avsluttet`
      : meeting.status === "lobby"
        ? `${kind} venter på start`
        : `${kind} pågår LIVE`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #150f0b 0%, #0a0908 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            borderRadius: "50%",
            top: -300,
            background:
              "radial-gradient(circle, rgba(255,106,31,0.35) 0%, rgba(255,106,31,0) 65%)",
            display: "flex",
          }}
        />
        <div style={{ fontSize: 40, color: "#a89a8d", display: "flex" }}>
          🔥 {statusLabel}
        </div>
        <div
          style={{
            fontSize: 128,
            fontWeight: 900,
            color: "#ff6a1f",
            display: "flex",
            marginTop: 10,
          }}
        >
          {meeting ? `${formatKr(prognosis)} kr` : "🔥"}
        </div>
        {meeting && (
          <div style={{ fontSize: 32, color: "#f5efe9", display: "flex", marginTop: 6 }}>
            {meeting.participants} deltakere · ca. {minutes} min
          </div>
        )}
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#f5efe9",
            display: "flex",
            marginTop: 40,
          }}
        >
          motebrenneren.no
        </div>
      </div>
    ),
    { ...size },
  );
}
