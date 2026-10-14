/**
 * Wallet Intelligence data layer — Connect Wallet → Instant Wallet Intelligence.
 *
 * Reads public PulseChain data for any address: ERC-20 holdings, PLS balance,
 * and recent transactions, then turns them into plain-English descriptions
 * and deterministic wallet-health observations.
 *
 * Data sources (all public, no keys, no new vendors):
 * - Blockscout v1 API at https://api.scan.pulsechain.com/api (verified working
 *   2026-10-02: `scan.pulsechain.com/api` 404s — the API lives on the
 *   api.* host. src/lib/proof/chains.ts still lists the dead base; nothing
 *   reads it, so it is left alone.)
 * - Existing on-chain price hooks (useTokenPrices / usePlsPrice) for USD math.
 *
 * Privacy: everything here is a public read of a public address. Nothing is
 * persisted — callers keep results in component state only.
 */

import {
  DAMP,
  DUMB,
  HELGO,
  HEX,
  INC,
  PCOCK,
  PLSX,
  PRVX,
  PTGC,
  SOLIDX,
  TEDDY,
  WBTC,
  WPLS,
} from "@/lib/pulsechain";
import type { PriceTokenKey } from "@/lib/token-prices";

const INTEL_API = "https://api.scan.pulsechain.com/api";
const FETCH_TIMEOUT_MS = 20_000;
const DEAD = "0x000000000000000000000000000000000000dEaD";

export interface IntelToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
}

export interface IntelTx {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  /** Raw tx input; "" for plain transfers. The 4-byte selector classifies the call. */
  input: string;
  isError: boolean;
  timeStamp: number;
  blockNumber: number;
}

export interface HealthObservation {
  tone: "ok" | "review" | "info";
  title: string;
  body: string;
  /** Contract addresses to offer "Scan" links for. */
  scanTokens?: string[];
}

/** Curated contracts the hub knows: address (lowercase) → price key + display name. */
export const CURATED: Record<string, { key: PriceTokenKey; label: string }> = {
  [DUMB.toLowerCase()]: { key: "DUMB", label: "Dumb Money" },
  [DAMP.toLowerCase()]: { key: "DAMP", label: "Dumb Amplifier" },
  [WPLS.toLowerCase()]: { key: "PLS", label: "Wrapped Pulse" },
  [HEX.toLowerCase()]: { key: "HEX", label: "HEX" },
  [TEDDY.toLowerCase()]: { key: "TEDDY", label: "Teddy Bear" },
  [SOLIDX.toLowerCase()]: { key: "SOLIDX", label: "Solid X" },
  [PCOCK.toLowerCase()]: { key: "PCOCK", label: "PulseChain Peacock" },
  [HELGO.toLowerCase()]: { key: "HELGO", label: "HELGO" },
  [INC.toLowerCase()]: { key: "INC", label: "INC" },
  [PLSX.toLowerCase()]: { key: "PLSX", label: "PulseX" },
  [PRVX.toLowerCase()]: { key: "PRVX", label: "PRVX" },
  [PTGC.toLowerCase()]: { key: "pTGC", label: "pTGC" },
  [WBTC.toLowerCase()]: { key: "WBTC", label: "Wrapped BTC" },
};

export const shortAddr = (a: string): string => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

/** One GET against the explorer API. Never throws — null on any failure.
 *  Blockscout returns status "0" with an empty array for a fresh address
 *  ("No transactions found" / "No tokens found") — that is a valid empty
 *  read, not an error, so it comes back as []. */
async function intelGet(params: Record<string, string>): Promise<unknown | null> {
  const url = new URL(INTEL_API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url.toString(), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const body = (await res.json()) as { status?: string; result?: unknown };
      if (body?.status === "1") return body.result ?? null;
      if (body?.status === "0" && Array.isArray(body.result) && body.result.length === 0) return [];
      return null;
    } catch {
      clearTimeout(timer);
      // retry once, then fall through to null
    }
  }
  return null;
}

const toBig = (v: unknown): bigint | null => {
  try {
    if (typeof v !== "string" || !/^\d+$/.test(v)) return null;
    return BigInt(v);
  } catch {
    return null;
  }
};

/** All ERC-20 balances for an address, newest-first as returned. Null when the read fails. */
export async function fetchIntelTokens(address: string): Promise<IntelToken[] | null> {
  const result = await intelGet({ module: "account", action: "tokenlist", address });
  if (!Array.isArray(result)) return null;
  const out: IntelToken[] = [];
  for (const t of result as Record<string, unknown>[]) {
    const balance = toBig(t["balance"]);
    const contractAddress =
      typeof t["contractAddress"] === "string" ? (t["contractAddress"] as string) : "";
    if (balance == null || balance <= 0n || !contractAddress) continue;
    const decimals =
      typeof t["decimals"] === "string" && /^\d+$/.test(t["decimals"] as string)
        ? parseInt(t["decimals"] as string, 10)
        : 18;
    out.push({
      address: contractAddress,
      name: typeof t["name"] === "string" ? (t["name"] as string) : "Unknown token",
      symbol: typeof t["symbol"] === "string" ? (t["symbol"] as string) : "???",
      decimals,
      balance,
    });
  }
  return out;
}

/** Native PLS balance in wei. Null when the read fails. */
export async function fetchIntelPls(address: string): Promise<bigint | null> {
  const result = await intelGet({ module: "account", action: "balance", address });
  return typeof result === "string" ? toBig(result) : null;
}

/** Most recent transactions, newest first. Null when the read fails. */
export async function fetchIntelTxs(address: string, n = 8): Promise<IntelTx[] | null> {
  const result = await intelGet({
    module: "account",
    action: "txlist",
    address,
    sort: "desc",
    page: "1",
    offset: String(n),
  });
  if (!Array.isArray(result)) return null;
  const out: IntelTx[] = [];
  for (const t of result as Record<string, unknown>[]) {
    const hash = typeof t["hash"] === "string" ? (t["hash"] as string) : "";
    if (!hash) continue;
    const value = toBig(t["value"]) ?? 0n;
    const ts =
      typeof t["timeStamp"] === "string" && /^\d+$/.test(t["timeStamp"] as string)
        ? parseInt(t["timeStamp"] as string, 10)
        : 0;
    out.push({
      hash,
      from: typeof t["from"] === "string" ? (t["from"] as string) : "",
      to: typeof t["to"] === "string" ? (t["to"] as string) : "",
      value,
      input: typeof t["input"] === "string" ? (t["input"] as string) : "",
      isError: t["isError"] === "1",
      timeStamp: ts,
      blockNumber:
        typeof t["blockNumber"] === "string" && /^\d+$/.test(t["blockNumber"] as string)
          ? parseInt(t["blockNumber"] as string, 10)
          : 0,
    });
  }
  // Never trust upstream ordering: the diff math downstream treats index 0
  // as the newest transaction, so enforce newest-first here.
  out.sort((a, b) => b.timeStamp - a.timeStamp);
  return out;
}

/** Common 4-byte selectors → readable names. Unknown selectors stay honest: "Contract interaction". */
const SELECTOR_NAMES: Record<string, string> = {
  "0xa9059cbb": "transfer",
  "0x095ea7b3": "approve",
  "0x38ed1739": "swapExactTokensForTokens",
  "0x8803dbee": "swapTokensForExactTokens",
  "0x7ff36ab5": "swapExactETHForTokens",
  "0x18cbafe5": "swapExactTokensForETH",
  "0xfb3bdb41": "swapETHForExactTokens",
  "0x5c11d795": "swapExactTokensForTokensSupportingFeeOnTransferTokens",
  "0x791ac947": "swapExactETHForTokensSupportingFeeOnTransferTokens",
  "0xb6f9de95": "swapExactTokensForETHSupportingFeeOnTransferTokens",
  "0x4a25d94a": "swapTokensForExactETH",
  "0xe8e33700": "addLiquidity",
  "0xf305d719": "addLiquidityETH",
  "0xbaa2abde": "removeLiquidity",
  "0x02751cec": "removeLiquidityETH",
};

export const selectorName = (input: string): string =>
  input.length >= 10 ? (SELECTOR_NAMES[input.slice(0, 10).toLowerCase()] ?? "") : "";

/** First address param of transfer/approve calldata (recipient / spender). */
function calldataAddress(input: string): string {
  return input.length >= 74 ? `0x${input.slice(34, 74)}` : "";
}

function fmtPls(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = ((wei % 10n ** 18n) / 10n ** 14n).toString().padStart(4, "0").replace(/0+$/, "");
  return frac ? `${whole.toLocaleString("en-US")}.${frac}` : whole.toLocaleString("en-US");
}

/**
 * One-line plain-English description of a transaction, from explorer fields
 * alone. Honest about its limits: without decoding token transfers it can't
 * name token amounts — the full /scan explainer does that (linked by callers).
 */
export function describeTx(tx: IntelTx, self: string): { headline: string; detail: string } {
  const me = self.toLowerCase();
  const fn = selectorName(tx.input).toLowerCase();
  const fnDisplay = selectorName(tx.input);
  if (tx.isError) {
    return {
      headline: `Failed ${fnDisplay || "transaction"}`,
      detail: "It reverted — nothing moved except the gas it cost. Open the explainer to see why.",
    };
  }
  if (!tx.to) {
    return {
      headline: "Contract deployment",
      detail:
        "A new contract was deployed from this wallet. The explainer shows the created contract.",
    };
  }
  if (tx.to.toLowerCase() === DEAD.toLowerCase()) {
    return tx.value > 0n
      ? {
          headline: `Burned ${fmtPls(tx.value)} PLS`,
          detail: "PLS sent to the dead address — gone for good.",
        }
      : {
          headline: "Burn to the dead address",
          detail: "Tokens sent where they can never move again.",
        };
  }
  if (fn.includes("swap")) {
    const dir = tx.value > 0n ? `spending ${fmtPls(tx.value)} PLS` : "spending tokens";
    return {
      headline: "Swap via a DEX router",
      detail: `A DEX swap ${dir}. The explainer shows exactly what came back.`,
    };
  }
  if (fn.startsWith("approve")) {
    const spender = calldataAddress(tx.input);
    return {
      headline: "Token approval",
      detail: `Permission granted${spender ? ` to ${shortAddr(spender)}` : ""}. Approvals let contracts move tokens for you — review them below.`,
    };
  }
  if (tx.value > 0n && tx.from.toLowerCase() === me) {
    const isContractCall = tx.input !== "" && tx.input !== "0x";
    return {
      headline: isContractCall
        ? `Contract call with ${fmtPls(tx.value)} PLS`
        : `Sent ${fmtPls(tx.value)} PLS`,
      detail: isContractCall
        ? `To ${shortAddr(tx.to)} — the PLS moved as part of a contract call. The explainer decodes what it did.`
        : `To ${shortAddr(tx.to)}.`,
    };
  }
  if (tx.value > 0n && tx.to.toLowerCase() === me) {
    return {
      headline: `Received ${fmtPls(tx.value)} PLS`,
      detail: `From ${shortAddr(tx.from)}.`,
    };
  }
  if (fn.startsWith("transfer")) {
    const recipient = calldataAddress(tx.input);
    const dir =
      tx.from.toLowerCase() === me
        ? `to ${recipient ? shortAddr(recipient) : shortAddr(tx.to)}`
        : `from ${shortAddr(tx.from)}`;
    return {
      headline: "Token transfer",
      detail: `Tokens moved ${dir}. The explainer names the token and amount.`,
    };
  }
  if (fn.includes("liquidity")) {
    return {
      headline: `Liquidity ${fn.startsWith("add") ? "deposit" : "withdrawal"}`,
      detail: `With ${shortAddr(tx.to)}. The explainer shows the pool and amounts.`,
    };
  }
  return {
    headline: fn ? `Contract call: ${fn}` : "Contract interaction",
    detail: `With ${shortAddr(tx.to)}. The explainer decodes what it did.`,
  };
}

/**
 * Deterministic wallet-health observations. Three checks max, plain English,
 * no invented risk scores — each one names exactly what was measured.
 */
export function buildObservations(args: {
  tokens: IntelToken[];
  txs: IntelTx[];
  /** USD value per token address (lowercase), only for priced tokens. */
  usdByToken: Record<string, number>;
}): HealthObservation[] {
  const { tokens, txs, usdByToken } = args;
  const obs: HealthObservation[] = [];

  const unknown = tokens.filter((t) => !CURATED[t.address.toLowerCase()]);
  if (unknown.length > 0) {
    obs.push({
      tone: "review",
      title: `${unknown.length} unrecognized token${unknown.length === 1 ? "" : "s"}`,
      body: "These aren't in the hub's verified list. Airdropped spam tokens are common — don't interact with them until you've scanned the contract.",
      scanTokens: unknown.slice(0, 3).map((t) => t.address),
    });
  }

  const priced = Object.entries(usdByToken);
  const total = priced.reduce((s, [, v]) => s + v, 0);
  if (total > 0 && priced.length > 1) {
    const [topAddr, topVal] = priced.reduce((a, b) => (b[1] > a[1] ? b : a));
    const share = (topVal / total) * 100;
    const token = tokens.find((t) => t.address.toLowerCase() === topAddr);
    if (share >= 50 && token) {
      obs.push({
        tone: "review",
        title: `${token.symbol} is ${share.toFixed(0)}% of valued holdings`,
        body: "Heavy concentration — if that token drops, the portfolio drops with it. This is a fact about distribution, not investment advice.",
      });
    }
  }

  const failed = txs.filter((t) => t.isError);
  if (failed.length > 0) {
    obs.push({
      tone: "info",
      title: `${failed.length} failed transaction${failed.length === 1 ? "" : "s"} recently`,
      body: "Reverted transactions move nothing but still cost gas. Open one in the explainer to see why it failed.",
    });
  }

  if (obs.length === 0) {
    obs.push({
      tone: "ok",
      title: "Nothing to flag in these checks",
      body: "No unrecognized tokens, no heavy concentration, no recent failures. These are narrow checks — not a safety verdict.",
    });
  }
  return obs.slice(0, 3);
}
