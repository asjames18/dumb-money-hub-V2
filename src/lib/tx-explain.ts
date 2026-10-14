// Transaction explainer — the second tab on /scan.
// Paste any PulseChain tx hash → plain-English "what actually happened".
//
// Read-only by construction: two RPC reads (the tx + its receipt) against the
// public PulseChain RPC. No wallet, no signing, no spending — this never asks
// the user for anything except the hash.
//
// Honesty contract (non-negotiable): we report what MOVED on-chain, never
// intent. Internal transfers (value moving inside a contract call) are
// invisible to this tool — the UI says so. A clean-looking tx is "nothing
// suspicious in the movements", never "this was safe".

import {
  createPublicClient,
  decodeErrorResult,
  decodeFunctionData,
  formatUnits,
  http,
  keccak256,
  stringToHex,
} from "viem";

import { DAMP, DEAD, DUMB, PULSEX_V2_ROUTER, erc20Abi, pulsechain, routerAbi } from "./pulsechain";

const txClient = createPublicClient({
  chain: pulsechain,
  transport: http("https://rpc.pulsechain.com"),
});

/** Canonical ERC-20 Transfer topic — computed, never hand-typed. */
const TRANSFER_TOPIC = keccak256(stringToHex("Transfer(address,address,uint256)"));
const TX_RE = /^0x[0-9a-fA-F]{64}$/;
const DEAD_LC = DEAD.toLowerCase();
const DUMB_LC = DUMB.toLowerCase();
const DAMP_LC = DAMP.toLowerCase();
const ROUTER_LC = PULSEX_V2_ROUTER.toLowerCase();
const PLS_DECIMALS = 18;

// Minimal symbol() read — the shared erc20Abi doesn't carry it (same reason
// token-scan.ts keeps its own local ABI for symbol).
const symbolAbi = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const erc20MinAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface TxMovement {
  token: `0x${string}`;
  symbol: string;
  from: string;
  to: string;
  amount: string;
  isBurnLeg: boolean;
}

export interface TxFlag {
  kind: "burn" | "warn" | "info";
  text: string;
}

export type TxStatus = "mined" | "failed" | "not-found" | "rpc-error";

export interface TxExplanation {
  hash: string;
  status: TxStatus;
  headline: string;
  subline: string;
  called: string | null;
  movements: TxMovement[];
  flags: TxFlag[];
  explorerUrl: string;
  /**
   * The tx hash again when this transaction is a voluntary DUMB/DAMP burn to
   * the dead address that /api/brag-image can render a shareable brag card
   * for: a direct transfer(), or the PLS-swap burn shape (router
   * swapExactETHForTokensSupportingFeeOnTransferTokens with `to` = dead and
   * the path ending in DUMB) — the exact shapes the endpoint verifies before
   * rendering. The explainer's swap-burn DECODE covers the ERC-20 swap shape
   * too, but those never set this: the endpoint 404s on them. The UI links
   * /brag?tx= only when this is set, so a card is never promised for burns
   * the endpoint can't render (other tokens, indirect paths, ERC-20 swap
   * burns). Null otherwise.
   */
  burnBragTx: string | null;
}

export const isTxHash = (s: string): boolean => TX_RE.test(s.trim());

/** Bounded read: rpc.pulsechain.com drops calls intermittently, so every read
 *  retries before the explainer degrades to an honest error. */
async function tryRead<T>(fn: () => Promise<T>): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

const short = (addr: string): string =>
  addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

// ---------------------------------------------------------------------------
// Failure diagnosis — pure helpers (unit-tested in scripts/tx-autopsy.test.ts).
// Every finding states what the receipt proves; anything we can't prove is
// never stated. "We couldn't pin it down" is an honest result, not a bug.
// ---------------------------------------------------------------------------

/** The three PulseX V2 router swap methods the swap box uses. In all three,
 *  `deadline` is the last argument — verified against routerAbi. */
const SWAP_FNS = new Set([
  "swapExactETHForTokensSupportingFeeOnTransferTokens",
  "swapExactTokensForETHSupportingFeeOnTransferTokens",
  "swapExactTokensForTokensSupportingFeeOnTransferTokens",
]);

const ERROR_STRING_ABI = [
  { type: "error", name: "Error", inputs: [{ name: "message", type: "string" }] },
] as const;

/** gasUsed >= gasLimit: the receipt's standard out-of-gas fingerprint. */
export function isOutOfGas(gasUsed: bigint, gasLimit: bigint): boolean {
  return gasLimit > 0n && gasUsed >= gasLimit;
}

/** Inclusion block timestamp past the swap's deadline. */
export function deadlinePassed(deadline: bigint, blockTimestamp: bigint): boolean {
  return blockTimestamp > deadline;
}

/** What a failed attempt cost in PLS — fully determined by the receipt. */
export function formatPlsCost(gasUsed: bigint, effectiveGasPrice: bigint): string {
  return `${fmtAmount(gasUsed * effectiveGasPrice, PLS_DECIMALS)} PLS`;
}

/** A captured "reason" only counts when a human could read it — bare codes
 *  like "01", pure hex, or template leftovers are not reasons. */
function looksHumanReason(r: string): boolean {
  return (
    r.length >= 3 &&
    /[a-zA-Z]/.test(r) &&
    !/^0x[0-9a-fA-F]+$/.test(r) &&
    !/^[0-9]+$/.test(r) &&
    !/couldn'?t infer/i.test(r)
  );
}

/** Pull a revert reason out of a viem call error: ABI-encoded Error(string)
 *  first, then the known viem/node message templates ("reverted with
 *  reason: X", "execution reverted: X", "reverted with reason string 'X'").
 *  Returns null when there is no human-readable reason — an empty revert or
 *  a bare code like "01" is not a reason, and we never invent one. */
export function extractRevertReason(err: unknown): string | null {
  if (err == null) return null;
  const msg = err instanceof Error ? err.message : String(err);
  let causeText = "";
  try {
    const cause = (err as { cause?: unknown }).cause as
      { details?: unknown; shortMessage?: unknown } | undefined;
    // viem's ExecutionRevertedError carries the node's words in
    // details/shortMessage — prefer them over the long formatted message.
    causeText = [cause?.details, cause?.shortMessage]
      .filter((x) => typeof x === "string")
      .join(" ");
    if (!causeText) causeText = JSON.stringify(cause ?? "");
  } catch {
    causeText = "";
  }
  const hay = `${causeText} ${msg}`;
  // Some callers attach the raw revert payload as a top-level `data` field
  // (viem surfaces it inside the cause, but be liberal in what we accept).
  const topData = (err as { data?: unknown }).data;
  const haystack = typeof topData === "string" ? `${hay} ${topData}` : hay;
  // 1) ABI-encoded Error(string): 0x08c379a0…
  const enc = haystack.match(/0x08c379a0[0-9a-fA-F]+/);
  if (enc) {
    try {
      const decoded = decodeErrorResult({ abi: ERROR_STRING_ABI, data: enc[0] as `0x${string}` });
      const reason = decoded.args?.[0];
      if (typeof reason === "string" && looksHumanReason(reason)) return reason;
    } catch {
      // fall through to the template parse
    }
  }
  // 2) Known message templates, most specific first. When a template matches
  // but the captured "reason" isn't human-readable, stop — hunting further
  // templates can only surface worse text (e.g. "with reason: 01.").
  const patterns = [
    /reverted with reason:\s*([^.\n]{1,120})/i,
    /reverted with reason string\s*["']([^"']{1,120})["']/i,
    /execution reverted:\s*([^\n]{1,120})/i,
  ];
  for (const p of patterns) {
    const m = haystack.match(p);
    const candidate = m?.[1]
      ?.trim()
      .replace(/["'.]+$/, "")
      .trim();
    if (candidate) return looksHumanReason(candidate) ? candidate : null;
  }
  return null;
}

/** Map a contract's revert reason to plain English. Matching is on the reason
 *  suffix, never the router-name prefix (PulseX kept its fork's strings;
 *  the suffix is what carries the meaning). Unknown reasons are shown
 *  verbatim — never paraphrased into a guess. */
export function explainRevertReason(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("expired"))
    return `The contract itself said "${reason}" — your swap's deadline passed before it was included. The router refused rather than fill you at a stale price; that's the protection working as designed. A fresh quote with a new deadline is the shape that works.`;
  if (
    r.includes("insufficient_output_amount") ||
    r.includes("insufficient_a_amount") ||
    r.includes("insufficient_b_amount")
  )
    return `The contract itself said "${reason}" — the price moved past your slippage setting before the swap executed, so the router protected you from a worse fill. On taxed tokens, remember DEX quotes show the pre-tax price: a 6% DUMB tax needs slippage room beyond the quote.`;
  if (r.endsWith(": k") || r === "k")
    return `The contract itself said "${reason}" — the pair's price moved too far mid-transaction and the pool's invariant check rejected the swap. Same family as slippage: the market moved while your transaction waited.`;
  if (r.includes("transfer_from_failed"))
    return `The contract itself said "${reason}" — a token transfer inside the swap failed. Usually the approval was too small (approve enough to cover the tax, not just the typed amount), or the token contract blocked that transfer path.`;
  if (r.includes("transfer amount exceeds balance") || r.includes("insufficient balance"))
    return `The contract itself said "${reason}" — the wallet didn't hold enough of the token when the swap executed. Balances shift between quote and execution on taxed tokens (reflections, other transfers).`;
  if (r.includes("insufficient liquidity"))
    return `The contract itself said "${reason}" — the pair didn't have enough liquidity for that trade size. Try a smaller amount, or a different route.`;
  return `The contract gave this reason: "${reason}". We don't have a plain-English mapping for it — the explorer link above shows the raw transaction if you want to dig deeper.`;
}

/** For a decoded router swap call: the deadline (last arg of all three swap
 *  methods) and the token the user was actually trading (path[0] when tokens
 *  go in, path[last] when PLS goes in). Null when the call isn't one of the
 *  three known swap shapes. */
export function swapCallShape(
  fn: string | null,
  args: readonly unknown[] | null,
): { deadline: bigint; tradeToken: string } | null {
  if (!fn || !SWAP_FNS.has(fn) || !args || args.length === 0) return null;
  const last = args[args.length - 1];
  if (typeof last !== "bigint") return null;
  const path = args.find(
    (a): a is readonly string[] => Array.isArray(a) && a.length > 0 && typeof a[0] === "string",
  );
  if (!path || path.length === 0) return null;
  const token =
    fn === "swapExactETHForTokensSupportingFeeOnTransferTokens" ? path[path.length - 1] : path[0];
  if (typeof token !== "string") return null;
  return { deadline: last, tradeToken: token };
}

// ---------------------------------------------------------------------------
// Swap-burn gate — pure (unit-tested in scripts/tx-autopsy.test.ts).
//
// The /scan transaction explainer's swap-burn DECODE recognizes BOTH router
// swap shapes with `to` = dead and the path ending in DUMB: native-PLS via
// swapExactETHForTokensSupportingFeeOnTransferTokens and any ERC-20 via
// swapExactTokensForTokensSupportingFeeOnTransferTokens (Dumb AI Pro's burn
// leg uses the ERC-20 shape for every non-DUMB payment token).
//
// The shareable BRAG CARD holds the same bar: /api/brag-image's
// getSwapBurnArrival verifies both swap shapes (same gate — router swap,
// `to` = dead, path ending in DUMB, DUMB actually arriving at dead — mined
// successfully), so burnBragTx is set for both. The card shows only the
// verified DUMB amount, never the input token, so no per-shape copy is
// needed.
// ---------------------------------------------------------------------------

/** The router swap function a tx called (null when it called no router swap). */
export type SwapBurnFn =
  | "swapExactETHForTokensSupportingFeeOnTransferTokens"
  | "swapExactTokensForTokensSupportingFeeOnTransferTokens"
  | null;

/** Args captured from either router swap function, normalized to { path, to }. */
export interface SwapBurnArgs {
  path: readonly string[];
  to: string;
}

/**
 * Swap-burn decode gate (PLS + ERC-20): a PulseX router swap with `to` = dead
 * and the path ending in DUMB. Reverted txs never reach this — the explainer
 * returns on the failure path above the gate.
 */
export function isSwapBurn(txTo: string, swapFn: SwapBurnFn, args: SwapBurnArgs | null): boolean {
  if (txTo.toLowerCase() !== ROUTER_LC || !swapFn || !args) return false;
  const { path, to } = args;
  if (to.toLowerCase() !== DEAD_LC) return false;
  if (path.length === 0) return false;
  return path[path.length - 1]!.toLowerCase() === DUMB_LC;
}

/**
 * Plain-English for a decoded ERC-20 approve() call. approve() is always
 * called on the token contract itself, so the caller (tx.from) grants
 * `spender` an allowance of `amount` of that token. Three honest shapes: a
 * zero allowance is a REVOCATION, type(uint256).max is an effectively
 * unlimited approval (flagged — it's the riskiest one), anything else is a
 * capped approval. Pure: the caller resolves symbol/decimals with
 * tokenMeta(); the helper formats and classifies only.
 */
export interface ApprovalExplained {
  headline: string;
  subline: string;
  flags: TxFlag[];
}

export const MAX_ALLOWANCE = 2n ** 256n - 1n;

export function describeApproval(
  symbol: string,
  decimals: number,
  spender: string,
  amount: bigint,
): ApprovalExplained {
  const who = short(spender);
  if (amount === 0n) {
    return {
      headline: `Approval revoked — ${who} can no longer move ${symbol}`,
      subline: `This transaction set ${who}'s allowance to zero. No tokens moved — revoking is a permission change, not a transfer. From here, that spender cannot pull ${symbol} from this wallet through the old approval.`,
      flags: [],
    };
  }
  if (amount >= MAX_ALLOWANCE) {
    return {
      headline: `Unlimited approval — ${who} can move your ${symbol}`,
      subline: `No tokens moved in this transaction — an approval only grants permission. This one granted an effectively unlimited allowance, so ${who} can pull ${symbol} from this wallet at any time, in any amount, until the approval is revoked.`,
      flags: [
        {
          kind: "warn",
          text: `Unlimited ${symbol} allowance. If you don't recognize ${who} or no longer use it, revoke this approval — the /wallet page's Token approvals section shows what the PulseX router can still move and revokes those in one click, but it can't see approvals granted to other spenders.`,
        },
      ],
    };
  }
  return {
    headline: `Approved ${who} to move up to ${fmtAmount(amount, decimals)} ${symbol}`,
    subline: `No tokens moved in this transaction — an approval only grants permission. ${who} can now pull up to ${fmtAmount(amount, decimals)} ${symbol} from this wallet without further prompts, until the approval is revoked.`,
    flags: [],
  };
}

const fmtAmount = (value: bigint, decimals: number): string => {
  let units: string;
  try {
    units = formatUnits(value, decimals);
  } catch {
    return value.toString();
  }
  const n = Number(units);
  if (!Number.isFinite(n)) return units;
  if (n === 0) return "0";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumSignificantDigits: 4 });
};

interface TokenMeta {
  symbol: string;
  decimals: number;
}

const metaCache = new Map<string, TokenMeta>();

async function tokenMeta(address: string): Promise<TokenMeta> {
  const key = address.toLowerCase();
  const cached = metaCache.get(key);
  if (cached) return cached;
  const addr = address as `0x${string}`;
  const symbol = await tryRead(() =>
    (txClient.readContract as (p: unknown) => Promise<string>)({
      address: addr,
      abi: symbolAbi,
      functionName: "symbol",
    }),
  );
  const decimals = await tryRead(() =>
    (txClient.readContract as (p: unknown) => Promise<number>)({
      address: addr,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  );
  const meta: TokenMeta =
    typeof symbol === "string" && symbol.length > 0 && typeof decimals === "number"
      ? { symbol, decimals }
      : { symbol: short(address), decimals: PLS_DECIMALS };
  metaCache.set(key, meta);
  return meta;
}

/** Re-run the exact failed call against the previous block's state. A revert
 *  WITH a reason is the answer — stop immediately. Anything else (RPC flake,
 *  reason-less error) retries, then degrades to null: no reason is an honest
 *  result, never a guessed one. */
async function replayRevertReason(
  tx: { from?: string | null; to?: string | null; input?: string | null; value?: bigint | null },
  blockNumber: bigint,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await txClient.call({
        account: (tx.from ?? undefined) as `0x${string}` | undefined,
        to: (tx.to ?? undefined) as `0x${string}` | undefined,
        data: (tx.input ?? "0x") as `0x${string}`,
        value: tx.value ?? 0n,
        blockNumber: blockNumber - 1n,
      });
      // The replay SUCCEEDED against the previous block — the failure came
      // from something that changed between blocks. Return the sentinel; the
      // caller turns it into the slippage-family finding.
      return "__replay_succeeded__";
    } catch (e) {
      const reason = extractRevertReason(e);
      if (reason) return reason;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

const fmtTs = (ts: bigint): string => new Date(Number(ts) * 1000).toUTCString();

/** Evidence-backed failure diagnosis for a reverted transaction. Read-only:
 *  one block read + one replayed call, both through the retrying tryRead.
 *  Returns the findings plus the PLS the failed attempt cost (receipt math).
 *  Never throws — worst case is the honest fallback finding. */
async function diagnoseFailure(
  tx: {
    from?: string | null;
    to?: string | null;
    input?: string | null;
    value?: bigint | null;
    gas?: bigint | null;
  },
  receipt: {
    gasUsed?: bigint | null;
    effectiveGasPrice?: bigint | null;
    blockNumber?: bigint | null;
  },
  fn: string | null,
  callArgs: readonly unknown[] | null,
): Promise<{ flags: TxFlag[]; gasCostPls: string | null }> {
  const flags: TxFlag[] = [];
  let gasCostPls: string | null = null;

  const gasUsed = receipt.gasUsed ?? 0n;
  const gasLimit = tx.gas ?? 0n;
  const eff = receipt.effectiveGasPrice ?? 0n;
  if (gasUsed > 0n && eff > 0n) gasCostPls = formatPlsCost(gasUsed, eff);

  let specific = false;

  if (isOutOfGas(gasUsed, gasLimit)) {
    specific = true;
    flags.push({
      kind: "warn",
      text: `Out of gas — the receipt shows this transaction burned 100% of the gas it was given (${gasUsed.toLocaleString("en-US")} of ${gasLimit.toLocaleString("en-US")} units). That almost always means it ran out of gas mid-execution. If you retry, raise the gas limit — and double-check the quote first.`,
    });
  }

  const shape = swapCallShape(fn, callArgs);
  if (shape && receipt.blockNumber != null) {
    const block = await tryRead(() => txClient.getBlock({ blockNumber: receipt.blockNumber! }));
    const blockTs = block?.timestamp;
    if (typeof blockTs === "bigint" && deadlinePassed(shape.deadline, blockTs)) {
      specific = true;
      flags.push({
        kind: "warn",
        text: `Deadline expired — your swap said it must complete by ${fmtTs(shape.deadline)}; the chain didn't include it until ${fmtTs(blockTs)}, after that cutoff. The router refused rather than fill you at a stale price — that's the protection working as designed. A fresh quote with a new deadline is the shape that works.`,
      });
    }
  }

  if (receipt.blockNumber != null && tx.to) {
    const replay = await replayRevertReason(tx, receipt.blockNumber);
    if (replay === "__replay_succeeded__") {
      specific = true;
      flags.push({
        kind: "info",
        text: "A replay of your exact transaction against the previous block succeeded — so the failure came from something that changed between blocks. The usual story: the price moved past your slippage setting (on taxed tokens, DEX quotes show the pre-tax price).",
      });
    } else if (replay) {
      specific = true;
      flags.push({ kind: "info", text: explainRevertReason(replay) });
    }
  }

  if (shape) {
    flags.push({
      kind: "info",
      text: `Before you retry, safety-check the token you were trading — paste ${shape.tradeToken} into the token scanner tab above. A token whose swaps keep reverting is worth a second look.`,
    });
  }

  if (!specific) {
    flags.push({
      kind: "info",
      text: "The receipt doesn't name a cause — the contract gave no reason, and none of the usual fingerprints (out of gas, expired deadline) matched. The most common culprits for a failed swap on a taxed token: slippage set too tight (DEX quotes show the pre-tax price — a 6% tax needs room), an approval smaller than the taxed amount, or the price moving between quote and execution. If you retry, change one thing at a time — and never resubmit the exact same transaction blindly.",
    });
  }

  return { flags, gasCostPls };
}

/** Plain-English breakdown of a PulseChain transaction. Never throws — every
 *  failure mode becomes an honest status the UI can render. */
export async function explainTx(rawHash: string): Promise<TxExplanation> {
  const hash = rawHash.trim() as `0x${string}`;
  const explorerUrl = `https://scan.pulsechain.com/tx/${hash}`;
  const fail = (status: TxStatus, headline: string, subline: string): TxExplanation => ({
    hash,
    status,
    headline,
    subline,
    called: null,
    movements: [],
    flags: [],
    explorerUrl,
    burnBragTx: null,
  });

  if (!TX_RE.test(hash)) {
    return fail(
      "rpc-error",
      "That doesn't look like a transaction hash",
      "A PulseChain transaction hash is 0x followed by 64 hex characters.",
    );
  }

  const [tx, receipt] = await Promise.all([
    tryRead(() => txClient.getTransaction({ hash })),
    tryRead(() => txClient.getTransactionReceipt({ hash })),
  ]);
  if (!tx || !receipt) {
    return fail(
      "not-found",
      "Couldn't find that transaction",
      "Either the hash is wrong, the transaction hasn't been mined yet, or the RPC didn't answer. Double-check the hash on the explorer.",
    );
  }

  // Decode ERC-20 Transfer logs into movements.
  const raw: { token: `0x${string}`; from: string; to: string; value: bigint }[] = [];
  for (const log of receipt.logs) {
    const topics = (log.topics ?? []) as string[];
    if (topics.length < 3 || topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    let value = 0n;
    try {
      value = BigInt(log.data ?? "0x0");
    } catch {
      continue;
    }
    if (value <= 0n) continue;
    raw.push({
      token: log.address as `0x${string}`,
      from: `0x${topics[1]?.slice(-40) ?? ""}`.toLowerCase(),
      to: `0x${topics[2]?.slice(-40) ?? ""}`.toLowerCase(),
      value,
    });
  }

  // Aggregate identical (token, from, to) legs, then resolve metadata.
  const agg = new Map<string, { token: `0x${string}`; from: string; to: string; value: bigint }>();
  for (const m of raw) {
    const k = `${m.token}|${m.from}|${m.to}`;
    const e = agg.get(k);
    if (e) e.value += m.value;
    else agg.set(k, { ...m });
  }
  const movements: TxMovement[] = [];
  for (const m of agg.values()) {
    const meta = await tokenMeta(m.token);
    movements.push({
      token: m.token,
      symbol: meta.symbol,
      from: m.from,
      to: m.to,
      amount: fmtAmount(m.value, meta.decimals),
      isBurnLeg: m.to === DEAD_LC,
    });
  }

  // "What did the user call?" — router gets a friendly label, everything else
  // gets the decoded function name when we recognize it. This block sits
  // ABOVE the failed-tx early return: the failure diagnosis needs fn + args
  // (deadline check, traded-token pointer). We also capture whether this is
  // a plain transfer() straight to the dead address — the voluntary-burn
  // shape (note: taxed tokens emit extra legs to their own contract alongside
  // the dead legs, so "burn" is NOT "every leg is a burn leg"; it's the call
  // shape plus dead-address arrival in the logs).
  let called: string | null = null;
  let fn: string | null = null;
  let callArgs: readonly unknown[] | null = null;
  let transferToDead = false;
  let transferAmount: bigint | null = null;
  // Approval shape: approve(spender, amount) is always called on the token
  // contract itself, so tx.to is the token being approved. Captured raw so
  // the classification branch below can render the named spender + amount.
  let approveSpender: string | null = null;
  let approveAmount: bigint | null = null;
  // Swap-burn shape: a PulseX router swap (native PLS via
  // swapExactETHForTokensSupportingFeeOnTransferTokens, or any ERC-20 via
  // swapExactTokensForTokensSupportingFeeOnTransferTokens) with `to` = dead
  // and the path ending in DUMB — the decode gate (isSwapBurn, below) covers
  // both shapes. The brag-card link stays PLS-shape-only until
  // /api/brag-image's verification generalizes. Args are captured (not just
  // the name) so the gate below can check them; the fn name is captured too
  // so the brag-card arm can narrow to the PLS shape. Both functions end in
  // (path, to, deadline), so the capture normalizes to { path, to }.
  let swapBurnFn: SwapBurnFn = null;
  let swapBurnArgs: SwapBurnArgs | null = null;
  const toAddr = (tx.to ?? "").toLowerCase();
  if (toAddr) {
    if (tx.input && tx.input !== "0x") {
      try {
        const decoded = decodeFunctionData({ abi: routerAbi, data: tx.input });
        fn = decoded.functionName;
        callArgs = decoded.args as readonly unknown[];
        if (fn === "swapExactETHForTokensSupportingFeeOnTransferTokens") {
          const [, path, to] = decoded.args as readonly [bigint, readonly string[], string, bigint];
          swapBurnFn = "swapExactETHForTokensSupportingFeeOnTransferTokens";
          swapBurnArgs = { path, to };
        } else if (fn === "swapExactTokensForTokensSupportingFeeOnTransferTokens") {
          const [, , path, to] = decoded.args as readonly [
            bigint,
            bigint,
            readonly string[],
            string,
            bigint,
          ];
          swapBurnFn = "swapExactTokensForTokensSupportingFeeOnTransferTokens";
          swapBurnArgs = { path, to };
        }
      } catch {
        try {
          const decoded = decodeFunctionData({ abi: erc20MinAbi, data: tx.input });
          fn = decoded.functionName;
          if (fn === "transfer") {
            const [to, amount] = decoded.args as [string, bigint];
            transferToDead = to.toLowerCase() === DEAD_LC;
            transferAmount = amount;
          } else if (fn === "approve") {
            const [spender, amount] = decoded.args as [string, bigint];
            approveSpender = spender;
            approveAmount = amount;
          }
        } catch {
          fn = null;
        }
      }
    }
    called =
      toAddr === ROUTER_LC
        ? `PulseX router${fn ? ` · ${fn}` : ""}`
        : fn
          ? `${short(tx.to as string)} · ${fn}`
          : tx.input && tx.input !== "0x"
            ? `Contract ${short(tx.to as string)}`
            : `Wallet ${short(tx.to as string)}`;
  } else {
    called = "Contract deployment";
  }

  const flags: TxFlag[] = [];
  const fromAddr = (tx.from ?? "").toLowerCase();

  if (receipt.status === "reverted") {
    // Failure diagnosis: evidence-backed findings about WHY it reverted —
    // out of gas, an expired deadline, the contract's own revert reason — or
    // an honest "couldn't pin it down". Read-only; never a guess.
    const diagnosis = await diagnoseFailure(tx, receipt, fn, callArgs);
    const failFlags: TxFlag[] = [...diagnosis.flags];
    failFlags.push({
      kind: "warn",
      text: "Failed transactions still cost gas. If a wallet or site told you this succeeded, that was wrong — the chain says reverted.",
    });
    const costNote = diagnosis.gasCostPls
      ? ` This failed attempt still cost ~${diagnosis.gasCostPls} in gas — reverted transactions pay for the work they attempted.`
      : "";
    return {
      hash,
      status: "failed",
      headline: "This transaction failed",
      subline:
        "It was reverted, so none of the token movements it attempted actually happened — but the gas was still spent. If you paid for a swap or a burn, nothing was swapped or burned." +
        costNote,
      called,
      movements: [],
      flags: failFlags,
      explorerUrl,
      burnBragTx: null,
    };
  }

  const valueIn = tx.value ?? 0n;

  // Nets per token for the sender — the primitive every classification uses.
  const nets = new Map<string, { symbol: string; net: bigint; decimals: number }>();
  for (const m of agg.values()) {
    const meta = await tokenMeta(m.token);
    const key = m.token.toLowerCase();
    const e = nets.get(key) ?? { symbol: meta.symbol, net: 0n, decimals: meta.decimals };
    if (m.from === fromAddr) e.net -= m.value;
    if (m.to === fromAddr) e.net += m.value;
    nets.set(key, e);
  }
  const ins = [...nets.values()].filter((e) => e.net > 0n);
  const outs = [...nets.values()].filter((e) => e.net < 0n);
  const burnLegs = movements.filter((m) => m.isBurnLeg);

  // Dead-leg sums per token (bigint) — the primitive the swap cost note
  // uses. Every taxed DUMB/DAMP transfer emits its 1% protocol burn leg
  // on-chain, so the dead-leg sum x 100 ~= the pre-tax transfer amount
  // (the 1% reflection is invisible in logs) and x bps/100 ~= the total
  // tax taken. Verified live on-chain: buy 0x73a44f04b5835546c5554e31d267
  // b9afd735cb4a13fc6bc448b9c7888008cd00 (dead x 100 = pre-tax, received /
  // preTax = 0.9398) and sell 0xb1c92cc34469f37ec585a7319390e5fdc08b72465f
  // 94540e712c57a6ff7dd2cf (pair 94.95% / dead 1.01% / contract 4.04%).
  const burnSums = new Map<string, bigint>();
  for (const m of agg.values()) {
    if (m.to === DEAD_LC) {
      const k = m.token.toLowerCase();
      burnSums.set(k, (burnSums.get(k) ?? 0n) + m.value);
    }
  }

  const burnFlagFor = (m: TxMovement): TxFlag => ({
    kind: "burn",
    text: `${m.amount} ${m.symbol} went to the dead address — permanently burned, gone forever. Nobody can recover it.`,
  });

  // What the transfer tax cost on a swap — for DUMB/DAMP only, where the tax
  // is known and verified. Slippage and the quoted price can't be derived
  // from the receipt alone, and the note says so: it names only the tax
  // component, never a total "you lost X%".
  const swapTaxNote = (): TxFlag | null => {
    const parts: string[] = [];
    for (const [key, bps] of [
      [DUMB_LC, 600],
      [DAMP_LC, 300],
    ] as const) {
      const burn = burnSums.get(key);
      if (!burn || burn <= 0n) continue;
      const net = nets.get(key);
      const tax = (burn * BigInt(bps)) / 100n;
      const sym = net?.symbol ?? "tokens";
      const dec = net?.decimals ?? 18;
      parts.push(
        `the ${bps / 100}% ${sym} transfer tax took ~${fmtAmount(tax, dec)} ${sym} — priced into the swap itself, not charged on top (visible in the legs above: the 1% protocol burn; the rest went to the token contract's entombed buckets, ~1% reflected to holders)`,
      );
    }
    if (parts.length === 0) return null;
    return {
      kind: "info",
      text: `What the tax cost: ${parts.join("; ")}. Tax component only — the receipt can't show the price you were quoted, so slippage isn't measurable from here.`,
    };
  };

  // Contract-recipient warning: tokens the SENDER put directly into a contract
  // that isn't the PulseX router are very often lost. Only legs from the
  // sender's own wallet qualify — contract-to-contract legs (router → pair,
  // pair → token) are normal DeFi plumbing, not a mistake.
  const recipients = [...new Set(movements.map((m) => m.to))].filter(
    (a) => a !== fromAddr && a !== DEAD_LC,
  );
  for (const r of recipients) {
    if (r === ROUTER_LC) continue;
    const code = await tryRead(() => txClient.getBytecode({ address: r as `0x${string}` }));
    if (code && code !== "0x") {
      const total = movements.filter((m) => m.to === r && m.from === fromAddr);
      if (total.length > 0) {
        flags.push({
          kind: "warn",
          text: `${total.map((m) => `${m.amount} ${m.symbol}`).join(" + ")} went to a contract (${short(r)}), not a wallet. Only do this when you know the contract handles incoming tokens — sent to the wrong contract, they're usually lost for good.`,
        });
      }
      break; // one warning covers it; don't spam per recipient
    }
  }

  let headline: string;
  let subline: string;

  // Swap-burn decode gate (pure, unit-tested): a PulseX router swap with `to`
  // = dead and the path ending in DUMB — mined successfully (reverted txs
  // returned above), with DUMB actually arriving at dead in the receipt
  // logs. Covers both the PLS and ERC-20 swap shapes; the brag-card link
  // below narrows to the PLS shape only.
  const swapBurnDumb = isSwapBurn(toAddr, swapBurnFn, swapBurnArgs);
  const swapBurnArrived = burnSums.get(DUMB_LC) ?? 0n;

  if (
    fn === "approve" &&
    approveSpender &&
    approveAmount != null &&
    movements.length === 0 &&
    valueIn === 0n
  ) {
    // Decoded approval: the most common "nothing moved" transaction a
    // newcomer pastes — name the spender and the allowance instead of the
    // generic no-movement copy. Guarded on the pure no-movement shape so a
    // weird multi-leg approve tx still falls through to the honest
    // fallbacks below.
    const meta = await tokenMeta(toAddr);
    const explained = describeApproval(meta.symbol, meta.decimals, approveSpender, approveAmount);
    headline = explained.headline;
    subline = explained.subline;
    flags.push(...explained.flags);
  } else if (movements.length === 0 && valueIn === 0n) {
    headline = "No token or PLS movements";
    subline =
      "This transaction moved nothing the tool can see — likely a contract interaction with no transfers (an approval, a settings change, or similar). Approvals don't move tokens; they grant permission.";
    flags.push({
      kind: "info",
      text: "Heads up: a token approval looks exactly like this — no movements, but the spender can now move your tokens. Revoke approvals you don't recognize.",
    });
  } else if (swapBurnDumb && swapBurnArrived > 0n) {
    // Swap-path voluntary burn: the router swapped the input (native PLS or
    // an ERC-20 — Dumb AI Pro's burn leg uses this exact shape for every
    // non-DUMB payment token) for DUMB and sent it straight to the dead
    // address — classified as a burn, not a swap, because nothing came back
    // to the sender. The amount shown is the verified dead arrival (the
    // same number the brag card prints); the 6% transfer tax is taken on
    // the swap output before it lands at dead.
    const dec = nets.get(DUMB_LC)?.decimals ?? 18;
    headline = `Burn — ${fmtAmount(swapBurnArrived, dec)} DUMB destroyed`;
    subline = `This transaction swapped ${valueIn > 0n ? "PLS" : "a token"} for DUMB through the PulseX router and sent the bought DUMB straight to the dead address — permanently destroyed. Nothing and nobody can recover burned tokens.`;
    for (const m of burnLegs) flags.unshift(burnFlagFor(m));
  } else if (transferToDead && burnLegs.length > 0) {
    // Voluntary burn: a plain transfer() straight to the dead address. The
    // headline counts only what actually arrived at dead (taxed tokens keep
    // bucket legs to their own contract — those are in the table below, not
    // hidden). burnLegs is aggregated per (token, from, to), so the net
    // transfer leg and the protocol burn leg merge into one dead-arrival row.
    headline = `Burn — ${burnLegs.map((m) => `${m.amount} ${m.symbol}`).join(" + ")} destroyed`;
    subline =
      "This transfer sent tokens straight to the dead address — permanently destroyed. Nothing and nobody can recover burned tokens.";
    for (const m of burnLegs) flags.unshift(burnFlagFor(m));
  } else if (outs.length === 1 && ins.length === 1) {
    const out = outs[0]!;
    const inn = ins[0]!;
    headline = `Swap — ${fmtAmount(-out.net, out.decimals)} ${out.symbol} → ${fmtAmount(inn.net, inn.decimals)} ${inn.symbol}`;
    subline =
      "The sender's net result: tokens out, different tokens back. The transfer-tax cost is broken down below when it's DUMB/DAMP — anything beyond that is slippage (compare against what you were quoted) or something worse.";
    for (const m of burnLegs) flags.unshift(burnFlagFor(m));
    const note = swapTaxNote();
    if (note) flags.push(note);
  } else if (valueIn > 0n && ins.length === 1 && outs.length === 0) {
    const inn = ins[0]!;
    headline = `Swap — ${fmtAmount(valueIn, PLS_DECIMALS)} PLS → ${fmtAmount(inn.net, inn.decimals)} ${inn.symbol}`;
    subline =
      "PLS went in, tokens came back to the sender. The transfer-tax cost is broken down below when it's DUMB/DAMP — anything beyond that is slippage (compare against what you were quoted), or worse if the gap is huge.";
    for (const m of burnLegs) flags.unshift(burnFlagFor(m));
    const note = swapTaxNote();
    if (note) flags.push(note);
  } else if (outs.length === 1 && ins.length === 0 && valueIn === 0n) {
    const out = outs[0]!;
    const dest = movements.find((m) => m.from === fromAddr && m.to !== fromAddr);
    headline = `Sent ${fmtAmount(-out.net, out.decimals)} ${out.symbol}${dest ? ` to ${short(dest.to)}` : ""}`;
    subline =
      "A straight token transfer — no swap, no other tokens involved. If you didn't initiate this, check your approvals: someone may be moving your tokens with an old permission.";
    for (const m of burnLegs) flags.unshift(burnFlagFor(m));
  } else if (movements.length === 0 && valueIn > 0n) {
    headline = `Sent ${fmtAmount(valueIn, PLS_DECIMALS)} PLS${toAddr ? ` to ${short(toAddr)}` : ""}`;
    subline = "A plain native-currency transfer — no tokens moved in this transaction.";
  } else {
    headline = `This transaction moved ${movements.length} token leg${movements.length === 1 ? "" : "s"}`;
    subline =
      "A complex transaction — the full leg-by-leg breakdown is below. Each row is one verified on-chain movement.";
    for (const m of burnLegs) flags.unshift(burnFlagFor(m));
  }

  // Brag-card link, strictly gated: the tx must be a verified voluntary burn
  // the /api/brag-image endpoint can render — either a direct DUMB/DAMP
  // transfer() to the dead address or a router swap burn (native-PLS or
  // ERC-20 shape: `to` = dead, path ending in DUMB), mined successfully,
  // with the tokens actually arriving (a Transfer log to dead on that
  // token) — mirroring exactly what the endpoint verifies before it renders
  // the card. Anything else — other tokens, indirect paths, `to` != dead —
  // never sets this, so the UI can never promise a card the endpoint
  // would 404.
  const arrivalLogged = movements.some(
    (m) => m.token.toLowerCase() === toAddr && m.from === fromAddr && m.isBurnLeg,
  );
  const isDirectBurnTx =
    (toAddr === DUMB_LC || toAddr === DAMP_LC) &&
    fn === "transfer" &&
    transferToDead &&
    transferAmount != null &&
    transferAmount > 0n &&
    arrivalLogged;
  const isSwapBurnTx = swapBurnDumb && swapBurnArrived > 0n;

  return {
    hash,
    status: "mined",
    headline,
    subline,
    called,
    movements,
    flags,
    explorerUrl,
    burnBragTx: isDirectBurnTx || isSwapBurnTx ? hash : null,
  };
}
