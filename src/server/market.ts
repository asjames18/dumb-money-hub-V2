// Public market snapshot for the /roots dashboard: DUMB and DAMP flagship
// PulseX V2 pairs, read server-side from the DexScreener free API (no key,
// no auth). Server-side fetch means every visitor shares one upstream
// request instead of each phone hitting the API and getting rate-limited.
//
// Freshness: cached 60s in the isolate; a stale snapshot is served rather
// than nothing; if DexScreener has no pair data we return nulls so the
// dashboard can say "unavailable" — a price is never invented. DexScreener
// does not index every pair (e.g. DUMB/DAI2) — those stay on-chain only.
//
// Cross-isolate fallback: every successful fetch is also written to the
// ANALYTICS_KV namespace (`market:cache`, 15-min TTL). If both DexScreener
// fetches fail AND no isolate has a fresh in-memory snapshot (new isolate,
// cold start), a KV snapshot newer than 15 minutes is served with
// `stale: true` — the dashboard labels it "stale — feed unreachable, last
// good snapshot". Older than that, we return the honest 502 and the
// dashboard says the feed is unavailable. Never stale beyond 15 minutes.
import type { AnalyticsKV } from "./analytics";

const DUMB_WPLS = "0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186";
const DAMP_WPLS = "0xB256769d6B9d53E0E66a395C17135F8855A8633A";

const CACHE_MS = 60_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
    },
  });
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

type PairQuote = {
  ok: boolean;
  symbol: string;
  pairAddress: string;
  dexId: string | null;
  chartUrl: string | null;
  priceUsd: number | null;
  priceNative: number | null;
  liquidityUsd: number | null;
  volumeH24: number | null;
  priceChangeH24: number | null;
  txnsH24: { buys: number; sells: number } | null;
  marketCap: number | null;
};

function quoteFromPair(symbol: string, pairAddress: string, raw: unknown): PairQuote {
  const empty: PairQuote = {
    ok: false,
    symbol,
    pairAddress,
    dexId: null,
    chartUrl: null,
    priceUsd: null,
    priceNative: null,
    liquidityUsd: null,
    volumeH24: null,
    priceChangeH24: null,
    txnsH24: null,
    marketCap: null,
  };
  if (!raw || typeof raw !== "object") return empty;
  const p = raw as Record<string, unknown>;
  // Never mislabel another pair's numbers as ours: confirm the returned
  // pair is the address we asked for (the endpoint is address-keyed, so a
  // mismatch would mean the upstream shape changed — treat as no data).
  const returnedPair = p["pairAddress"];
  if (
    typeof returnedPair !== "string" ||
    returnedPair.toLowerCase() !== pairAddress.toLowerCase()
  ) {
    return empty;
  }
  const liquidity = p["liquidity"] as Record<string, unknown> | undefined;
  const volume = p["volume"] as Record<string, unknown> | undefined;
  const change = p["priceChange"] as Record<string, unknown> | undefined;
  const txns = p["txns"] as Record<string, unknown> | undefined;
  const h24 = txns?.["h24"] as Record<string, unknown> | undefined;
  const chartUrl = p["url"];
  return {
    ok: true,
    symbol,
    pairAddress,
    dexId: typeof p["dexId"] === "string" ? (p["dexId"] as string) : null,
    // External data becomes an outbound link — only accept http(s); a
    // javascript: or data: URL here would be an XSS vector via the anchor.
    chartUrl: typeof chartUrl === "string" && /^https?:\/\//i.test(chartUrl) ? chartUrl : null,
    priceUsd: num(p["priceUsd"]),
    priceNative: num(p["priceNative"]),
    liquidityUsd: num(liquidity?.["usd"]),
    volumeH24: num(volume?.["h24"]),
    priceChangeH24: num(change?.["h24"]),
    txnsH24:
      typeof h24?.["buys"] === "number" && typeof h24?.["sells"] === "number"
        ? { buys: h24["buys"] as number, sells: h24["sells"] as number }
        : null,
    // DexScreener's marketCap is price × circulating supply excluding the
    // dead address — honest for our purposes, labeled as theirs.
    marketCap: num(p["marketCap"]),
  };
}

async function fetchPair(symbol: string, pairAddress: string): Promise<PairQuote> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/pulsechain/${pairAddress}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return quoteFromPair(symbol, pairAddress, null);
    const body = (await res.json()) as { pairs?: unknown[] };
    const first = Array.isArray(body.pairs) && body.pairs.length > 0 ? body.pairs[0] : null;
    return quoteFromPair(symbol, pairAddress, first);
  } catch {
    return quoteFromPair(symbol, pairAddress, null);
  }
}

let cache: { at: number; payload: unknown } | null = null;

const KV_KEY = "market:cache";
const KV_TTL_SECONDS = 900; // 15 minutes — same bound the honest-stale label implies.
const KV_MAX_AGE_MS = KV_TTL_SECONDS * 1000;

// Same env plumbing as analytics.ts / pledges.ts: nitro's lazyService
// wrapper calls the SSR fetch with the request only, so bindings come from
// request.runtime or globalThis.__env__.
function getEnv(request: Request | undefined): { ANALYTICS_KV?: AnalyticsKV } {
  if (!request) return {};
  const viaRequest = (
    request as unknown as { runtime?: { cloudflare?: { env?: { ANALYTICS_KV?: AnalyticsKV } } } }
  ).runtime?.cloudflare?.env;
  if (viaRequest) return viaRequest;
  const viaGlobal = (globalThis as unknown as { __env__?: { ANALYTICS_KV?: AnalyticsKV } }).__env__;
  if (viaGlobal) return viaGlobal;
  return {};
}

/** Best-effort write of the fresh snapshot into KV. Never throws. */
async function writeKvCache(request: Request | undefined, payload: unknown): Promise<void> {
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return;
    await kv.put(KV_KEY, JSON.stringify(payload), { expirationTtl: KV_TTL_SECONDS });
  } catch {
    // KV is a fallback layer; a failed write never blocks a live response.
  }
}

/** Read the KV snapshot; null unless it parses and is younger than 15 min. */
async function readKvCache(request: Request | undefined): Promise<Record<string, unknown> | null> {
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return null;
    const raw = await kv.get(KV_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const at = payload["at"];
    if (typeof at !== "number") return null;
    if (typeof payload["dumb"] !== "object" || typeof payload["damp"] !== "object") return null;
    if (Date.now() - at >= KV_MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function handleMarket(request?: Request): Promise<Response> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return json({ ...((cache.payload as Record<string, unknown>) ?? {}), cached: true });
  }
  const [dumb, damp] = await Promise.all([
    fetchPair("DUMB", DUMB_WPLS),
    fetchPair("DAMP", DAMP_WPLS),
  ]);
  const payload = {
    at: now,
    source: "DexScreener",
    sourceNote: "Flagship PulseX V2 pairs (DUMB/WPLS, DAMP/WPLS). Not every pool is indexed.",
    dumb,
    damp,
  };
  if (!dumb.ok && !damp.ok) {
    // Same 15-minute honesty bound as the KV fallback below: an isolate can
    // live long after the upstream dies, so an unbounded in-memory stale
    // serve would let a hours-old snapshot ride forever labeled just
    // "stale". Past the bound, fall through to the honest 502.
    if (cache && now - cache.at < KV_MAX_AGE_MS) {
      return json({
        ...((cache.payload as Record<string, unknown>) ?? {}),
        cached: true,
        stale: true,
      });
    }
    // Cross-isolate fallback: serve the KV snapshot if it is still fresh.
    const kvPayload = await readKvCache(request);
    if (kvPayload) {
      return json({ ...kvPayload, cached: true, stale: true });
    }
    return json({ ok: false, reason: "Market data unavailable." }, 502);
  }
  cache = { at: now, payload };
  await writeKvCache(request, payload);
  return json(payload);
}
