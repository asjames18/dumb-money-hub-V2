// Free quick-scan UI for the PulseChain token safety scanner (/scan).
// Client-only, read-only: paste an address, get a plain-English report.
// No wallet, no signing, no approval — the scan never touches your funds.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatUnits, isAddress } from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  CircleHelp,
  Coins,
  Flame,
  Link2,
  Loader2,
  OctagonX,
  Bookmark,
  ScanSearch,
  ShieldCheck,
  ShieldX,
  Sparkles,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import {
  DAMP,
  DEAD,
  DUMB,
  PULSEX_V2_ROUTER,
  WPLS,
  erc20Abi,
  explorerAddress,
  pulsechain,
  routerAbi,
} from "@/lib/pulsechain";
import { SITE_URL } from "@/lib/page-meta";
import { useTokenPrices } from "@/lib/token-prices";
import { trackEvent } from "@/lib/analytics";
import { AI_SCAN_STORAGE_KEY, type AiScanPayload } from "@/lib/ai/pro";
import {
  RESCAN_EVENT,
  addToWatchlist,
  isWatched,
  notifyWatchlistChanged,
  removeFromWatchlist,
} from "@/lib/scan-watchlist";
import {
  DEEP_SCAN_BURN_COST,
  SCAN_BURN_DEADLINE_SECONDS,
  deepScan,
  loadScanPass,
  passTimeLeft,
  plsBurnMinOut,
  quickScan,
  quotePlsBurn,
  saveScanPass,
  verifyDeepScanBurn,
  verifyPlsScanBurn,
  verifyScanBurn,
  type DeepScanPass,
  type DeepScanResult,
  type PlsBurnQuote,
  type QuickScanResult,
  type ScanBurnVerification,
  type ScanCheck,
  type ScanStatus,
} from "@/lib/token-scan";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ConnectButton } from "./ConnectButton";
import { CopyButton } from "./CopyButton";
import { AddToWalletButton } from "./AddToWalletButton";
import { NativeShareButton } from "./NativeShareButton";
import { BurnBragCard } from "./BurnBragCard";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/** bigint DUMB (18 decimals) → "95,000" / "104,477.42" — same shape as the
    BurnBox brag copy, so the card and the share text always match.
    A real dust burn (positive but below 0.0001) renders "<0.0001" — never
    "0", so the panel can never assert a zero amount for a real burn. */
function fmtBurnTok(bi: bigint): string {
  const [i, d = ""] = formatUnits(bi, 18).split(".");
  const int = Number(i).toLocaleString("en-US");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  if (bi > 0n && int === "0" && !dec) return "<0.0001";
  return dec ? `${int}.${dec}` : int;
}

const STATUS_STYLE: Record<ScanStatus, { icon: typeof ShieldCheck; row: string; label: string }> = {
  pass: { icon: ShieldCheck, row: "border-primary/40 bg-primary/5", label: "Looks good" },
  warn: {
    icon: TriangleAlert,
    row: "border-amber-400/50 bg-amber-400/10",
    label: "Caution",
  },
  fail: { icon: OctagonX, row: "border-red-500/50 bg-red-500/10", label: "Red flag" },
  unknown: {
    icon: CircleHelp,
    row: "border-border bg-card",
    label: "Unknown",
  },
};

export function TokenScanner({
  shareToken,
  shareBurn,
}: {
  /** Address from a shared report link (?token=) — auto-runs the quick scan on load. */
  shareToken?: string | undefined;
  /** Burn tx from a shared deep-scan report link (?burn=) — re-verifies on-chain, then runs. */
  shareBurn?: string | undefined;
}) {
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<QuickScanResult | null>(null);
  const [deepBurn, setDeepBurn] = useState<string | null>(null);
  const [deepChecks, setDeepChecks] = useState<ScanCheck[] | null>(null);
  // True when the deep scan ran on the 30-day pass (not a fresh burn).
  const [deepViaPass, setDeepViaPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const autoRan = useRef(false);

  const runScan = useCallback(async (addr: `0x${string}`) => {
    setScanning(true);
    setError(null);
    trackEvent("scan_started");
    try {
      const r = await quickScan(addr);
      setResult(r);
      setDeepBurn(null);
      setDeepChecks(null);
      setDeepViaPass(false);
      // A re-scan of a watched token refreshes its verdict + timestamp.
      if (isWatched(r.address)) {
        addToWatchlist(r);
        notifyWatchlistChanged();
      }
      trackEvent("quick_scan");
    } catch {
      setError("The scan hit an error — try again in a moment.");
      trackEvent("err_scan");
      setResult(null);
    } finally {
      setScanning(false);
    }
  }, []);

  // Watchlist "Re-scan" buttons dispatch this — the scanner re-runs live
  // on-chain for the requested address (shared ?token= links only auto-run
  // on first mount, so they can't carry this).
  useEffect(() => {
    const onRescan = (e: Event) => {
      const addr = (e as CustomEvent<string>).detail;
      if (typeof addr === "string" && isAddress(addr)) {
        setInput(addr);
        void runScan(addr);
      }
    };
    window.addEventListener(RESCAN_EVENT, onRescan);
    return () => window.removeEventListener(RESCAN_EVENT, onRescan);
  }, [runScan]);

  // Keep the Watch toggle in sync when a new result lands.
  useEffect(() => {
    setWatching(result !== null && isWatched(result.address));
  }, [result]);

  // Shared report link: the report re-runs live on-chain at view time, so the
  // link can never carry a fabricated or stale result — only an address.
  useEffect(() => {
    if (autoRan.current) return;
    if (!shareToken || !isAddress(shareToken)) return;
    autoRan.current = true;
    setInput(shareToken);
    void runScan(shareToken);
  }, [shareToken, runScan]);

  const scan = async () => {
    const trimmed = input.trim();
    if (!isAddress(trimmed)) {
      setError("That doesn't look like a token address. Paste the 0x… contract address.");
      return;
    }
    void runScan(trimmed);
  };

  const redFlags = result?.checks.filter((c) => c.status === "fail").length ?? 0;
  const cautions = result?.checks.filter((c) => c.status === "warn").length ?? 0;
  const unknowns = result?.checks.filter((c) => c.status === "unknown").length ?? 0;

  return (
    <div id="token-scanner" className="rounded-xl border-2 border-foreground/20 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ScanSearch className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-xl uppercase tracking-wide">Quick scan</h2>
        <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
          Free
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste any PulseChain token address. The scanner reads the contract live on-chain and reports
        what it can verify — in plain English. Read-only, no wallet needed.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
          aria-label="Token contract address to scan"
          placeholder="0x… paste the token contract address"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
        />
        <button
          onClick={scan}
          disabled={scanning}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {scanning && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {scanning ? "Scanning…" : "Scan"}
        </button>
      </div>
      {input.trim() === "" && (
        <button
          type="button"
          onClick={() => setInput(DUMB)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          No address handy? Try DUMB
        </button>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {redFlags === 0 && cautions === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-display text-xs uppercase tracking-[0.2em] text-primary">
                <ShieldCheck className="size-4" aria-hidden /> No red flags found
                {unknowns > 0 && ` · ${unknowns} check${unknowns === 1 ? "" : "s"} unknown`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 font-display text-xs uppercase tracking-[0.2em] text-amber-500">
                <ShieldX className="size-4" aria-hidden />
                {redFlags > 0 ? `${redFlags} red flag${redFlags > 1 ? "s" : ""}` : ""}
                {redFlags > 0 && cautions > 0 ? " · " : ""}
                {cautions > 0 ? `${cautions} caution${cautions > 1 ? "s" : ""}` : ""}
              </span>
            )}
            <a
              href={explorerAddress(result.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
            >
              {result.address.slice(0, 10)}…{result.address.slice(-8)} on the explorer
            </a>
            <button
              onClick={() => {
                if (watching) removeFromWatchlist(result.address);
                else addToWatchlist(result);
                setWatching(!watching);
                notifyWatchlistChanged();
                trackEvent("watchlist_toggle");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              <Bookmark className="size-3.5" aria-hidden />
              {watching ? "Watching" : "Watch"}
            </button>
          </div>

          {result.symbol !== null && result.decimals !== null && (
            <AddToWalletButton
              label="Add this token to wallet"
              doneLabel={`${result.symbol} in your wallet`}
              address={result.address}
              symbol={result.symbol}
              decimals={result.decimals}
            />
          )}

          <CheckRows checks={result.checks} />

          <p className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Honest limits: a quick scan can catch red flags, but it can't prove a token is safe.
            Anything unverified above is marked unknown — treat unknown as risky, not fine. Always
            double-check the contract on the explorer yourself before you ape.
          </p>

          {(result.address.toLowerCase() === DUMB.toLowerCase() ||
            result.address.toLowerCase() === DAMP.toLowerCase()) &&
            redFlags === 0 && (
              <div className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2.5">
                <p className="text-sm leading-relaxed">
                  <strong className="text-foreground">This is the hub's own token</strong> — you
                  just scanned the contract this site is built around. The swap box shows the
                  after-tax amount you'll actually receive (
                  {result.address.toLowerCase() === DUMB.toLowerCase() ? "6%" : "3%"} tax) before
                  you sign.
                </p>
                <Link
                  to="/trade"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-display text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
                >
                  Trade {result.symbol ?? "on the hub"} on the hub →
                </Link>
              </div>
            )}

          {result.pair && (
            <DeepScanPanel
              result={result}
              autoBurn={shareBurn}
              onDeepComplete={(hash, checks, viaPass) => {
                setDeepBurn(hash);
                setDeepChecks(checks);
                setDeepViaPass(viaPass);
              }}
            />
          )}

          <ShareReport
            result={result}
            deepBurn={deepBurn}
            deepChecks={deepChecks}
            viaPass={deepViaPass}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Shareable report card: the link carries only the token address (plus the
 * verified burn tx when a deep scan ran). The report re-runs live on-chain
 * when the link is opened, so a shared link can never show a fabricated or
 * stale result — the viewer always gets a fresh, re-verified scan. A deep
 * scan run on the 30-day pass links the pass's verified burn hash
 * (re-verified at view time, no pass issued to the viewer); the copy says it
 * ran on the pass, never implying a fresh burn.
 */
function ShareReport({
  result,
  deepBurn,
  deepChecks,
  viaPass,
}: {
  result: QuickScanResult;
  deepBurn: string | null;
  deepChecks: ScanCheck[] | null;
  /** True when the deep scan ran on the 30-day pass (the pass's verified burn). */
  viaPass?: boolean;
}) {
  const redFlags = result.checks.filter((c) => c.status === "fail").length;
  const cautions = result.checks.filter((c) => c.status === "warn").length;
  const url = `${SITE_URL}/scan?token=${result.address.toLowerCase()}${deepBurn ? `&burn=${deepBurn}` : ""}`;
  const shortAddr = `${result.address.slice(0, 6)}…${result.address.slice(-4)}`;
  // A burn-backed deep scan ran: the shared link re-verifies the burn and
  // re-runs the real deep scan for the viewer, so the copy can honestly name
  // both — this is the share path that credits the burn the sharer paid for.
  // Pass-backed runs (viaPass) name the pass instead of implying a fresh burn.
  const deepFails = deepChecks?.filter((c) => c.status === "fail").length ?? 0;
  const deepWarns = deepChecks?.filter((c) => c.status === "warn").length ?? 0;
  const text =
    deepBurn && deepChecks
      ? `Deep scan for ${shortAddr}: ${
          deepFails === 0 && deepWarns === 0
            ? "no red flags — clean on the on-chain buy-to-sell test"
            : `${deepFails} red flag${deepFails === 1 ? "" : "s"}, ${deepWarns} caution${deepWarns === 1 ? "" : "s"} on the on-chain buy-to-sell test`
        } — ${
          viaPass
            ? "run on a 30-day pass unlocked by a verified 100,000 DUMB burn"
            : "100,000 DUMB was burned to run it"
        }, live on PulseChain via the Dumb Money Hub scanner.`
      : `Safety scan for ${shortAddr}: ` +
        `${redFlags === 0 && cautions === 0 ? "no red flags found" : `${redFlags} red flag${redFlags === 1 ? "" : "s"}, ${cautions} caution${cautions === 1 ? "" : "s"}`} ` +
        `— scanned live on PulseChain via the Dumb Money Hub scanner.`;
  const fallbackUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  return (
    <div className="mt-6 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="size-4 text-primary" aria-hidden />
        <span className="font-display text-sm uppercase tracking-widest">Share this report</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <NativeShareButton
          title="Token safety scan"
          text={text}
          url={url}
          fallbackUrl={fallbackUrl}
        />
        <Button
          asChild
          size="sm"
          className="gap-1.5 rounded-md bg-foreground text-xs font-bold text-background hover:bg-foreground/90"
        >
          <a href={fallbackUrl} target="_blank" rel="noreferrer noopener">
            Post to X
          </a>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
        >
          <a href={tgUrl} target="_blank" rel="noreferrer noopener">
            Share to Telegram
          </a>
        </Button>
        <CopyButton value={url} label="Copy report link" />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        The link re-runs the scan live on-chain when opened — your friend always sees a fresh,
        re-verified report, never a screenshot of yours.
      </p>
    </div>
  );
}

/** Shared check-row rendering (quick scan + deep scan). */
function CheckRows({ checks }: { checks: QuickScanResult["checks"] }) {
  return (
    <ul className="mt-3 space-y-2">
      {checks.map((c) => {
        const s = STATUS_STYLE[c.status];
        const Icon = s.icon;
        return (
          <li key={c.id} className={cn("rounded-lg border px-3 py-2.5", s.row)}>
            <div className="flex items-center gap-2">
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="font-display text-sm uppercase tracking-widest">{c.label}</span>
              <span className="ml-auto font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {s.label}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}

const USED_BURNS_KEY = "dumb-deep-scan-burns";

function loadUsedBurns(): string[] {
  try {
    const raw = localStorage.getItem(USED_BURNS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Burn-gated deep scan. One verified 100,000 DUMB burn unlocks a 30-day pass
 * (localStorage ledger {txHash, unlockedAt, expiresAt, path}) for unlimited
 * deep scans — then the user burns again. Three ways to burn:
 *
 *  A. One-click wallet burn (recommended): the connected wallet sends exactly
 *     100,000 DUMB to the dead address — a plain transfer(), no approval —
 *     and the tx hash is verified on-chain automatically.
 *  B. Manual fallback: burn from any wallet, paste the tx hash (unchanged).
 *  C. Pay with PLS (shown when the wallet holds < 100k DUMB): one wallet
 *     confirmation calling the PulseX router's
 *     swapExactETHForTokensSupportingFeeOnTransferTokens with `to` = dead and
 *     path [WPLS, DUMB] — the bought DUMB goes straight to dead. Quoted live
 *     for ~110k DUMB output so ≥100k lands burned after the 6% arrival tax;
 *     verified via the tx's Transfer logs to dead. Same guards as the swap
 *     box (8% slippage, 20-minute deadline).
 *
 * Nothing is ever auto-run from an unverified claim: the pass is only issued
 * after the burn is verified on-chain (receipt + selector/path + recipient +
 * amount/arrival logs). The user signs their own burn/swap — the site never
 * touches funds or keys.
 */
function DeepScanPanel({
  result,
  autoBurn,
  onDeepComplete,
}: {
  result: QuickScanResult;
  /** Burn tx from a shared report link — re-verified on-chain, then the deep scan auto-runs. */
  autoBurn?: string | undefined;
  /**
   * Called with the verified burn hash + the deep scan's checks once a deep
   * scan completes (for the share link and its verdict copy). viaPass is true
   * when the scan ran on the active 30-day pass — the pass's burn hash was
   * verified on-chain before the pass was issued, so it still backs the share
   * link (re-verified at view time); only the copy differs.
   */
  onDeepComplete: (burnHash: string, checks: ScanCheck[], viaPass: boolean) => void;
}) {
  const [burnTx, setBurnTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deep, setDeep] = useState<DeepScanResult | null>(null);
  // The verified burn that unlocked THIS session's deep scan (hash + verified
  // dead-arrival). Set only after on-chain verification inside runWithHash —
  // never from a stale pass or a shared link the viewer didn't do.
  const [verifiedBurn, setVerifiedBurn] = useState<{ hash: string; amount: bigint } | null>(null);
  const [pass, setPass] = useState<DeepScanPass | null>(() => loadScanPass());
  const autoRan = useRef(false);
  const passScanned = useRef<string | null>(null);

  // Fresh token → fresh deep-scan state (the pass is per-user, results are per-token).
  useEffect(() => {
    setDeep(null);
    setVerifiedBurn(null);
    passScanned.current = null;
    setError(null);
  }, [result.address]);

  // --- one-click wallet burn ------------------------------------------------
  const { address: wallet, chainId } = useAccount();
  const onPulse = chainId === pulsechain.id;
  const { data: dumbBalance } = useReadContract({
    address: DUMB as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet ?? ZERO_ADDRESS],
    query: { enabled: !!wallet && onPulse },
  });
  const {
    writeContract,
    data: burnHash,
    isPending: burnPending,
    error: burnWriteError,
    reset: resetBurn,
  } = useWriteContract();
  const {
    data: burnReceipt,
    isLoading: burnConfirming,
    isSuccess: burnReceiptFetched,
  } = useWaitForTransactionReceipt({ hash: burnHash });
  const burnConfirmed = burnReceiptFetched && burnReceipt?.status === "success";
  const burnReverted = burnReceiptFetched && burnReceipt?.status === "reverted";

  // Live USD estimate for the 100k DUMB burn cost — "~$0.36 est.", nothing when
  // the price feed is down (never invented).
  const prices = useTokenPrices();
  const burnCostUsd = prices.DUMB != null ? `~$${(100_000 * prices.DUMB).toFixed(2)} est.` : null;

  // Pass path: the deep scan runs on the active 30-day pass — no fresh burn.
  // The pass's burn hash was verified on-chain before the pass was issued, so
  // it backs the shareable report link (re-verified at view time like any
  // burn hash); the brag card stays keyed on this-session burns only.
  const runDeep = async () => {
    const p = pass;
    if (!p) return;
    setBusy(true);
    setError(null);
    trackEvent("scan_started");
    try {
      const r = await deepScan(result.address, result.taxBps, {
        symbol: result.symbol,
        decimals: result.decimals,
      });
      setDeep(r);
      passScanned.current = result.address;
      trackEvent("deep_scan");
      onDeepComplete(p.txHash, r.checks, true);
    } catch {
      setError("The deep scan hit an error — try again in a moment.");
      trackEvent("err_scan");
    } finally {
      setBusy(false);
    }
  };

  const runWithHash = async (
    hash: string,
    path: DeepScanPass["path"],
    verify: (h: string) => Promise<ScanBurnVerification>,
    expectedFrom?: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const verified = await verify(hash);
      if (!verified.ok) {
        setError(verified.reason);
        return;
      }
      // Manual-paste path: the burn must come from the connected wallet —
      // otherwise anyone could claim a pass with a stranger's burn hash.
      // (One-click wallet/PLS hashes come from the wallet's own broadcast,
      // so they pass this by construction.)
      if (expectedFrom && verified.from.toLowerCase() !== expectedFrom.toLowerCase()) {
        setError(
          "That burn wasn't sent from your connected wallet. Paste a burn made by the wallet you have connected.",
        );
        return;
      }
      if (loadUsedBurns().includes(hash)) {
        setError("That burn was already used for a deep scan pass — burns are one-time.");
        return;
      }
      // The burn verified on-chain: this session's brag/share surface credits
      // exactly this hash with the verified dead-arrival — the same bigint
      // the /brag page's unfurl card prints, never the entered number.
      setVerifiedBurn({ hash, amount: verified.amount });
      try {
        localStorage.setItem(USED_BURNS_KEY, JSON.stringify([...loadUsedBurns(), hash]));
      } catch {
        // Storage full or blocked — the scan still runs; reuse isn't the threat here.
      }
      saveScanPass(hash, path);
      setPass(loadScanPass());
      trackEvent(path === "pls" ? "pass_burn_pls" : "pass_burn_dumb");
      const r = await deepScan(result.address, result.taxBps, {
        symbol: result.symbol,
        decimals: result.decimals,
      });
      setDeep(r);
      trackEvent("deep_scan");
      onDeepComplete(hash, r.checks, false);
    } catch {
      setError("The deep scan hit an error — try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  // Wallet burn settled on-chain → verify it (full checks) → issue the 30-day
  // pass → run the deep scan. The pass never exists without verification.
  useEffect(() => {
    if (!burnConfirmed || !burnHash) return;
    void runWithHash(burnHash.toLowerCase(), "wallet", verifyScanBurn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burnConfirmed, burnHash]);

  useEffect(() => {
    if (burnReverted) {
      setError("The burn transaction reverted on-chain — nothing was burned. Try again.");
    } else if (burnWriteError) {
      setError("The transaction was rejected in your wallet — nothing was burned.");
    }
  }, [burnReverted, burnWriteError]);

  // --- PLS fallback (wallets holding < 100k DUMB) ---------------------------
  const { data: plsBal } = useBalance({
    address: wallet,
    query: { enabled: !!wallet && onPulse },
  });
  const [plsQuote, setPlsQuote] = useState<PlsBurnQuote | null>(null);
  const [plsQuoteStale, setPlsQuoteStale] = useState(false);

  const {
    writeContract: writeSwap,
    data: swapHash,
    isPending: swapPending,
    error: swapWriteError,
    reset: resetSwap,
  } = useWriteContract();
  const {
    data: swapReceipt,
    isLoading: swapConfirming,
    isSuccess: swapReceiptFetched,
  } = useWaitForTransactionReceipt({ hash: swapHash });
  const swapConfirmed = swapReceiptFetched && swapReceipt?.status === "success";
  const swapReverted = swapReceiptFetched && swapReceipt?.status === "reverted";

  // PLS swap settled on-chain → verify the burn via the swap's Transfer logs
  // to dead → issue the 30-day pass → run the deep scan.
  useEffect(() => {
    if (!swapConfirmed || !swapHash) return;
    void runWithHash(swapHash.toLowerCase(), "pls", verifyPlsScanBurn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapConfirmed, swapHash]);

  useEffect(() => {
    if (swapReverted) {
      setError("The PLS swap reverted on-chain — nothing was burned. Try again.");
    } else if (swapWriteError) {
      setError("The transaction was rejected in your wallet — nothing was burned.");
    }
  }, [swapReverted, swapWriteError]);

  const run = async () => {
    const hash = burnTx.trim().toLowerCase();
    if (!/^0x[0-9a-fA-F]{64}$/.test(burnTx.trim())) {
      setError("That doesn't look like a transaction hash. Paste the 0x… burn tx hash.");
      return;
    }
    if (!wallet) {
      setError("Connect your wallet first — a pasted burn has to come from your connected wallet.");
      return;
    }
    void runWithHash(hash, "paste", verifyDeepScanBurn, wallet);
  };

  // Shared deep-scan report link: re-verify the burn on-chain (fresh read,
  // then run the simulation — the viewer gets the real report, not a screenshot.
  // Accepts either burn path (plain DUMB transfer or the PLS-fallback swap).
  // No 30-day pass is issued from a shared link (the viewer didn't do the burn).
  useEffect(() => {
    if (autoRan.current || deep || busy) return;
    if (!autoBurn || !/^0x[0-9a-fA-F]{64}$/.test(autoBurn.trim())) return;
    autoRan.current = true;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const verified = await verifyDeepScanBurn(autoBurn.trim().toLowerCase());
        if (!verified.ok) {
          setError(`That shared report's burn no longer verifies: ${verified.reason}`);
          return;
        }
        const r = await deepScan(result.address, result.taxBps, {
          symbol: result.symbol,
          decimals: result.decimals,
        });
        setDeep(r);
      } catch {
        setError("The deep scan hit an error — try again in a moment.");
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBurn]);

  const knownShort = dumbBalance != null && dumbBalance < DEEP_SCAN_BURN_COST;
  const oneClickDisabled =
    !wallet || !onPulse || knownShort || burnPending || burnConfirming || busy;

  // Live PLS quote (refreshed every 60s, like the site's price feeds) while
  // the wallet is short on DUMB — the quote the swap button uses.
  useEffect(() => {
    if (!wallet || !onPulse || !knownShort) {
      setPlsQuote(null);
      setPlsQuoteStale(false);
      return;
    }
    let alive = true;
    const fetchQuote = async () => {
      const q = await quotePlsBurn();
      if (!alive) return;
      setPlsQuote(q);
      setPlsQuoteStale(q === null);
    };
    void fetchQuote();
    const id = setInterval(fetchQuote, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [wallet, onPulse, knownShort]);

  const plsInsufficient = plsBal != null && plsQuote != null && plsBal.value < plsQuote.plsIn;
  const plsDisabled =
    !plsQuote || plsQuoteStale || plsInsufficient || swapPending || swapConfirming || busy;

  const startPlsBurn = () => {
    if (!plsQuote || !wallet) return;
    setError(null);
    resetSwap();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + SCAN_BURN_DEADLINE_SECONDS);
    writeSwap({
      address: PULSEX_V2_ROUTER as `0x${string}`,
      abi: routerAbi,
      functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens",
      // One confirmation: PLS in, DUMB bought and sent straight to dead.
      args: [
        plsBurnMinOut(plsQuote),
        [WPLS as `0x${string}`, DUMB as `0x${string}`],
        DEAD as `0x${string}`,
        deadline,
      ],
      value: plsQuote.plsIn,
      // Belt-and-suspenders chain pin (matches BurnBox's PLS path): the call
      // can never be prepared against another chain even if the wallet flips
      // networks between the button enabling and the signature.
      chainId: pulsechain.id,
    });
  };

  const startWalletBurn = () => {
    setError(null);
    resetBurn();
    writeContract({
      address: DUMB as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      // Exact-amount plain transfer to the dead address — no approval needed.
      // Irreversible: the DUMB is destroyed, not moved.
      args: [DEAD as `0x${string}`, DEEP_SCAN_BURN_COST],
      // Chain pin, same reasoning as the PLS path above.
      chainId: pulsechain.id,
    });
  };

  // Honest pre-filled copy for the verified deep-scan burn — nothing is ever
  // posted automatically. Both burn paths (direct transfer, PLS-fallback swap)
  // link the /brag page, whose preview unfurls the server-verified card
  // (/api/brag-image verifies both shapes). The amount is the verified
  // dead-arrival — the honest destroyed number.
  const bragUrl = verifiedBurn ? `${SITE_URL}/brag?tx=${verifiedBurn.hash}` : "";
  const burnAmt = verifiedBurn ? fmtBurnTok(verifiedBurn.amount) : "";
  const bragText = `I just burned ${burnAmt} DUMB on PulseChain 🔥 — that unlocked 30 days of deep scans on the Dumb Money Hub. Supply shrank a little, no promises. ${bragUrl}\n\nBurns shrink supply, never promise price.`;
  const bragXHref = `https://x.com/intent/post?text=${encodeURIComponent(bragText)}`;
  const bragTgHref = `https://t.me/share/url?url=${encodeURIComponent(
    bragUrl,
  )}&text=${encodeURIComponent(
    `I just burned ${burnAmt} DUMB on PulseChain 🔥 — that unlocked 30 days of deep scans on the Dumb Money Hub. Supply shrank a little, no promises. Verified on-chain.`,
  )}`;

  return (
    <div className="mt-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Flame className="size-5 text-primary" aria-hidden />
        <h3 className="font-display text-lg uppercase tracking-wide">Deep scan</h3>
        <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-amber-500">
          Burn-gated
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The quick scan reads what the contract <em>says</em>. The deep scan watches what it{" "}
        <em>does</em> — simulated buys and sell-backs at multiple sizes against the token's real
        PulseX liquidity: the true round-trip cost, what a 10 WPLS bag nets on exit, and a full
        depth curve. One <strong className="text-foreground">100,000 DUMB burn</strong>
        {burnCostUsd ? ` (${burnCostUsd})` : ""} to the dead address unlocks{" "}
        <strong className="text-foreground">30 days of unlimited deep scans</strong> — every burn
        shrinks the supply.
      </p>

      {!deep && pass && (
        <div className="mt-4">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-display text-xs uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="size-4" aria-hidden /> 30-day pass active · {passTimeLeft(pass)}{" "}
            left
          </p>
          <div className="mt-3">
            <button
              onClick={runDeep}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {busy ? "Scanning…" : "Run deep scan"}
            </button>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Pass from burn{" "}
            <span className="font-mono">
              {pass.txHash.slice(0, 10)}…{pass.txHash.slice(-6)}
            </span>{" "}
            — re-burn to extend after it expires.
          </p>
          <p className="mt-2 text-xs">
            <Link
              to="/burn"
              className="inline-flex items-center gap-1 font-bold text-primary underline decoration-dotted underline-offset-2"
            >
              <Flame className="size-3.5" aria-hidden />
              Watch your burn land on the burn leaderboard
            </Link>
          </p>
        </div>
      )}

      {!deep && !pass && (
        <>
          {/* Option A: one-click wallet burn */}
          <div className="mt-4 rounded-lg border border-primary/30 bg-background p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" aria-hidden />
              <span className="font-display text-sm uppercase tracking-widest">
                Burn in one click
              </span>
              <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
                Recommended
              </span>
            </div>
            {!wallet || !onPulse ? (
              <div className="mt-3">
                <ConnectButton />
                <p className="mt-2 text-xs text-muted-foreground">
                  Connect on PulseChain — your wallet sends the burn itself. The site never touches
                  your funds or keys.
                </p>
              </div>
            ) : (
              <>
                {knownShort && (
                  <p className="mt-3 rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm">
                    This wallet holds{" "}
                    {(Number(dumbBalance) / 1e18).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    DUMB — the burn needs 100,000. Burn from a wallet that holds enough, pay with
                    PLS below, or use the manual paste option.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={startWalletBurn}
                    disabled={oneClickDisabled}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {(burnPending || burnConfirming || busy) && (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    {burnPending
                      ? "Confirm in wallet…"
                      : burnConfirming
                        ? "Burn confirming…"
                        : busy
                          ? "Verifying burn…"
                          : "Burn 100,000 DUMB & unlock 30 days"}
                  </button>
                  {dumbBalance != null && !knownShort && (
                    <span className="text-xs text-muted-foreground">
                      Your wallet:{" "}
                      {(Number(dumbBalance) / 1e18).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      DUMB
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Sends exactly 100,000 DUMB to the dead address — a plain transfer, no approval
                  step. The pass counts the 100,000 you send (the 5% burn tax means ~95,000 lands at
                  dead — that's expected). This burn is permanent and can never be recovered. After
                  it confirms on-chain, your 30-day pass activates automatically.
                </p>
              </>
            )}
          </div>

          {/* Option C: pay with PLS (shown when the wallet holds < 100k DUMB) */}
          {wallet && onPulse && knownShort && (
            <div className="mt-4 rounded-lg border border-amber-400/40 bg-background p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-amber-500" aria-hidden />
                <span className="font-display text-sm uppercase tracking-widest">Pay with PLS</span>
                <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-amber-500">
                  No DUMB needed
                </span>
              </div>
              {plsQuote ? (
                <p className="mt-3 text-sm leading-relaxed">
                  <strong className="text-foreground">
                    ~
                    {Number(formatUnits(plsQuote.plsIn, 18)).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    PLS
                  </strong>{" "}
                  → buys ~
                  {(Number(plsQuote.dumbOut) / 1e18).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  DUMB → straight to the dead address, burned forever. The arrival is taxed 6% —
                  that tax <em>is</em> the burn — so ~
                  {((Number(plsQuote.dumbOut) / 1e18) * 0.95).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  DUMB lands destroyed, clearing the 100,000 pass threshold. The swap also carries a
                  minimum-output guard, so if the pool moves against you before it lands it reverts
                  and you keep your PLS — it can't settle short of the pass.
                </p>
              ) : plsQuoteStale ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No live PLS quote right now — either the RPC didn't answer, or the pool is too
                  thin to buy enough DUMB to clear the pass. The button stays off until a real quote
                  comes back; nothing is ever estimated or invented.
                </p>
              ) : (
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Loading the live PLS
                  quote…
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={startPlsBurn}
                  disabled={plsDisabled}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-4 py-2 font-display text-sm uppercase tracking-widest text-black hover:bg-amber-300 disabled:opacity-50"
                >
                  {(swapPending || swapConfirming || busy) && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  {swapPending
                    ? "Confirm in wallet…"
                    : swapConfirming
                      ? "Swap confirming…"
                      : busy
                        ? "Verifying burn…"
                        : "Burn with PLS & unlock 30 days"}
                </button>
                {plsInsufficient && plsQuote && (
                  <span className="text-xs text-muted-foreground">
                    Not enough PLS in this wallet for the quoted amount.
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                One wallet confirmation through the PulseX router — the same 8% slippage guard and
                20-minute deadline the swap box uses. You sign it yourself; the site never touches
                your funds. Keep a little PLS in the wallet for gas. The burn is permanent and can
                never be recovered.
              </p>
            </div>
          )}

          {/* Option B: manual paste fallback */}
          <ol className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground">Or go manual:</span> send{" "}
              <strong className="text-foreground">100,000 DUMB</strong> to the dead address from any
              wallet you control — the site never touches your funds. The pass counts the 100,000
              you send (~95,000 lands at dead after the 5% burn tax — that's expected).
              <span className="inline-flex items-center gap-2 rounded-md bg-background px-2 py-1 font-mono text-xs">
                {DEAD.slice(0, 10)}…{DEAD.slice(-8)}
                <CopyButton value={DEAD} label="Dead address" />
              </span>
            </li>
            <li>
              Paste the burn transaction hash below — it must be a burn from your connected wallet.
              The scan verifies it on-chain before running — one verified burn also earns the 30-day
              pass.
            </li>
          </ol>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={burnTx}
              onChange={(e) => setBurnTx(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              aria-label="DUMB burn transaction hash"
              placeholder="0x… paste your DUMB burn tx hash"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <button
              onClick={run}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {busy ? "Verifying…" : "Verify & run deep scan"}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}
        </>
      )}

      {deep && (
        <div className="mt-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-display text-xs uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="size-4" aria-hidden /> Deep scan complete — burn verified
          </p>
          <CheckRows checks={deep.checks} />
          <Button
            size="sm"
            variant="outline"
            className="mt-3 gap-1.5 rounded-md text-xs font-bold"
            onClick={() => {
              const payload: AiScanPayload = {
                symbol: result?.symbol ?? null,
                address: deep.address,
                taxBps: result?.taxBps ?? null,
                pair: result?.pair ?? null,
                checks: deep.checks.map((c) => ({
                  label: c.label,
                  status: c.status,
                  detail: c.detail,
                })),
              };
              try {
                localStorage.setItem(AI_SCAN_STORAGE_KEY, JSON.stringify(payload));
              } catch {
                /* storage unavailable — the AI page will say so */
              }
              window.location.href = "/ai?explain=1";
            }}
          >
            <Sparkles className="size-3.5" /> Explain with AI
          </Button>
          {verifiedBurn && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Brag about it
              </p>
              <BurnBragCard
                amount={burnAmt}
                token="DUMB"
                txHash={verifiedBurn.hash}
                shareText={bragText}
              />
              <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Or text-only
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <NativeShareButton
                  title="Burned DUMB on PulseChain"
                  text={bragText}
                  url={bragUrl}
                  fallbackUrl={bragXHref}
                />
                <Button
                  asChild
                  size="sm"
                  className="gap-1.5 rounded-md bg-foreground text-xs font-bold text-background hover:bg-foreground/90"
                >
                  <a href={bragXHref} target="_blank" rel="noreferrer noopener">
                    Post to X
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
                >
                  <a href={bragTgHref} target="_blank" rel="noreferrer noopener">
                    Share to Telegram
                  </a>
                </Button>
              </div>
            </div>
          )}
          <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Honest limits: the simulation applies the tax the contract <em>claims</em>. If the
            contract takes more than it claims — or blocks sells for fresh wallets — real trades
            cost more than this says. A clean deep scan is a good sign, not a safety certificate.
          </p>
        </div>
      )}
    </div>
  );
}
