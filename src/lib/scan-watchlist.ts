/**
 * Scan watchlist — lets a user keep the quick-scan results they care about
 * across visits. localStorage only (this browser, nothing leaves it): entries
 * hold the address + a one-line verdict summary, never full check text. A
 * watched entry never claims to be current — the list shows how long ago it
 * was scanned and one tap re-runs the scan live on-chain.
 */
import type { QuickScanResult } from "./token-scan";

export interface ScanWatchEntry {
  address: `0x${string}`;
  /** On-chain symbol() at scan time (null = the metadata check didn't pass). */
  symbol: string | null;
  redFlags: number;
  cautions: number;
  /** Transfer tax in bps from the contract's own getters (null = none found). */
  taxBps: number | null;
  /** Whether a PulseX WPLS pair existed → deep scan is available. */
  hasPair: boolean;
  /** Seconds epoch, matching timeAgo(). */
  scannedAtSec: number;
}

const KEY = "dumb-scan-watchlist-v1";
const MAX_ENTRIES = 50;
/** Fired after any add/remove so the list panel refreshes without a reload. */
export const WATCHLIST_EVENT = "dumb:watchlist-changed";
/** CustomEvent detail = 0x address string: ask the mounted scanner to re-run. */
export const RESCAN_EVENT = "dumb:rescan";

function isValidEntry(e: unknown): e is ScanWatchEntry {
  if (typeof e !== "object" || e === null) return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o["address"] === "string" &&
    /^0x[0-9a-fA-F]{40}$/.test(o["address"]) &&
    (o["symbol"] === null || typeof o["symbol"] === "string") &&
    Number.isSafeInteger(o["redFlags"]) &&
    Number.isSafeInteger(o["cautions"]) &&
    (o["taxBps"] === null || typeof o["taxBps"] === "number") &&
    typeof o["hasPair"] === "boolean" &&
    Number.isSafeInteger(o["scannedAtSec"])
  );
}

export function loadWatchlist(): ScanWatchEntry[] {
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

function save(entries: ScanWatchEntry[]): ScanWatchEntry[] {
  const capped = entries.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(capped));
  } catch {
    /* storage full/blocked — the in-memory list still renders this visit */
  }
  return capped;
}

export function watchEntryFromResult(r: QuickScanResult): ScanWatchEntry {
  return {
    address: r.address,
    symbol: r.symbol,
    redFlags: r.checks.filter((c) => c.status === "fail").length,
    cautions: r.checks.filter((c) => c.status === "warn").length,
    taxBps: r.taxBps,
    hasPair: r.pair !== null,
    scannedAtSec: Math.floor(Date.now() / 1000),
  };
}

/** Add or refresh (a re-scan updates the verdict + timestamp, newest first). */
export function addToWatchlist(result: QuickScanResult): ScanWatchEntry[] {
  const entry = watchEntryFromResult(result);
  const key = result.address.toLowerCase();
  const rest = loadWatchlist().filter((e) => e.address.toLowerCase() !== key);
  return save([entry, ...rest]);
}

export function removeFromWatchlist(address: string): ScanWatchEntry[] {
  const key = address.toLowerCase();
  return save(loadWatchlist().filter((e) => e.address.toLowerCase() !== key));
}

export function isWatched(address: string): boolean {
  const key = address.toLowerCase();
  return loadWatchlist().some((e) => e.address.toLowerCase() === key);
}

export function notifyWatchlistChanged(): void {
  window.dispatchEvent(new Event(WATCHLIST_EVENT));
}

/** Ask the mounted scanner to re-run a quick scan for the given address. */
export function requestRescan(address: `0x${string}`): void {
  window.dispatchEvent(new CustomEvent(RESCAN_EVENT, { detail: address }));
}
