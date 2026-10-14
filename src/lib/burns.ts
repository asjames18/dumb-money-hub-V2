import { formatUnits, numberToHex } from "viem";
import type { TransactionReceipt } from "viem";
import type { usePublicClient } from "wagmi";

import {
  DAMP,
  BURN_EPOCH_BLOCK,
  DAMP_WPLS_PAIR,
  DEAD,
  DUMB,
  WPLS_DUMB_PAIR,
} from "@/lib/pulsechain";

export type PulsePublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

/**
 * Topic0 for ERC-20 Transfer logs.
 *
 * `...523b3ef` IS the textbook keccak256("Transfer(address,address,uint256)")
 * — verified computationally 2026-10-10 (test-vector-validated keccak, two
 * independent implementations) and against live PulseChain receipts: every
 * Transfer log on DUMB, DAMP, HEX, INC, PRVX and PLSX carries it. The old
 * `...288b6e9` value was a misrecorded hash that never appears on-chain;
 * filtering on it silently matched ZERO rows — that is exactly how the burn
 * leaderboard went empty (fixed 2026-10-05). Both values are accepted on
 * decode (defensive); filtering uses the verified textbook one. Never
 * hand-type this constant: compute it with keccak256 at runtime (see
 * src/routes/api/brag-image.ts) or import it from here.
 */
export const TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const CLASSIC_TRANSFER_TOPIC0 =
  // Misrecorded value from before the 2026-10-05 fix: it never appears in any
  // on-chain log. Kept only so decode stays liberal; filtering never uses it.
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df288b6e9";

/** Zero-pad an address into a log topic. */
export function addrTopic(addr: string): `0x${string}` {
  return `0x${"0".repeat(24)}${addr.toLowerCase().replace(/^0x/, "")}` as `0x${string}`;
}

export type RawLogFilter = {
  address?: `0x${string}` | `0x${string}`[];
  topics?: (`0x${string}` | null)[];
  fromBlock?: `0x${string}`;
  toBlock?: `0x${string}`;
};

export type RawRpcLog = {
  transactionHash: `0x${string}`;
  blockNumber: `0x${string}`;
  topics: `0x${string}`[];
  data: `0x${string}`;
};

/**
 * Raw eth_getLogs with explicit topics. viem's typed getLogs derives topic0
 * from an ABI event hash, but the contracts on this chain emit Transfer logs
 * with a different topic0 (see TRANSFER_TOPIC0) — so the raw method is the
 * only honest path. Drops logs missing a tx hash or block number; every
 * caller below needs both.
 */
export async function rpcGetLogs(
  client: PulsePublicClient,
  filter: RawLogFilter,
): Promise<RawRpcLog[]> {
  const arg = {
    method: "eth_getLogs",
    params: [filter],
    // The client's RpcSchema types don't model raw topic filters (null
    // entries); the wire shape is exactly what the node expects.
  } as never;
  const logs = (await client.request(arg)) as (Partial<RawRpcLog> & {
    topics?: string[];
    data?: string;
  })[];
  return logs
    .filter(
      (l): l is RawRpcLog =>
        !!l.transactionHash &&
        !!l.blockNumber &&
        Array.isArray(l.topics) &&
        typeof l.data === "string",
    )
    .map((l) => ({
      transactionHash: l.transactionHash,
      blockNumber: l.blockNumber,
      topics: l.topics as `0x${string}`[],
      data: l.data as `0x${string}`,
    }));
}
export type DecodedTransfer = { from: string; to: string; value: bigint };

/**
 * Manually decode a Transfer-shaped log (indexed from/to, value in data).
 * decodeEventLog can't be used here: the on-chain topic0 doesn't match the
 * ABI hash, so it throws on every real log. Never invents a row.
 */
export function decodeTransferLog(log: {
  topics: readonly string[] | string[];
  data: `0x${string}` | string;
}): DecodedTransfer | null {
  const topics = log.topics as string[];
  if (topics.length !== 3) return null;
  const t0 = topics[0];
  const t1 = topics[1];
  const t2 = topics[2];
  if (!t0 || !t1 || !t2) return null;
  const sig = t0.toLowerCase();
  if (sig !== TRANSFER_TOPIC0 && sig !== CLASSIC_TRANSFER_TOPIC0) return null;
  try {
    return {
      from: `0x${t1.slice(-40)}`.toLowerCase(),
      to: `0x${t2.slice(-40)}`.toLowerCase(),
      value: BigInt(log.data),
    };
  } catch {
    return null;
  }
}
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
          // Raw eth_getLogs: viem's typed getLogs derives topics from an ABI
          // event, and the on-chain topic0 doesn't match the ABI hash.
          rpcGetLogs(client, {
            address,
            topics: [TRANSFER_TOPIC0, null, addrTopic(DEAD)],
            fromBlock: numberToHex(from),
            toBlock: numberToHex(to),
          }),
        ),
      ),
    );
    // Only the tx hash + block are used downstream (receipts re-derive legs).
    return results.flat().map((l) => ({
      transactionHash: l.transactionHash,
      blockNumber: BigInt(l.blockNumber),
    }));
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
      const d = decodeTransferLog(log);
      if (!d) continue;
      const { from, to, value } = d;
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
  /** Per-tx voluntary legs (block-scoped) — lets time-aware consumers
   *  (e.g. pledges) count only burns that landed after a given block. */
  legs: EpochBurnLeg[];
};

/** One voluntary burn leg inside an EpochBurnRow. */
export type EpochBurnLeg = {
  /** Block the burn landed in. */
  blockNumber: bigint;
  token: "DUMB" | "DAMP";
  /** Dead-leg wei (arrival accounting). */
  wei: bigint;
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
            // Raw eth_getLogs: viem's typed getLogs derives topics from an
            // ABI event, and the on-chain topic0 doesn't match the ABI hash.
            rpcGetLogs(client, {
              address,
              topics: [TRANSFER_TOPIC0, null, addrTopic(DEAD)],
              fromBlock: numberToHex(from),
              toBlock: numberToHex(to),
            }),
          ),
        ),
      );
      for (const logs of batch)
        for (const l of logs)
          out.push({ hash: l.transactionHash, blockNumber: BigInt(l.blockNumber), token });
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
          // Raw eth_getLogs — same topic0 reason as above.
          rpcGetLogs(client, {
            address: token === "DUMB" ? DUMB : DAMP,
            topics: [TRANSFER_TOPIC0],
            fromBlock: numberToHex(blockNumber),
            toBlock: numberToHex(blockNumber),
          }),
        ).then((logs) => ({ token, logs })),
      ),
    );
    for (const { token, logs } of batch) {
      for (const l of logs) {
        const d = decodeTransferLog(l);
        if (!d) continue;
        const k: TxKey = `${l.transactionHash}:${token}`;
        const arr = txLogs.get(k) ?? [];
        arr.push(d);
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
        legs: [],
      } as EpochBurnRow);
    if (v.token === "DUMB") r.voluntaryDumbWei += v.toDead;
    else r.voluntaryDampWei += v.toDead;
    r.legs.push({ blockNumber: v.blockNumber, token: v.token, wei: v.toDead });
    r.txs += 1;
    if (v.blockNumber < r.firstBlock) r.firstBlock = v.blockNumber;
    agg.set(v.sender, r);
  }
  return [...agg.values()];
}

/**
 * Decode the tax legs of a direct wallet→dead burn from its receipt logs.
 * Pure and local: no RPC, no new data source — it reads the receipt the
 * wallet already returned. Sums the Transfer legs into the dead address
 * (the plain transfer leg + the 1% protocol burn leg, both land on dead)
 * and into the token contract itself (the entombed buckets). Mints are
 * skipped. Returns null when no dead-bound leg decodes — never invents legs.
 */
export type BurnReceiptLegs = {
  deadWei: bigint;
  bucketWei: bigint;
};

export function burnReceiptLegs(
  logs: TransactionReceipt["logs"],
  tokenAddress: string,
): BurnReceiptLegs | null {
  const tokenLc = tokenAddress.toLowerCase();
  let deadWei = 0n;
  let bucketWei = 0n;
  for (const log of logs) {
    if (log.address.toLowerCase() !== tokenLc) continue;
    const d = decodeTransferLog(log);
    if (!d) continue;
    const { from, to, value } = d;
    if (from === ZERO) continue; // mints never burn
    if (to === DEAD_LC) deadWei += value;
    else if (to === tokenLc) bucketWei += value;
  }
  if (deadWei === 0n) return null;
  return { deadWei, bucketWei };
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
