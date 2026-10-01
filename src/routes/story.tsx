import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, Flame, Users } from "lucide-react";

import { ContractGuardrail } from "@/components/dumb/ContractGuardrail";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { PageShell } from "@/components/dumb/PageShell";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "The True Story — Dumb Money on PulseChain";
const DESCRIPTION =
  "The verified on-chain history of DUMB on PulseChain: launch, the first-minute burns, the renounced keys, and what the code actually does today. Every event linked to its proof.";

const EXPLORER = "https://scan.pulsechain.com";
const tx = (hash: string) => `${EXPLORER}/tx/${hash}`;
const addr = (a: string) => `${EXPLORER}/address/${a}`;

const DUMB = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D";
const DAMP = "0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3";
const DEAD = "0x000000000000000000000000000000000000dEaD";
const POOL = "0xf046e04ff986dcae96315046888d85ac27500618";
const DIAMOND = "0x0e10dd174e8906d13ec2e96afd6667503842f197";

type Event = {
  when: string;
  title: string;
  body: string;
  proof?: { label: string; href: string }[];
  hot?: boolean;
};

const TIMELINE: Event[] = [
  {
    when: "2025-02-15 · 02:19 UTC",
    title: "DUMB is born",
    body: "28B DUMB minted to a single anonymous deployer wallet. No presale, no team allocation — the entire supply in one hand, 30 seconds before its sibling.",
    proof: [
      {
        label: "Deploy tx",
        href: tx("0x05799690b51e7171fa4f643885cb7cfe8421cf1e827b84c128efa1a96c983a67"),
      },
    ],
  },
  {
    when: "+20 seconds",
    title: "Half the supply burns",
    body: "The deployer sends 14B DUMB — 50% of everything — to the dead address. Gone forever, twenty seconds after launch. No announcement, no ceremony.",
    proof: [
      {
        label: "14B burn tx",
        href: tx("0xa4993f522d1d205cf7db0282ff3751ad8adabc1dfcbb2033ab66a4edd29f578d"),
      },
    ],
    hot: true,
  },
  {
    when: "+30 seconds",
    title: "DAMP launches",
    body: "The Dumb Amplifier: 1B minted by the same deployer. Its 3% tax was designed to market-buy and burn DUMB — a flywheel meant to amplify scarcity.",
    proof: [
      {
        label: "Deploy tx",
        href: tx("0x6e7abe198a8a1a677b395265b1a8e940a43060d7fb9841125d8e1786804c5cf0"),
      },
    ],
  },
  {
    when: "+40 seconds",
    title: "30% of DAMP burns",
    body: "300M DAMP to the dead address. Then DAMP is registered as a fee pair on DUMB — the amplifier is wired into the machine, at least on paper.",
    proof: [
      {
        label: "300M burn tx",
        href: tx("0x4429869ff8b7a4f1473d90db1b81bf168db4bd0415745abaf8d4bfd3b8574d10"),
      },
    ],
  },
  {
    when: "Same morning",
    title: "Liquidity seeded",
    body: "~84.7M PLS across the pools. The DUMB/DAMP pair is born. Launch-day snipers pile in and dump within minutes — the classic memecoin baptism.",
  },
  {
    when: "2025-02-16 · ~38 hours later",
    title: "The keys are thrown away",
    body: "Both ownerships renounced, ten seconds apart. The deployer kept nothing — it holds 0 DUMB today. No pause button, no fee changes, no rescue, no restart. Ever.",
    proof: [
      {
        label: "DUMB renounce",
        href: tx("0x488c64e489a9bb597d025183b1afdbccf2d186348cb937d9eedfb0aa0e83ee5a"),
      },
      {
        label: "DAMP renounce",
        href: tx("0x81c223c6262cce0ade5d7412ed505c5ba6a274d9abf7cdd71e0f2641ea7fafbb"),
      },
    ],
    hot: true,
  },
  {
    when: "Feb → Jul 2025",
    title: "Diamond hands",
    body: "One wallet buys 597.5M DUMB + 59.2M DAMP across 195 transfers — and never sells once. Not during the pumps, not during the silence. Ever.",
    proof: [{ label: "The accumulator", href: addr(DIAMOND) }],
  },
  {
    when: "The present",
    title: "Still standing",
    body: "As of Sep 2026, DUMB trades on PulseX with ~$52K circulating FDV and a few dollars of daily volume. The team is gone. The code isn't. A ~188-follower X account keeps the memes alive — and this site keeps the receipts.",
  },
];

export const Route = createFileRoute("/story")({
  head: () => pageMeta("/story", TITLE, DESCRIPTION),
  component: StoryPage,
});

function TxLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 rounded-md border border-foreground/20 bg-surface px-2.5 py-1 font-mono text-[11px] text-foreground hover:border-pink hover:text-pink"
    >
      {label} <ExternalLink className="size-3" />
    </a>
  );
}

function StoryPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Disclaimer className="mb-6" />
        <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">The true story</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl uppercase leading-none sm:text-6xl">
          Born, burned, abandoned — still here
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          The verified on-chain history of Dumb Money on PulseChain. No lore, no marketing — every
          event below links to its proof on the explorer. Researched 2026-09-26 from the contracts,
          the transaction history, and the market data; key balances re-verified on-chain
          2026-09-29.
        </p>

        <div className="mt-8">
          <ContractGuardrail />
        </div>

        {/* Timeline */}
        <section aria-label="Timeline" className="mt-12">
          <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">The timeline</h2>
          <ol className="mt-6 space-y-0">
            {TIMELINE.map((e, i) => (
              <li key={e.title} className="relative flex gap-4 pb-8 last:pb-0 sm:gap-6">
                {i < TIMELINE.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[7px] top-6 h-[calc(100%-1.5rem)] w-0.5 bg-foreground/20"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-1.5 size-4 shrink-0 rounded-full border-2 ${
                    e.hot ? "border-gold bg-gold" : "border-pink bg-background"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[11px] uppercase tracking-[0.25em] text-pink">
                    {e.when}
                  </p>
                  <h3 className="mt-1 font-display text-xl uppercase tracking-wide text-foreground">
                    {e.title}
                  </h3>
                  <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {e.body}
                  </p>
                  {e.proof && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {e.proof.map((p) => (
                        <TxLink key={p.label} label={p.label} href={p.href} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What the code actually does today */}
        <section aria-label="What the code actually does today" className="mt-14 sm:mt-16">
          <div className="rounded-xl border-2 border-pink/50 bg-card p-5 sm:p-8">
            <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-pink">
              <Flame className="size-4" /> The record, corrected
            </p>
            <h2 className="mt-2 font-display text-3xl uppercase leading-none sm:text-4xl">
              What the code actually does today
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              A correction, and we&apos;re owning it: an earlier version of this page claimed the
              project&apos;s X account (@DumbMoneydotwin) was wrong when its pinned post said
              &ldquo;burns every trade, reflections to holders.&rdquo; We misread the contract — the
              pinned post was accurate. Here&apos;s what the code actually does, read live:
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">Every trade burns 1%.</span>
                <span>
                  The burn share is live, not zero — 1% of every taxed transfer goes to the dead
                  address. The chain proves it: the dead balance grows on trading days.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">Every trade reflects 1%.</span>
                <span>
                  Holders really do receive a slice of other people&apos;s transfers — 1% of every
                  taxed transfer is redistributed. It&apos;s small, and it guarantees nothing about
                  price, but it&apos;s real.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">The DAMP flywheel is dead.</span>
                <span>
                  DAMP&apos;s 3% tax was designed to market-buy and burn DUMB — 2% instantly burned
                  (1% to the dead address, 1% into the entombed contract bucket), 1% reflected. Its
                  auto-processing never runs — but the per-transfer burn and reflection still fire
                  on every transfer, same mechanics as DUMB.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">
                  4% of every trade sits in the contract.
                </span>
                <span>
                  2% into the buy-back bucket, 2% into the liquidity bucket — and the
                  auto-processing engine that was supposed to spend them is dead with the keys
                  thrown away. ~12.5% of supply is already entombed there. Nobody can move it.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">The post-launch burns were both.</span>
                <span>
                  ~1.8B DUMB reached the dead address after launch — the 1% protocol burn on every
                  taxed transfer plus manual holder burns. The code burns a little on every trade;
                  holders burned more by choice.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">15.84B, not 18B.</span>
                <span>
                  Marketing tweets say &ldquo;18B+ incinerated.&rdquo; The chain says 15.84B
                  (56.6%). We use the chain&apos;s number.
                </span>
              </li>
            </ul>
            <p className="mt-5 rounded-lg border border-pink/40 bg-pink/5 p-4 text-sm leading-relaxed text-foreground">
              Say it plainly: every taxed transfer burns 5% and reflects 1%. The 5% is 1% to the
              dead address plus 4% into the contract&apos;s entombed buckets — out of circulation
              either way.
            </p>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Verified on-chain 2026-09-26 — fee split, ownership, and balances read live on{" "}
              <a
                href="/roots"
                className="underline decoration-pink underline-offset-2 hover:text-pink"
              >
                /roots
              </a>
              .
            </p>
          </div>
        </section>

        {/* Holder reality */}
        <section aria-label="Holder reality" className="mt-14 sm:mt-16">
          <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-pink">
            <Users className="size-4" /> Holder reality
          </p>
          <h2 className="mt-2 font-display text-3xl uppercase leading-none sm:text-4xl">
            Who actually holds the supply
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide">69% can never move</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                56.6% of DUMB (15.84B) sits at the dead address; another ~12.5% (3.5B) is entombed
                in the token contract itself. Track both live on{" "}
                <a
                  href="/roots"
                  className="underline decoration-pink underline-offset-2 hover:text-pink"
                >
                  /roots
                </a>
                .
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <TxLink label="Dead address" href={addr(DEAD)} />
                <TxLink label="DUMB contract" href={addr(DUMB)} />
              </div>
            </div>
            <div className="rounded-xl border-2 border-gold/60 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide text-gold">
                The &ldquo;whale&rdquo; is a pool
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <span className="break-all font-mono text-[11px]">0xf046…0618</span> holds 1.09B
                DUMB + 196M DAMP — but it isn&apos;t a whale. It&apos;s the{" "}
                <strong className="text-foreground">DUMB/DAMP liquidity pool</strong> on PulseX. Its
                &ldquo;accumulation&rdquo; is LP reserves; its &ldquo;sells&rdquo; were users
                buying. Anyone showing it as a top holder didn&apos;t do the homework — we did.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <TxLink label="Pool contract" href={addr(POOL)} />
              </div>
            </div>
            <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
              <h3 className="font-display text-lg uppercase tracking-wide">Diamond hands</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                One wallet bought 597.5M DUMB + 59.2M DAMP across 195 transfers between Feb and Jul
                2025 — and has <strong className="text-foreground">never sold once</strong>. Not on
                the pumps, not in the silence.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <TxLink label="The accumulator" href={addr(DIAMOND)} />
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            No invented distribution claims — everything above is on the explorer. DAMP: 1B supply,
            36.4% burned, ~4.9% entombed in its contract.{" "}
            <a
              href={addr(DAMP)}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-pink underline-offset-2 hover:text-pink"
            >
              DAMP contract
            </a>
            .
          </p>
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <a
            href="/trade"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            Trade the live pairs <ArrowUpRight className="size-4" />
          </a>
          <a
            href="/roots"
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-foreground/30 bg-surface px-5 py-2.5 font-display text-sm uppercase tracking-widest text-foreground hover:border-pink hover:text-pink"
          >
            The full receipts <ArrowUpRight className="size-4" />
          </a>
        </div>
      </main>
    </PageShell>
  );
}
