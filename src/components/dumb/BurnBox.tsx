import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Coins, Flame, Loader2, Send, TriangleAlert, Twitter } from "lucide-react";

import {
  DAMP,
  DAMP_TAX_BPS,
  DEAD,
  DUMB,
  DUMB_TAX_BPS,
  PULSEX_V2_ROUTER,
  WPLS,
  erc20Abi,
  explorerAddress,
  explorerTx,
  pulsechain,
  routerAbi,
} from "@/lib/pulsechain";
import {
  SCAN_BURN_DEADLINE_SECONDS,
  plsBurnMinOut,
  preTaxForArrival,
  quotePlsBurnFor,
  verifyPlsBurn,
  type PlsBurnQuote,
} from "@/lib/token-scan";
import { ConnectButton } from "./ConnectButton";
import { trackEvent } from "@/lib/analytics";
import { CopyButton } from "./CopyButton";
import { BurnBragCard } from "./BurnBragCard";
import { NativeShareButton } from "./NativeShareButton";
import { SITE_URL } from "@/lib/page-meta";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TokenKey = "DUMB" | "DAMP";

/**
 * Verified tax accounting for a plain wallet→dead transfer (verified on-chain
 * 2026-09-26, read-only): the dead address is NOT fee-excluded, so the full
 * transfer tax applies. DUMB: dead balance +0.95X (94% transfer leg + 1%
 * protocol burn leg), token contract +0.04X (entombed buckets), ~1% reflected
 * to holders. DAMP: dead +0.98X, contract +0.01X, ~1% reflected.
 * Net per transfer: DUMB 5% burned / 1% reflected, DAMP 2% burned / 1% reflected.
 */
const BURN: Record<
  TokenKey,
  {
    address: `0x${string}`;
    taxBps: number;
    /** bps of the sent amount that lands in the dead address balance. */
    deadBps: number;
    /** bps captured by the contract's dead buckets. */
    bucketBps: number;
    /** % of the sent amount that arrives as the plain transfer leg (100% - tax). */
    transferPct: number;
    /** % of the sent amount permanently burned: protocol burn leg + entombed buckets. */
    burnedPct: number;
  }
> = {
  DUMB: {
    address: DUMB,
    taxBps: DUMB_TAX_BPS,
    deadBps: 9500,
    bucketBps: 400,
    transferPct: 94,
    burnedPct: 5,
  },
  DAMP: {
    address: DAMP,
    taxBps: DAMP_TAX_BPS,
    deadBps: 9800,
    bucketBps: 100,
    transferPct: 97,
    burnedPct: 2,
  },
};

function fmtTok(bi: bigint | null): string {
  if (bi === null) return "—";
  const [i, d = ""] = formatUnits(bi, 18).split(".");
  const int = Number(i).toLocaleString("en-US");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  return dec ? `${int}.${dec}` : int;
}

function fmtDead(bi: bigint, bps: number): string {
  return fmtTok((bi * BigInt(bps)) / 10_000n);
}

/** Brag-surface amount only (share copy + BurnBragCard): a real dust burn
    (positive but below 0.0001) renders "<0.0001" — never "0", so the share
    text can never claim "I just burned 0 DUMB" for a real burn. */
function fmtBragAmt(bi: bigint): string {
  const s = fmtTok(bi);
  return bi > 0n && s === "0" ? "<0.0001" : s;
}

export function BurnBox() {
  const [tokenKey, setTokenKey] = useState<TokenKey>("DUMB");
  const [amount, setAmount] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** Snapshot of the last burn attempt — so the share text always reflects the
      real burned amount, even if the input is edited after confirmation. */
  const [burned, setBurned] = useState<{
    amount: bigint;
    token: TokenKey;
  } | null>(null);

  const { address, chainId } = useAccount();
  const onPulse = chainId === pulsechain.id;
  const cfg = BURN[tokenKey];

  const { data: bal, refetch: refetchBal } = useReadContract({
    address: cfg.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onPulse, refetchInterval: 15_000 },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isFailed,
  } = useWaitForTransactionReceipt({ hash });
  // isSuccess only means a receipt was fetched — a reverted tx still returns
  // one. Only the receipt's status tells us the burn actually executed; without
  // this the UI (and share buttons) would celebrate a failed burn as confirmed.
  const txSucceeded = isConfirmed && receipt?.status === "success";
  const txReverted = isConfirmed && receipt?.status === "reverted";

  // --- PLS fallback: the wallet holds less DUMB than the entered amount ----
  // One wallet confirmation: PLS in, the router buys DUMB and sends it
  // straight to the dead address. The bought DUMB is taxed 6% on arrival
  // (that tax IS the burn — ~95% lands destroyed), so the live quote targets
  // entered × 1.1 pre-tax (arrival-tax + slippage buffer), like the deep-scan
  // fallback. The user signs their own swap — the site never touches funds.
  const { data: plsBal } = useBalance({
    address,
    query: { enabled: !!address && onPulse },
  });
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
  const swapSucceeded = swapReceiptFetched && swapReceipt?.status === "success" && !!swapHash;
  const swapReverted = swapReceiptFetched && swapReceipt?.status === "reverted";
  const [plsQuote, setPlsQuote] = useState<PlsBurnQuote | null>(null);
  const [plsQuoteStale, setPlsQuoteStale] = useState(false);
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  /**
   * Escape hatch for a stuck confirmation: the receipt poll can wait forever
   * if the tx sits unmined in the mempool or was dropped and never broadcast.
   * After 2 minutes of "confirming" with no receipt, show the user what to
   * check and a safe way out — never leave them stranded on CONFIRMING…
   */
  const [confirmStuck, setConfirmStuck] = useState(false);
  useEffect(() => {
    const pendingHash = hash ?? swapHash;
    const confirming = isConfirming || swapConfirming;
    if (!pendingHash || !confirming) {
      setConfirmStuck(false);
      return;
    }
    const t = setTimeout(() => setConfirmStuck(true), 120_000);
    return () => clearTimeout(t);
  }, [hash, swapHash, isConfirming, swapConfirming]);

  // The burn completed on either path — the direct wallet burn or the PLS
  // fallback swap. The share buttons below celebrate the verified arrival,
  // whichever path produced it.
  const doneHash = swapHash ?? hash;
  const doneSucceeded = txSucceeded || swapSucceeded;

  // Anonymous analytics: one event per CONFIRMED burn (receipt status success
  // — never for reverted or rejected transactions). Fire-and-forget.
  const trackedBurnFor = useRef<string | null>(null);
  useEffect(() => {
    if (doneSucceeded && doneHash && trackedBurnFor.current !== doneHash) {
      trackedBurnFor.current = doneHash;
      trackEvent(swapSucceeded ? "burn_voluntary_pls" : "burn_voluntary");
    }
  }, [doneSucceeded, doneHash, swapSucceeded]);

  /** Pre-filled, honest share copy for a CONFIRMED burn only — nothing is
      ever posted automatically; the user clicks through and posts themselves.
      Both paths link the per-burn brag page, whose link preview unfurls the
      generated card image (X, Telegram, Discord): /api/brag-image verifies
      direct burns from the transfer input and PLS-swap burns from the DUMB
      that provably arrived at dead in the swap receipt. The explorer link
      stays one click away on the brag page. */
  const sharePost = useMemo(() => {
    if (!burned || !doneHash) return null;
    const amt = fmtBragAmt(burned.amount);
    const bragUrl = `${SITE_URL}/brag?tx=${doneHash}`;
    const body = `I just burned ${amt} ${burned.token} on PulseChain 🔥 — supply shrank a little, no promises. ${bragUrl}\n\nBurns shrink supply, never promise price.`;
    return {
      title: `Burned ${burned.token} on PulseChain`,
      text: body,
      url: bragUrl,
      amount: amt,
      token: burned.token,
      xHref: `https://x.com/intent/post?text=${encodeURIComponent(body)}`,
      tgHref: `https://t.me/share/url?url=${encodeURIComponent(bragUrl)}&text=${encodeURIComponent(
        `I just burned ${amt} ${burned.token} on PulseChain 🔥 — supply shrank a little, no promises. Verified on-chain.`,
      )}`,
    };
  }, [burned, doneHash]);

  /** The brag card image is rendered server-side from the verified tx
      (/api/brag-image) — no upload needed. The shared /brag URL unfurls it
      on X/Telegram/Discord; the explorer link stays one click away there. */

  let parsed: bigint | null = null;
  try {
    if (amount.trim()) parsed = parseUnits(amount.trim(), 18);
  } catch {
    parsed = null;
  }
  const insufficient = parsed !== null && bal !== undefined && parsed > bal;

  // Show the PLS fallback when the wallet holds less DUMB than the entered
  // burn amount (DUMB only — the fallback buys DUMB through the WPLS pair).
  const showPls = tokenKey === "DUMB" && insufficient && !!address && onPulse;

  // Live PLS quote for the entered amount, refreshed every 60s while the
  // wallet is short — the quote the swap button uses.
  useEffect(() => {
    if (!showPls || parsed === null || parsed <= 0n) {
      setPlsQuote(null);
      setPlsQuoteStale(false);
      return;
    }
    // Target the PRE-TAX amount that still lands `parsed` at dead after the
    // 6% arrival tax AND the full 8% slippage allowance. A flat ×1.1 buffer
    // is not enough: 95% × 92% = 87.4%, so ×1.1 only reaches ~96% of the
    // entered amount and the burn settles short of what the user typed.
    const target = preTaxForArrival(parsed);
    let alive = true;
    const fetchQuote = async () => {
      const q = await quotePlsBurnFor(target);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPls, parsed?.toString()]);

  const plsInsufficient = plsBal != null && plsQuote != null && plsBal.value < plsQuote.plsIn;
  const plsDisabled =
    !plsQuote ||
    plsQuoteStale ||
    plsInsufficient ||
    swapPending ||
    swapConfirming ||
    swapBusy ||
    !acknowledged;

  const startPlsBurn = () => {
    if (!plsQuote || !acknowledged) return;
    // Belt-and-suspenders chain guard, like doBurn: pin the wallet client to
    // PulseChain so the swap can never be signed on another chain.
    if (chainId !== pulsechain.id) return;
    setSwapError(null);
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
      chainId: pulsechain.id,
    });
  };

  // Swap settled on-chain → verify the burn via the swap's Transfer logs to
  // dead (must land at least the entered amount) → celebrate the real
  // arrival. The pass/burn never exists without verification.
  useEffect(() => {
    if (!swapSucceeded || !swapHash || parsed === null) return;
    let alive = true;
    void (async () => {
      setSwapBusy(true);
      setSwapError(null);
      try {
        const v = await verifyPlsBurn(swapHash.toLowerCase(), {
          minArrival: parsed,
          shortfallNote: `that didn't reach your ${fmtTok(parsed)} DUMB burn amount`,
        });
        if (!alive) return;
        if (v.ok) {
          setBurned({ amount: v.amount, token: "DUMB" });
          refetchBal();
        } else {
          setSwapError(v.reason);
        }
      } catch {
        if (alive) setSwapError("The burn verification hit an error — try again in a moment.");
      } finally {
        if (alive) setSwapBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapSucceeded, swapHash]);

  const doBurn = () => {
    if (parsed === null || parsed <= 0n) return;
    // Belt-and-suspenders chain guard: the dialog can stay open if the user
    // switches networks after triggering it. Pin the wallet client to
    // PulseChain so the burn can never be signed on another chain.
    if (chainId !== pulsechain.id) return;
    setConfirmOpen(false);
    reset();
    trackEvent("burn_started");
    setBurned({ amount: parsed, token: tokenKey });
    writeContract({
      address: cfg.address,
      abi: erc20Abi,
      functionName: "transfer",
      args: [DEAD, parsed],
      chainId: pulsechain.id,
    });
  };

  const startOver = () => {
    setAmount("");
    setAcknowledged(false);
    setBurned(null);
    reset();
    resetSwap();
    setSwapError(null);
    setSwapBusy(false);
    refetchBal();
  };

  const selectToken = (k: TokenKey) => {
    if (k === tokenKey) return;
    setTokenKey(k);
    setAmount("");
    setAcknowledged(false);
    setBurned(null);
    reset();
    resetSwap();
    setSwapError(null);
    setSwapBusy(false);
  };

  const canBurn =
    !!address &&
    onPulse &&
    parsed !== null &&
    parsed > 0n &&
    !insufficient &&
    acknowledged &&
    !isPending &&
    !isConfirming &&
    !swapPending &&
    !swapConfirming &&
    !swapBusy;

  const taxPct = cfg.taxBps / 100;

  // Escape-hatch UI reused by both the direct burn and the PLS fallback swap:
  // if a receipt never arrives, the user gets guidance, not a dead end.
  const stuckNote = confirmStuck ? (
    <div className="rounded-md border border-gold/60 bg-gold/10 p-3 text-xs leading-relaxed">
      <p className="font-bold text-gold">Taking longer than usual.</p>
      <p className="mt-1 text-muted-foreground">
        Your burn may still be waiting in the network queue. Check it on the explorer: if it shows
        as <em>pending</em>, give it time — do not start a second burn. If the explorer cannot find
        it, nothing was broadcast, your tokens never moved, and it is safe to start over.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={startOver}
        className="mt-2 rounded-md font-display text-xs uppercase tracking-widest"
      >
        Start over
      </Button>
    </div>
  ) : null;

  return (
    <div className="rounded-xl border-2 border-pink/50 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl uppercase tracking-wide sm:text-2xl">
          Burn {tokenKey}
        </h2>
        <div
          role="group"
          aria-label="Token to burn"
          className="flex gap-1 rounded-lg bg-secondary p-1"
        >
          {(["DUMB", "DAMP"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => selectToken(k)}
              className={`rounded-md px-3 py-1 font-display text-sm uppercase tracking-widest ${
                tokenKey === k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-lg border border-gold/60 bg-gold/10 p-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-gold" />
        <p className="text-sm leading-relaxed">
          <strong className="text-foreground">Burning is permanent.</strong> Tokens sent to the dead
          address can never be moved again — by you or anyone else. Burns shrink supply, but they do
          not guarantee anything about price. Only burn what you are happy to lose forever.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="burn-amount"
          className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground"
        >
          Amount to burn
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="burn-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isPending || isConfirming || swapPending || swapConfirming || swapBusy}
            className="min-w-0 flex-1 rounded-lg border-2 border-foreground/20 bg-background px-4 py-3 text-xl font-bold tabular-nums outline-none focus:border-pink disabled:opacity-60"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => bal !== undefined && setAmount(formatUnits(bal, 18))}
            disabled={
              bal === undefined || isPending || isConfirming || swapPending || swapConfirming
            }
            className="rounded-lg font-display text-sm uppercase tracking-widest"
          >
            Max
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Balance: {bal === undefined ? "—" : `${fmtTok(bal)} ${tokenKey}`} · gas is paid in PLS
        </p>
        {insufficient && (
          <p className="mt-1.5 text-sm font-bold text-destructive">
            Insufficient {tokenKey} balance.{" "}
            <Link
              to="/trade"
              className="font-normal underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              Buy {tokenKey} on the trade page
            </Link>
          </p>
        )}
      </div>

      {parsed !== null && parsed > 0n && (
        <div className="mt-5 rounded-lg bg-secondary/60 p-4 text-sm leading-relaxed">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
            What actually happens (verified on-chain)
          </p>
          <ul className="mt-2 space-y-1">
            <li>
              You send{" "}
              <strong>
                {fmtTok(parsed)} {tokenKey}
              </strong>
            </li>
            <li>
              The dead address balance grows by{" "}
              <strong className="text-pink">
                ~{fmtDead(parsed, cfg.deadBps)} {tokenKey}
              </strong>{" "}
              ({cfg.transferPct}% transfer leg + the 1% protocol burn leg)
            </li>
            <li className="text-muted-foreground">
              {taxPct}% total transfer tax: <strong>{cfg.burnedPct}% burned</strong> · 1% reflected
              to holders
            </li>
            <li className="text-muted-foreground text-xs opacity-80">
              Burned = 1% protocol burn to the dead address + {cfg.bucketBps / 100}% locked in the
              contract&apos;s dead buckets forever (the auto-processing engine is dead, so those
              tokens can never move)
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Dead address: <span className="font-mono break-all">{DEAD}</span>
          </p>
        </div>
      )}

      <div className="mt-5">
        {!address || !onPulse ? (
          <>
            <ConnectButton />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              No {tokenKey} yet?{" "}
              <Link
                to="/trade"
                className="underline decoration-dotted underline-offset-2 hover:text-primary"
              >
                Buy it on the trade page
              </Link>
            </p>
          </>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-foreground/20 p-3 text-sm leading-relaxed">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
                className="mt-0.5"
              />
              <span>
                I understand this is <strong>permanent and irreversible</strong> — my {tokenKey} is
                gone forever, and nobody can get it back.
              </span>
            </label>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  disabled={!canBurn}
                  onClick={() => canBurn && setConfirmOpen(true)}
                  className="mt-3 w-full gap-2 rounded-lg bg-destructive py-6 font-display text-base uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  <Flame className="size-5" />
                  {isPending
                    ? "Waiting for wallet…"
                    : isConfirming
                      ? "Confirming…"
                      : `Burn ${tokenKey} forever`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display uppercase tracking-wide">
                    Final check — this cannot be undone
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm leading-relaxed">
                    You are about to burn{" "}
                    <strong className="text-foreground">
                      {parsed !== null && parsed > 0n ? fmtTok(parsed) : "—"} {tokenKey}
                    </strong>{" "}
                    to the dead address. The tokens leave your wallet permanently. This is the last
                    step before your wallet asks you to sign.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my tokens</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={doBurn}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, burn it
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {/* PLS fallback: the wallet holds less DUMB than the entered amount.
          One wallet confirmation buys the burn with PLS and sends it straight
          to the dead address — no DUMB needed. Verified the same way as the
          deep-scan fallback (Transfer logs to dead, must land ≥ the entered
          amount). The "I understand" box above gates this too. */}
      {showPls && (
        <div className="mt-4 rounded-xl border-2 border-amber-400/40 bg-amber-400/5 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Coins className="size-5 text-amber-500" aria-hidden />
            <h3 className="font-display text-base uppercase tracking-wide">Burn with PLS</h3>
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
              DUMB → burned straight to the dead address. The arrival is taxed 6% — that tax{" "}
              <em>is</em> the burn — so ~
              {((Number(plsQuote.dumbOut) / 1e18) * 0.95).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{" "}
              DUMB lands destroyed, covering your {parsed !== null ? fmtTok(parsed) : "—"} burn.
            </p>
          ) : plsQuoteStale ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No live PLS quote right now — either the RPC didn't answer, or the pool is too thin to
              buy enough DUMB for that amount. The button stays off until a real quote comes back;
              nothing is ever estimated or invented.
            </p>
          ) : (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading the live PLS quote…
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={startPlsBurn}
              disabled={plsDisabled}
              className="gap-2 rounded-lg bg-amber-400 px-4 py-2 font-display text-sm uppercase tracking-widest text-black hover:bg-amber-300 disabled:opacity-50"
            >
              {(swapPending || swapConfirming || swapBusy) && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              {swapPending
                ? "Confirm in wallet…"
                : swapConfirming
                  ? "Swapping + burning…"
                  : swapBusy
                    ? "Verifying burn…"
                    : "Burn with PLS"}
            </Button>
            {plsInsufficient && plsQuote && (
              <span className="text-xs text-muted-foreground">
                Not enough PLS in this wallet for the quoted amount.
              </span>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            One wallet confirmation through the PulseX router — the same 8% slippage guard and
            20-minute deadline the swap box uses. You sign it yourself; the site never touches your
            funds. Keep a little PLS in the wallet for gas. The burn is permanent and can never be
            recovered.
          </p>
        </div>
      )}

      {(isPending ||
        isConfirming ||
        isConfirmed ||
        isFailed ||
        error ||
        hash ||
        swapPending ||
        swapConfirming ||
        swapReceiptFetched ||
        swapWriteError ||
        swapError ||
        swapHash) && (
        <div className="mt-4 rounded-lg border border-foreground/20 bg-secondary/40 p-4 text-sm">
          {isPending && <p>Waiting for your wallet signature…</p>}
          {swapPending && <p>Waiting for your wallet signature…</p>}
          {isConfirming && (
            <div className="space-y-2">
              <p>
                Burning on-chain…{" "}
                {hash && (
                  <a
                    href={explorerTx(hash)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-pink underline-offset-2 hover:text-pink"
                  >
                    view transaction
                  </a>
                )}
              </p>
              {stuckNote}
            </div>
          )}
          {swapConfirming && (
            <div className="space-y-2">
              <p>
                Swapping PLS and burning on-chain…{" "}
                {swapHash && (
                  <a
                    href={explorerTx(swapHash)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-pink underline-offset-2 hover:text-pink"
                  >
                    view transaction
                  </a>
                )}
              </p>
              {stuckNote}
            </div>
          )}
          {doneSucceeded && doneHash && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-bold text-primary">
                <Flame className="size-4" /> Burned — respect. The supply shrank a little.
              </p>
              <p>
                <a
                  href={explorerTx(doneHash)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-pink underline-offset-2 hover:text-pink"
                >
                  View the burn on the explorer
                </a>
              </p>
              <p className="text-xs text-muted-foreground">
                Real burners only — the leaderboard will list on-chain burns, never invented ones.
              </p>
              {sharePost && (
                <div className="pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Brag about it
                  </p>
                  <BurnBragCard
                    amount={sharePost.amount}
                    token={sharePost.token}
                    txHash={doneHash}
                    shareText={sharePost.text}
                  />
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Or text-only
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <NativeShareButton
                      title={sharePost.title}
                      text={sharePost.text}
                      url={sharePost.url}
                      fallbackUrl={sharePost.xHref}
                    />
                    <Button
                      asChild
                      size="sm"
                      className="gap-1.5 rounded-md bg-foreground text-xs font-black text-background hover:bg-foreground/90"
                    >
                      <a href={sharePost.xHref} target="_blank" rel="noreferrer noopener">
                        <Twitter className="size-3.5" /> Post to X
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
                    >
                      <a href={sharePost.tgHref} target="_blank" rel="noreferrer noopener">
                        <Send className="size-3.5" /> Share to Telegram
                      </a>
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Pre-filled post with the real amount — the link unfurls your burn card image.
                    Nothing is posted until you say so.
                  </p>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startOver}
                className="rounded-md font-display text-xs uppercase tracking-widest"
              >
                Burn more
              </Button>
            </div>
          )}
          {(isFailed || txReverted || error || swapReverted || swapWriteError) && (
            <div className="space-y-2">
              <p className="font-bold text-destructive">
                {isFailed || txReverted || swapReverted
                  ? "Transaction failed on-chain."
                  : "Something went wrong."}
              </p>
              {(error ?? swapWriteError) && (
                <p className="break-words font-mono text-xs text-muted-foreground">
                  {((error ?? swapWriteError) as Error).message?.split("\n")[0]}
                </p>
              )}
              {doneHash && (
                <p>
                  <a
                    href={explorerTx(doneHash)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-pink underline-offset-2 hover:text-pink"
                  >
                    View the transaction
                  </a>
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  reset();
                  resetSwap();
                }}
                className="rounded-md font-display text-xs uppercase tracking-widest"
              >
                Try again
              </Button>
            </div>
          )}
          {swapError && (
            <p className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm">
              {swapError}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl border-2 border-foreground/20 bg-card p-5">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-pink" />
          <h2 className="font-display text-base uppercase tracking-wide">
            Burning from another wallet?
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Holding DUMB or DAMP somewhere else — an exchange, a hardware wallet, a different app?
          Send it straight to the dead address below. Copy it exactly: hand-typing a 42-character
          address is how tokens get lost forever.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5">
          <span className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{DEAD}</span>
          <CopyButton value={DEAD} label="Dead address" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          After pasting, match the first and last 4 characters (
          <span className="font-mono">0x00…dEaD</span>) against the explorer. The transfer tax
          applies to direct burns too — ~95% of DUMB / ~98% of DAMP sent lands in the dead balance;
          the rest goes to the tax (1% to dead, the remainder entombed) and ~1% reflects to holders.
          Burns are permanent and never promise price.
        </p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Verifying the dead address yourself?{" "}
        <a
          href={explorerAddress(DEAD)}
          target="_blank"
          rel="noreferrer noopener"
          className="underline decoration-pink underline-offset-2 hover:text-pink"
        >
          Open it on the PulseChain explorer
        </a>{" "}
        — it holds only what the token contract and burners sent it.
      </p>
    </div>
  );
}
