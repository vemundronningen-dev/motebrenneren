import { formatKr } from "./format";

export interface ShareImageParams {
  amount: number;
  verdictTitle: string;
  comparison: string;
  participants: number;
  durationLabel: string;
  progressFraction: number; // 0..1, hvor langt lunta brant
}

const W = 1200;
const H = 630;

export async function generateShareImage(params: ShareImageParams): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke lage bilde");

  // Bakgrunn
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#120d0a");
  bg.addColorStop(1, "#0a0908");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glød i bakgrunnen
  const glow = ctx.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H * 0.35, 520);
  glow.addColorStop(0, "rgba(255,106,31,0.28)");
  glow.addColorStop(1, "rgba(255,106,31,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Kicker
  ctx.fillStyle = "#a89a8d";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Dette møtet kostet", W / 2, 150);

  // Beløp
  ctx.fillStyle = "#ff6a1f";
  ctx.font = "900 128px system-ui, sans-serif";
  ctx.fillText(`${formatKr(params.amount)} kr`, W / 2, 280);

  // Dom
  ctx.fillStyle = "#f5efe9";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText(params.verdictTitle, W / 2, 340);

  // Sammenligning
  ctx.fillStyle = "#a89a8d";
  ctx.font = "400 26px system-ui, sans-serif";
  ctx.fillText(`Like mye som ${params.comparison}`, W / 2, 385);

  // Mini brent lunte
  const trackX = 200;
  const trackY = 460;
  const trackW = W - 400;
  const trackH = 22;
  ctx.fillStyle = "#2a2422";
  roundRect(ctx, trackX, trackY, trackW, trackH, 11);
  ctx.fill();

  const burntW = Math.max(0, Math.min(1, params.progressFraction)) * trackW;
  const burnt = ctx.createLinearGradient(trackX, 0, trackX + burntW, 0);
  burnt.addColorStop(0, "#c2270c");
  burnt.addColorStop(1, "#ff6a1f");
  ctx.save();
  roundRect(ctx, trackX, trackY, trackW, trackH, 11);
  ctx.clip();
  ctx.fillStyle = burnt;
  ctx.fillRect(trackX, trackY, burntW, trackH);
  ctx.restore();

  ctx.font = "34px system-ui, sans-serif";
  ctx.fillText("🔥", trackX + burntW, trackY + 18);

  // Detaljer
  ctx.fillStyle = "#a89a8d";
  ctx.font = "400 26px system-ui, sans-serif";
  ctx.fillText(
    `${params.participants} deltakere · ${params.durationLabel}`,
    W / 2,
    540,
  );

  // Wordmark
  ctx.fillStyle = "#f5efe9";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText("🔥 motebrenneren.no", W / 2, 600);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Kunne ikke generere bilde"));
    }, "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
