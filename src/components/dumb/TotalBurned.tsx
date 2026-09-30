import { useReadContract } from "wagmi";
import { Flame, RotateCcw } from "lucide-react";

import { DAMP, DEAD, DUMB, erc20Abi, explorerAddress, pulsechain } from "@/lib/pulsechain";
import { fmtCompactTok } from "@/lib/burns";
import { fmtUsdCompact, useTokenPrices } from "@/lib/token-prices";

/**
 * Lifetime total-burned card on /burn: the live DUMB + DAMP balances of the
 * dead address — everything sitting there is permanently destroyed (it gets
 * there via 1% protocol burn legs and voluntary burns; see the reflection
 * caveat below).
 *
 * Honest math, exact thanks to the verified direct-to-dead tax accounting
 * (backlog #1): the dead address is NOT fee-excluded, so a straight-to-dead
 * transfer of A arrives as 0.95A (DUMB) / 0.98A (DAMP) — the balance shown
 * here is what actually landed, not a naive 1:1 of amounts sent. USD is an
 * estimate from on-chain WPLS pair reserves x PLS/USD, indicative only.
 * Burns shrink supply; they never promise price.
 *
 * One caveat, verified from the token source 2026-09-27 (#9 security pass):
 * burn legs credit dead's reflected balance (_rOwned), and dead is NOT in the
 * fee-exclusion set — but reward exclusion (_isExcluded) is a separate
 * private mapping the constructor never sets for dead, and the owner is
 * renounced, so whether dead also accretes its share of the ~1% holder
 * reflection is unknowable from outside. Either way every token here is
 * permanently destroyed; the rows say "destroyed", not "burned", for exactly
 * this reason. Do NOT derive a "burn rate" from dead-balance deltas — deltas
 * may include reflection accretion, not just burn legs.
 *
 * Read-only against the public RPC: two balanceOf calls + two totalSupply()
 * calls (the % of supply is computed from live chain state — never a pinned
 * constant), no wallet needed, no new data sources.
 */
export function TotalBurned() {
  const prices = useTokenPrices();
  const balanceOfDead = {
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [DEAD],
    chainId: pulsechain.id,
    query: { refetchInterval: 60_000, refetchOnWindowFocus: false, retry: 1 },
  } as const;
  const totalSupply = {
    abi: erc20Abi,
    functionName: "totalSupply",
    chainId: pulsechain.id,
    query: { refetchInterval: 60_000, refetchOnWindowFocus: false, retry: 1 },
  } as const;

  const {
    data: dumbBurned,
    isLoading: dumbLoading,
    isError: dumbError,
    refetch: refetchDumb,
  } = useReadContract({ ...balanceOfDead, address: DUMB });
  const {
    data: dampBurned,
    isLoading: dampLoading,
    isError: dampError,
    refetch: refetchDamp,
  } = useReadContract({ ...balanceOfDead, address: DAMP });
  // totalSupply() read live — no hardcoded supply constant (a pinned number
  // would drift from chain state). Both tokens are 18-decimal.
  const { data: dumbSupply, refetch: refetchDumbSupply } = useReadContract({
    ...totalSupply,
    address: DUMB,
  });
  const { data: dampSupply, refetch: refetchDampSupply } = useReadContract({
    ...totalSupply,
    address: DAMP,
  });

  const loading = dumbLoading || dampLoading;
  const failed = dumbError || dampError;
  const both = typeof dumbBurned === "bigint" && typeof dampBurned === "bigint";

  const dumbUsd = prices.DUMB;
  const dampUsd = prices.DAMP;
  const priced = both && dumbUsd !== null && dampUsd !== null;
  const totalUsd = priced
    ? (Number(dumbBurned) / 1e18) * (dumbUsd as number) +
      (Number(dampBurned) / 1e18) * (dampUsd as number)
    : null;

  const retry = () => {
    void refetchDumb();
    void refetchDamp();
    void refetchDumbSupply();
    void refetchDampSupply();
  };

  /** Burned share of total supply, formatted honestly — null when supply is unread. */
  const shareOfSupply = (burned: bigint, supply: bigint | undefined): string | null => {
    if (typeof supply !== "bigint" || supply === 0n) return null;
    const pct = (Number(burned) / Number(supply)) * 100;
    const digits = pct >= 10 ? 1 : 2;
    return `≈ ${pct.toFixed(digits)}% of total supply`;
  };

  return (
    <section
      aria-label="Total burned all time"
      className="rounded-xl border-2 border-pink/40 bg-gradient-to-br from-pink/10 via-card to-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Flame className="size-5 text-pink" aria-hidden="true" />
        <h2 className="font-display text-sm uppercase tracking-[0.25em] text-muted-foreground">
          Total burned · all time
        </h2>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          Reading the dead address…
        </p>
      )}

      {failed && !both && (
        <div className="mt-4 rounded-lg border border-foreground/20 bg-card p-4" role="alert">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t read the burn totals from the chain right now. Nothing is broken — the
            chain just didn&apos;t answer.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:border-pink"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {both && (
        <div className="mt-4">
          {totalUsd !== null && (
            <p className="font-display text-4xl uppercase leading-none sm:text-5xl">
              <span className="text-pink">~{fmtUsdCompact(totalUsd)}</span>{" "}
              <span className="text-lg text-muted-foreground">est.</span>
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-foreground/15 bg-card p-4">
              <p className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                DUMB destroyed
              </p>
              <p className="mt-1 font-display text-2xl">
                {fmtCompactTok(dumbBurned)}{" "}
                <span className="text-sm text-muted-foreground">DUMB</span>
              </p>
              {shareOfSupply(dumbBurned, dumbSupply) && (
                <p className="text-xs text-muted-foreground">
                  {shareOfSupply(dumbBurned, dumbSupply)}
                </p>
              )}
              {dumbUsd !== null && (
                <p className="text-xs text-muted-foreground">
                  ~{fmtUsdCompact((Number(dumbBurned) / 1e18) * dumbUsd)} est.
                </p>
              )}
            </div>
            <div className="rounded-lg border border-foreground/15 bg-card p-4">
              <p className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                DAMP destroyed
              </p>
              <p className="mt-1 font-display text-2xl">
                {fmtCompactTok(dampBurned)}{" "}
                <span className="text-sm text-muted-foreground">DAMP</span>
              </p>
              {shareOfSupply(dampBurned, dampSupply) && (
                <p className="text-xs text-muted-foreground">
                  {shareOfSupply(dampBurned, dampSupply)}
                </p>
              )}
              {dampUsd !== null && (
                <p className="text-xs text-muted-foreground">
                  ~{fmtUsdCompact((Number(dampBurned) / 1e18) * dampUsd)} est.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Lifetime DUMB + DAMP sitting at the dead address — permanently destroyed. The dead address
        is <em>not</em> fee-excluded: a direct-to-dead transfer is taxed, so only ~95% of DUMB /
        ~98% of DAMP sent actually arrives (the balance above is what really landed, never a naive
        1:1).{" "}
        <a
          href={explorerAddress(DEAD)}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-pink underline-offset-2 hover:text-pink"
        >
          Check it on the explorer
        </a>
        . USD is estimated from on-chain WPLS pair reserves × PLS/USD — indicative only. Burns
        shrink supply; they never promise price.
      </p>
    </section>
  );
}
