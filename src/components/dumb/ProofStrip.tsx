import { useEffect, useState } from "react";
import { useBlockNumber, useReadContract } from "wagmi";
import { ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";

import { DAMP, DEAD, DUMB, erc20Abi, explorerAddress, pulsechain, taxAbi } from "@/lib/pulsechain";
import { fmtCompactTok, timeAgo } from "@/lib/burns";

/**
 * Backlog #16 (Antonio 2026-09-28) — live proof strip on the hero.
 *
 * Trust comes from verifiable facts placed BEFORE the action: the first thing
 * a newcomer sees is total destroyed, fixed supply, and the per-transfer tax
 * legs — every figure read live from PulseChain, each with block number, age,
 * and an explorer link. No invented numbers, no new data sources, read-only.
 *
 * The tax legs are derived from the contracts themselves, not pinned copy:
 * fees() is the total transfer tax in basis points (600 = 6% DUMB,
 * 300 = 3% DAMP) and feesDistribution() is four uint256 shares of 10,000 of
 * that tax — legs 0+1+2 are burn/entomb, leg 3 reflects to holders — which
 * reproduces the canonical 5%/1% (DUMB) and 2%/1% (DAMP) framing from live
 * chain state.
 */
const query = { refetchInterval: 60_000, refetchOnWindowFocus: false, retry: 1 } as const;

function oneDecimal(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function ProofStrip() {
  const deadBal = {
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [DEAD],
    chainId: pulsechain.id,
    query,
  } as const;
  const supply = {
    abi: erc20Abi,
    functionName: "totalSupply",
    chainId: pulsechain.id,
    query,
  } as const;
  const feesCall = { abi: taxAbi, functionName: "fees", chainId: pulsechain.id, query } as const;
  const distCall = {
    abi: taxAbi,
    functionName: "feesDistribution",
    chainId: pulsechain.id,
    query,
  } as const;

  const d1 = useReadContract({ ...deadBal, address: DUMB });
  const d2 = useReadContract({ ...deadBal, address: DAMP });
  const s1 = useReadContract({ ...supply, address: DUMB });
  const f1 = useReadContract({ ...feesCall, address: DUMB });
  const g1 = useReadContract({ ...distCall, address: DUMB });
  const f2 = useReadContract({ ...feesCall, address: DAMP });
  const g2 = useReadContract({ ...distCall, address: DAMP });
  const block = useBlockNumber({ chainId: pulsechain.id, query: { refetchInterval: 60_000 } });

  const ready =
    typeof d1.data === "bigint" &&
    typeof d2.data === "bigint" &&
    typeof s1.data === "bigint" &&
    typeof f1.data === "bigint" &&
    Array.isArray(g1.data) &&
    g1.data.length === 4 &&
    typeof f2.data === "bigint" &&
    Array.isArray(g2.data) &&
    g2.data.length === 4;
  const failed =
    d1.isError || d2.isError || s1.isError || f1.isError || g1.isError || f2.isError || g2.isError;
  const loading = !ready && !failed;

  // "Updated Xs ago" — stamp the moment all figures resolve, re-tick every 10s.
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (ready) setSeenAt(Date.now());
  }, [ready, d1.data, d2.data, s1.data, f1.data, g1.data, f2.data, g2.data]);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const retry = () => {
    void d1.refetch();
    void d2.refetch();
    void s1.refetch();
    void f1.refetch();
    void g1.refetch();
    void f2.refetch();
    void g2.refetch();
  };

  /** Net burn/reflection percentages of a transfer, from live fees() + feesDistribution(). */
  const taxLegs = (fees: bigint, dist: [bigint, bigint, bigint, bigint]) => {
    const taxPct = Number(fees) / 100;
    const burnPct = (Number(dist[0] + dist[1] + dist[2]) / 10_000) * taxPct;
    const reflectPct = (Number(dist[3]) / 10_000) * taxPct;
    return {
      taxPct: oneDecimal(taxPct),
      burnPct: oneDecimal(burnPct),
      reflectPct: oneDecimal(reflectPct),
    };
  };

  const shareOfSupply = (burned: bigint, supplyVal: bigint): string | null => {
    if (supplyVal === 0n) return null;
    const pct = (Number(burned) / Number(supplyVal)) * 100;
    return `≈ ${oneDecimal(pct)}% of supply`;
  };

  const figs = (() => {
    if (!ready) return [];
    const dumbBurned = d1.data as bigint;
    const dampBurned = d2.data as bigint;
    const dumbSupply = s1.data as bigint;
    const dist = (d: unknown): [bigint, bigint, bigint, bigint] =>
      d as [bigint, bigint, bigint, bigint];
    const dumbLegs = taxLegs(f1.data as bigint, dist(g1.data));
    const dampLegs = taxLegs(f2.data as bigint, dist(g2.data));
    return [
      {
        key: "burned",
        label: "DUMB destroyed",
        value: fmtCompactTok(dumbBurned),
        sub: shareOfSupply(dumbBurned, dumbSupply),
        extra: `DAMP: ${fmtCompactTok(dampBurned)} destroyed`,
        href: explorerAddress(DEAD),
        linkLabel: "Dead address on the explorer",
      },
      {
        key: "supply",
        label: "DUMB total supply",
        value: fmtCompactTok(dumbSupply),
        sub: "fixed at launch · immutable",
        extra: "ownership renounced — supply can't change",
        href: explorerAddress(DUMB),
        linkLabel: "DUMB contract on the explorer",
      },
      {
        key: "tax",
        label: "Transfer tax · DUMB",
        value: `${dumbLegs.taxPct}%`,
        sub: `${dumbLegs.burnPct}% burn · ${dumbLegs.reflectPct}% reflect — every transfer`,
        extra: `DAMP: ${dampLegs.taxPct}% · ${dampLegs.burnPct}% burn · ${dampLegs.reflectPct}% reflect`,
        href: explorerAddress(DUMB),
        linkLabel: "DUMB contract on the explorer",
      },
    ];
  })();

  return (
    <section aria-label="Live on-chain proof" className="mx-auto max-w-6xl px-4 pt-8 sm:pt-10">
      <div className="rounded-xl border-2 border-gold/50 bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.25em] text-gold">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Live from the chain
          </p>
          <p className="text-xs text-muted-foreground">
            {typeof block.data === "bigint" && <>block {block.data.toLocaleString("en-US")}</>}
            {seenAt !== null && <> · updated {timeAgo(Math.floor(seenAt / 1000))}</>}
          </p>
        </div>

        {loading && (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            Reading the chain…
          </p>
        )}

        {failed && !ready && (
          <div className="mt-3 rounded-lg border border-foreground/20 bg-surface p-4" role="alert">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t read the proof figures from the chain right now — the chain just
              didn&apos;t answer. Nothing here is a guess, so nothing is shown.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:border-gold"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {ready && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {figs.map((fig) => (
              <a
                key={fig.key}
                href={fig.href}
                target="_blank"
                rel="noreferrer"
                aria-label={fig.linkLabel}
                className="group rounded-lg border border-foreground/15 bg-surface p-4 transition-colors hover:border-gold"
              >
                <p className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {fig.label}
                </p>
                <p className="mt-1 font-display text-3xl leading-none">
                  {fig.value}
                  <ExternalLink
                    className="ml-1.5 inline size-4 text-muted-foreground group-hover:text-gold"
                    aria-hidden="true"
                  />
                </p>
                {fig.sub && <p className="mt-1.5 text-xs text-muted-foreground">{fig.sub}</p>}
                {fig.extra && <p className="mt-0.5 text-xs text-muted-foreground">{fig.extra}</p>}
              </a>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Every figure above is read from PulseChain at the block shown — the tax numbers come
          straight from the token contracts&apos; <code>fees()</code> and{" "}
          <code>feesDistribution()</code>. The dead address isn&apos;t fee-excluded, so destroyed
          balances are what actually landed. Burns shrink supply; they never promise price.
        </p>
      </div>
    </section>
  );
}
