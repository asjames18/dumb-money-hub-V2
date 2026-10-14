/**
 * Wallet Watch UI — the browser-local watchlist for /portfolio.
 *
 * Everything here reads/writes localStorage only (this browser, nothing
 * leaves it). The "what's new" badges and the banner below come from real
 * diffs of real chain reads — never invented, never promising anything.
 */
import { useEffect, useState } from "react";
import { Bell, Check, Eye, EyeOff, Pencil, X } from "lucide-react";

import { explorerAddress } from "@/lib/pulsechain";
import { shortAddr, timeAgo } from "@/lib/wallet-intel";
import {
  WALLET_WATCH_EVENT,
  addWallet,
  describeWatchChange,
  getWalletEntry,
  isWalletWatched,
  loadWalletWatchlist,
  notifyWalletWatchChanged,
  removeWallet,
  setWalletLabel,
  type WalletWatchEntry,
  type WatchChange,
} from "@/lib/watchlist";

function useWalletWatchlist(): WalletWatchEntry[] {
  const [entries, setEntries] = useState<WalletWatchEntry[]>(() => loadWalletWatchlist());
  useEffect(() => {
    const refresh = () => setEntries(loadWalletWatchlist());
    window.addEventListener(WALLET_WATCH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WALLET_WATCH_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return entries;
}

/** Toggle button shown on a viewed address: "Watch this wallet" ↔ "Watching". */
export function WatchToggleButton({ address }: { address: string }) {
  const entries = useWalletWatchlist();
  const watched = entries.some((e) => e.address.toLowerCase() === address.toLowerCase());

  const toggle = () => {
    if (watched) removeWallet(address);
    else addWallet(address);
    notifyWalletWatchChanged();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={watched}
      title={
        watched
          ? "Stop watching this wallet (removes it from your watchlist)"
          : "Watch this wallet — save it here and see what changes next visit"
      }
      className={
        watched
          ? "inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/25"
          : "inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      }
    >
      {watched ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {watched ? "Watching" : "Watch this wallet"}
    </button>
  );
}

function ChangeBadge({ change }: { change: WatchChange }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
      <Bell className="size-3" aria-hidden />
      {describeWatchChange(change)}
    </span>
  );
}

function entrySummary(entry: WalletWatchEntry): string {
  const snap = entry.lastSnapshot;
  if (!snap) return "View it to save a baseline";
  const n = snap.tokens.length;
  const tokens = `${n} token${n === 1 ? "" : "s"}`;
  if (snap.lastTxTs == null) return `${tokens} · no recent transactions`;
  return `${tokens} · last tx ${timeAgo(snap.lastTxTs)}`;
}

function WatchRow({
  entry,
  onSelect,
  connected,
}: {
  entry: WalletWatchEntry;
  onSelect: (address: string) => void;
  connected: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(entry.label);

  const saveLabel = () => {
    setEditing(false);
    const next = labelDraft.trim();
    if (next && next !== entry.label) {
      setWalletLabel(entry.address, next);
      notifyWalletWatchChanged();
    } else {
      setLabelDraft(entry.label);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveLabel();
                if (e.key === "Escape") {
                  setLabelDraft(entry.label);
                  setEditing(false);
                }
              }}
              maxLength={40}
              autoFocus
              aria-label="Wallet label"
              className="min-w-0 flex-1 rounded-md border border-primary/50 bg-background px-2 py-1 text-sm font-bold"
            />
          ) : (
            <>
              <p className="truncate text-sm font-bold">{entry.label}</p>
              <button
                type="button"
                onClick={() => {
                  setLabelDraft(entry.label);
                  setEditing(true);
                }}
                aria-label={`Rename ${entry.label}`}
                title="Rename"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            </>
          )}
        </div>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {shortAddr(entry.address)}{" "}
          <a
            href={explorerAddress(entry.address)}
            target="_blank"
            rel="noreferrer"
            className="font-sans font-bold text-primary hover:underline"
          >
            Explorer
          </a>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{entrySummary(entry)}</p>
        {entry.lastDiff != null && entry.lastDiff.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {entry.lastDiff.map((c, i) => (
              <ChangeBadge key={i} change={c} />
            ))}
          </div>
        )}
        {entry.lastDiff != null && entry.lastDiff.length === 0 && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Check className="size-3" aria-hidden /> No changes since your last visit
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onSelect(entry.address)}
          disabled={connected}
          title={
            connected ? "Disconnect your wallet to inspect a watched address" : "View this wallet"
          }
          className="rounded-md bg-primary px-3 py-1.5 font-display text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => {
            removeWallet(entry.address);
            notifyWalletWatchChanged();
          }}
          aria-label={`Stop watching ${entry.label}`}
          title="Stop watching"
          className="rounded-md border border-foreground/20 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}

/**
 * The "Watched wallets" panel — rendered above the dashboard when an address
 * is viewed, and in the empty state when nothing is viewed. Clicking an entry
 * loads it in watch mode.
 */
export function WalletWatchPanel({
  onSelect,
  connected,
}: {
  onSelect: (address: string) => void;
  connected: boolean;
}) {
  const entries = useWalletWatchlist();
  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Watched wallets"
      className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Eye className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-xl uppercase tracking-wide">
          Watched wallets <span className="text-muted-foreground">({entries.length})</span>
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Saved in this browser only — nothing leaves your device. Revisit a wallet and the hub shows
        you what changed since your last visit.
      </p>
      {connected && (
        <p className="mt-2 text-xs text-muted-foreground">
          You&apos;re viewing your connected wallet — disconnect it to inspect a watched address.
        </p>
      )}
      <ul className="mt-2 divide-y divide-foreground/10">
        {entries.map((entry) => (
          <WatchRow key={entry.address} entry={entry} onSelect={onSelect} connected={connected} />
        ))}
      </ul>
    </section>
  );
}

/**
 * "What's new" banner for the currently viewed watched wallet. `diff` is the
 * change set computed on this view (null = first view, baseline just saved).
 */
export function WhatsNewBanner({ diff }: { diff: WatchChange[] | null }) {
  return (
    <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4">
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.2em] text-primary">
        <Bell className="size-4" aria-hidden /> What&apos;s new
      </p>
      {diff === null ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Baseline saved — this is what the wallet looks like right now. Check back later and the
          hub will show you what changed.
        </p>
      ) : diff.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Nothing changed since your last visit.
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {diff.map((c, i) => (
            <ChangeBadge key={i} change={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
