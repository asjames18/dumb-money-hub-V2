import { FLAME, FONT_TIERS, type Glyph } from "./brag-font-data.server";

// Server-side burn brag card renderer — dependency-free.
//
// The same card the client draws on canvas (ember-night gradient, glow,
// seeded sparks, flame, amount, token, deterministic tagline, checkable
// footer) is reproduced here with pre-rasterized bitmap glyphs so the worker
// can serve it as the og:image for /brag links. Every pixel comes from
// VERIFIED on-chain data: the caller must only invoke this for a confirmed
// voluntary burn. Nothing here can invent a burn.

const S = 1080;
const CX = S / 2;

type RGB = [number, number, number];

const PINK: RGB = [255, 45, 149];
const EMBER: RGB = [255, 120, 40];
const WHITE: RGB = [247, 243, 236];
const FAINT: RGB = [244, 247, 242];
const LIME: RGB = [57, 255, 20];
const SKY: RGB = [125, 211, 252];

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

// ---------------------------------------------------------------------------
// Framebuffer helpers
// ---------------------------------------------------------------------------

function newFrame(): Uint8ClampedArray {
  return new Uint8ClampedArray(S * S * 3);
}

function blend(px: Uint8ClampedArray, i: number, c: RGB, a: number): void {
  const [r, g, b] = c;
  if (a <= 0) return;
  if (a >= 1) {
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    return;
  }
  const inv = 1 - a;
  px[i] = (px[i] ?? 0) * inv + r * a;
  px[i + 1] = (px[i + 1] ?? 0) * inv + g * a;
  px[i + 2] = (px[i + 2] ?? 0) * inv + b * a;
}

/** Static ember-night background (gradient + radial glow). Built once per isolate. */
let bgCache: Uint8ClampedArray | null = null;

function background(): Uint8ClampedArray {
  if (bgCache) return bgCache.slice();
  const px = newFrame();
  // Vertical gradient: #17120e -> #0d0b0a @55% -> #08080a
  const stops: Array<[number, RGB]> = [
    [0, [23, 18, 14]],
    [0.55, [13, 11, 10]],
    [1, [8, 8, 10]],
  ];
  for (let y = 0; y < S; y++) {
    const t = y / (S - 1);
    let a = stops[0]!;
    let b = stops[stops.length - 1]!;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s]![0] && t <= stops[s + 1]![0]) {
        a = stops[s]!;
        b = stops[s + 1]!;
        break;
      }
    }
    const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    const r = a[1][0] + (b[1][0] - a[1][0]) * f;
    const g = a[1][1] + (b[1][1] - a[1][1]) * f;
    const bl = a[1][2] + (b[1][2] - a[1][2]) * f;
    const row = y * S * 3;
    for (let x = 0; x < S; x++) {
      const i = row + x * 3;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = bl;
    }
  }
  // Radial ember glow behind the flame: rgba(255,90,20,0.35) -> rgba(255,45,149,0.10) @60% -> 0
  const gx = CX;
  const gy = S * 0.34;
  const R = 420;
  const x0 = Math.max(0, Math.floor(gx - R));
  const x1 = Math.min(S - 1, Math.ceil(gx + R));
  const y0 = Math.max(0, Math.floor(gy - R));
  const y1 = Math.min(S - 1, Math.ceil(gy + R));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.sqrt((x - gx) * (x - gx) + (y - gy) * (y - gy)) / R;
      if (d >= 1) continue;
      let c: RGB;
      let al: number;
      if (d < 0.6) {
        const f = d / 0.6;
        c = [255, 90 - 45 * f, 20 + 129 * f];
        al = 0.35 - 0.25 * f;
      } else {
        const f = (d - 0.6) / 0.4;
        c = [255, 45, 149];
        al = 0.1 * (1 - f);
      }
      blend(px, (y * S + x) * 3, c, al);
    }
  }
  bgCache = px;
  return px.slice();
}

function fillCircle(
  px: Uint8ClampedArray,
  cx: number,
  cy: number,
  r: number,
  c: RGB,
  a: number,
): void {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(S - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(S - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.max(x0, Math.ceil(cx - dx)); x <= Math.min(x1, Math.floor(cx + dx)); x++) {
      blend(px, (y * S + x) * 3, c, a);
    }
  }
}

// ---------------------------------------------------------------------------
// Bitmap text
// ---------------------------------------------------------------------------

const glyphCache = new Map<string, Uint8Array>();

function glyphBits(g: Glyph): Uint8Array {
  const key = `${g.w}x${g.h}:${g.data}`;
  let bits = glyphCache.get(key);
  if (bits) return bits;
  const raw = Uint8Array.from(atob(g.data), (ch) => ch.charCodeAt(0));
  const stride = Math.ceil(g.w / 8);
  bits = new Uint8Array(g.w * g.h);
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const byte = raw[y * stride + (x >> 3)]!;
      bits[y * g.w + x] = (byte >> (7 - (x & 7))) & 1;
    }
  }
  glyphCache.set(key, bits);
  return bits;
}

type TextOpts = { tracking?: number; shear?: number; alpha?: number };

function textWidth(str: string, tier: number, pxSize: number, tracking = 0): number {
  const glyphs = FONT_TIERS[tier]!;
  const scale = pxSize / tier;
  let w = 0;
  let n = 0;
  for (const ch of str) {
    const g = glyphs[ch];
    if (!g) continue;
    w += g.adv * scale + tracking;
    n++;
  }
  return n === 0 ? 0 : w - tracking;
}

function drawText(
  px: Uint8ClampedArray,
  str: string,
  cx: number,
  baselineY: number,
  tier: number,
  pxSize: number,
  color: RGB,
  opts: TextOpts = {},
): void {
  const { tracking = 0, shear = 0, alpha = 1 } = opts;
  const glyphs = FONT_TIERS[tier]!;
  const scale = pxSize / tier;
  const w = textWidth(str, tier, pxSize, tracking);
  let pen = cx - w / 2;
  for (const ch of str) {
    const g = glyphs[ch];
    if (!g) continue;
    if (g.w > 0 && g.h > 0) {
      const bits = glyphBits(g);
      for (let gy = 0; gy < g.h; gy++) {
        const sy = baselineY + (g.oy + gy) * scale;
        const y0 = Math.floor(sy);
        const y1 = Math.ceil(sy + scale) - 1;
        const shearX = (gy - g.h / 2) * shear * scale;
        for (let gx = 0; gx < g.w; gx++) {
          if (!bits[gy * g.w + gx]) continue;
          const sx = pen + gx * scale + shearX;
          const x0 = Math.floor(sx);
          const x1 = Math.ceil(sx + scale) - 1;
          for (let y = y0; y <= y1; y++) {
            if (y < 0 || y >= S) continue;
            for (let x = x0; x <= x1; x++) {
              if (x < 0 || x >= S) continue;
              blend(px, (y * S + x) * 3, color, alpha);
            }
          }
        }
      }
    }
    pen += g.adv * scale + tracking;
  }
}

// ---------------------------------------------------------------------------
// Flame sprite
// ---------------------------------------------------------------------------

let flameCache: { w: number; h: number; px: Uint8Array } | null = null;

function flame(): { w: number; h: number; px: Uint8Array } {
  if (flameCache) return flameCache;
  const raw = Uint8Array.from(atob(FLAME.data), (ch) => ch.charCodeAt(0));
  flameCache = { w: FLAME.w, h: FLAME.h, px: raw };
  return flameCache;
}

function drawFlame(px: Uint8ClampedArray, cx: number, cy: number, height: number): void {
  const f = flame();
  const scale = height / f.h;
  const dw = f.w * scale;
  const dh = f.h * scale;
  const x0 = Math.round(cx - dw / 2);
  const y0 = Math.round(cy - dh / 2);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(f.h - 1, Math.floor(y / scale));
    const dy = y0 + y;
    if (dy < 0 || dy >= S) continue;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(f.w - 1, Math.floor(x / scale));
      const si = (sy * f.w + sx) * 4;
      const a = f.px[si + 3]! / 255;
      if (a <= 0) continue;
      const dx = x0 + x;
      if (dx < 0 || dx >= S) continue;
      blend(px, (dy * S + dx) * 3, [f.px[si]!, f.px[si + 1]!, f.px[si + 2]!], a);
    }
  }
}

// ---------------------------------------------------------------------------
// PNG encoding (no dependencies: raw deflate via CompressionStream)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function encodePng(px: Uint8ClampedArray): Promise<Uint8Array> {
  const raw = new Uint8Array(S * (1 + S * 3));
  for (let y = 0; y < S; y++) {
    const o = y * (1 + S * 3);
    raw[o] = 0; // filter: none
    raw.set(px.subarray(y * S * 3, (y + 1) * S * 3), o + 1);
  }
  const cs = new CompressionStream("deflate");
  // Start draining before writing: otherwise close() can stall on backpressure.
  const done = new Response(cs.readable).arrayBuffer();
  const writer = cs.writable.getWriter();
  await writer.write(raw);
  await writer.close();
  const deflated = new Uint8Array(await done);

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, S);
  dv.setUint32(4, S);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const sig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflated),
    chunk("IEND", new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export type BragCardInput = {
  /** Human-readable amount, e.g. "1,250" — must come from verified on-chain data. */
  amount: string;
  token: "DUMB" | "DAMP";
  /** Full tx hash — short form lands on the card; also seeds sparks + tagline. */
  txHash: string;
};

export async function renderBragCard(input: BragCardInput): Promise<Uint8Array> {
  const px = background();

  // Deterministic ember sparks (same LCG as the client card)
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
    fillCircle(px, x, y, r, rand() > 0.4 ? EMBER : PINK, a);
  }

  // Kicker
  drawText(px, "D U M B   M O N E Y   ·   P U L S E C H A I N", CX, 92, 32, 30, PINK, { alpha: 1 });

  // Flame
  drawFlame(px, CX, 250, 190);

  // "I BURNED"
  drawText(px, "I  B U R N E D", CX, 448, 48, 58, FAINT, { tracking: 2, alpha: 0.85 });

  // Amount — shrink to fit, ember glow behind the core
  let amtSize = 190;
  while (textWidth(input.amount, 192, amtSize) > S - 120 && amtSize > 60) amtSize -= 10;
  const amtY = 448 + amtSize + 40;
  for (const [ox, oy] of [
    [-4, 0],
    [4, 0],
    [0, -4],
    [0, 4],
  ] as const) {
    drawText(px, input.amount, CX + ox, amtY + oy, 192, amtSize, EMBER, { alpha: 0.35 });
  }
  drawText(px, input.amount, CX, amtY, 192, amtSize, WHITE);

  // Token
  const tokenY = amtY + 118;
  drawText(px, input.token, CX, tokenY, 192, 104, input.token === "DUMB" ? LIME : SKY);

  // Tagline (deterministic, italic-ish)
  drawText(px, pickLine(input.txHash), CX, tokenY + 92, 48, 46, FAINT, {
    shear: 0.18,
    alpha: 0.78,
  });

  // Divider
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 300; x++) {
      blend(px, ((tokenY + 132 + y) * S + (CX - 150 + x)) * 3, PINK, 0.55);
    }
  }

  // Footer — checkable tx + honesty line
  const short = `${input.txHash.slice(0, 8)}…${input.txHash.slice(-6)}`;
  drawText(px, `TX ${short}  ·  VERIFIED ON-CHAIN`, CX, S - 108, 32, 30, FAINT, { alpha: 0.62 });
  drawText(px, "Burns shrink supply. Never promise price.", CX, S - 64, 32, 26, FAINT, {
    alpha: 0.42,
  });

  return encodePng(px);
}

/** Format a wei bigint like the client's fmtTok: thousands separators, ≤4 trimmed decimals.
    A real dust burn (positive but below 0.0001) renders "<0.0001" — never "0",
    so the card can never assert a zero amount for a real burn. */
export function fmtTok(wei: bigint): string {
  const negative = wei < 0n;
  const v = negative ? -wei : wei;
  const int = v / 10n ** 18n;
  const frac = v % 10n ** 18n;
  const intStr = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = frac.toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  if (!negative && v > 0n && int === 0n && !dec) return "<0.0001";
  return `${negative ? "-" : ""}${dec ? `${intStr}.${dec}` : intStr}`;
}
