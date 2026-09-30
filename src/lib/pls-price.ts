import { useQuery } from "@tanstack/react-query";

// Live PLS/USD reference rate, used to display dollar figures next to wei
// amounts. The worker's /api/pls-price is tried first — it serves one
// shared cached upstream call for all visitors, because every phone hitting
// CoinGecko directly gets rate-limited. Direct DexScreener (free, no key —
// Antonio approved 2026-09-29) is next, then direct CoinGecko. Client hook
// caches 5 minutes; if every source fails the UI falls back to PLS figures
// rather than guessing a price.

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=pulsechain&vs_currencies=usd";
const DEXSCREENER_URL =
  "https://api.dexscreener.com/latest/dex/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
const WORKER_PRICE_URL = "/api/pls-price";

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`price request failed: ${res.status}`);
  return res.json();
}

function parseCoinGecko(json: unknown): number | null {
  const price = (json as { pulsechain?: { usd?: unknown } })?.pulsechain?.usd;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

async function trySource(
  url: string,
  parse: (json: unknown) => number | null,
  timeoutMs: number,
): Promise<number | null> {
  try {
    return parse(await fetchJson(url, timeoutMs));
  } catch {
    return null;
  }
}

function parseWorker(json: unknown): number | null {
  const price = (json as { usd?: unknown })?.usd;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

/** Highest-liquidity WPLS pair's USD price (DexScreener token API). */
function parseDexScreener(json: unknown): number | null {
  const pairs = (json as { pairs?: unknown })?.pairs;
  if (!Array.isArray(pairs)) return null;
  let best: number | null = null;
  let bestLiq = -1;
  for (const p of pairs) {
    const rec = p as { priceUsd?: unknown; liquidity?: { usd?: unknown } };
    const raw = rec?.priceUsd;
    const price = typeof raw === "string" ? Number(raw) : raw;
    const liqRaw = rec?.liquidity?.usd;
    const liq = typeof liqRaw === "number" ? liqRaw : -1;
    if (typeof price === "number" && Number.isFinite(price) && price > 0 && liq > bestLiq) {
      best = price;
      bestLiq = liq;
    }
  }
  return best;
}

async function fetchPlsUsdRaw(): Promise<number> {
  // Two passes: worker cache first, then direct sources. Throws only if
  // every source fails on every pass.
  for (let attempt = 0; attempt < 2; attempt++) {
    const price =
      (await trySource(WORKER_PRICE_URL, parseWorker, 8_000)) ??
      (await trySource(DEXSCREENER_URL, parseDexScreener, 8_000)) ??
      (await trySource(COINGECKO_URL, parseCoinGecko, 8_000));
    if (price != null) return price;
  }
  throw new Error("PLS price unavailable from all sources");
}

export function usePlsPrice() {
  return useQuery({
    queryKey: ["pls-usd"],
    queryFn: fetchPlsUsdRaw,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/** Server-safe PLS/USD fetch: resolves null (never throws) on any failure. */
export async function fetchPlsUsd(): Promise<number | null> {
  try {
    return await fetchPlsUsdRaw();
  } catch {
    return null;
  }
}

/** wei -> dollars at the given PLS/USD rate. */
export const weiToUsd = (wei: bigint, plsUsd: number): number => (Number(wei) / 1e18) * plsUsd;

/** gwei -> dollars at the given PLS/USD rate. */
export const gweiToUsd = (gwei: number, plsUsd: number): number => (gwei / 1e9) * plsUsd;

/** Adaptive dollar formatting: $1.23, $0.0045, $0.00000412 — never "0.00". */
export function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(4);
  if (n === 0) return "$0";
  return "$" + n.toPrecision(3);
}

/**
 * Age of the last successful PLS price fetch. react-query keeps serving the
 * last good value when refetches fail, so a dollar figure priced hours ago
 * must not read as current — show "· 12 min ago" once the data is stale.
 */
export function priceAgeLabel(dataUpdatedAt?: number): string | null {
  if (!dataUpdatedAt) return null;
  const mins = Math.floor((Date.now() - dataUpdatedAt) / 60_000);
  return mins >= 6 ? `· ${mins} min ago` : null;
}
