// Client fetch for GET /api/market — the DexScreener flagship-pair snapshot
// served by the worker (server-side, cached 60s). Every numeric field is
// nullable: the API leaves fields null on thin pairs, and the dashboard
// renders "unavailable" instead of inventing.

export type MarketQuote = {
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

export type MarketSnapshot = {
  at: number;
  source: string;
  sourceNote: string;
  cached?: boolean;
  stale?: boolean;
  dumb: MarketQuote;
  damp: MarketQuote;
};

export async function fetchMarket(): Promise<MarketSnapshot> {
  const res = await fetch("/api/market");
  if (!res.ok) throw new Error(`market ${res.status}`);
  const body = (await res.json()) as MarketSnapshot;
  if (!body || typeof body.at !== "number" || !body.dumb || !body.damp) {
    throw new Error("market shape");
  }
  return body;
}
