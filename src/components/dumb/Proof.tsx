import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { BurnMilestones } from "@/components/dumb/BurnMilestones";
import { CopyButton } from "@/components/dumb/CopyButton";
import { SectionHead } from "@/components/dumb/SectionHead";
import { DUMB_TOKEN_URL, TOKENS } from "@/data/dump";
import { fmtUsdCompact, useMarketCaps } from "@/lib/token-prices";

/** Token receipts for the live DUMB token on PulseChain.
 *
 * Static, verifiable facts — the live tables (pairs, tax, burns, holders) are
 * on /roots. Nothing here reads from a bonding curve: there isn't one.
 */
const RECEIPTS = [
  {
    label: "Contract",
    value: "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D",
    note: "The live DUMB token on PulseChain mainnet. Verify the address character by character — fakes exist.",
  },
  {
    label: "Supply",
    value: "28B fixed",
    note: "~56.5% historically burned, ~12.5% entombed in the token contract — roughly 69% immobilized.",
  },
  {
    label: "Tax",
    value: "6% on every transfer",
    note: "Buys, sells, wallet-to-wallet. Per taxed transfer: 2% to the contract's buy-back bucket, 2% to its liquidity bucket, 1% burned, 1% reflected — the buckets just sit there because the auto-processing engine is dead. Net: 5% of every transfer is permanently burned, 1% reflected to holders.",
  },
  {
    label: "Ownership",
    value: "Renounced",
    note: "No owner, no pause, no fee changes. The auto-processing engine is permanently dead and nobody can restart it — but the per-transfer tax split (5% out of circulation — 1% to dead, 4% entombed — plus 1% reflected) runs on its own.",
  },
];

export function Proof() {
  const token = TOKENS[0];
  const { dumbMcapUsd } = useMarketCaps();
  return (
    <section id="proof" className="scroll-mt-24">
      <SectionHead
        asH1
        index="02"
        eyebrow="Proof"
        title="Don't trust. Verify."
        blurb="The DUMB token on PulseChain is already launched — so every claim below is checkable on-chain right now. Live pair tables, tax reads, and holder data live on /roots."
      />

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <ShieldCheck className="size-4 text-primary" /> Token receipts — DUMB
        </h3>
        <dl className="mt-4 space-y-4">
          {RECEIPTS.map((r) => (
            <div key={r.label} className="rounded-md bg-surface p-3">
              <dt className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                {r.label}
              </dt>
              <dd className="mt-1 flex items-center gap-2 font-mono text-sm font-bold text-foreground">
                <span className="min-w-0 break-all">{r.value}</span>
                {r.label === "Contract" && <CopyButton value={r.value} label="contract address" />}
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.note}</dd>
            </div>
          ))}
          {dumbMcapUsd != null && (
            <div className="rounded-md bg-surface p-3">
              <dt className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Market cap
              </dt>
              <dd className="mt-1 font-mono text-sm font-bold text-foreground">
                ~{fmtUsdCompact(dumbMcapUsd)} est.
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                totalSupply() × the estimated USD price above — indicative only. Counts the
                immobilized supply too (~69% burned or entombed).
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={DUMB_TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 font-display text-xs uppercase tracking-widest text-primary-foreground hover:opacity-90"
          >
            Open on explorer <ArrowUpRight className="size-3.5" />
          </a>
          <a
            href="/roots"
            className="inline-flex items-center gap-1 rounded-md border-2 border-foreground/20 px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground hover:border-pink hover:text-pink"
          >
            Live tables on /roots <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>

      <div className="mt-6">
        <BurnMilestones />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {token.name} ({token.symbol}) — {token.blurb}
      </p>
    </section>
  );
}
