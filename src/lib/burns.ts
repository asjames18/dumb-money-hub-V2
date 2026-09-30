import { decodeEventLog, formatUnits, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";

import {
  DAMP,
  BURN_EPOCH_BLOCK,
  DAMP_WPLS_PAIR,
  DEAD,
  DUMB,
  WPLS_DUMB_PAIR,
} from "@/lib/pulsechain";

export type PulsePublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
const ZERO = "0x0000000000000000000000000000000000000000";
const DEAD_LC = DEAD.toLowerCase();
/** Last N blocks scanned for burn legs (~10s blocks: ~2.3 days). */
export const SCAN_BLOCKS = 20_000n;
/** Keep each getLogs window small — the public RPC drops big scans. */
const LOG_CHUNK_BLOCKS = 5_000n;
/** Bound parallel calls — the public RPC drops connections under batches. */
const RECEIPT_BATCH = 4;
const MAX_TXS = 15;

/**
 * Retry a single RPC call with backoff. rpc.pulsechain.com drops connections
 * intermittently under repeated calls, so a dropped call retries on its own
 * instead of failing the whole scan. Bounded (3 attempts, ≤1.2s of backoff)
 * so a genuinely dead RPC still surfaces an error state honestly.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw last;
}

export type BurnKind = "voluntary" | "protocol";

export type BurnEvent = {
  token: "DUMB" | "DAMP";
  hash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number | null;
  /** Wallet that caused the burn (lowercased). */
  sender: string;
  /** Sum of this sender's legs into the dead address (wei). */
  burnedWei: bigint;
  kind: BurnKind;
};

/**
 * Reads real burn activity off-chain from the public PulseChain RPC:
 * every taxed transfer emits a 1% burn leg to the dead address, and every
 * voluntary burn is a direct transfer to the dead address. Both arrive as
 * Transfer(to=dead) logs — no new data source, no invented numbers.
 *
 * Verified mechanics (2026-09-26, backlog #1): the dead address is NOT
 * fee-excluded, so the protocol burn leg always comes from the transferrer,
 * never from the token contract. Per sender, per tx: if the sender has no
 * non-dead, non-contract recipient leg, this was a voluntary burn
 * (94% transfer leg + 1% protocol burn leg land at dead); otherwise the
 * dead leg is the 1% protocol burn of an ordinary taxed transfer.
 */
export async function fetchRecentBurns(client: PulsePublicClient): Promise<BurnEvent[]> {
  const latest = await withRetry(() => client.getBlockNumber());
  const fromBlock = latest > SCAN_BLOCKS ? latest - SCAN_BLOCKS : 0n;
  // Scan each token in small block windows so one dropped RPC call only
  // retries its chunk instead of killing the whole 20k-block scan.
  const scanToken = async (address: typeof DUMB | typeof DAMP) => {
    const chunks: [bigint, bigint][] = [];
    for (let from = fromBlock; from <= latest;) {
      const to = from + LOG_CHUNK_BLOCKS - 1n > latest ? latest : from + LOG_CHUNK_BLOCKS - 1n;
      chunks.push([from, to]);
      from = to + 1n;
    }
    const results = await Promise.all(
      chunks.map(([from, to]) =>
        withRetry(() =>
          client.getLogs({
            address,
            event: TRANSFER_EVENT,
            args: { to: DEAD },
            fromBlock: from,
            toBlock: to,
          }),
        ),
      ),
    );
    return results.flat();
  };
  const [dumbLogs, dampLogs] = await Promise.all([scanToken(DUMB), scanToken(DAMP)]);
  const tagged = [
    ...dumbLogs.map((l) => ({ ...l, token: "DUMB" as const })),
    ...dampLogs.map((l) => ({ ...l, token: "DAMP" as const })),
  ];
  const byTx = new Map<string, (typeof tagged)[number]>();
  for (const l of tagged) {
    const cur = byTx.get(l.transactionHash);
    if (!cur || l.blockNumber > cur.blockNumber) byTx.set(l.transactionHash, l);
  }
  const txs = [...byTx.values()]
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
    .slice(0, MAX_TXS);

  // Fetch receipts in small bounded batches: up to 30 parallel RPC calls is
  // exactly the pattern the public RPC drops; each call retries on its own.
  const receipts: {
    tx: (typeof txs)[number];
    receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>;
    timestamp: number;
  }[] = [];
  for (let i = 0; i < txs.length; i += RECEIPT_BATCH) {
    const batch = await Promise.all(
      txs.slice(i, i + RECEIPT_BATCH).map(async (tx) => {
        const [receipt, block] = await Promise.all([
          withRetry(() => client.getTransactionReceipt({ hash: tx.transactionHash })),
          withRetry(() => client.getBlock({ blockNumber: tx.blockNumber })),
        ]);
        return { tx, receipt, timestamp: Number(block.timestamp) };
      }),
    );
    receipts.push(...batch);
  }

  const events: BurnEvent[] = [];
  for (const { tx, receipt, timestamp } of receipts) {
    const tokenAddr = tx.token === "DUMB" ? DUMB : DAMP;
    const tokenLc = tokenAddr.toLowerCase();
    const bySender = new Map<string, { toDead: bigint; hasNonDead: boolean }>();
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== tokenLc) continue;
      let from = "";
      let to = "";
      let value = 0n;
      try {
        const d = decodeEventLog({
          abi: [TRANSFER_EVENT],
          data: log.data,
          topics: log.topics,
        });
        if (d.eventName !== "Transfer" || !d.args) continue;
        from = d.args.from.toLowerCase();
        to = d.args.to.toLowerCase();
        value = d.args.value;
      } catch {
        continue;
      }
      if (from === tokenLc || from === ZERO) continue; // entombed contract legs never burn
      const e = bySender.get(from) ?? { toDead: 0n, hasNonDead: false };
      if (to === DEAD_LC) e.toDead += value;
      else if (to !== tokenLc) e.hasNonDead = true;
      bySender.set(from, e);
    }
    for (const [sender, e] of bySender.entries()) {
      if (e.toDead <= 0n) continue;
      // Skip dust that would display as "0" (less than 0.005 tokens) — a "0 DUMB
      // burned" row is real on-chain but reads as noise and erodes trust.
      if (e.toDead < 5_000_000_000_000_000n) continue;
      events.push({
        token: tx.token,
        hash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        timestamp,
        sender,
        burnedWei: e.toDead,
        kind: e.hasNonDead ? "protocol" : "voluntary",
      });
    }
  }
  return events.sort((a, b) => Number(b.blockNumber - a.blockNumber));
}

/** Pair whose dead-leg sender means "swap output sent straight to dead"
 *  (the site's Burn with PLS flow) — the real burner is the tx originator. */
const PAIR_TO_TOKEN: Record<string, "DUMB" | "DAMP"> = {
  [WPLS_DUMB_PAIR.toLowerCase()]: "DUMB",
  [DAMP_WPLS_PAIR.toLowerCase()]: "DAMP",
};

/** Below this a dead leg reads as "0" — real on-chain but display noise. */
const DUST_WEI = 5_000_000_000_000_000n; // 0.005 tokens

export type EpochBurnRow = {
  /** Wallet that burned, lowercased. */
  address: string;
  /** Total voluntary DUMB burned since the epoch block (wei). */
  voluntaryDumbWei: bigint;
  /** Total voluntary DAMP burned since the epoch block (wei). */
  voluntaryDampWei: bigint;
  /** Number of voluntary burn txs. */
  txs: number;
  /** Earliest block with a voluntary burn — tie-break: first to burn keeps
   *  the higher rank, so nobody is bumped without burning more. */
  firstBlock: bigint;
};

/**
 * All-time voluntary burns since BURN_EPOCH_BLOCK (Sept 21 2026), for the
 * leaderboard. Two passes, no receipts (they don't scale to hundreds of
 * txs):
 *
 * 1. Chunked getLogs for Transfer(to=dead) on DUMB + DAMP across the whole
 *    epoch — finds every tx with a dead leg.
 * 2. For each distinct block containing a dead leg, one block-scoped getLogs
 *    for ALL token Transfer logs, then the same per-sender classification as
 *    fetchRecentBurns: voluntary iff the sender has no Transfer leg to a
 *    non-dead, non-token-contract address in that tx.
 *
 * Amounts stay in raw token wei — the leaderboard ranks by tokens burned,
 * never by estimated USD, so price moves can never re-rank anyone. Legs
 * whose token-level sender is the WPLS pair (the Burn with PLS flow) are
 * re-attributed to the tx originator — the human who signed the burn.
 */
export async function fetchEpochBurns(client: PulsePublicClient): Promise<EpochBurnRow[]> {
  const latest = await withRetry(() => client.getBlockNumber());
  const fromBlock = latest > BURN_EPOCH_BLOCK ? BURN_EPOCH_BLOCK : latest;

  const scanDeadLegs = async (address: typeof DUMB | typeof DAMP, token: "DUMB" | "DAMP") => {
    const chunks: [bigint, bigint][] = [];
    for (let from = fromBlock; from <= latest;) {
      const to = from + LOG_CHUNK_BLOCKS - 1n > latest ? latest : from + LOG_CHUNK_BLOCKS - 1n;
      chunks.push([from, to]);
      from = to + 1n;
    }
    // Chunks run in bounded batches — the public RPC drops wide-open fan-out.
    const out: { hash: `0x${string}`; blockNumber: bigint; token: "DUMB" | "DAMP" }[] = [];
    for (let i = 0; i < chunks.length; i += RECEIPT_BATCH) {
      const batch = await Promise.all(
        chunks.slice(i, i + RECEIPT_BATCH).map(([from, to]) =>
          withRetry(() =>
            client.getLogs({
              address,
              event: TRANSFER_EVENT,
              args: { to: DEAD },
              fromBlock: from,
              toBlock: to,
            }),
          ),
        ),
      );
      for (const logs of batch)
        for (const l of logs)
          out.push({ hash: l.transactionHash, blockNumber: l.blockNumber, token });
    }
    return out;
  };

  const [dumbDead, dampDead] = await Promise.all([
    scanDeadLegs(DUMB, "DUMB"),
    scanDeadLegs(DAMP, "DAMP"),
  ]);

  // Distinct (block, token) pairs with at least one dead leg, plus a
  // tx -> block lookup for classification below.
  const blockTokens = new Map<string, { blockNumber: bigint; token: "DUMB" | "DAMP" }>();
  const txBlock = new Map<string, bigint>();
  for (const d of [...dumbDead, ...dampDead]) {
    const k = `${d.blockNumber}:${d.token}`;
    if (!blockTokens.has(k)) blockTokens.set(k, { blockNumber: d.blockNumber, token: d.token });
    txBlock.set(`${d.hash}:${d.token}`, d.blockNumber);
  }

  // All token Transfer logs for those blocks, grouped by (tx, token).
  type TxKey = string; // `${txHash}:${token}`
  const txLogs = new Map<TxKey, { from: string; to: string; value: bigint }[]>();
  const entries = [...blockTokens.values()];
  for (let i = 0; i < entries.length; i += RECEIPT_BATCH) {
    const batch = await Promise.all(
      entries.slice(i, i + RECEIPT_BATCH).map(({ blockNumber, token }) =>
        withRetry(() =>
          client.getLogs({
            address: token === "DUMB" ? DUMB : DAMP,
            event: TRANSFER_EVENT,
            fromBlock: blockNumber,
            toBlock: blockNumber,
          }),
        ).then((logs) => ({ token, logs })),
      ),
    );
    for (const { token, logs } of batch) {
      for (const l of logs) {
        const d = decodeEventLog({ abi: [TRANSFER_EVENT], data: l.data, topics: l.topics });
        if (d.eventName !== "Transfer" || !d.args) continue;
        const k: TxKey = `${l.transactionHash}:${token}`;
        const arr = txLogs.get(k) ?? [];
        arr.push({
          from: d.args.from.toLowerCase(),
          to: d.args.to.toLowerCase(),
          value: d.args.value,
        });
        txLogs.set(k, arr);
      }
    }
  }

  // Per-tx voluntary legs, before aggregation.
  const vols: {
    hash: string;
    token: "DUMB" | "DAMP";
    sender: string;
    toDead: bigint;
    blockNumber: bigint;
  }[] = [];
  for (const [key, legs] of txLogs) {
    const token = key.endsWith(":DUMB") ? ("DUMB" as const) : ("DAMP" as const);
    const tokenAddr = token === "DUMB" ? DUMB : DAMP;
    const tokenLc = tokenAddr.toLowerCase();
    const blockNumber = txBlock.get(key) ?? 0n;
    const bySender = new Map<string, { toDead: bigint; hasNonDead: boolean }>();
    for (const leg of legs) {
      if (leg.from === tokenLc || leg.from === ZERO) continue;
      const e = bySender.get(leg.from) ?? { toDead: 0n, hasNonDead: false };
      if (leg.to === DEAD_LC) e.toDead += leg.value;
      else if (leg.to !== tokenLc) e.hasNonDead = true;
      bySender.set(leg.from, e);
    }
    for (const [sender, e] of bySender) {
      if (e.toDead <= 0n || e.hasNonDead) continue; // protocol legs don't rank
      if (e.toDead < DUST_WEI) continue; // same dust filter as the ticker
      vols.push({ hash: key.slice(0, 66), token, sender, toDead: e.toDead, blockNumber });
    }
  }

  // The site's Burn with PLS flow sends swap output straight to dead, so the
  // pair is the token-level sender — but the human who signed the swap is the
  // real burner. Re-attribute those legs to the tx originator so the human
  // sees "That's you", and so the pair can't become an unbeatable #1 row
  // that no individual burner could ever pass.
  const pairHashes = [
    ...new Set(vols.filter((v) => PAIR_TO_TOKEN[v.sender] === v.token).map((v) => v.hash)),
  ];
  const originator = new Map<string, string>();
  for (let i = 0; i < pairHashes.length; i += RECEIPT_BATCH) {
    const batch = await Promise.all(
      pairHashes.slice(i, i + RECEIPT_BATCH).map((h) =>
        withRetry(() => client.getTransaction({ hash: h as `0x${string}` })).then((tx) => ({
          h,
          from: tx.from.toLowerCase(),
        })),
      ),
    );
    for (const { h, from } of batch) originator.set(h, from);
  }
  for (const v of vols) {
    if (PAIR_TO_TOKEN[v.sender] === v.token) {
      const o = originator.get(v.hash);
      if (o) v.sender = o;
    }
  }

  const agg = new Map<string, EpochBurnRow>();
  for (const v of vols) {
    const r =
      agg.get(v.sender) ??
      ({
        address: v.sender,
        voluntaryDumbWei: 0n,
        voluntaryDampWei: 0n,
        txs: 0,
        firstBlock: v.blockNumber,
      } as EpochBurnRow);
    if (v.token === "DUMB") r.voluntaryDumbWei += v.toDead;
    else r.voluntaryDampWei += v.toDead;
    r.txs += 1;
    if (v.blockNumber < r.firstBlock) r.firstBlock = v.blockNumber;
    agg.set(v.sender, r);
  }
  return [...agg.values()];
}

export function fmtCompactTok(wei: bigint): string {
  const n = Number(formatUnits(wei, 18));
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function timeAgo(ts: number | null): string {
  if (ts === null) return "";
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
