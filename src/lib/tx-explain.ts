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
   * the dead address — the exact shapes /api/brag-image verifies before it
   * renders a shareable brag card (a direct transfer(), or the PLS-swap burn
   * shape: router swapExactETHForTokensSupportingFeeOnTransferTokens with
   * `to` = dead and the path ending in DUMB). The UI links /brag?tx= only
   * when this is set, so a card is never promised for burns the endpoint
   * can't render (other tokens, indirect paths). Null otherwise.
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
  // gets the decoded function name when we recognize it. We also capture
  // whether this is a plain transfer() straight to the dead address — the
  // voluntary-burn shape (note: taxed tokens emit extra legs to their own
  // contract alongside the dead legs, so "burn" is NOT "every leg is a burn
  // leg"; it's the call shape plus dead-address arrival in the logs).
  let called: string | null = null;
  let fn: string | null = null;
  let transferToDead = false;
  let transferAmount: bigint | null = null;
  // PLS-swap burn shape: swapExactETHForTokensSupportingFeeOnTransferTokens
  // on the PulseX router with `to` = dead and the path ending in DUMB — the
  // same shape /api/brag-image verifies before rendering a brag card. Args
  // are captured (not just the name) so the gate below can check them.
  let swapArgs: readonly [bigint, readonly string[], string, bigint] | null = null;
  const toAddr = (tx.to ?? "").toLowerCase();
  if (toAddr) {
    if (tx.input && tx.input !== "0x") {
      try {
        const decoded = decodeFunctionData({ abi: routerAbi, data: tx.input });
        fn = decoded.functionName;
        if (fn === "swapExactETHForTokensSupportingFeeOnTransferTokens") {
          swapArgs = decoded.args as readonly [bigint, readonly string[], string, bigint];
        }
      } catch {
        try {
          const decoded = decodeFunctionData({ abi: erc20MinAbi, data: tx.input });
          fn = decoded.functionName;
          if (fn === "transfer") {
            const [to, amount] = decoded.args as [string, bigint];
            transferToDead = to.toLowerCase() === DEAD_LC;
            transferAmount = amount;
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
    return {
      hash,
      status: "failed",
      headline: "This transaction failed",
      subline:
        "It was reverted, so none of the token movements it attempted actually happened — but the gas was still spent. If you paid for a swap or a burn, nothing was swapped or burned.",
      called,
      movements: [],
      flags: [
        {
          kind: "warn",
          text: "Failed transactions still cost gas. If a wallet or site told you this succeeded, that was wrong — the chain says reverted.",
        },
      ],
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

  // PLS-swap burn gate, mirroring exactly what /api/brag-image verifies
  // before rendering a card: the PulseX router's
  // swapExactETHForTokensSupportingFeeOnTransferTokens with `to` = dead and
  // the path ending in DUMB, mined successfully (reverted txs returned
  // above), with DUMB actually arriving at dead in the receipt logs.
  const swapBurnDumb = (() => {
    if (toAddr !== ROUTER_LC || !swapArgs) return false;
    const [, path, to] = swapArgs;
    if (to.toLowerCase() !== DEAD_LC) return false;
    if (path.length === 0) return false;
    return path[path.length - 1]!.toLowerCase() === DUMB_LC;
  })();
  const swapBurnArrived = burnSums.get(DUMB_LC) ?? 0n;

  if (movements.length === 0 && valueIn === 0n) {
    headline = "No token or PLS movements";
    subline =
      "This transaction moved nothing the tool can see — likely a contract interaction with no transfers (an approval, a settings change, or similar). Approvals don't move tokens; they grant permission.";
    flags.push({
      kind: "info",
      text: "Heads up: a token approval looks exactly like this — no movements, but the spender can now move your tokens. Revoke approvals you don't recognize.",
    });
  } else if (swapBurnDumb && swapBurnArrived > 0n) {
    // PLS-path voluntary burn: PLS went in, the bought DUMB went straight to
    // the dead address — classified as a burn, not a swap, because nothing
    // came back to the sender. The amount shown is the verified dead arrival
    // (the same number the brag card prints); the 6% transfer tax is taken
    // on the swap output before it lands at dead.
    const dec = nets.get(DUMB_LC)?.decimals ?? 18;
    headline = `Burn — ${fmtAmount(swapBurnArrived, dec)} DUMB destroyed`;
    subline =
      "This transaction swapped PLS for DUMB through the PulseX router and sent the bought DUMB straight to the dead address — permanently destroyed. Nothing and nobody can recover burned tokens.";
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
  // transfer() to the dead address or the PLS-swap burn shape (router swap
  // with `to` = dead, path ending in DUMB), mined successfully, with the
  // tokens actually arriving (a Transfer log to dead on that token) —
  // mirroring exactly what the endpoint verifies before it renders the
  // card. Anything else — other tokens, indirect paths — never sets this,
  // so the UI can never promise a card the endpoint would 404.
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
