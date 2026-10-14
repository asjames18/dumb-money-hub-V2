import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

import {
  DAMP,
  DAMP_WPLS_PAIR,
  DUMB,
  HELGOWPLS_PAIR,
  HEX_WPLS_PAIR,
  INCWPLS_PAIR,
  PCOCKWPLS_PAIR,
  PLSXWPLS_PAIR,
  PRVXWPLS_PAIR,
  PTGCWPLS_PAIR,
  SOLIDXWPLS_PAIR,
  TEDDYWPLS_PAIR,
  WBTCWPLS_PAIR,
  WPLS_DUMB_PAIR,
  erc20Abi,
  pairAbi,
  pulsechain,
} from "./pulsechain";
import { fmtUsd, usePlsPrice } from "./pls-price";

// Estimated USD prices for every curated token, derived from on-chain data
// only — no new external sources. Formula per token:
//   token/USD = (WPLS reserve / token reserve) from its verified WPLS pair × PLS/USD
// Pair ordering + decimals were verified on-chain 2026-09-26 (see script
// /tmp/verify_usd_pairs.py); UniswapV2 pairs are immutable so the ordering
// can't change. Anything that fails resolves to null for that token — never
// throws, never invents a price.
//
// ROOT CAUSE NOTE (2026-09-26): this module previously used
// client.multicall(), which silently failed on PulseChain because the
// multicall3 contract is NOT deployed there — so every price resolved null
// while the "indicative only" footnote still rendered. Single readContract
// calls (the same primitive wagmi's useReadContract uses for the swap box's
// working quotes) are used instead.

export type PriceTokenKey =
  | "PLS"
  | "DUMB"
  | "DAMP"
  | "HEX"
  | "TEDDY"
  | "SOLIDX"
  | "PCOCK"
  | "HELGO"
  | "INC"
  | "PLSX"
  | "PRVX"
  | "pTGC"
  | "WBTC";

export type TokenPrices = Record<PriceTokenKey, number | null>;

interface PricedToken {
  key: Exclude<PriceTokenKey, "PLS">;
  /** WPLS pair used for pricing. */
  pair: `0x${string}`;
  /** True when WPLS is token0 in the pair (verified on-chain). */
  wplsIsToken0: boolean;
  /** Verified on-chain via decimals(). */
  decimals: number;
}

const PRICED: readonly PricedToken[] = [
  { key: "DUMB", pair: WPLS_DUMB_PAIR, wplsIsToken0: true, decimals: 18 },
  { key: "DAMP", pair: DAMP_WPLS_PAIR, wplsIsToken0: false, decimals: 18 },
  { key: "HEX", pair: HEX_WPLS_PAIR, wplsIsToken0: false, decimals: 8 },
  { key: "TEDDY", pair: TEDDYWPLS_PAIR, wplsIsToken0: true, decimals: 18 },
  { key: "SOLIDX", pair: SOLIDXWPLS_PAIR, wplsIsToken0: false, decimals: 18 },
  { key: "PCOCK", pair: PCOCKWPLS_PAIR, wplsIsToken0: true, decimals: 18 },
  { key: "HELGO", pair: HELGOWPLS_PAIR, wplsIsToken0: false, decimals: 18 },
  { key: "INC", pair: INCWPLS_PAIR, wplsIsToken0: false, decimals: 18 },
  { key: "PLSX", pair: PLSXWPLS_PAIR, wplsIsToken0: false, decimals: 18 },
  { key: "PRVX", pair: PRVXWPLS_PAIR, wplsIsToken0: true, decimals: 18 },
  { key: "pTGC", pair: PTGCWPLS_PAIR, wplsIsToken0: false, decimals: 18 },
  { key: "WBTC", pair: WBTCWPLS_PAIR, wplsIsToken0: false, decimals: 8 },
] as const;

type PublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

async function priceOneToken(
  client: PublicClient,
  t: PricedToken,
  plsUsd: number,
): Promise<number | null> {
  try {
    // Single eth_call — mirrors the swap box's working useReadContract reads.
    const reserves = (await client.readContract({
      address: t.pair,
      abi: pairAbi,
      functionName: "getReserves",
    })) as unknown as readonly [bigint, bigint, number];
    const reserveWpls = t.wplsIsToken0 ? reserves[0] : reserves[1];
    const reserveToken = t.wplsIsToken0 ? reserves[1] : reserves[0];
    if (reserveWpls <= 0n || reserveToken <= 0n) return null;
    const wplsPerToken = Number(reserveWpls) / 10 ** 18 / (Number(reserveToken) / 10 ** t.decimals);
    const usd = wplsPerToken * plsUsd;
    return Number.isFinite(usd) && usd > 0 ? usd : null;
  } catch {
    return null;
  }
}

const EMPTY: TokenPrices = {
  PLS: null,
  DUMB: null,
  DAMP: null,
  HEX: null,
  TEDDY: null,
  SOLIDX: null,
  PCOCK: null,
  HELGO: null,
  INC: null,
  PLSX: null,
  PRVX: null,
  pTGC: null,
  WBTC: null,
};

/**
 * Estimated USD prices for every curated token: PLS from the site price feed,
 * everything else from its verified WPLS pair reserves × PLS/USD. Resolves
 * null per token (never throws) on any failure — RPC error, empty reserves,
 * or missing PLS price.
 */
export function useTokenPrices(): TokenPrices {
  const client = usePublicClient({ chainId: pulsechain.id });
  const { data: plsUsd } = usePlsPrice();
  const { data } = useQuery({
    queryKey: ["token-prices", plsUsd ?? "no-pls-price"],
    queryFn: async (): Promise<TokenPrices> => {
      if (!client || plsUsd == null) return { ...EMPTY, PLS: plsUsd ?? null };
      const entries = await Promise.all(
        PRICED.map(async (t): Promise<[PriceTokenKey, number | null]> => [
          t.key,
          await priceOneToken(client, t, plsUsd),
        ]),
      );
      return { ...EMPTY, PLS: plsUsd, ...Object.fromEntries(entries) } as TokenPrices;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  return data ?? { ...EMPTY, PLS: plsUsd ?? null };
}

/** Compact dollars: $1.23B, $4.56M, $789K. Falls back to fmtUsd below $1K. */
export function fmtUsdCompact(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return fmtUsd(n);
}

export interface MarketCaps {
  dumbMcapUsd: number | null;
  dampMcapUsd: number | null;
}

const MCAP_EMPTY: MarketCaps = { dumbMcapUsd: null, dampMcapUsd: null };

async function supplyOne(client: PublicClient, token: `0x${string}`): Promise<bigint | null> {
  try {
    // Single eth_call — same working primitive as the price reads above.
    const supply = (await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "totalSupply",
    })) as unknown as bigint;
    return supply > 0n ? supply : null;
  } catch {
    return null;
  }
}

/**
 * Estimated market caps: totalSupply() × the on-chain-derived USD price,
 * fully on-chain, no new data sources. Resolves null per token (never throws,
 * never invents) when the price or the supply read is unavailable.
 */
export function useMarketCaps(): MarketCaps {
  const client = usePublicClient({ chainId: pulsechain.id });
  const prices = useTokenPrices();
  const { data } = useQuery({
    queryKey: ["market-caps", prices.DUMB ?? "no-dumb", prices.DAMP ?? "no-damp"],
    queryFn: async (): Promise<MarketCaps> => {
      if (!client) return MCAP_EMPTY;
      const [dumbSupply, dampSupply] = await Promise.all([
        supplyOne(client, DUMB),
        supplyOne(client, DAMP),
      ]);
      const mcap = (supply: bigint | null, usd: number | null): number | null => {
        // Both tokens are 18-decimal (verified on-chain).
        if (supply == null || usd == null) return null;
        const v = (Number(supply) / 1e18) * usd;
        return Number.isFinite(v) && v > 0 ? v : null;
      };
      return {
        dumbMcapUsd: mcap(dumbSupply, prices.DUMB),
        dampMcapUsd: mcap(dampSupply, prices.DAMP),
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  return data ?? MCAP_EMPTY;
}

export interface DirectoryMarketRow {
  key: PriceTokenKey;
  /** Estimated USD price (WPLS pair reserves × PLS/USD); null when unreadable. */
  priceUsd: number | null;
  /**
   * Estimated USD liquidity = 2 × WPLS-side reserve × PLS/USD. In a balanced
   * V2 pair each side holds ~half the pool's value, so doubling the WPLS side
   * is the honest estimate derivable from reserves alone.
   */
  liquidityUsd: number | null;
}

async function marketOneToken(
  client: PublicClient,
  t: PricedToken,
  plsUsd: number,
): Promise<DirectoryMarketRow> {
  try {
    // Single eth_call — same working primitive as the price reads above.
    const reserves = (await client.readContract({
      address: t.pair,
      abi: pairAbi,
      functionName: "getReserves",
    })) as unknown as readonly [bigint, bigint, number];
    const reserveWpls = t.wplsIsToken0 ? reserves[0] : reserves[1];
    const reserveToken = t.wplsIsToken0 ? reserves[1] : reserves[0];
    if (reserveWpls <= 0n || reserveToken <= 0n)
      return { key: t.key, priceUsd: null, liquidityUsd: null };
    const wplsPerToken = Number(reserveWpls) / 10 ** 18 / (Number(reserveToken) / 10 ** t.decimals);
    const priceUsd = wplsPerToken * plsUsd;
    const liquidityUsd = (Number(reserveWpls) / 10 ** 18) * 2 * plsUsd;
    return {
      key: t.key,
      priceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null,
      liquidityUsd: Number.isFinite(liquidityUsd) && liquidityUsd > 0 ? liquidityUsd : null,
    };
  } catch {
    // The public RPC drops calls under batch load; a null here means
    // "couldn't read", never "worth zero". The UI renders it as unavailable.
    return { key: t.key, priceUsd: null, liquidityUsd: null };
  }
}

/**
 * Screener data for the vetted-token directory: live USD price + liquidity per
 * curated token, one getReserves call each (12 pairs total, read in small
 * chunks — the public RPC drops connections under heavy batches, so no big
 * Promise.all here). Resolves null per token (never throws) on any failure.
 *
 * DELIBERATELY OMITTED: 24h change and 24h volume need historical data —
 * block-by-block reserves or Swap-event log scans over ~17k blocks per pair —
 * that no current source provides. The hub has no caching layer yet, and
 * running those log scans per page load on the flaky public RPC is not viable.
 * Those columns stay out until a server-side cache exists; a column of "—"
 * placeholders would be decoration, not data.
 */
export function useDirectoryMarketData(): {
  rows: DirectoryMarketRow[];
  isLoading: boolean;
} {
  const client = usePublicClient({ chainId: pulsechain.id });
  const { data: plsUsd, isPending: plsPending } = usePlsPrice();
  const { data, isPending } = useQuery({
    queryKey: ["directory-market", plsUsd ?? "no-pls-price"],
    queryFn: async (): Promise<DirectoryMarketRow[]> => {
      if (!client || plsUsd == null)
        return PRICED.map((t) => ({ key: t.key, priceUsd: null, liquidityUsd: null }));
      const rows: DirectoryMarketRow[] = [];
      const CHUNK = 3;
      for (let i = 0; i < PRICED.length; i += CHUNK) {
        const chunk = await Promise.all(
          PRICED.slice(i, i + CHUNK).map((t) => marketOneToken(client, t, plsUsd)),
        );
        rows.push(...chunk);
      }
      return rows;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  return { rows: data ?? [], isLoading: plsPending || isPending };
}
