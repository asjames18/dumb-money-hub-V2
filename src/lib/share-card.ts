export type ShareCardInput = {
  title: string;
  caption: string;
  type: string;
  vibe: string;
  imageUrl: string;
};

const W = 1080;
const H = 1350;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load share-card image"));
    img.src = src;
  });
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.length === maxLines) {
    const last = lines[maxLines - 1]!;
    if (ctx.measureText(`${last}…`).width <= maxWidth) lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Draw a 1080×1350 Smiley raid card and return a PNG blob. */
export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  const img = await loadImage(input.imageUrl);

  // Cover-fit background
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  // Bottom gradient for text
  const grad = ctx.createLinearGradient(0, H * 0.45, 0, H);
  grad.addColorStop(0, "rgba(10,12,10,0)");
  grad.addColorStop(0.45, "rgba(10,12,10,0.72)");
  grad.addColorStop(1, "rgba(10,12,10,0.96)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.4, W, H * 0.6);

  // Accent bar
  ctx.fillStyle = "#39ff14";
  ctx.fillRect(64, H - 330, 120, 8);

  ctx.fillStyle = "#ff2d95";
  ctx.font = "700 28px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`${input.type.toUpperCase()}  ·  ${input.vibe.toUpperCase()}`, 64, H - 272);

  ctx.fillStyle = "#f4f7f2";
  ctx.font = "900 64px ui-sans-serif, system-ui, sans-serif";
  const titleLines = wrapLines(ctx, input.title, W - 128, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 64, H - 206 + i * 70);
  });

  ctx.fillStyle = "rgba(244,247,242,0.82)";
  ctx.font = "600 32px ui-sans-serif, system-ui, sans-serif";
  const captionLines = wrapLines(ctx, input.caption, W - 128, 2);
  captionLines.forEach((line, i) => {
    ctx.fillText(line, 64, H - 96 + i * 40);
  });

  ctx.fillStyle = "#39ff14";
  ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("DUMB MONEY HUB  ·  #DUMB  ·  PULSECHAIN", 64, H - 20);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 0.95),
  );
  if (!blob) throw new Error("Failed to encode share card");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Meme taglines for burn brag cards — burn-focused, never price promises. */
const BRAG_LINES = [
  "Supply down. Vibes up.",
  "Proof of burn. No promises.",
  "Straight to the void.",
  "The dead address eats well tonight.",
  "Dumb money. Smart burn.",
  "Less supply. Zero regrets.",
  "Burned, not sold.",
];

/** Deterministic pick so the same burn always renders the same card. */
function pickLine(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return BRAG_LINES[h % BRAG_LINES.length]!;
}

export type BurnBragInput = {
  /** Human-readable amount, e.g. "1,250". */
  amount: string;
  token: "DUMB" | "DAMP";
  /** Full tx hash — only the short form lands on the card, and it doubles as the tagline seed. */
  txHash: string;
};

/**
 * Draw a 1080×1080 burn brag card and return a PNG blob.
 *
 * Pure canvas typography + emoji — no gallery/mascot imagery, so nothing ships
 * that Antonio hasn't approved. Only ever call with a CONFIRMED on-chain burn
 * (the card carries the tx hash, so the brag is checkable, never invented).
 */
export async function renderBurnBragCard(input: BurnBragInput): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  // Ember-night background
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, "#17120e");
  bg.addColorStop(0.55, "#0d0b0a");
  bg.addColorStop(1, "#08080a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Radial ember glow behind the flame
  const glow = ctx.createRadialGradient(S / 2, S * 0.34, 40, S / 2, S * 0.34, 420);
  glow.addColorStop(0, "rgba(255,90,20,0.35)");
  glow.addColorStop(0.6, "rgba(255,45,149,0.10)");
  glow.addColorStop(1, "rgba(255,45,149,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Deterministic ember sparks
  let seed = 0;
  for (let i = 0; i < input.txHash.length; i++)
    seed = (seed * 31 + input.txHash.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 46; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 1.5 + rand() * 4;
    const a = 0.08 + rand() * 0.22;
    ctx.fillStyle = rand() > 0.4 ? `rgba(255,120,40,${a})` : `rgba(255,45,149,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const cx = S / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Top kicker
  ctx.fillStyle = "#ff2d95";
  ctx.font = "700 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("D U M B   M O N E Y   ·   P U L S E C H A I N", cx, 92);

  // Flame
  ctx.font = "200px serif";
  ctx.fillText("🔥", cx, 330);

  // "I BURNED"
  ctx.fillStyle = "rgba(244,247,242,0.85)";
  ctx.font = "800 58px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("I  B U R N E D", cx, 448);

  // Amount — shrink to fit
  let amtSize = 190;
  ctx.font = `900 ${amtSize}px ui-sans-serif, system-ui, sans-serif`;
  while (ctx.measureText(input.amount).width > S - 120 && amtSize > 60) {
    amtSize -= 10;
    ctx.font = `900 ${amtSize}px ui-sans-serif, system-ui, sans-serif`;
  }
  ctx.save();
  ctx.shadowColor = "rgba(255,120,30,0.55)";
  ctx.shadowBlur = 46;
  ctx.fillStyle = "#f7f3ec";
  ctx.fillText(input.amount, cx, 448 + amtSize + 40);
  ctx.restore();

  // Token
  const tokenY = 448 + amtSize + 40 + 118;
  ctx.fillStyle = input.token === "DUMB" ? "#39ff14" : "#7dd3fc";
  ctx.font = "900 104px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(input.token, cx, tokenY);

  // Tagline
  ctx.fillStyle = "rgba(244,247,242,0.78)";
  ctx.font = "italic 600 46px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(pickLine(input.txHash), cx, tokenY + 92);

  // Divider
  ctx.fillStyle = "rgba(255,45,149,0.55)";
  ctx.fillRect(cx - 150, tokenY + 132, 300, 5);

  // Footer — checkable tx + honesty line
  const short = `${input.txHash.slice(0, 8)}…${input.txHash.slice(-6)}`;
  ctx.fillStyle = "rgba(244,247,242,0.62)";
  ctx.font = "600 30px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(`TX ${short}  ·  VERIFIED ON-CHAIN`, cx, S - 108);
  ctx.fillStyle = "rgba(244,247,242,0.42)";
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Burns shrink supply. Never promise price.", cx, S - 64);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 0.95),
  );
  if (!blob) throw new Error("Failed to encode brag card");
  return blob;
}
