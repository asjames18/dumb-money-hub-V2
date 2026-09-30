import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ListChecks, TriangleAlert } from "lucide-react";

import { pageMeta } from "@/lib/page-meta";

import { BurnMilestones } from "@/components/dumb/BurnMilestones";
import { ConnectButton } from "@/components/dumb/ConnectButton";
import { ContractGuardrail } from "@/components/dumb/ContractGuardrail";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { PageShell } from "@/components/dumb/PageShell";
import { SwapBox } from "@/components/dumb/SwapBox";

const TITLE = "Trade DUMB — Dumb Money Hub";
const DESCRIPTION =
  "DUMB trades on live DEX pairs on PulseChain — the WPLS/DUMB pair on PulseX v2 is the flagship. DEX quotes show pre-tax prices; the 6% transfer tax means you receive about 6% less.";

const WPLS_DUMB_DEX =
  "https://dexscreener.com/pulsechain/0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186";
const DAMP_WPLS_DEX =
  "https://dexscreener.com/pulsechain/0xB256769d6B9d53E0E66a395C17135F8855A8633A";

export const Route = createFileRoute("/trade")({
  head: () => pageMeta("/trade", TITLE, DESCRIPTION),
  component: TradePage,
});

function TradePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Disclaimer className="mb-6" />
        <div className="mb-8">
          <ContractGuardrail />
        </div>
        <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">Trade</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-6xl">
          Trade the live pairs
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          DUMB is already launched on PulseChain. Trade DUMB and DAMP right here — both directions:
          buy with PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX, PRVX, pTGC, or WBTC, sell back
          into any of them, or swap DUMB&#8596;DAMP — all through the live PulseX v2 pairs — or use
          the DEXScreener links below if you prefer the full charting terminal.
        </p>
        <div className="mt-3 flex justify-start">
          <ConnectButton />
        </div>

        <div className="mt-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
            PulseChain · mainnet · 369
          </p>
          <SwapBox />
        </div>

        <section
          aria-label="First swap walkthrough"
          className="mt-10 rounded-xl border-2 border-primary/40 bg-card p-5 sm:p-6"
        >
          <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">New here?</p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">
            Your first swap, in 5 steps
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-primary">
                1.
              </span>
              <span>
                <strong className="text-foreground">Connect your wallet</strong> with the button at
                the top of this page. The swap box switches you to PulseChain mainnet (chain 369)
                automatically.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-primary">
                2.
              </span>
              <span>
                <strong className="text-foreground">Keep a little PLS for gas.</strong> Every swap
                costs PLS in network fees — keep a spare amount in your wallet so your first trade
                doesn&apos;t get stranded at the finish line. No PLS yet?{" "}
                <a href="#get-pls" className="text-primary underline underline-offset-2">
                  Here&apos;s how to get some.
                </a>
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-primary">
                3.
              </span>
              <span>
                <strong className="text-foreground">Pick what you pay and what you receive.</strong>{" "}
                Every input token is curated and verified — the real addresses are listed right in
                the swap box with explorer links. Never paste a random contract address.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-primary">
                4.
              </span>
              <span>
                <strong className="text-foreground">Expect the tax.</strong> DUMB takes 6% on every
                transfer (3% on DAMP) — the quote already shows the after-tax amount you&apos;ll
                receive, so there are no surprises.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-primary">
                5.
              </span>
              <span>
                <strong className="text-foreground">
                  Approve, then swap, then check the receipt.
                </strong>{" "}
                The first click approves the exact amount you entered — never an unlimited approval
                — and the second executes the trade. Open the receipt on the explorer to confirm
                what actually landed. And never enter a seed phrase on any site, including this one.
              </span>
            </li>
          </ol>
        </section>

        <section
          id="get-pls"
          aria-label="Get PLS for gas"
          className="mt-6 scroll-mt-24 rounded-xl border-2 border-gold/60 bg-card p-5 sm:p-6"
        >
          <p className="font-display text-sm uppercase tracking-[0.3em] text-gold">No PLS yet?</p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">
            Get gas before you trade
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            PLS is PulseChain&apos;s native gas token. A wallet full of tokens but empty of PLS
            can&apos;t send anything at all — so sort out gas first, then come back and trade.
            Common ways people get PLS:
          </p>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-gold">
                1.
              </span>
              <span>
                <strong className="text-foreground">Bridge from Ethereum.</strong> The official
                PulseChain bridge at{" "}
                <a
                  href="https://bridge.pulsechain.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  bridge.pulsechain.com
                </a>{" "}
                moves assets between Ethereum and PulseChain — you&apos;ll still need ETH on the
                Ethereum side to pay for that transaction&apos;s gas.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-gold">
                2.
              </span>
              <span>
                <strong className="text-foreground">Buy PLS on an exchange that lists it</strong>{" "}
                and withdraw to your own wallet address on PulseChain (chain 369). Double-check the
                destination network before you hit withdraw.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-gold">
                3.
              </span>
              <span>
                <strong className="text-foreground">Already hold assets on PulseChain?</strong> Swap
                a small slice to PLS on PulseX first, so you have gas covered for the real trades.
              </span>
            </li>
          </ol>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Watch out for lookalike bridge sites — type the URL yourself or use a bookmark, and
            never enter a seed phrase anywhere. Bridges and listings change over time, so verify
            everything yourself before you move funds. This is information, not an endorsement.
          </p>
        </section>

        <div className="mt-6">
          <BurnMilestones />
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border-2 border-gold/60 bg-card p-5">
          <TriangleAlert className="mt-0.5 size-6 shrink-0 text-gold" />
          <p className="text-sm font-bold leading-relaxed text-foreground">
            DEX quotes show the <em>pre-tax</em> price. Every DUMB transfer pays the 6% transfer tax
            (3% on DAMP), so you receive less than the quote shows. Size accordingly.
          </p>
        </div>

        <h2 className="mt-10 font-display text-xl uppercase tracking-wide text-muted-foreground">
          Prefer the charting terminal?
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <a
            href={WPLS_DUMB_DEX}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border-2 border-primary/50 bg-card p-5 transition-colors hover:border-primary"
          >
            <span className="sticker bg-primary px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
              Flagship pair
            </span>
            <h2 className="mt-3 font-display text-2xl uppercase tracking-wide group-hover:text-primary">
              WPLS / DUMB
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The main DUMB market on PulseX v2. Chart, price, and swap on DEXScreener.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 font-display text-xs uppercase tracking-widest text-foreground group-hover:text-primary">
              Open on DEXScreener <ArrowUpRight className="size-3.5" />
            </span>
          </a>

          <a
            href={DAMP_WPLS_DEX}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border-2 border-foreground/20 bg-card p-5 transition-colors hover:border-pink"
          >
            <span className="sticker bg-gold px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-black">
              Sibling token
            </span>
            <h2 className="mt-3 font-display text-2xl uppercase tracking-wide group-hover:text-pink">
              DAMP / WPLS
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The Dumb Amplifier — 3% tax: 2% instantly burned (1% to the dead address, 1% into the
              entombed contract bucket), 1% reflected to holders. Its market-buy-and-burn flywheel
              never runs, but the per-transfer burn and reflection still fire on every transfer.
              Chart on DEXScreener.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 font-display text-xs uppercase tracking-widest text-foreground group-hover:text-pink">
              Open on DEXScreener <ArrowUpRight className="size-3.5" />
            </span>
          </a>
        </div>

        <section
          aria-label="Pre-trade checklist"
          className="mt-10 rounded-xl border-2 border-pink/50 bg-card p-5 sm:p-6"
        >
          <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-pink">
            <ListChecks className="size-4" /> Before you ape
          </p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">
            The honest checklist
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-pink">
                1.
              </span>
              <span>
                <strong className="text-foreground">6% tax on DUMB, 3% on DAMP.</strong> DEX quotes
                show pre-tax prices — you receive about 6% less than the quote shows on DUMB (3%
                less on DAMP). Size accordingly.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-pink">
                2.
              </span>
              <span>
                <strong className="text-foreground">Micro-liquidity slippage.</strong> The flagship
                pools hold only a few thousand dollars of liquidity (thin — check the live pair
                tables on /roots before sizing a trade) — a $100 trade can move the price. Your
                market order is someone&apos;s exit liquidity.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-pink">
                3.
              </span>
              <span>
                <strong className="text-foreground">Check the risk flags yourself.</strong>{" "}
                DEXScreener&apos;s Quick Intel flags issues on both flagship pairs — open the pair
                pages above and read them before you sign anything. Don&apos;t take our word for it.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-pink">
                4.
              </span>
              <span>
                <strong className="text-foreground">Verify the address, again.</strong> Copycat
                tokens share the name — the real PulseChain addresses are pinned at the top of this
                page, and every input token&apos;s verified address is listed in the swap box too.
                Match them character by character in your wallet before you swap.
              </span>
            </li>
          </ul>
        </section>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          DUMB trades across multiple PulseX pools — the two flagship pairs, WPLS/DUMB and
          DAMP/WPLS, with explorer links are pinned on{" "}
          <a href="/roots" className="underline decoration-pink underline-offset-2 hover:text-pink">
            /roots
          </a>
          . Always verify the contract address (
          <span className="font-mono text-xs">0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D</span>)
          before you sign anything — fakes exist.
        </p>
      </main>
    </PageShell>
  );
}
