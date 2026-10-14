/**
 * Wallet Watch — a browser-local watchlist for /portfolio. Entries hold an
 * address, a user label, and a compact snapshot of what the wallet looked
 * like the last time it was viewed. Viewing a watched wallet again diffs the
 * fresh chain reads against that snapshot and surfaces what changed.
 *
 * localStorage only (this browser, nothing leaves it): no accounts, no
 * custody, no signing, no server. Every change event comes from a real diff
 * of real chain reads; never invented.
 */
import { getAddress } from "viem";

import type { IntelToken, IntelTx } from "./wallet-intel";
import { safePersistedSymbol } from "./scan-watchlist";

/** A change between two snapshots of the same watched wallet. */
export type WatchChange =
  | { kind: "new_token"; addr: string; sym: string | null }
  | { kind: "token_gone"; addr: string; sym: string | null }
  | { kind: "balance_moved"; addr: string; sym: string | null; dir: "up" | "down"; pct: number }
  | { kind: "new_txs"; count: number };

/** Compact point-in-time state of a watched wallet. Balances as decimal strings. */
export interface WatchSnapshot {
  plsWei: string;
  tokens: Array<{ addr: string; bal: string; sym: string | null }>;
  lastTxHash: string | null;
  lastTxTs: number | null;
  /** Seconds epoch, matching timeAgo(). */
  takenAtSec: number;
}

export interface WalletWatchEntry {
  /** Checksummed address. */
  address: `0x${string}`;
  label: string;
  /** Seconds epoch. */
  addedAtSec: number;
  /** Seconds epoch. */
  lastSeenAtSec: number;
  lastSnapshot: WatchSnapshot | null;
  /** Diff computed on the most recent view (null = baseline only, [] = no changes). */
  lastDiff: WatchChange[] | null;
}

const KEY = "dumb-wallet-watchlist-v1";
const MAX_ENTRIES = 50;
/** Fired after any add/remove/label/snapshot so panels refresh without a reload. */
export const WALLET_WATCH_EVENT = "dumb:wallet-watch-changed";
/** A token balance must move by at least this much (in percent) to count as "moved". */
const BALANCE_MOVE_PCT = 10;

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** Normalize to a checksummed address, or null when invalid. */
export function normalizeWatchAddress(address: string): `0x${string}` | null {
  try {
    return getAddress(address);
  } catch {
    return null;
  }
}

function isValidSnapshot(s: unknown): s is WatchSnapshot {
  if (typeof s !== "object" || s === null) return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o["plsWei"] === "string" &&
    /^\d+$/.test(o["plsWei"]) &&
    Array.isArray(o["tokens"]) &&
    (o["tokens"] as unknown[]).every((t) => {
      const r = t as Record<string, unknown>;
      return (
        typeof r === "object" &&
        r !== null &&
        typeof r["addr"] === "string" &&
        /^0x[0-9a-fA-F]{40}$/.test(r["addr"]) &&
        typeof r["bal"] === "string" &&
        /^\d+$/.test(r["bal"]) &&
        (r["sym"] === null || typeof r["sym"] === "string")
      );
    }) &&
    (o["lastTxHash"] === null || typeof o["lastTxHash"] === "string") &&
    (o["lastTxTs"] === null || Number.isSafeInteger(o["lastTxTs"])) &&
    Number.isSafeInteger(o["takenAtSec"])
  );
}

function isValidChange(c: unknown): c is WatchChange {
  if (typeof c !== "object" || c === null) return false;
  const o = c as Record<string, unknown>;
  switch (o["kind"]) {
    case "new_token":
    case "token_gone":
      return (
        typeof o["addr"] === "string" &&
        /^0x[0-9a-fA-F]{40}$/.test(o["addr"]) &&
        (o["sym"] === null || typeof o["sym"] === "string")
      );
    case "balance_moved":
      return (
        typeof o["addr"] === "string" &&
        /^0x[0-9a-fA-F]{40}$/.test(o["addr"]) &&
        (o["sym"] === null || typeof o["sym"] === "string") &&
        (o["dir"] === "up" || o["dir"] === "down") &&
        Number.isSafeInteger(o["pct"])
      );
    case "new_txs":
      return Number.isSafeInteger(o["count"]) && (o["count"] as number) > 0;
    default:
      return false;
  }
}

function isValidEntry(e: unknown): e is WalletWatchEntry {
  if (typeof e !== "object" || e === null) return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o["address"] === "string" &&
    /^0x[0-9a-fA-F]{40}$/.test(o["address"]) &&
    typeof o["label"] === "string" &&
    Number.isSafeInteger(o["addedAtSec"]) &&
    Number.isSafeInteger(o["lastSeenAtSec"]) &&
    (o["lastSnapshot"] === null || isValidSnapshot(o["lastSnapshot"])) &&
    (o["lastDiff"] === null ||
      (Array.isArray(o["lastDiff"]) && (o["lastDiff"] as unknown[]).every(isValidChange)))
  );
}

export function loadWalletWatchlist(): WalletWatchEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function save(entries: WalletWatchEntry[]): WalletWatchEntry[] {
  const capped = entries.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(capped));
  } catch {
    /* storage full/blocked — the in-memory list still renders this visit */
  }
  return capped;
}

export function getWalletEntry(address: string): WalletWatchEntry | null {
  const key = address.toLowerCase();
  return loadWalletWatchlist().find((e) => e.address.toLowerCase() === key) ?? null;
}

export function isWalletWatched(address: string): boolean {
  return getWalletEntry(address) !== null;
}

/** Add (or refresh the label timestamp of an existing entry). Newest first. */
export function addWallet(address: string, label?: string): WalletWatchEntry[] {
  const normalized = normalizeWatchAddress(address);
  if (!normalized) return loadWalletWatchlist();
  const key = normalized.toLowerCase();
  const existing = loadWalletWatchlist().find((e) => e.address.toLowerCase() === key);
  const entry: WalletWatchEntry = existing ?? {
    address: normalized,
    label: label ?? `${normalized.slice(0, 6)}…${normalized.slice(-4)}`,
    addedAtSec: nowSec(),
    lastSeenAtSec: nowSec(),
    lastSnapshot: null,
    lastDiff: null,
  };
  const rest = loadWalletWatchlist().filter((e) => e.address.toLowerCase() !== key);
  return save([entry, ...rest]);
}

export function removeWallet(address: string): WalletWatchEntry[] {
  const key = address.toLowerCase();
  return save(loadWalletWatchlist().filter((e) => e.address.toLowerCase() !== key));
}

export function setWalletLabel(address: string, label: string): WalletWatchEntry[] {
  const key = address.toLowerCase();
  const trimmed = label.trim().slice(0, 40);
  if (!trimmed) return loadWalletWatchlist();
  return save(
    loadWalletWatchlist().map((e) =>
      e.address.toLowerCase() === key ? { ...e, label: trimmed } : e,
    ),
  );
}

/**
 * Record a fresh snapshot for a watched address (diff already computed by the
 * caller). No-op when the address isn't watched.
 */
export function recordSnapshot(
  address: string,
  snapshot: WatchSnapshot,
  diff: WatchChange[] | null,
): WalletWatchEntry[] {
  const key = address.toLowerCase();
  return save(
    loadWalletWatchlist().map((e) =>
      e.address.toLowerCase() === key
        ? { ...e, lastSnapshot: snapshot, lastDiff: diff, lastSeenAtSec: nowSec() }
        : e,
    ),
  );
}

export function notifyWalletWatchChanged(): void {
  window.dispatchEvent(new Event(WALLET_WATCH_EVENT));
}

/** Build a compact snapshot from a successful set of wallet-intel reads. */
export function snapshotFromIntel(
  plsWei: bigint,
  tokens: IntelToken[],
  txs: IntelTx[],
): WatchSnapshot {
  const newest = txs[0];
  return {
    plsWei: plsWei.toString(),
    // Symbols ride along from Blockscout/on-chain reads (attacker-controlled):
    // bound them at the persistence boundary so one hostile token can't blow
    // the localStorage quota and silently break the whole watchlist.
    tokens: tokens.map((t) => ({
      addr: t.address,
      bal: t.balance.toString(),
      sym: safePersistedSymbol(t.symbol),
    })),
    lastTxHash: newest ? newest.hash : null,
    lastTxTs: newest ? newest.timeStamp : null,
    takenAtSec: nowSec(),
  };
}

const PCT = 100n;
const MOVE_FACTOR = BigInt(100 + BALANCE_MOVE_PCT); // 110

/**
 * Diff two snapshots into change events. All comparisons in bigint — no float
 * money math. `freshTxTs` = timeStamps (newest first) of the current tx fetch;
 * new_txs counts how many are newer than the previous snapshot's lastTxTs.
 */
export function diffSnapshots(
  prev: WatchSnapshot,
  next: WatchSnapshot,
  freshTxTs: number[] = [],
): WatchChange[] {
  const changes: WatchChange[] = [];
  const prevBy = new Map(prev.tokens.map((t) => [t.addr.toLowerCase(), t]));
  const nextBy = new Map(next.tokens.map((t) => [t.addr.toLowerCase(), t]));

  for (const [k, t] of nextBy) {
    const p = prevBy.get(k);
    if (!p) {
      changes.push({ kind: "new_token", addr: t.addr, sym: t.sym });
      continue;
    }
    const pBal = BigInt(p.bal);
    const nBal = BigInt(t.bal);
    if (nBal === pBal) continue;
    // moved >= 10%? n*100 >= p*110 (up) or p*100 >= n*110 (down)
    const up = nBal * PCT >= pBal * MOVE_FACTOR;
    const down = pBal * PCT >= nBal * MOVE_FACTOR;
    if (!up && !down) continue;
    // Integer percent for display only — floor, never a money value.
    const pct =
      up && pBal > 0n
        ? Number(((nBal - pBal) * PCT) / pBal)
        : down && nBal > 0n
          ? Number(((pBal - nBal) * PCT) / nBal)
          : 0;
    changes.push({
      kind: "balance_moved",
      addr: t.addr,
      sym: t.sym,
      dir: up ? "up" : "down",
      pct: Number.isFinite(pct) ? pct : 0,
    });
  }
  for (const [k, t] of prevBy) {
    if (!nextBy.has(k)) changes.push({ kind: "token_gone", addr: t.addr, sym: t.sym });
  }

  if (prev.lastTxTs != null && freshTxTs.length > 0) {
    const count = freshTxTs.filter((ts) => ts > prev.lastTxTs!).length;
    if (count > 0) changes.push({ kind: "new_txs", count });
  }
  return changes;
}

/** One-line, honest human text for a change event. */
export function describeWatchChange(c: WatchChange): string {
  const name = (sym: string | null, addr: string) => sym ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  switch (c.kind) {
    case "new_token":
      return `+1 token (${name(c.sym, c.addr)})`;
    case "token_gone":
      return `−1 token (${name(c.sym, c.addr)})`;
    case "balance_moved":
      return `${name(c.sym, c.addr)} ${c.dir === "up" ? "▲" : "▼"}${c.pct > 0 ? ` ~${c.pct}%` : ""}`;
    case "new_txs":
      return `${c.count} new transaction${c.count === 1 ? "" : "s"}`;
  }
}
