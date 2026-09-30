import { createFileRoute } from "@tanstack/react-router";
import { Send, Twitter, ArrowRight } from "lucide-react";

import { Hero } from "@/components/dumb/Hero";
import { ProofStrip } from "@/components/dumb/ProofStrip";
import { pageMeta } from "@/lib/page-meta";
import { ContractGuardrail } from "@/components/dumb/ContractGuardrail";
import { PageShell } from "@/components/dumb/PageShell";
import { Button } from "@/components/ui/button";
import { SOCIALS } from "@/data/dump";

const SOCIAL_ICONS = {
  x: Twitter,
  telegram: Send,
} as const;

const TITLE = "Dumb Money Hub — The Home of Retail Crypto";
const DESCRIPTION =
  "Dumb Money on PulseChain: the live, already-launched DUMB token (6% transfer tax, immutable, 28B fixed supply) — proof feeds, a token safety scanner, raid missions and the Dumb AI helper. Community tool, not financial advice.";

export const Route = createFileRoute("/")({
  head: () => pageMeta("/", TITLE, DESCRIPTION),
  component: Index,
});

const PAGES = [
  {
    to: "/story",
    sticker: "Story",
    title: "The true story",
    blurb:
      "Born, burned, abandoned — still here. The verified on-chain history of DUMB: every event linked to its proof.",
  },
  {
    to: "/trade",
    sticker: "Trade",
    title: "Trade the pairs",
    blurb:
      "DUMB trades on live PulseX pairs — the WPLS/DUMB chart and swap links. Remember: DEX quotes show pre-tax prices, you receive ~6% less.",
  },
  {
    to: "/burn",
    sticker: "Burn",
    title: "Burn it",
    blurb:
      "Voluntarily burn DUMB or DAMP to the dead address — verified tax math, permanent by design. Burns shrink supply; they never promise price.",
  },
  {
    to: "/proof",
    sticker: "Proof",
    title: "Receipts",
    blurb:
      "Don't trust the memes — verify. The DUMB contract, supply story, and tax reality, on the record.",
  },
  {
    to: "/scan",
    sticker: "Scan",
    title: "Scan any token",
    blurb:
      "Paste any PulseChain token address for a plain-English safety report — real vs claimed tax, owner powers, liquidity locks. Quick scan is free; the deep scan costs a small DUMB burn.",
  },
  {
    to: "/raid",
    sticker: "Raid",
    title: "Raid HQ",
    blurb:
      "Missions, the arcade, and your personal XP board. Earn XP, track your run, raid together.",
  },
  {
    to: "/ai",
    sticker: "Dumb AI",
    title: "Ask Dumb",
    blurb:
      "The helper that explains the 6% tax, the burns, and the receipts in plain language. Dumb name, sharp answers.",
  },
  {
    to: "/culture",
    sticker: "Culture",
    title: "Smiley & the brand",
    blurb:
      "The mascot, the brand system, and the share-card studio. Meme first — but make it on-brand.",
  },
  {
    to: "/plan",
    sticker: "Plan",
    title: "Roadmap",
    blurb:
      "Where Dumb Money on PulseChain goes from live-token analytics to the community engine — and what has to happen first.",
  },
];

function Index() {
  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Dumb Money Hub",
            url: "https://dumbmoneypulse.melanatedintech.com/",
            description:
              "DUMB and DAMP are immutable PulseChain tax tokens — 6% and 3% on every transfer, with a 5% instant burn and 1% reflections.",
          }),
        }}
      />
      <div id="top">
        <Hero />
      </div>

      {/* #16 — live proof strip: the first thing a newcomer sees after the
          hero is verifiable facts, not the pitch. */}
      <ProofStrip />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8">
          <ContractGuardrail />
        </div>

        <section aria-label="Explore the hub">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">
            Pick your station
          </p>
          <h2 className="mt-2 font-display text-4xl uppercase leading-none sm:text-5xl">
            The hub, room by room
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAGES.map((p) => (
              <a
                key={p.to}
                href={p.to}
                className="group rounded-xl border-2 border-foreground/20 bg-card p-5 transition-colors hover:border-pink"
              >
                <span className="sticker bg-primary px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
                  {p.sticker}
                </span>
                <h3 className="mt-3 font-display text-2xl uppercase tracking-wide group-hover:text-pink">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-display text-xs uppercase tracking-widest text-foreground group-hover:text-pink">
                  Open <ArrowRight className="size-3.5" />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section aria-label="Tokenomics" className="mt-16 sm:mt-20">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">Tokenomics</p>
          <h2 className="mt-2 font-display text-4xl uppercase leading-none sm:text-5xl">
            Built different, on purpose
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            DUMB on PulseChain is the real thing, already trading — not a new token. Every mechanic
            below was verified on-chain, and nobody can change the rules:{" "}
            <a
              href="/roots"
              className="underline decoration-pink underline-offset-2 hover:text-pink"
            >
              the full receipts live on /roots
            </a>
            .
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide">
                6% tax, every transfer
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Buys, sells, and wallet-to-wallet transfers all pay 6%. It isn&apos;t optional, and
                it isn&apos;t changing — the per-transfer split runs on its own, and the
                auto-processing engine is permanently dead.
              </p>
            </div>
            <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide">Where the 6% goes</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Net:{" "}
                <strong className="text-foreground">
                  5% of every taxed transfer is permanently burned
                </strong>
                , <strong className="text-foreground">1% reflected</strong> to holders. The 5%: 1%
                burned to the dead address, 2% + 2% into the contract&apos;s buckets — entombed
                forever, the auto-processing engine is dead. Say it plainly: every trade burns 5%
                and reflects 1%.
              </p>
            </div>
            <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide">69% immobilized</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                28B fixed supply. ~56.5% was historically burned, ~12.5% sits stuck in the contract
                — roughly 69% of every DUMB ever created can never move again.
              </p>
            </div>
            <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide">Nobody in charge</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ownership is renounced. No pause button, no fee changes, no rescue, no restart — the
                6% tax and its split (2% / 2% / 1% burned / 1% reflected) are frozen forever.
              </p>
            </div>
            <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide">Live on PulseX</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                DUMB trades on real DEX pairs — the WPLS/DUMB pair on PulseX v2 is the flagship.
                <a
                  href="/trade"
                  className="underline decoration-pink underline-offset-2 hover:text-pink"
                >
                  {" "}
                  Trade the live pairs
                </a>{" "}
                — quotes show pre-tax prices, you receive ~6% less.
              </p>
            </div>
            <div className="rounded-xl border-2 border-pink/50 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide text-pink">
                The raid is the engine
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Every buy is volume on the live pairs — so the raid exists to bring people into the
                protocol. More raiders, more buys, more volume. Community growth isn&apos;t
                marketing here; it&apos;s the mechanism.{" "}
                <a
                  href="/raid"
                  className="underline decoration-pink underline-offset-2 hover:text-pink"
                >
                  Join the raid
                </a>
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            All numbers verified on-chain 2026-09-29 (see /roots for the live reads).
          </p>
        </section>

        <section
          id="community"
          className="relative mt-16 overflow-hidden rounded-xl border-2 border-foreground/20 bg-card p-6 sm:mt-20 sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-street)] opacity-50"
          />
          <p className="relative font-display text-sm uppercase tracking-[0.3em] text-pink">
            Community
          </p>
          <h2 className="relative mt-2 font-display text-4xl uppercase leading-none sm:text-5xl">
            Join the raid
          </h2>
          <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Official Telegram and X for Dumb Money. Trade DUMB on the live pairs — always verify the
            contract address before you sign anything.
          </p>
          <div className="relative mt-5 flex flex-wrap gap-3">
            {SOCIALS.map(({ label, key, href }) => {
              const Icon = SOCIAL_ICONS[key];
              const ready = href !== "#";
              return (
                <Button
                  key={key}
                  asChild={ready}
                  variant="outline"
                  aria-disabled={!ready}
                  className="gap-2 rounded-md border-2 border-foreground/30 bg-surface px-5 py-2.5 font-display text-sm uppercase tracking-widest text-foreground hover:border-pink hover:text-pink aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                >
                  {ready ? (
                    <a href={href} target="_blank" rel="noreferrer noopener">
                      <Icon className="size-4 text-pink" /> {label}
                    </a>
                  ) : (
                    <span>
                      <Icon className="size-4 text-pink" /> {label}
                      <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        soon
                      </span>
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
