// "Scan my bags" — one click quick-scans every token the connected wallet
// received in the recent on-chain window. The classic rekt story is the
// airdropped token: "free" dust you try to sell and can't (honeypot), or
// approve and lose. This finds those tokens and runs the free, read-only
// quick scan on each — rows open the full report through the existing
// rescan event, where the burn-gated deep scan lives as usual.
// Read-only throughout: getLogs + quick scans. No signing, no approvals,
// nothing moves. The window is labeled honestly from block timestamps.

import { useState } from "react";
import { Loader2, ScanSearch, ShieldCheck, ShieldX, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";

import { discoverWalletTokens, quickScan, type QuickScanResult } from "@/lib/token-scan";
import { pulsechain } from "@/lib/pulsechain";
import { requestRescan } from "@/lib/scan-watchlist";
import { trackEvent } from "@/lib/analytics";
import { NativeShareButton } from "./NativeShareButton";

const BAG_SCAN_CAP = 12;

interface BagRow {
  address: `0x${string}`;
  result: QuickScanResult | null;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Risk-first ordering: actual fails at the top, then cautions, then clean,
 *  then unscannable (honest unknown, last). Stable — a token that finished
 *  earlier keeps its relative slot among ties. */
function riskRank(row: BagRow): number {
  if (!row.result) return 3;
  const fails = row.result.checks.filter((c) => c.status === "fail").length;
  if (fails > 0) return 0;
  const warns = row.result.checks.filter((c) => c.status === "warn").length;
  return warns > 0 ? 1 : 2;
}

function VerdictChip({ result }: { result: QuickScanResult | null }) {
  if (result === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Loader2 className="size-3.5" aria-hidden /> couldn't scan
      </span>
    );
  }
  const redFlags = result.checks.filter((c) => c.status === "fail").length;
  const cautions = result.checks.filter((c) => c.status === "warn").length;
  if (redFlags === 0 && cautions === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
        <ShieldCheck className="size-3.5" aria-hidden /> No red flags found
      </span>
    );
  }
  // An actual FAIL is a different creature than a caution — a safety tool
  // shouldn't paint them the same color.
  if (redFlags > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-red-500">
        <ShieldX className="size-3.5" aria-hidden />
        {redFlags} red flag{redFlags > 1 ? "s" : ""}
        {cautions > 0 ? ` · ${cautions} caution${cautions > 1 ? "s" : ""}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-amber-500">
      <ShieldX className="size-3.5" aria-hidden />
      {cautions} caution{cautions > 1 ? "s" : ""}
    </span>
  );
}

/** Share copy carries ONLY counts — never an address or wallet. Same
 *  one-tap-by-you pattern as the burn surfaces: nothing posts automatically.
 *  Wording differs when the user scanned someone else's wallet (a pasted
 *  address) rather than their own connected one. */
const bagShareUrl = (): string => `${window.location.origin}/scan`;

const bagShareText = (rows: BagRow[], ownWallet: boolean): string => {
  const checked = rows.filter((r) => r.result).length;
  const fails = rows.filter(
    (r) => r.result && r.result.checks.some((c) => c.status === "fail"),
  ).length;
  const warns = rows.filter(
    (r) =>
      r.result &&
      !r.result.checks.some((c) => c.status === "fail") &&
      r.result.checks.some((c) => c.status === "warn"),
  ).length;
  const prefix = ownWallet
    ? "I scanned my PulseChain bags on the Dumb Money hub"
    : "I checked a PulseChain wallet on the Dumb Money hub";
  let s = `${prefix} — ${checked} token${checked === 1 ? "" : "s"} checked`;
  if (checked === 0) {
    // Honest when nothing scanned — never claim a clean bill of health on
    // zero data.
    return `${prefix} but the scans didn't land — trying again. Scan yours free before you touch anything.`;
  }
  if (fails > 0) s += `, ${fails} with red flags`;
  if (warns > 0) s += `, ${warns} with cautions`;
  if (fails === 0 && warns === 0) s += `, no red flags found`;
  s += ". Scan yours free before you touch anything.";
  return s;
};

const bagShareXUrl = (rows: BagRow[], ownWallet: boolean): string =>
  `https://x.com/intent/post?text=${encodeURIComponent(bagShareText(rows, ownWallet))}&url=${encodeURIComponent(bagShareUrl())}`;

const bagShareTelegramUrl = (rows: BagRow[], ownWallet: boolean): string =>
  `https://t.me/share/url?url=${encodeURIComponent(bagShareUrl())}&text=${encodeURIComponent(bagShareText(rows, ownWallet))}`;

export function BagScan() {
  const { address: wallet, chainId, isConnected } = useAccount();
  const onPulse = chainId === pulsechain.id;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<BagRow[] | null>(null);
  const [scope, setScope] = useState("");
  const [capNote, setCapNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Paste-any-wallet path: no wallet connection needed — the discovery is a
  // read-only getLogs on the public RPC. `ownWallet` tracks whose wallet the
  // displayed run covered, so the share copy stays honest.
  const [custom, setCustom] = useState("");
  const [addrError, setAddrError] = useState<string | null>(null);
  const [ownWallet, setOwnWallet] = useState(true);

  const canRun = isConnected && onPulse && !!wallet && !busy;

  const runFor = async (target: `0x${string}`, mine: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setRows(null);
    setScope("");
    setCapNote("");
    setOwnWallet(mine);
    trackEvent("bag_scan");
    try {
      setProgress("Finding tokens on-chain…");
      const d = await discoverWalletTokens(target);
      const since =
        d.fromTimestamp !== null
          ? new Date(d.fromTimestamp * 1000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "the recent window";
      setScope(
        `Tokens that sent a transfer to ${shortAddr(target)} since ${since} — spot check, not a full audit.`,
      );
      if (d.tokens.length === 0) {
        setRows([]);
        return;
      }
      const batch = d.tokens.slice(0, BAG_SCAN_CAP);
      if (d.tokens.length > batch.length || d.truncated) {
        // Honest about the caps: discovery stops at 25 contracts and only the
        // first 12 are scanned — re-pasting the same address rediscovers the
        // same capped set, so the rest are not reachable from here. Never
        // promise a "paste for the rest" path that doesn't exist.
        setCapNote(
          d.truncated
            ? `Showing ${batch.length} of 25+ inbound token contracts — discovery stops at 25, and only the first ${batch.length} were scanned; the rest aren't reachable from this page.`
            : `Showing ${batch.length} of ${d.tokens.length} — only the first ${batch.length} were scanned; the rest aren't reachable from this page.`,
        );
      }
      const out: BagRow[] = [];
      let i = 0;
      for (const addr of batch) {
        i++;
        setProgress(`Scanning ${i} of ${batch.length}…`);
        try {
          out.push({ address: addr, result: await quickScan(addr) });
        } catch {
          out.push({ address: addr, result: null });
        }
        // Re-rank risk-first on every progressive update — the most dangerous
        // tokens surface immediately instead of wherever the scan order lands.
        out.sort((a, b) => riskRank(a) - riskRank(b));
        setRows([...out]);
      }
    } catch {
      setError("The scan hit an error — try again in a moment.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const run = async () => {
    if (!wallet || !onPulse || busy) return;
    await runFor(wallet, true);
  };

  const runCustom = async () => {
    const trimmed = custom.trim();
    if (!isAddress(trimmed)) {
      setAddrError("That's not a valid wallet address — paste a 0x… address and try again.");
      return;
    }
    setAddrError(null);
    await runFor(trimmed, false);
  };

  const openReport = (addr: `0x${string}`) => {
    requestRescan(addr);
    document
      .getElementById("token-scanner")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Wallet className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-xl uppercase tracking-wide">Scan my bags</h2>
        <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
          Free
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Airdropped mystery tokens are the classic trap — free dust you try to sell and can't, or
        approve and lose. Connect a wallet and this runs the free quick scan on every token that
        moved into it recently — or paste any wallet address below, no connection needed. The check
        is fully read-only: public RPC logs only, no signing, nothing moves.
      </p>

      <div className="mt-4">
        <button
          onClick={run}
          disabled={!canRun}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ScanSearch className="size-4" aria-hidden />
          )}
          {busy ? progress || "Scanning…" : "Scan tokens in this wallet"}
        </button>
        {!isConnected && (
          <p className="mt-2 text-sm text-muted-foreground">
            No wallet connected? Paste an address below — no connection needed.
          </p>
        )}
        {isConnected && !onPulse && (
          <p className="mt-2 text-sm text-muted-foreground">
            Switch to PulseChain (chain 369) to scan your connected wallet's tokens — or paste an
            address below, which works on any network since it only reads the chain.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
          <label htmlFor="bag-custom-address" className="text-sm font-bold">
            Check any wallet:
          </label>
          <input
            id="bag-custom-address"
            type="text"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              if (addrError) setAddrError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runCustom();
            }}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            disabled={busy}
            className="w-full flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm disabled:opacity-50"
          />
          <button
            onClick={() => void runCustom()}
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ScanSearch className="size-4" aria-hidden />
            )}
            Check this wallet
          </button>
        </div>
        {addrError && (
          <p className="mt-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm">
            {addrError}
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {scope && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{scope}</p>}
      {capNote && <p className="mt-1 text-xs text-muted-foreground">{capNote}</p>}

      {rows !== null && rows.length === 0 && (
        <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          No token transfers to this wallet in the window — either it's quiet lately or older
          holdings predate the window. Paste any address above to scan it directly.
        </p>
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-background">
          {rows.map((row) => (
            <li key={row.address} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              {/* The symbol comes from an arbitrary contract, so it can be any
                  length and contain no break opportunities (a hex-ish string).
                  min-w-0 + break-all keeps a hostile 40-char symbol from
                  overflowing the row at 390px — flex-wrap can't help when
                  there's nowhere to wrap. Same guard Proof.tsx uses. */}
              <span className="min-w-0 break-all font-mono text-sm font-bold">
                {row.result?.symbol ?? shortAddr(row.address)}
              </span>
              <VerdictChip result={row.result} />
              <button
                onClick={() => openReport(row.address)}
                className="ml-auto text-sm font-bold text-primary underline decoration-dotted underline-offset-2"
              >
                Full report →
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Finished runs only — mid-scan counts understate what ran, and "I
          scanned my bags" implies a completed run. */}
      {rows !== null && rows.length > 0 && !busy && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold">Share this:</span>
          <NativeShareButton
            text={bagShareText(rows, ownWallet)}
            url={bagShareUrl()}
            title="Scan my bags"
            fallbackUrl={bagShareXUrl(rows, ownWallet)}
          />
          <a
            href={bagShareXUrl(rows, ownWallet)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-bold text-primary underline decoration-dotted underline-offset-2"
          >
            Post to X
          </a>
          <a
            href={bagShareTelegramUrl(rows, ownWallet)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-bold text-primary underline decoration-dotted underline-offset-2"
          >
            Share to Telegram
          </a>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Honest limits: a quick scan catches red flags, it can't prove a token safe. Dust you never
          asked for is usually a trap — don't interact with it, don't approve it. Anything with red
          flags: read the full report above before you touch it.
        </p>
      )}
    </div>
  );
}
