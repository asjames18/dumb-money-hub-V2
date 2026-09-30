/**
 * Scan watchlist panel — the user's own saved quick-scan verdicts, kept in
 * localStorage (this browser only). Entries never claim to be current: each
 * row shows how long ago it was scanned, and Re-scan re-runs the scan live
 * on-chain in the mounted scanner above (the link pattern can't do this —
 * the scanner's shared-link auto-run only fires on mount).
 */
import { useEffect, useState } from "react";
import { Bookmark, RotateCcw, ScanSearch, ShieldCheck, ShieldX, X } from "lucide-react";

import { timeAgo } from "@/lib/burns";
import { explorerAddress } from "@/lib/pulsechain";
import {
  WATCHLIST_EVENT,
  loadWatchlist,
  removeFromWatchlist,
  notifyWatchlistChanged,
  requestRescan,
  type ScanWatchEntry,
} from "@/lib/scan-watchlist";

function VerdictBadge({ entry }: { entry: ScanWatchEntry }) {
  if (entry.redFlags === 0 && entry.cautions === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
        <ShieldCheck className="size-3" aria-hidden /> No red flags
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-amber-500">
      <ShieldX className="size-3" aria-hidden />
      {entry.redFlags > 0 ? `${entry.redFlags} red flag${entry.redFlags > 1 ? "s" : ""}` : ""}
      {entry.redFlags > 0 && entry.cautions > 0 ? " · " : ""}
      {entry.cautions > 0 ? `${entry.cautions} caution${entry.cautions > 1 ? "s" : ""}` : ""}
    </span>
  );
}

export function ScanWatchlist() {
  const [entries, setEntries] = useState<ScanWatchEntry[]>(() => loadWatchlist());

  useEffect(() => {
    const refresh = () => setEntries(loadWatchlist());
    window.addEventListener(WATCHLIST_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const remove = (address: `0x${string}`) => {
    setEntries(removeFromWatchlist(address));
  };

  const rescan = (entry: ScanWatchEntry) => {
    requestRescan(entry.address);
    document
      .getElementById("token-scanner")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Bookmark className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-xl uppercase tracking-wide">Your scan watchlist</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Tokens you've vetted, kept across visits — stored only in this browser, never sent anywhere.
        A verdict is a snapshot: re-scan before you act, because a contract's owner, taxes, or pause
        switch can change.
      </p>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border bg-background px-3 py-4 text-center text-sm text-muted-foreground">
          Nothing watched yet — scan a token above and tap{" "}
          <span className="font-bold text-foreground">Watch</span> to keep its verdict here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.address.toLowerCase()}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-background px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {entry.symbol ?? `${entry.address.slice(0, 10)}…${entry.address.slice(-8)}`}
                  </span>
                  <VerdictBadge entry={entry} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <a
                    href={explorerAddress(entry.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline decoration-dotted underline-offset-2"
                  >
                    {entry.address.slice(0, 10)}…{entry.address.slice(-8)}
                  </a>
                  <span>
                    Tax:{" "}
                    {entry.taxBps === null ? "not readable" : `${(entry.taxBps / 100).toFixed(1)}%`}
                  </span>
                  {entry.hasPair && <span className="text-primary">Deep scan available</span>}
                  <span>scanned {timeAgo(entry.scannedAtSec)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rescan(entry)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" aria-hidden /> Re-scan
                </button>
                <button
                  onClick={() => remove(entry.address)}
                  aria-label={`Remove ${entry.symbol ?? "token"} from watchlist`}
                  className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {entries.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ScanSearch className="size-3.5" aria-hidden />
          Keeps your latest {entries.length} watched token{entries.length > 1 ? "s" : ""} on this
          device.
        </p>
      )}
    </div>
  );
}
