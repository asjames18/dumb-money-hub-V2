// Data layer for the /roots page — the legacy DUMB/DAMP story on PulseChain.
//
// Read-only against free public endpoints:
//   - GeckoTerminal: full pool inventory (the only complete pair list;
//     DEXScreener silently omits most pools, so it is never the pair source)
//   - PulseChain public RPC: live transfer tax (fees()), owner status,
//     fee-engine switch, dead-address burns, dormant contract piles
//
// No number is ever invented: every figure comes from a live call, and the UI
// shows honest loading/error states when a source is down.

import { CHAINS } from "./chains";
import { abiAddress, asUint, asUintAt, DEAD, ethCall, getJson } from "./format";

export const LEGACY_DUMB = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D";
export const LEGACY_DAMP = "0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3";

// Selectors via `cast sig`; live values verified 2026-09-26:
//
//   fees()            = TOTAL transfer tax, single word (bps):
//                       DUMB 600 (6%), DAMP 300 (3%).
//   feesDistribution() = split of that tax as shares summing to 10000, struct
//                       order [buyAndBurn, liquidity, burn, reflection]:
//                       DUMB (3333, 3333, 1667, 1667) -> of every taxed transfer
//                         2% to the contract's buy-and-burn bucket,
//                         2% to the contract's liquidity bucket,
//                         1% BURNED to the dead address,
//                         1% reflected to holders, 94% to the recipient.
//                       DAMP (3333, 0, 3333, 3334) -> of every taxed transfer
//                         1% to the contract, 1% burned, 1% reflected,
//                         97% to the recipient.
//   owner() = 0x0 on both (renounced); executeSwapsActive() = false.
//
// NOTE (2026-09-26 correction): an earlier version of this file called fees()
// (selector 0x9af1d35a) and misparsed its single-word total-tax return as the
// 4-word distribution tuple, producing the false claim "[600,0,0,0] — the whole
// tax piles into the contract, nothing burns on trades". The per-transfer burn
// (1%) and reflection (1%) shares are LIVE. What is dead is only the
// _processFees AUTO-PROCESSING engine: the accumulated buy-and-burn/liquidity
// buckets in the contract can never be processed (executeSwapsActive=false,
// owner renounced).
const SEL_TOTAL_TAX = "0x9af1d35a";
const SEL_FEES_DIST = "0xb068d56e";
const SEL_OWNER = "0x8da5cb5b";
const SEL_ENGINE = "0x5c38693d";
const SEL_BALANCE_OF = "0x70a08231";
const SEL_TOTAL_SUPPLY = "0x18160ddd";

export type RootPool = {
  name: string;
  address: string;
  liquidityUsd: number;
  volumeH24: number;
  buysH24: number;
  sellsH24: number;
};

type GTPoolAttrs = {
  name?: unknown;
  address?: unknown;
  reserve_in_usd?: unknown;
  volume_usd?: { h24?: unknown } | null;
  transactions?: { h24?: { buys?: unknown; sells?: unknown } } | null;
};

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Strip non-printable chars - dust-pool names sometimes carry odd unicode. */
export const cleanPoolName = (name: string) => {
  const cleaned = Array.from(name)
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp >= 32 && cp !== 127 && !(cp >= 128 && cp <= 159);
    })
    .join("")
    .trim();
  return cleaned || "Unknown pool";
};

async function fetchPools(token: string): Promise<RootPool[]> {
  const json = await getJson<{ data?: { attributes?: GTPoolAttrs }[] }>(
    `https://api.geckoterminal.com/api/v2/networks/pulsechain/tokens/${token}/pools`,
  );
  return (json.data ?? []).map((p) => {
    const a = p.attributes ?? {};
    return {
      name: cleanPoolName(str(a.name)),
      address: str(a.address),
      liquidityUsd: num(a.reserve_in_usd),
      volumeH24: num(a.volume_usd?.h24),
      buysH24: Math.round(num(a.transactions?.h24?.buys)),
      sellsH24: Math.round(num(a.transactions?.h24?.sells)),
    };
  });
}

export const fetchDumbPools = () => fetchPools(LEGACY_DUMB);
export const fetchDampPools = () => fetchPools(LEGACY_DAMP);

export type RootEngineState = {
  symbol: string;
  /** Transfer tax in basis points, read live from fees(). */
  taxBps: number;
  /**
   * Fee split as shares of the tax (sum = 10000), struct order:
   * [buyAndBurn, liquidity, burn, reflection]. Converted by the UI to
   * % of transfer. Live on every taxed transfer.
   */
  feeSplit: { buyAndBurn: number; liquidity: number; burn: number; reflection: number };
  /** True when ownership is renounced (owner() == 0x0). */
  renounced: boolean;
  /** Live executeSwapsActive() — the auto-liquidity/buy-back master switch. */
  engineOn: boolean;
  /** Tokens entombed in the token contract (auto-processing engine is dead). */
  dormant: bigint;
  dormantPct: number;
  /** Tokens burned to the dead address. */
  burned: bigint;
  burnedPct: number;
  totalSupply: bigint;
};

export type RootEngine = RootEngineState | null;

async function fetchTokenEngine(address: string, symbol: string): Promise<RootEngine> {
  const rpc = CHAINS.pulsechain.rpc;
  const [taxHex, distHex, ownerHex, engineHex, dormantHex, burnedHex, supplyHex] =
    await Promise.all([
      ethCall(rpc, address, SEL_TOTAL_TAX),
      ethCall(rpc, address, SEL_FEES_DIST),
      ethCall(rpc, address, SEL_OWNER),
      ethCall(rpc, address, SEL_ENGINE),
      ethCall(rpc, address, SEL_BALANCE_OF + abiAddress(address)),
      ethCall(rpc, address, SEL_BALANCE_OF + abiAddress(DEAD)),
      ethCall(rpc, address, SEL_TOTAL_SUPPLY),
    ]);
  const tax = asUint(taxHex);
  const owner = asUint(ownerHex);
  const engine = asUint(engineHex);
  const dormant = asUint(dormantHex);
  const burned = asUint(burnedHex);
  const supply = asUint(supplyHex);
  const split = [0, 1, 2, 3].map((i) => asUintAt(distHex, i));
  if (
    tax == null ||
    distHex == null ||
    owner == null ||
    engine == null ||
    dormant == null ||
    burned == null ||
    supply == null ||
    supply === 0n ||
    split.some((v) => v == null)
  ) {
    return null;
  }
  const pct = (v: bigint) => Number((v * 10000n) / supply) / 100;
  return {
    symbol,
    taxBps: Number(tax),
    feeSplit: {
      buyAndBurn: Number(split[0]),
      liquidity: Number(split[1]),
      burn: Number(split[2]),
      reflection: Number(split[3]),
    },
    renounced: owner === 0n,
    engineOn: engine !== 0n,
    dormant,
    dormantPct: pct(dormant),
    burned,
    burnedPct: pct(burned),
    totalSupply: supply,
  };
}

/** Live tax + engine + burn state for both legacy tokens. Null when the RPC is down. */
export async function fetchRootEngines(): Promise<[RootEngineState, RootEngineState] | null> {
  const [dumb, damp] = await Promise.all([
    fetchTokenEngine(LEGACY_DUMB, "DUMB"),
    fetchTokenEngine(LEGACY_DAMP, "DAMP"),
  ]);
  if (!dumb || !damp) return null;
  return [dumb, damp];
}
