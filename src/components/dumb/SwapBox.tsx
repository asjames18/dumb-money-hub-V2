import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { ChevronDown, Send, TriangleAlert, Twitter } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { trackEvent } from "@/lib/analytics";

import {
  DAMP,
  DAMP_PLSX_PAIR,
  DAMP_TAX_BPS,
  DAMP_WPLS_PAIR,
  DUMB,
  DUMB_PLSX_PAIR,
  DUMB_TAX_BPS,
  HELGO,
  HELGOWPLS_PAIR,
  HEX,
  HEX_DAMP_PAIR,
  HEX_DUMB_PAIR,
  HEX_WPLS_PAIR,
  INC,
  INC_DAMP_PAIR,
  INC_DUMB_PAIR,
  INCWPLS_PAIR,
  PCOCK,
  PCOCKWPLS_PAIR,
  PULSEX_V2_ROUTER,
  PLSX,
  PLSXWPLS_PAIR,
  PRVX,
  PRVXWPLS_PAIR,
  PTGC,
  PTGCWPLS_PAIR,
  SOLIDX,
  SOLIDXWPLS_PAIR,
  TEDDY,
  TEDDYWPLS_PAIR,
  WBTC,
  WBTCDUMB_PAIR,
  WBTCWPLS_PAIR,
  WPLS,
  WPLS_DUMB_PAIR,
  erc20Abi,
  explorerAddress,
  explorerTx,
  pairAbi,
  pulsechain,
  routerAbi,
} from "@/lib/pulsechain";
import { ConnectButton } from "./ConnectButton";
import { SITE } from "@/data/dump";
import { fmtUsd } from "@/lib/pls-price";
import { fmtUsdCompact, useMarketCaps, useTokenPrices } from "@/lib/token-prices";
import { CopyButton } from "./CopyButton";
import { NativeShareButton } from "./NativeShareButton";
import { Button } from "@/components/ui/button";

const SLIPPAGE_PRESETS = [5, 8, 12];
const DEFAULT_SLIPPAGE = 8;
const DEADLINE_SECONDS = 20 * 60;
const IMPACT_WARN_PCT = 5;
const IMPACT_BLOCK_PCT = 25;

type TokenKey = "DUMB" | "DAMP";
/** Buy-side pay tokens. TEDDY / SOLIDX / PCOCK / HELGO route
 *  TOKEN->WPLS->DUMB/DAMP (verified WPLS pairs only, like PRVX / pTGC);
 *  WBTC has a direct WBTC/DUMB pair and routes via WPLS for DAMP. */
type PayKey =
  | "PLS"
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
/** Sell-side receive token. DUMB/DAMP outputs enable the DUMB<->DAMP swap
 *  via WPLS. */
type SellOutKey =
  | "PLS"
  | "HEX"
  | "TEDDY"
  | "SOLIDX"
  | "PCOCK"
  | "HELGO"
  | "INC"
  | "PLSX"
  | "PRVX"
  | "pTGC"
  | "WBTC"
  | "DUMB"
  | "DAMP";
/** Any token id the box can reference. */
type TokKey = PayKey | SellOutKey | TokenKey;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

interface Tok {
  id: string;
  symbol: string;
  /** null = native PLS (no contract). */
  address: `0x${string}` | null;
  decimals: number;
  blurb: string;
}

/** Every token the box touches. Addresses verified on-chain (see pulsechain.ts). */
const TOKENS: Record<TokKey, Tok> = {
  PLS: {
    id: "PLS",
    symbol: "PLS",
    address: null,
    decimals: 18,
    blurb: "PLS — the native coin, no contract",
  },
  HEX: {
    id: "HEX",
    symbol: "HEX",
    address: HEX,
    decimals: 8,
    blurb: "HEX — pHEX, the PulseChain-native HEX (8 decimals)",
  },
  TEDDY: {
    id: "TEDDY",
    symbol: "TEDDY",
    address: TEDDY,
    decimals: 18,
    blurb: "TEDDY — Teddy Bear, 18 decimals, routed TEDDY → WPLS → DUMB/DAMP",
  },
  SOLIDX: {
    id: "SOLIDX",
    symbol: "SOLIDX",
    address: SOLIDX,
    decimals: 18,
    blurb: "SOLIDX — Solid X, 18 decimals, routed SOLIDX → WPLS → DUMB/DAMP",
  },
  PCOCK: {
    id: "PCOCK",
    symbol: "PCOCK",
    address: PCOCK,
    decimals: 18,
    blurb: "PCOCK — PulseChain Peacock, 18 decimals, routed PCOCK → WPLS → DUMB/DAMP",
  },
  HELGO: {
    id: "HELGO",
    symbol: "HELGO",
    address: HELGO,
    decimals: 18,
    blurb: "HELGO — 18 decimals, routed HELGO → WPLS → DUMB/DAMP",
  },
  INC: {
    id: "INC",
    symbol: "INC",
    address: INC,
    decimals: 18,
    blurb: "INC — 18 decimals, direct DUMB + DAMP pairs",
  },
  PLSX: {
    id: "PLSX",
    symbol: "PLSX",
    address: PLSX,
    decimals: 18,
    blurb: "PLSX — the PulseX token, 18 decimals",
  },
  PRVX: {
    id: "PRVX",
    symbol: "PRVX",
    address: PRVX,
    decimals: 18,
    blurb: "PRVX — 18 decimals, routed PRVX → WPLS → DUMB/DAMP",
  },
  pTGC: {
    id: "pTGC",
    symbol: "pTGC",
    address: PTGC,
    decimals: 18,
    blurb: "pTGC — 18 decimals, routed pTGC → WPLS → DUMB/DAMP",
  },
  WBTC: {
    id: "WBTC",
    symbol: "WBTC",
    address: WBTC,
    decimals: 8,
    blurb: "WBTC — 8 decimals, direct WBTC/DUMB pair; WPLS-routed for DAMP",
  },
  DUMB: {
    id: "DUMB",
    symbol: "DUMB",
    address: DUMB,
    decimals: 18,
    blurb: "DUMB — the live token, 6% transfer tax",
  },
  DAMP: {
    id: "DAMP",
    symbol: "DAMP",
    address: DAMP,
    decimals: 18,
    blurb: "DAMP — the secondary token, 3% transfer tax",
  },
};

interface Market {
  pair: `0x${string}`;
  label: string;
  sideA: string;
  sideB: string;
  /** True when sideA is token0 in the pair. */
  aIsToken0: boolean;
}

/** Every live market, verified on-chain 2026-09-26 (token0/token1, nonzero
 *  reserves, factory.getPair matches). Paste-any-address stays rejected. */
const MARKETS: Market[] = [
  { pair: WPLS_DUMB_PAIR, label: "WPLS/DUMB", sideA: "WPLS", sideB: "DUMB", aIsToken0: true },
  { pair: DAMP_WPLS_PAIR, label: "DAMP/WPLS", sideA: "DAMP", sideB: "WPLS", aIsToken0: true },
  { pair: HEX_DUMB_PAIR, label: "HEX/DUMB", sideA: "HEX", sideB: "DUMB", aIsToken0: true },
  { pair: INC_DUMB_PAIR, label: "INC/DUMB", sideA: "INC", sideB: "DUMB", aIsToken0: true },
  { pair: DAMP_PLSX_PAIR, label: "DAMP/PLSX", sideA: "DAMP", sideB: "PLSX", aIsToken0: true },
  { pair: HEX_DAMP_PAIR, label: "HEX/DAMP", sideA: "HEX", sideB: "DAMP", aIsToken0: true },
  { pair: INC_DAMP_PAIR, label: "INC/DAMP", sideA: "INC", sideB: "DAMP", aIsToken0: true },
  { pair: WBTCDUMB_PAIR, label: "WBTC/DUMB", sideA: "WBTC", sideB: "DUMB", aIsToken0: true },
  { pair: DUMB_PLSX_PAIR, label: "DUMB/PLSX", sideA: "PLSX", sideB: "DUMB", aIsToken0: true },
  // WPLS routing legs used by the multihop buy inputs — also live markets.
  { pair: HEX_WPLS_PAIR, label: "HEX/WPLS", sideA: "HEX", sideB: "WPLS", aIsToken0: true },
  { pair: PRVXWPLS_PAIR, label: "PRVX/WPLS", sideA: "PRVX", sideB: "WPLS", aIsToken0: false },
  { pair: PTGCWPLS_PAIR, label: "pTGC/WPLS", sideA: "pTGC", sideB: "WPLS", aIsToken0: true },
  { pair: WBTCWPLS_PAIR, label: "WBTC/WPLS", sideA: "WBTC", sideB: "WPLS", aIsToken0: true },
  { pair: INCWPLS_PAIR, label: "INC/WPLS", sideA: "INC", sideB: "WPLS", aIsToken0: true },
  { pair: PLSXWPLS_PAIR, label: "PLSX/WPLS", sideA: "PLSX", sideB: "WPLS", aIsToken0: true },
  { pair: TEDDYWPLS_PAIR, label: "TEDDY/WPLS", sideA: "TEDDY", sideB: "WPLS", aIsToken0: false },
  { pair: SOLIDXWPLS_PAIR, label: "SOLIDX/WPLS", sideA: "SOLIDX", sideB: "WPLS", aIsToken0: true },
  { pair: PCOCKWPLS_PAIR, label: "PCOCK/WPLS", sideA: "PCOCK", sideB: "WPLS", aIsToken0: false },
  { pair: HELGOWPLS_PAIR, label: "HELGO/WPLS", sideA: "HELGO", sideB: "WPLS", aIsToken0: true },
];

const findMarket = (a: string, b: string): Market | null =>
  MARKETS.find((m) => (m.sideA === a && m.sideB === b) || (m.sideA === b && m.sideB === a)) ?? null;

/** WPLS -> output second-leg pair for sell-side multihop. DUMB/DAMP use their
 *  flagship WPLS pairs; every other output reuses its verified WPLS_HOP leg
 *  (hop pairs are TOKEN/WPLS, so the non-input side is WPLS). null = no route. */
function wplsHopOut(outKey: string): { pair: `0x${string}`; wplsIsToken0: boolean } | null {
  if (outKey === "DUMB") return { pair: WPLS_DUMB_PAIR, wplsIsToken0: true };
  if (outKey === "DAMP") return { pair: DAMP_WPLS_PAIR, wplsIsToken0: false };
  const h: { pair: `0x${string}`; inputIsToken0: boolean } | null =
    (WPLS_HOP as Record<string, { pair: `0x${string}`; inputIsToken0: boolean } | null>)[outKey] ??
    null;
  if (!h) return null;
  return { pair: h.pair, wplsIsToken0: !h.inputIsToken0 };
}

type RouteKind = "eth-in" | "eth-out" | "direct" | "multihop";

interface Route {
  kind: RouteKind;
  path: [`0x${string}`, ...`0x${string}`[]];
  /** Pair whose reserves feed the single-hop impact math. */
  impactPair: `0x${string}`;
  /** True when the input token is token0 in impactPair. */
  inputIsToken0: boolean;
  /** Human label, e.g. "HEX/DUMB". */
  label: string;
  /** First-leg pair for multihop (input/WPLS), for two-leg impact math. */
  hopPair?: `0x${string}`;
  /** True when the input token is token0 in hopPair. */
  hopInputIsToken0?: boolean;
  /** Sell-multihop only: true when WPLS is token0 in hopPair (the second leg). */
  hopWplsIsToken0?: boolean;
}

/** Token order for the verified list. */
const TOKEN_LIST: TokKey[] = [
  "PLS",
  "HEX",
  "TEDDY",
  "SOLIDX",
  "PCOCK",
  "HELGO",
  "INC",
  "PLSX",
  "PRVX",
  "pTGC",
  "WBTC",
  "DUMB",
  "DAMP",
];
/** Buy-side pay options, in selector order. TEDDY / SOLIDX / PCOCK / HELGO
 *  route via their verified WPLS pairs (multihop), like PRVX / pTGC. */
const PAY_KEYS: PayKey[] = [
  "PLS",
  "HEX",
  "TEDDY",
  "SOLIDX",
  "PCOCK",
  "HELGO",
  "INC",
  "PLSX",
  "PRVX",
  "pTGC",
  "WBTC",
];
/** Sell-side receive options per pay token — every listed token, both ways.
 *  Direct pair wins; otherwise the DUMB/DAMP -> WPLS -> token multihop. */
const SELL_OUTS: Record<TokenKey, SellOutKey[]> = {
  DUMB: [
    "PLS",
    "HEX",
    "TEDDY",
    "SOLIDX",
    "PCOCK",
    "HELGO",
    "INC",
    "PLSX",
    "PRVX",
    "pTGC",
    "WBTC",
    "DAMP",
  ],
  DAMP: [
    "PLS",
    "HEX",
    "TEDDY",
    "SOLIDX",
    "PCOCK",
    "HELGO",
    "INC",
    "PLSX",
    "PRVX",
    "pTGC",
    "WBTC",
    "DUMB",
  ],
};
/** WPLS-routed fallback for buy inputs with no direct pair to the target.
 *  Per-payKey first-leg pair + verified token0 side, so the multihop impact
 *  math reads the right reserve. null = no WPLS route for this input. */
const WPLS_HOP: Record<
  Exclude<PayKey, "PLS">,
  { pair: `0x${string}`; inputIsToken0: boolean } | null
> = {
  HEX: { pair: HEX_WPLS_PAIR, inputIsToken0: true },
  TEDDY: { pair: TEDDYWPLS_PAIR, inputIsToken0: false },
  SOLIDX: { pair: SOLIDXWPLS_PAIR, inputIsToken0: true },
  PCOCK: { pair: PCOCKWPLS_PAIR, inputIsToken0: false },
  HELGO: { pair: HELGOWPLS_PAIR, inputIsToken0: true },
  INC: null,
  PLSX: null,
  PRVX: { pair: PRVXWPLS_PAIR, inputIsToken0: false },
  pTGC: { pair: PTGCWPLS_PAIR, inputIsToken0: true },
  WBTC: { pair: WBTCWPLS_PAIR, inputIsToken0: true },
};

interface TokenCfg {
  key: TokenKey;
  symbol: string;
  address: typeof DUMB | typeof DAMP;
  pair: typeof WPLS_DUMB_PAIR | typeof DAMP_WPLS_PAIR;
  /** "WPLS/DUMB" style label for copy. */
  pairLabel: string;
  taxBps: number;
  /** After-tax percent of the token leg, as an integer (94 = 94%). */
  afterTaxPct: number;
  /** True when WPLS is token0 in the pair. DAMP/WPLS is reversed (verified). */
  wplsIsToken0: boolean;
  /** Tooltip for the token selector. */
  blurb: string;
}

const TOKEN_CFGS: Record<TokenKey, TokenCfg> = {
  DUMB: {
    key: "DUMB",
    symbol: "DUMB",
    address: DUMB,
    pair: WPLS_DUMB_PAIR,
    pairLabel: "WPLS/DUMB",
    taxBps: DUMB_TAX_BPS,
    afterTaxPct: 94,
    wplsIsToken0: true,
    blurb: "DUMB — the live token, 6% transfer tax",
  },
  DAMP: {
    key: "DAMP",
    symbol: "DAMP",
    address: DAMP,
    pair: DAMP_WPLS_PAIR,
    pairLabel: "DAMP/WPLS",
    taxBps: DAMP_TAX_BPS,
    afterTaxPct: 97,
    wplsIsToken0: false,
    blurb: "DAMP — the secondary token, 3% transfer tax",
  },
};

/** Compact token amount: up to 4 significant decimals, no trailing zeros. */
function fmt(bi: bigint | null | undefined, decimals = 18): string {
  if (bi == null) return "—";
  const s = formatUnits(bi, decimals);
  const [i, d = ""] = s.split(".");
  const int = Number(i).toLocaleString("en-US");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  return dec ? `${int}.${dec}` : int;
}

/** Share URL for intents: the configured site URL, else the live origin. */
function siteShareUrl(): string {
  return SITE.url || (typeof window !== "undefined" ? window.location.origin : "");
}

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied/i.test(m)) return "Signature rejected in wallet.";
  if (/insufficient funds/i.test(m)) return "Insufficient PLS for gas + swap.";
  return (m.split("\n")[0] ?? "").slice(0, 180);
}

/**
 * On-site swap: trade DUMB/DAMP both ways through PulseX v2.
 * Buy: pay with PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX,
 * PRVX, pTGC, or WBTC for DUMB/DAMP. A direct pair wins when one exists
 * (single hop); the rest route TOKEN -> WPLS -> DUMB/DAMP. HEX keeps both
 * routes selectable.
 * Sell: DUMB/DAMP back into PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX,
 * PRVX, pTGC, WBTC — or DUMB<->DAMP through WPLS. Direct pair wins when one
 * exists (PLS via the ETH-unwrap variant); otherwise DUMB/DAMP -> WPLS ->
 * token. The 1% burn fires on the taxed leg in either direction.
 * Pure frontend: quotes and transactions go straight to PulseX contracts, the
 * user's own wallet signs everything.
 * The DUMB/DAMP transfer tax is applied on whichever side holds the taxed
 * token (input on sells, output on buys, both on DUMB<->DAMP), so the UI
 * always shows the honest receive amount. Curated tokens only —
 * paste-any-address was rejected as a honeypot vector.
 */
export function SwapBox() {
  const { address, chainId } = useAccount();
  const onPulse = chainId === pulsechain.id;

  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [payKey, setPayKey] = useState<PayKey>("PLS");
  const [tokenKey, setTokenKey] = useState<TokenKey>("DUMB");
  const [sellOutKey, setSellOutKey] = useState<SellOutKey>("PLS");
  /** HEX keeps its legacy WPLS route selectable alongside the direct pair. */
  const [routeSel, setRouteSel] = useState<"auto" | "direct" | "multihop">("auto");
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [lastAction, setLastAction] = useState<"approve" | "swap" | null>(null);
  /** Snapshot of the last SWAP attempt — so the share text always reflects the
      real traded amounts, even if the input is edited after confirmation.
      Cleared on any approve or selector change. */
  const [lastTrade, setLastTrade] = useState<{
    amountIn: bigint;
    inDecimals: number;
    inSymbol: string;
    estOut: bigint | null;
    outDecimals: number;
    outSymbol: string;
  } | null>(null);
  /** Verified tokens & markets list starts collapsed (long list, 2026-09-26). */
  const [verifiedOpen, setVerifiedOpen] = useState(false);

  const cfg = TOKEN_CFGS[tokenKey];
  const isSell = direction === "sell";
  const payIsPls = payKey === "PLS";

  const payTok = isSell ? TOKENS[tokenKey] : TOKENS[payKey];
  const rcvTok = isSell ? TOKENS[sellOutKey] : TOKENS[tokenKey];

  // Route resolution: direct pair first (single hop), WPLS multi-hop for
  // inputs without one, null when no route exists (e.g. PLSX -> DUMB,
  // pTGC -> DAMP direct leg missing).
  const route: Route | null = ((): Route | null => {
    if (isSell) {
      if (sellOutKey === "PLS")
        return {
          kind: "eth-out",
          path: [cfg.address, WPLS],
          impactPair: cfg.pair,
          inputIsToken0: !cfg.wplsIsToken0,
          label: cfg.pairLabel,
        };
      if (sellOutKey === tokenKey) return null; // no self-trades
      const m = findMarket(tokenKey, sellOutKey);
      if (m) {
        const payIsA = m.sideA === tokenKey;
        return {
          kind: "direct",
          path: [cfg.address, TOKENS[sellOutKey].address as `0x${string}`],
          impactPair: m.pair,
          inputIsToken0: payIsA ? m.aIsToken0 : !m.aIsToken0,
          label: m.label,
        };
      }
      // No direct pair: DUMB/DAMP -> WPLS -> output through the two verified
      // WPLS legs. The 1% burn fires on the taxed input leg either way.
      const hop = wplsHopOut(sellOutKey);
      if (!hop) return null;
      return {
        kind: "multihop",
        path: [cfg.address, WPLS, TOKENS[sellOutKey].address as `0x${string}`],
        impactPair: cfg.pair,
        inputIsToken0: !cfg.wplsIsToken0,
        label: `${cfg.symbol} → WPLS → ${TOKENS[sellOutKey].symbol}`,
        hopPair: hop.pair,
        hopWplsIsToken0: hop.wplsIsToken0,
      };
    }
    if (payIsPls)
      return {
        kind: "eth-in",
        path: [WPLS, cfg.address],
        impactPair: cfg.pair,
        inputIsToken0: cfg.wplsIsToken0,
        label: cfg.pairLabel,
      };
    const m = findMarket(payKey, tokenKey);
    const hop = WPLS_HOP[payKey];
    // HEX keeps its legacy WPLS route selectable; otherwise a direct pair
    // wins (single hop), else the WPLS multihop fallback.
    const forceMultihop = routeSel === "multihop" && hop !== null;
    if (m && !forceMultihop) {
      const payIsA = m.sideA === payKey;
      return {
        kind: "direct",
        path: [TOKENS[payKey].address as `0x${string}`, cfg.address],
        impactPair: m.pair,
        inputIsToken0: payIsA ? m.aIsToken0 : !m.aIsToken0,
        label: m.label,
      };
    }
    if (hop && (forceMultihop || !m))
      return {
        kind: "multihop",
        path: [TOKENS[payKey].address as `0x${string}`, WPLS, cfg.address],
        impactPair: cfg.pair,
        inputIsToken0: cfg.wplsIsToken0,
        label: `${cfg.pairLabel} via WPLS`,
        hopPair: hop.pair,
        hopInputIsToken0: hop.inputIsToken0,
      };
    return null;
  })();

  // The effective input/output tokens (null address = native PLS, no contract).
  const inputTokenAddress = payTok.address;
  const inputDecimals = payTok.decimals;
  const inputSymbol = payTok.symbol;
  const outputSymbol = rcvTok.symbol;
  const outputAddress = rcvTok.address;
  // Tokens whose own transfer tax is unknown — the quote can't reflect it.
  // (DUMB/DAMP legs always get the explicit after-tax factor, whichever side.)
  const otherSideUnknownTax =
    (isSell && sellOutKey !== "PLS" && sellOutKey !== "DUMB" && sellOutKey !== "DAMP") ||
    (!isSell &&
      (payKey === "INC" ||
        payKey === "PLSX" ||
        payKey === "PRVX" ||
        payKey === "pTGC" ||
        payKey === "WBTC"));

  let parsedIn: bigint | null = null;
  try {
    parsedIn = amountIn.trim() ? parseUnits(amountIn.trim(), inputDecimals) : null;
  } catch {
    parsedIn = null;
  }
  if (parsedIn !== null && parsedIn <= 0n) parsedIn = null;

  // The DUMB/DAMP transfer tax hits whichever side holds the taxed token: the
  // input leg on sells, the output leg on buys, both legs on DUMB<->DAMP. The
  // router quotes pre-tax, so the taxed input is reduced BEFORE quoting and
  // the taxed output AFTER.
  const inTaxPct = isSell ? cfg.afterTaxPct : 100;
  const outTokKey: TokenKey | null = !isSell
    ? tokenKey
    : sellOutKey === "DUMB" || sellOutKey === "DAMP"
      ? sellOutKey
      : null;
  const outTaxPct = outTokKey ? TOKEN_CFGS[outTokKey].afterTaxPct : 100;
  const taxIn = parsedIn !== null ? (parsedIn * BigInt(inTaxPct)) / 100n : null;

  // Balances (input side)
  const { data: plsBal, refetch: refetchPls } = useBalance({
    address,
    query: { enabled: !!address },
  });
  const { data: inTokenBal, refetch: refetchInToken } = useReadContract({
    address: (inputTokenAddress ?? ZERO_ADDRESS) as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: !!address && !!inputTokenAddress },
  });

  // Reserves for price-impact math on the route's pair; plus the first-leg
  // pair for the WPLS multihop routes.
  const { data: reserves } = useReadContract({
    address: (route?.impactPair ?? ZERO_ADDRESS) as `0x${string}`,
    abi: pairAbi,
    functionName: "getReserves",
    query: { enabled: !!route, refetchInterval: 15_000 },
  });
  const { data: inReserves } = useReadContract({
    address: (route?.hopPair ?? ZERO_ADDRESS) as `0x${string}`,
    abi: pairAbi,
    functionName: "getReserves",
    query: { enabled: route?.kind === "multihop" && !!route?.hopPair, refetchInterval: 15_000 },
  });

  // Pre-tax quote from the router, on the post-input-tax amount.
  const { data: amounts, error: quoteError } = useReadContract({
    address: PULSEX_V2_ROUTER,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: [taxIn ?? 0n, route ? [...route.path] : []],
    query: { enabled: !!parsedIn && onPulse && !!route, refetchInterval: 15_000 },
  });

  // Exact-amount approval state for the INPUT token (never infinite approvals).
  // On sell the input is DUMB/DAMP; on buy it's the curated token (PLS needs none).
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: (inputTokenAddress ?? ZERO_ADDRESS) as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? ZERO_ADDRESS, PULSEX_V2_ROUTER],
    query: { enabled: !!address && !!inputTokenAddress },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isFailed,
  } = useWaitForTransactionReceipt({ hash });
  // isSuccess only means a receipt was fetched — a reverted tx still returns
  // one. Only the receipt's status tells us the transaction actually
  // executed; without this the UI (and share buttons) would celebrate a
  // failed swap as confirmed.
  const txSucceeded = isConfirmed && receipt?.status === "success";
  const txReverted = isConfirmed && receipt?.status === "reverted";

  useEffect(() => {
    if (!txSucceeded) return;
    if (lastAction === "approve") void refetchAllowance();
    if (lastAction === "swap") {
      setAmountIn("");
      void refetchPls();
      void refetchInToken();
      void refetchAllowance();
      trackEvent("swap_confirmed");
    }
    setLastAction(null);
  }, [txSucceeded, lastAction, refetchAllowance, refetchPls, refetchInToken]);

  // --- derived numbers -------------------------------------------------
  const quotedOut = amounts?.[amounts.length - 1] ?? null;
  // Output-side tax (buys, and DUMB<->DAMP sells): the pre-tax quote
  // overstates what arrives by exactly the tax.
  const afterTaxOut = quotedOut !== null ? (quotedOut * BigInt(outTaxPct)) / 100n : null;
  const minOut =
    afterTaxOut !== null
      ? (afterTaxOut * BigInt(Math.round((1 - slippage / 100) * 10_000))) / 10_000n
      : null;

  // Human-verbs quote card: which legs of this trade carry the transfer tax,
  // and the exact base amount each tax applies to. Canonical split (locked):
  // DUMB 6% = 5% instant burn + 1% reflections; DAMP 3% = 2% + 1%.
  // Reflections are always 1% (100 bps), so burn = taxBps - 100.
  const quoteTaxLegs: { symbol: string; taxBps: number; base: bigint; decimals: number }[] =
    parsedIn !== null && quotedOut !== null
      ? [
          ...(isSell
            ? [{ symbol: cfg.symbol, taxBps: cfg.taxBps, base: parsedIn, decimals: inputDecimals }]
            : []),
          ...(outTokKey
            ? [
                {
                  symbol: outTokKey,
                  taxBps: TOKEN_CFGS[outTokKey].taxBps,
                  base: quotedOut,
                  decimals: rcvTok.decimals,
                },
              ]
            : !isSell
              ? [
                  {
                    symbol: cfg.symbol,
                    taxBps: cfg.taxBps,
                    base: quotedOut,
                    decimals: rcvTok.decimals,
                  },
                ]
              : []),
        ]
      : [];

  // --- anonymous usage + issue signals (no PII, fixed categories only) ----
  // Quote seen: fires once per distinct input/route (the 15s refetch reuses
  // the same key, so polling never double-counts).
  const lastQuoteKey = useRef<string | null>(null);
  useEffect(() => {
    if (quotedOut == null || parsedIn == null || !route) {
      lastQuoteKey.current = null;
      return;
    }
    const key = `${parsedIn.toString()}:${route.path.join(">")}`;
    if (lastQuoteKey.current !== key) {
      lastQuoteKey.current = key;
      trackEvent("swap_quote");
    }
  }, [quotedOut, parsedIn, route]);
  // Quote failures: one event per failure episode (RPC flakiness otherwise
  // spams). Category only — the raw error never leaves the device.
  const quoteErrNoted = useRef(false);
  useEffect(() => {
    if (quoteError && !quoteErrNoted.current) {
      quoteErrNoted.current = true;
      trackEvent("err_quote");
    } else if (!quoteError) {
      quoteErrNoted.current = false;
    }
  }, [quoteError]);
  // Wallet-side failure (rejected / pre-broadcast error): one per episode.
  const txErrNoted = useRef(false);
  useEffect(() => {
    if (error && !txErrNoted.current) {
      txErrNoted.current = true;
      trackEvent("err_tx");
    } else if (!error) {
      txErrNoted.current = false;
    }
  }, [error]);
  // On-chain swap failure (reverted / receipt error): once per tx hash.
  // Gated on lastAction so a reverted *approval* isn't miscounted as a failed swap.
  const failNotedFor = useRef<string | null>(null);
  useEffect(() => {
    if ((!txReverted && !isFailed) || !hash) return;
    if (lastAction !== "swap") return;
    if (failNotedFor.current === hash) return;
    failNotedFor.current = hash;
    trackEvent("swap_failed");
  }, [txReverted, isFailed, hash, lastAction]);

  // USD estimates for both sides of the quote, from on-chain reserves
  // (verified WPLS pair × PLS/USD) — "~…est.", never exact. Shown for every
  // token that has a price; null renders nothing.
  const prices = useTokenPrices();
  const { dampMcapUsd } = useMarketCaps();
  const usdFor = (amount: bigint | null, key: string): string | null => {
    if (amount === null || amount <= 0n) return null;
    const p = (prices as Record<string, number | null>)[key];
    const dec = (TOKENS as Record<string, { decimals?: number }>)[key]?.decimals;
    if (p == null || dec == null) return null;
    const v = (Number(amount) / 10 ** dec) * p;
    if (!Number.isFinite(v) || v <= 0) return null;
    return `~${fmtUsd(v)} est.`;
  };
  const usdPay = usdFor(parsedIn, isSell ? cfg.key : payKey);
  const usdReceive = !isSell
    ? usdFor(afterTaxOut, cfg.key)
    : outTokKey
      ? usdFor(afterTaxOut, outTokKey)
      : null;
  const usdNote =
    usdPay || usdReceive
      ? "USD estimates from WPLS pair reserves × PLS/USD — indicative only, execution price varies."
      : null;

  /** Pre-filled, honest share copy for a CONFIRMED swap only — nothing is
      ever posted automatically; the user clicks through and posts themselves.
      Uses the at-send snapshot so later input edits can't make the text lie.
      Facts only: real amounts + explorer receipt, no promises. */
  const tradeShare = useMemo(() => {
    if (!lastTrade || !hash) return null;
    const tx = explorerTx(hash);
    const inPart = `${fmt(lastTrade.amountIn, lastTrade.inDecimals)} ${lastTrade.inSymbol}`;
    const outPart = `~${fmt(lastTrade.estOut, lastTrade.outDecimals)} ${lastTrade.outSymbol}`;
    const xBody = `I just swapped ${inPart} → ${outPart} on the Dumb Money hub (PulseChain) 💸\n\nVerified on-chain: ${tx}\n\nNo promises — do your own homework.`;
    const tgBody = `I just swapped ${inPart} → ${outPart} on the Dumb Money hub (PulseChain) 💸 — verified on-chain. No promises, DYOR.`;
    return {
      title: "Dumb Money swap",
      text: tgBody,
      url: tx,
      xHref: `https://x.com/intent/post?text=${encodeURIComponent(xBody)}`,
      tgHref: `https://t.me/share/url?url=${encodeURIComponent(siteShareUrl())}&text=${encodeURIComponent(tgBody)}`,
    };
  }, [lastTrade, hash]);

  // Price impact, measured on what actually reaches the first pair (post
  // input tax). Single-hop routes measure the input against the input-side
  // reserve of the route's pair. Multihop routes combine both legs as
  // 1-(1-l1)(1-l2), all in bigint basis points to avoid float precision loss
  // on large reserves.
  let impact: number | null = null;
  if (taxIn && taxIn > 0n && reserves && route) {
    if (route.kind === "multihop" && inReserves && amounts && amounts.length === 3) {
      const mid = amounts[1] ?? 0n;
      if (mid > 0n) {
        if (!isSell && route.hopInputIsToken0 !== undefined) {
          // Buy: leg 1 input->WPLS on hopPair, leg 2 WPLS->output on impactPair.
          const wplsReserveOut = cfg.wplsIsToken0 ? reserves[0] : reserves[1];
          const inReserve = route.hopInputIsToken0 ? inReserves[0] : inReserves[1];
          if (inReserve > 0n && wplsReserveOut > 0n) {
            const l1bps = (taxIn * 10_000n) / (inReserve + taxIn);
            const l2bps = (mid * 10_000n) / (wplsReserveOut + mid);
            const combined = 10_000n - ((10_000n - l1bps) * (10_000n - l2bps)) / 10_000n;
            impact = Number(combined) / 100;
          }
        } else if (isSell && route.hopWplsIsToken0 !== undefined) {
          // Sell: leg 1 input->WPLS on impactPair, leg 2 WPLS->output on hopPair.
          const inReserve = route.inputIsToken0 ? reserves[0] : reserves[1];
          const wplsReserveHop = route.hopWplsIsToken0 ? inReserves[0] : inReserves[1];
          if (inReserve > 0n && wplsReserveHop > 0n) {
            const l1bps = (taxIn * 10_000n) / (inReserve + taxIn);
            const l2bps = (mid * 10_000n) / (wplsReserveHop + mid);
            const combined = 10_000n - ((10_000n - l1bps) * (10_000n - l2bps)) / 10_000n;
            impact = Number(combined) / 100;
          }
        }
      }
    } else if (route.kind !== "multihop") {
      const inReserve = route.inputIsToken0 ? reserves[0] : reserves[1];
      if (inReserve > 0n) impact = Number((taxIn * 10_000n) / (inReserve + taxIn)) / 100;
    }
  }

  const balIn = inputTokenAddress ? (inTokenBal ?? null) : (plsBal?.value ?? null);
  const insufficient = parsedIn !== null && balIn !== null && parsedIn > balIn;
  const blockedByImpact = impact !== null && impact > IMPACT_BLOCK_PCT;
  const needsApproval = !!inputTokenAddress && parsedIn !== null && (allowance ?? 0n) < parsedIn;

  const selectDirection = (dir: "buy" | "sell") => {
    if (dir === direction) return;
    setDirection(dir);
    setAmountIn("");
    reset();
    setLastAction(null);
    setLastTrade(null);
  };

  const selectToken = (key: TokenKey) => {
    if (key === tokenKey) return;
    setTokenKey(key);
    // Keep the sell output valid — not every token has every market.
    if (isSell && !SELL_OUTS[key].includes(sellOutKey)) setSellOutKey("PLS");
    setAmountIn("");
    reset();
    setLastAction(null);
    setLastTrade(null);
  };

  const selectPay = (key: PayKey) => {
    if (key === payKey) return;
    setPayKey(key);
    setRouteSel("auto");
    setAmountIn("");
    reset();
    setLastAction(null);
    setLastTrade(null);
  };

  const selectSellOut = (key: SellOutKey) => {
    if (key === sellOutKey) return;
    setSellOutKey(key);
    setAmountIn("");
    reset();
    setLastAction(null);
    setLastTrade(null);
  };

  const maxIn = () => {
    if (balIn === null) return;
    if (!isSell && payIsPls) {
      // Leave ~1 PLS for gas — a maxed-out PLS swap would fail on fees.
      const gasBuf = parseUnits("1", 18);
      setAmountIn(balIn > gasBuf ? formatUnits(balIn - gasBuf, 18) : "0");
    } else {
      // Token input (buy) or token sell: gas is paid in PLS, so the full
      // token balance is safe.
      setAmountIn(formatUnits(balIn, inputDecimals));
    }
  };

  const doApprove = () => {
    if (!parsedIn || !inputTokenAddress) return;
    setLastAction("approve");
    // Approvals aren't swaps — a stale trade snapshot must never show share buttons here.
    setLastTrade(null);
    writeContract({
      address: inputTokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [PULSEX_V2_ROUTER, parsedIn],
      // Belt-and-suspenders chain guard, matching BurnBox/TokenScanner/
      // AiPreview: without chainId wagmi leaves assertChainId off and builds
      // the client from whatever chain the connector reports at call time,
      // so a wallet that flips networks between the button enabling and the
      // signature would prepare the tx against 943 (or another chain) while
      // these mainnet contract addresses are hardcoded.
      chainId: pulsechain.id,
    });
  };

  const doSwap = () => {
    if (!parsedIn || !minOut || !address || blockedByImpact || !route) return;
    trackEvent("swap_attempt");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);
    setLastAction("swap");
    reset();
    // Snapshot the trade at send time for the share text — the input gets
    // cleared on confirmation, so capture the real amounts now.
    setLastTrade({
      amountIn: parsedIn,
      inDecimals: inputDecimals,
      inSymbol: inputSymbol,
      estOut: afterTaxOut,
      outDecimals: rcvTok.decimals,
      outSymbol: outputSymbol,
    });
    if (route.kind === "eth-in") {
      // Buy with native PLS: WPLS -> DUMB/DAMP through the pair, value sent.
      writeContract({
        address: PULSEX_V2_ROUTER,
        abi: routerAbi,
        functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens",
        args: [minOut, [...route.path], address, deadline],
        value: parsedIn,
        chainId: pulsechain.id,
      });
    } else if (route.kind === "eth-out") {
      // Sell DUMB/DAMP back to PLS: token -> WPLS through the pair, the
      // router unwraps WPLS to native PLS for the user.
      writeContract({
        address: PULSEX_V2_ROUTER,
        abi: routerAbi,
        functionName: "swapExactTokensForETHSupportingFeeOnTransferTokens",
        args: [parsedIn, minOut, [...route.path], address, deadline],
        chainId: pulsechain.id,
      });
    } else {
      // Direct single-hop and legacy multihop: the fee-supporting variant
      // covers the taxed DUMB/DAMP leg (and any taxed input token).
      writeContract({
        address: PULSEX_V2_ROUTER,
        abi: routerAbi,
        functionName: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
        args: [parsedIn, minOut, [...route.path], address, deadline],
        chainId: pulsechain.id,
      });
    }
  };

  // Gas: every swap needs native PLS for gas, separate from the input token.
  // A wallet with dust-or-nothing PLS fails at the wallet step with a
  // cryptic error — catch it here and point at the gas guide instead of
  // letting the user discover it after clicking.
  const GAS_WARN_WEI = 50_000_000_000_000_000n; // 0.05 PLS
  const lowGas = !!address && onPulse && plsBal !== undefined && plsBal.value < GAS_WARN_WEI;

  const actionLabel = !address
    ? "Connect to swap"
    : !onPulse
      ? "Switch to PulseChain"
      : parsedIn === null
        ? "Enter an amount"
        : route === null
          ? `No pair for ${inputSymbol} → ${outputSymbol}`
          : minOut === null
            ? "Quotes unavailable — try again"
            : insufficient
              ? `Insufficient ${inputSymbol}`
              : blockedByImpact
                ? "Impact too high — split the trade"
                : needsApproval
                  ? `Approve ${fmt(parsedIn, inputDecimals)} ${inputSymbol}`
                  : isPending
                    ? "Waiting for wallet…"
                    : isConfirming
                      ? "Confirming…"
                      : "Swap";

  const actionDisabled =
    !address ||
    !onPulse ||
    parsedIn === null ||
    route === null ||
    minOut === null ||
    insufficient ||
    blockedByImpact ||
    isPending ||
    isConfirming;

  return (
    <div className="rounded-xl border-2 border-primary/50 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl uppercase tracking-wide sm:text-2xl">Swap on-site</h2>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Swap direction"
            className="flex gap-1 rounded-lg bg-secondary p-1"
          >
            {(["buy", "sell"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                title={
                  dir === "buy"
                    ? "Buy DUMB/DAMP with PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX, PRVX, pTGC, or WBTC"
                    : "Sell DUMB/DAMP back into PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX, PRVX, pTGC, WBTC — or swap DUMB↔DAMP"
                }
                onClick={() => selectDirection(dir)}
                className={`rounded-md px-3 py-1 font-display text-sm uppercase tracking-widest ${
                  direction === dir
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
          {!isSell && (
            <div
              role="group"
              aria-label="Token to trade"
              className="flex gap-1 rounded-lg bg-secondary p-1"
            >
              {(Object.keys(TOKEN_CFGS) as TokenKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  title={TOKEN_CFGS[key].blurb}
                  onClick={() => selectToken(key)}
                  className={`rounded-md px-3 py-1 font-display text-sm uppercase tracking-widest ${
                    tokenKey === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          )}
          <span className="sticker bg-primary px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
            Live pair
          </span>
        </div>
      </div>
      {tokenKey === "DAMP" && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          DAMP is DUMB&apos;s dormant sibling — its original market-buy-and-burn flywheel never
          switched on. It trades as its own 3% tax token; holding it doesn&apos;t amplify DUMB.
        </p>
      )}
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {route === null ? (
          <>
            No direct PulseX pair for {inputSymbol} → {outputSymbol} — pick another token. Your
            wallet signs everything, we never touch your funds.
          </>
        ) : route.kind === "multihop" ? (
          <>
            Routed {inputSymbol} → WPLS → {outputSymbol} through PulseX v2 — your wallet signs
            everything, we never touch your funds.
          </>
        ) : isSell && route.kind === "eth-out" ? (
          <>
            Sell {inputSymbol} back to PLS through the {route.label} PulseX v2 pair — your wallet
            signs everything, we never touch your funds.
          </>
        ) : isSell ? (
          <>
            Sell {inputSymbol} for {outputSymbol} through the {route.label} PulseX v2 pair — your
            wallet signs everything, we never touch your funds.
          </>
        ) : (
          <>
            Direct through the {route.label} PulseX v2 pair — your wallet signs everything, we never
            touch your funds.
          </>
        )}
      </p>

      {/* HEX keeps both routes: the direct pair and the legacy WPLS hop. */}
      {!isSell && payKey === "HEX" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-display uppercase tracking-widest">Route</span>
          <div
            role="group"
            aria-label="HEX route"
            className="flex gap-1 rounded-lg bg-secondary p-1"
          >
            {(
              [
                ["auto", "Best"],
                ["direct", "Direct pair"],
                ["multihop", "Via WPLS"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                title={
                  v === "multihop"
                    ? "Legacy route: HEX → WPLS → token"
                    : v === "direct"
                      ? "Direct HEX pair, single hop"
                      : "Direct pair when available"
                }
                onClick={() => setRouteSel(v)}
                className={`rounded-md px-2 py-0.5 font-bold ${
                  routeSel === v ? "bg-primary text-primary-foreground" : "hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* From */}
      <div className="mt-4 rounded-lg border border-foreground/15 bg-background p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-display uppercase tracking-widest">You pay</span>
          <span>
            Balance: {fmt(balIn, inputDecimals)}{" "}
            <button
              type="button"
              onClick={maxIn}
              className="font-bold text-primary hover:underline"
            >
              MAX
            </button>
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <input
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            inputMode="decimal"
            placeholder="0.0"
            className="w-full bg-transparent font-display text-3xl outline-none placeholder:text-muted-foreground/40"
            aria-label={`Amount of ${inputSymbol} to swap`}
          />
          {isSell ? (
            <select
              value={tokenKey}
              onChange={(e) => selectToken(e.target.value as TokenKey)}
              title={cfg.blurb}
              aria-label="Token to sell"
              className="shrink-0 cursor-pointer rounded-md bg-secondary px-3 py-1.5 font-display text-sm uppercase tracking-widest outline-none"
            >
              {(Object.keys(TOKEN_CFGS) as TokenKey[]).map((key) => (
                <option key={key} value={key}>
                  {TOKEN_CFGS[key].symbol}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={payKey}
              onChange={(e) => selectPay(e.target.value as PayKey)}
              title={TOKENS[payKey].blurb}
              aria-label="Token to pay with"
              className="shrink-0 cursor-pointer rounded-md bg-secondary px-3 py-1.5 font-display text-sm uppercase tracking-widest outline-none"
            >
              {PAY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {TOKENS[key].symbol}
                  {key === "TEDDY" || key === "SOLIDX" || key === "PCOCK" || key === "HELGO"
                    ? " (via WPLS)"
                    : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        {usdPay && <p className="mt-1 text-[11px] text-muted-foreground">{usdPay}</p>}
        {inputTokenAddress && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span>Verified input:</span>
            <a
              href={explorerAddress(inputTokenAddress)}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-primary hover:underline"
            >
              {inputTokenAddress}
            </a>
            <CopyButton value={inputTokenAddress} label={`${inputSymbol} contract address`} />
          </p>
        )}
      </div>

      {/* To */}
      <div className="rounded-lg border border-foreground/15 bg-background p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-display uppercase tracking-widest">You receive (est.)</span>
          <span className="text-gold">
            {!isSell
              ? `after ${cfg.taxBps / 100}% tax`
              : outTokKey
                ? "both legs taxed"
                : `input taxed ${cfg.taxBps / 100}%`}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="w-full font-display text-3xl text-muted-foreground">
            {parsedIn ? fmt(afterTaxOut, rcvTok.decimals) : "0.0"}
          </span>
          {isSell ? (
            <select
              value={sellOutKey}
              onChange={(e) => selectSellOut(e.target.value as SellOutKey)}
              title={TOKENS[sellOutKey].blurb}
              aria-label="Token to receive"
              className="shrink-0 cursor-pointer rounded-md bg-secondary px-3 py-1.5 font-display text-sm uppercase tracking-widest outline-none"
            >
              {SELL_OUTS[tokenKey].map((key) => (
                <option key={key} value={key}>
                  {TOKENS[key].symbol}
                  {key === "TEDDY" || key === "SOLIDX" || key === "PCOCK" || key === "HELGO"
                    ? " (via WPLS)"
                    : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="shrink-0 rounded-md bg-secondary px-3 py-1.5 font-display text-sm uppercase tracking-widest">
              {cfg.symbol}
            </span>
          )}
        </div>
        {usdReceive && <p className="mt-1 text-[11px] text-muted-foreground">{usdReceive}</p>}
        {isSell && outputAddress && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span>Verified output:</span>
            <a
              href={explorerAddress(outputAddress)}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-primary hover:underline"
            >
              {outputAddress}
            </a>
            <CopyButton value={outputAddress} label={`${outputSymbol} contract address`} />
          </p>
        )}
        {parsedIn !== null && quotedOut !== null && taxIn !== null && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isSell && (
              <>
                After the {cfg.taxBps / 100}% {cfg.symbol} input tax, {fmt(taxIn, inputDecimals)}{" "}
                {inputSymbol} reaches the pair.{" "}
              </>
            )}
            {!isSell && <>Router quotes {fmt(quotedOut, rcvTok.decimals)} pre-tax. </>}
            {outTokKey ? (
              <>
                The {TOKEN_CFGS[outTokKey].taxBps / 100}% {outTokKey} transfer tax means ≈
                {fmt(afterTaxOut, rcvTok.decimals)} {outputSymbol} actually arrives.
              </>
            ) : (
              <>
                ≈{fmt(afterTaxOut, rcvTok.decimals)} {outputSymbol} arrives.
              </>
            )}
            {otherSideUnknownTax &&
              " The other token may carry its own transfer tax — not reflected here."}
            {usdNote && <> {usdNote}</>}
          </p>
        )}
      </div>

      {/* Slippage + impact */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="font-display uppercase tracking-widest">Slippage</span>
          {SLIPPAGE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSlippage(p)}
              className={`rounded px-1.5 py-0.5 font-bold ${
                slippage === p ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              {p}%
            </button>
          ))}
        </span>
        {impact !== null && parsedIn !== null && (
          <span className={impact > IMPACT_WARN_PCT ? "font-bold text-gold" : ""}>
            Price impact ≈{impact.toFixed(2)}%
          </span>
        )}
      </div>

      {impact !== null && impact > IMPACT_WARN_PCT && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-lg border-2 p-3 text-xs leading-relaxed ${
            blockedByImpact ? "border-red-500/60 bg-red-500/10" : "border-gold/60 bg-gold/10"
          }`}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" />
          <p>
            <strong className="text-foreground">
              {blockedByImpact ? "Trade blocked: " : "Heads up: "}
            </strong>
            {blockedByImpact
              ? `≈${impact.toFixed(1)}% price impact — this trade would move the market too far. Split it into smaller trades.`
              : route?.kind === "multihop"
                ? `≈${impact.toFixed(1)}% price impact across the two hops — consider a smaller size.`
                : `≈${impact.toFixed(1)}% price impact — consider a smaller size.`}
          </p>
        </div>
      )}

      {/* Human-verbs quote card: the whole mechanism in one glance, placed
          right before the signature button. Honest arithmetic, plain language. */}
      {quoteTaxLegs.length > 0 && (
        <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Before you sign
          </p>
          <div className="mt-2 space-y-1 text-sm leading-relaxed">
            <p>
              <span className="text-muted-foreground">You pay </span>
              <strong className="text-foreground">
                {fmt(parsedIn, inputDecimals)} {inputSymbol}
              </strong>
            </p>
            {quoteTaxLegs.map((leg) => {
              const burned = (leg.base * BigInt(leg.taxBps - 100)) / 10000n;
              const reflected = (leg.base * 100n) / 10000n;
              return (
                <p key={leg.symbol}>
                  <span className="text-muted-foreground">
                    → {leg.taxBps / 100}% {leg.symbol} tax:{" "}
                  </span>
                  <strong className="text-foreground">
                    {fmt(burned, leg.decimals)} burned forever
                  </strong>
                  <span className="text-muted-foreground">
                    {" "}
                    · {fmt(reflected, leg.decimals)} shared with holders
                  </span>
                </p>
              );
            })}
            <p>
              <span className="text-muted-foreground">→ You receive </span>
              <strong className="text-foreground">
                ≈{fmt(afterTaxOut, rcvTok.decimals)} {outputSymbol}
              </strong>
            </p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Price can move either way — this is the math, not a promise. The transfer tax applies to
            every transfer, not just swaps.
          </p>
        </div>
      )}

      {/* Action */}
      <div className="mt-4">
        {!address || !onPulse ? (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        ) : (
          <>
            {lowGas && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border-2 border-gold/60 bg-gold/10 p-3 text-xs leading-relaxed">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" />
                <p>
                  <strong className="text-foreground">No gas in the tank: </strong> this wallet
                  holds under 0.05 PLS, and every swap needs PLS for gas — this trade will likely
                  fail.{" "}
                  <a href="#get-pls" className="font-bold text-primary hover:underline">
                    Here&apos;s how to get some
                  </a>
                  .
                </p>
              </div>
            )}
            <Button
              onClick={needsApproval ? doApprove : doSwap}
              disabled={actionDisabled}
              className="w-full rounded-md bg-primary py-6 font-display text-base uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLabel}
            </Button>
          </>
        )}
      </div>

      {/* Tx status */}
      {(isPending || isConfirming || isConfirmed || isFailed || error || hash) && (
        <div className="mt-3 rounded-lg border border-foreground/15 bg-background p-3 text-xs">
          {isPending && <p>Waiting for your wallet signature…</p>}
          {isConfirming && (
            <p>
              Confirming on PulseChain…{" "}
              {hash && (
                <a
                  href={explorerTx(hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  View on explorer
                </a>
              )}
            </p>
          )}
          {txSucceeded && hash && (
            <div className="text-emerald-400">
              <p>
                {lastAction === null ? "Done" : "Confirmed"} —{" "}
                <a
                  href={explorerTx(hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  View on explorer
                </a>{" "}
                ·{" "}
                <Link
                  to="/scan"
                  search={{ token: undefined, burn: undefined, tx: hash }}
                  className="font-bold text-primary hover:underline"
                  title="Plain-English breakdown: what moved, what burned, and exactly what the transfer tax cost"
                >
                  Explain this swap
                </Link>
              </p>
              {/* Brag about it: pre-filled share intents with the REAL trade
                  amounts + explorer receipt — nothing posts automatically.
                  lastTrade is the at-send snapshot, cleared on any approve or
                  selector change so the text can't drift from the real tx. */}
              {tradeShare && (
                <div className="mt-2 border-t border-foreground/10 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Brag about it
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <NativeShareButton
                      title={tradeShare.title}
                      text={tradeShare.text}
                      url={tradeShare.url}
                      fallbackUrl={tradeShare.xHref}
                    />
                    <Button
                      asChild
                      size="sm"
                      className="gap-1.5 rounded-md bg-foreground text-xs font-black text-background hover:bg-foreground/90"
                    >
                      <a href={tradeShare.xHref} target="_blank" rel="noreferrer noopener">
                        <Twitter className="size-3.5" /> Post to X
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
                    >
                      <a href={tradeShare.tgHref} target="_blank" rel="noreferrer noopener">
                        <Send className="size-3.5" /> Share to Telegram
                      </a>
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Pre-filled post with the real amounts and the explorer receipt — nothing is
                    posted until you say so.
                  </p>
                </div>
              )}
            </div>
          )}
          {(isFailed || txReverted) && (
            <p className="text-red-400">
              Transaction failed on-chain.{" "}
              {hash && (
                <a
                  href={explorerTx(hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  View on explorer
                </a>
              )}
            </p>
          )}
          {error && (
            <p className="mt-1 text-red-400">
              {errMsg(error)}{" "}
              <button type="button" onClick={() => reset()} className="font-bold hover:underline">
                Dismiss
              </button>
            </p>
          )}
        </div>
      )}

      {/* Verified tokens & markets — the verified list is itself a trust feature.
          TEDDY / SOLIDX / PCOCK / HELGO route via their verified WPLS pairs.
          Addresses disambiguate. */}
      <div className="mt-4 rounded-lg border border-foreground/15 bg-background p-4">
        <button
          type="button"
          onClick={() => setVerifiedOpen((v) => !v)}
          aria-expanded={verifiedOpen}
          aria-controls="verified-tokens-markets"
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            Verified tokens & markets ({TOKEN_LIST.length} tokens, {MARKETS.length} pairs)
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${verifiedOpen ? "rotate-180" : ""}`}
          />
        </button>
        {verifiedOpen && (
          <div id="verified-tokens-markets">
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Only these curated tokens and live pairs — no paste-an-address box, so no honeypot
              roulette. Every address verified on-chain.
            </p>
            <p className="mt-3 font-display text-[11px] uppercase tracking-widest text-muted-foreground">
              Tokens
            </p>
            <ul className="mt-1 space-y-2">
              {TOKEN_LIST.map((id) => {
                const t = TOKENS[id];
                return (
                  <li key={id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-display uppercase tracking-widest" title={t.blurb}>
                      {t.symbol}
                    </span>
                    {t.address ? (
                      <>
                        <a
                          href={explorerAddress(t.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-mono text-[11px] text-primary hover:underline"
                        >
                          {t.address}
                        </a>
                        <CopyButton value={t.address} label={`${t.symbol} contract address`} />
                        {id === "DAMP" && dampMcapUsd != null && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            mcap ~{fmtUsdCompact(dampMcapUsd)} est.
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        native coin — no contract
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 font-display text-[11px] uppercase tracking-widest text-muted-foreground">
              Live markets
            </p>
            <ul className="mt-1 space-y-2">
              {MARKETS.map((m) => (
                <li key={m.pair} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-display uppercase tracking-widest">{m.label}</span>
                  <a
                    href={explorerAddress(m.pair)}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-mono text-[11px] text-primary hover:underline"
                  >
                    {m.pair}
                  </a>
                  <CopyButton value={m.pair} label={`${m.label} pair address`} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Deadline 20 minutes. Quotes refresh every ~15 seconds. This is a frontend to PulseX
        contracts — no backend, no custody, no accounts.
      </p>
    </div>
  );
}
