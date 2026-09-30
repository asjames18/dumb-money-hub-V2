import { createFileRoute, Link } from "@tanstack/react-router";
import { ListOrdered, ShieldCheck, TriangleAlert } from "lucide-react";

import { BurnBox } from "@/components/dumb/BurnBox";
import { BurnLeaderboard } from "@/components/dumb/BurnLeaderboard";
import { BurnMilestones } from "@/components/dumb/BurnMilestones";
import { BurnTicker } from "@/components/dumb/BurnTicker";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { FeedTheBurn } from "@/components/dumb/FeedTheBurn";
import { PledgeCard } from "@/components/dumb/PledgeCard";
import { PageShell } from "@/components/dumb/PageShell";
import { TaxFlowVisual } from "@/components/dumb/TaxFlowVisual";
import { TotalBurned } from "@/components/dumb/TotalBurned";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Burn DUMB — Dumb Money Hub";
const DESCRIPTION =
  "Voluntarily burn DUMB or DAMP to the dead address. Verified tax math, strong warnings, nothing reversible. Burns shrink supply — they never promise price.";

export const Route = createFileRoute("/burn")({
  head: () => pageMeta("/burn", TITLE, DESCRIPTION),
  component: BurnPage,
});

function BurnPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <Disclaimer className="mb-6" />
        <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">The burn pit</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-6xl">
          Burn it. <span className="text-pink">Shrink the supply.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          A voluntary burn is an ordinary transfer to the dead address — no new contract, no
          middleman, nothing reversible. The tax math below was verified on-chain, and the page
          shows you exactly what happens before you sign anything.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
          PulseChain · mainnet · 369
        </p>

        <div className="mt-8">
          <BurnBox />
        </div>

        <div className="mt-8">
          <FeedTheBurn />
        </div>

        <div className="mt-8">
          <TotalBurned />
        </div>

        <div className="mt-8">
          <BurnMilestones />
        </div>

        <div className="mt-8">
          <BurnTicker />
        </div>

        <div className="mt-8">
          <BurnLeaderboard />
        </div>

        <div className="mt-8">
          <PledgeCard />
        </div>

        <div className="mt-8">
          <TaxFlowVisual />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
            <TriangleAlert className="size-6 text-gold" />
            <h2 className="mt-3 font-display text-lg uppercase tracking-wide">Honest framing</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Burns remove tokens from circulation — they do not create demand. Price needs real
              buyers; nobody here will promise you gains from burning. Burn because you believe in
              the bit, not because anyone promised a pump.
            </p>
          </div>
          <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
            <ListOrdered className="size-6 text-primary" />
            <h2 className="mt-3 font-display text-lg uppercase tracking-wide">
              Burn contests next
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Burn contests are next: entry is burning some amount, verified on-chain against the
              leaderboard above. Nothing off-chain, nothing invented — if the chain didn&apos;t see
              it, it didn&apos;t happen.
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-foreground/20 bg-card p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Safety first: this page never sees your keys. Only your wallet can sign — the site
            proposes the transaction and your wallet shows you exactly what it does before you
            confirm. If any screen ever asks for a private key or seed phrase, close it: that is a
            scam, not this site.{" "}
            <Link
              to="/roots"
              className="underline decoration-pink underline-offset-2 hover:text-pink"
            >
              Verify everything on /roots
            </Link>
            .
          </p>
        </div>
      </main>
    </PageShell>
  );
}
