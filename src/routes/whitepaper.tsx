import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FileText, List } from "lucide-react";

import { CopyButton } from "@/components/dumb/CopyButton";
import { SITE_URL, pageMeta } from "@/lib/page-meta";

const TITLE = "Dumb Money — Whitepaper";
const DESCRIPTION =
  "How Dumb Money on PulseChain works: the live DUMB token, the 6% tax (5% instant burn, 1% reflections), the 69% immobilized supply, the raid as the community engine, and the honest risks. Not financial advice.";

export const Route = createFileRoute("/whitepaper")({
  head: () => pageMeta("/whitepaper", TITLE, DESCRIPTION),
  component: Whitepaper,
});

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 leading-relaxed text-muted-foreground">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 list-disc pl-5">{children}</ul>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="mt-2 leading-relaxed text-muted-foreground">{children}</li>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="text-foreground">{children}</strong>;
}

const CHAPTERS: { title: string; body: React.ReactNode }[] = [
  {
    title: "The idea in one paragraph",
    body: (
      <P>
        Dumb Money on PulseChain is the <B>already-launched DUMB token</B> — live and trading on
        PulseX. Every transfer pays a 6% tax: <B>5% is instantly burned</B> (1% to the dead address,
        2% + 2% into the contract&apos;s fee buckets — entombed forever, the auto-processing engine
        is dead) and 1% is reflected to holders. About 69% of the 28B fixed supply is immobilized:
        ~56.6% burned, ~12.5% stuck in the contract. Nobody is in charge — ownership is renounced
        and the fee split can&apos;t change. The raid exists to bring people into the protocol:
        every new buyer is volume on the live pairs. Memes on the front, receipts on everything.
      </P>
    ),
  },
  {
    title: "Which token is this",
    body: (
      <>
        <P>
          <B>This paper is about Dumb Money on PulseChain — the live DUMB token.</B>
        </P>
        <P>
          <B>DAMP — the Dumb Amplifier</B> — is the sibling token: 3% tax (2% instant burn, 1%
          reflections), designed to market-buy-and-burn DUMB. The flywheel never runs, but the tax
          is live — 1% protocol burn to the dead address, 1% entombed in the contract&apos;s bucket,
          1% reflected to holders. It stays secondary on this site.
        </P>
      </>
    ),
  },
  {
    title: "How it works — in plain language",
    body: (
      <Ul>
        <Li>
          <B>6% tax on every transfer.</B> Buys, sells, and wallet-to-wallet transfers all pay 6%.
          It isn&apos;t optional and it can&apos;t change.
        </Li>
        <Li>
          <B>Where the 6% goes.</B> Net: 5% of every taxed transfer is permanently burned and 1% is
          reflected to holders. The 5%: <B>1% burned</B> to the dead address, 2% into the
          contract&apos;s buy-back bucket, 2% into its liquidity bucket — both buckets entombed (the
          auto-processing engine is dead, so nothing ever spends them). About 12.5% of supply is
          already stuck there.
        </Li>
        <Li>
          <B>Every trade burns 5% and reflects 1%.</B> Say it plainly: on top of the historical
          burns (~56.6% of supply, verifiable on-chain), 5% of every taxed transfer is permanently
          destroyed and 1% is reflected to holders. That&apos;s the live mechanic — not history.
        </Li>
        <Li>
          <B>28B fixed supply.</B> No minting, no presale wallets — the supply is what it is, and
          roughly 69% of it can never move again.
        </Li>
        <Li>
          <B>Nobody is in charge.</B> Ownership is renounced. No pause button, no fee changes, no
          rescue, no restart. If something is wrong with the token, nobody can fix it — the rules
          are frozen forever.
        </Li>
      </Ul>
    ),
  },
  {
    title: "The supply story",
    body: (
      <Ul>
        <Li>
          <B>~56.6% burned</B> — roughly 15.84B of 28B sent to the dead address. Gone, verifiable
          on-chain.
        </Li>
        <Li>
          <B>~12.5% entombed</B> — roughly 3.5B of 28B sitting in the token contract, growing with
          every trade&apos;s tax. The contract can&apos;t spend it and nobody can move it.
        </Li>
        <Li>
          <B>~31% circulating</B> — what&apos;s left actually trades on PulseX v2 pairs, with the
          flagship WPLS/DUMB pair carrying the market.
        </Li>
        <Li>
          Verified on-chain 2026-09-29. The live tables — pairs, tax reads, holder concentration —
          are on <B>/roots</B>.
        </Li>
      </Ul>
    ),
  },
  {
    title: "The raid is the engine",
    body: (
      <P>
        Every buy is volume on the live pairs — so the raid exists to bring people into the
        protocol. More raiders, more buys, more volume. Community growth isn&apos;t marketing here;
        it&apos;s the mechanism. Raid missions are browser-local fun with no token rewards; the
        reward is a louder market for the token you already hold. Nothing about the raid changes the
        token&apos;s rules — it changes who shows up.
      </P>
    ),
  },
  {
    title: "What holding means",
    body: (
      <Ul>
        <Li>
          You hold a fixed-supply token on thin DEX pairs. Price moves with buys and sells — every
          trade also pays 6%, so round-tripping costs you on both sides.
        </Li>
        <Li>
          Your position grows only two slow ways: the 1% reflection on every taxed transfer, and
          whatever the market does. No yield, no staking — the tax buckets accumulate in the
          contract, not in your wallet.
        </Li>
        <Li>
          The one thing the contract does for you is immutability — the rules can&apos;t be
          rewritten later, by anyone. What you verified is what you keep.
        </Li>
        <Li>
          DEX quotes show the pre-tax price. You receive about 6% less than the quote shows — size
          accordingly.
        </Li>
      </Ul>
    ),
  },
  {
    title: "The honest risks",
    body: (
      <Ul>
        <Li>
          <B>You can lose everything.</B> This is a volatile meme token on thin pairs. Price can go
          to zero. The contract offers no redemption, no floor, and no downside protection.
        </Li>
        <Li>
          <B>The 6% tax is a drag.</B> Every entry and exit costs 6%. Frequent trading bleeds
          position size no matter what the price does.
        </Li>
        <Li>
          <B>Thin liquidity.</B> Pools exist but volume is thin — large orders move the price, and
          you may not be able to exit at the quoted price.
        </Li>
        <Li>
          <B>No utility, no promises.</B> This is a community culture project — the token itself is
          not a payment product or a return vehicle (the hub around it provides tools like the
          scanner and wallet checks, but those don't change what the token is). Nobody owes you a
          product, a listing, a buyback, or a price outcome.
        </Li>
        <Li>
          <B>No professional audit.</B> The token is a Safemoon fork — battle-tested pattern, but
          nobody can rescue funds if something is wrong. Immutability cuts both ways.
        </Li>
        <Li>
          <B>PulseChain risk.</B> The token lives on PulseChain. If the network, its bridges, or its
          liquidity dries up, the token goes with it.
        </Li>
        <Li>
          Nothing here is financial advice. It is a description of a live token and its risks.
        </Li>
      </Ul>
    ),
  },
  {
    title: "Questions people actually ask",
    body: (
      <>
        <P>
          <B>Does anything burn when I trade? </B>
          Yes — 5% of every taxed transfer is permanently destroyed: 1% burned to the dead address,
          4% entombed in the contract&apos;s fee buckets (the auto-processing engine is dead and
          ownership is renounced, so nothing ever spends them) — and 1% is reflected to holders. The
          historical burns (~56.6% of supply) are real, and the mechanic is still live today.
        </P>
        <P>
          <B>Can the tax be changed or removed? </B>
          No. Ownership is renounced, so the 6% rate and the split are frozen forever. The
          auto-processing engine is permanently dead — nobody can restart it.
        </P>
        <P>
          <B>Do reflections pay me for holding? </B>A little: 1% of every taxed transfer is
          reflected to holders. It&apos;s slow, it guarantees nothing about price, and nobody can
          change it.
        </P>
        <P>
          <B>What about DAMP? </B>
          The Dumb Amplifier — 3% tax: 2% instantly burned, 1% reflected to holders (1% to the dead
          address, 1% into the entombed contract bucket). Its market-buy-and-burn flywheel never
          runs, but the per-transfer burn and reflection are live. Secondary on this site; see
          /roots.
        </P>
      </>
    ),
  },
  {
    title: "Contract",
    body: (
      <>
        <P>
          DUMB · PulseChain mainnet (chain ID 369)
          <br />
          <code className="mt-2 block break-all rounded bg-surface px-2 py-1 font-mono text-[11px] text-foreground">
            0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D
          </code>
        </P>
        <P>
          <CopyButton value="0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D" label="contract address" />
        </P>
        <P>
          Live and trading. Verify the address character by character before you touch anything —
          fakes exist. Nothing here is financial advice.
        </P>
      </>
    ),
  },
];

/** URL-safe slugs for deep-linking chapters (e.g. /whitepaper#the-honest-risks). */
const SLUGS: string[] = CHAPTERS.map((c) =>
  c.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""),
);

function Whitepaper() {
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const chapter = CHAPTERS[index] ?? CHAPTERS[0]!;

  // Deep-linkable chapters: /whitepaper#the-honest-risks opens straight on the
  // risks chapter. Slugs are derived from titles, so they never drift.
  const slug = SLUGS[index] ?? "";
  const go = (i: number) => {
    const next = Math.min(Math.max(i, 0), CHAPTERS.length - 1);
    setIndex(next);
    setMenuOpen(false);
    const nextSlug = SLUGS[next];
    if (nextSlug) window.history.replaceState(null, "", `#${nextSlug}`);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const applyHash = () => {
      const i = SLUGS.indexOf(window.location.hash.replace(/^#/, ""));
      if (i >= 0) setIndex(i);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-pink"
        >
          <ArrowLeft className="size-4" /> Back to the hub
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="sticker bg-primary px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground">
            <FileText className="mr-1 inline size-3" /> Whitepaper
          </span>
          <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Mainnet v1 · Sep 2026
          </span>
          <div className="ml-auto inline-flex items-center gap-2">
            <CopyButton
              value={`${SITE_URL}/whitepaper#${slug}`}
              label={`link to chapter "${chapter.title}"`}
            />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Table of contents"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:border-pink hover:text-pink"
            >
              <List className="size-4" /> Contents
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            aria-label="Whitepaper contents"
            className="mt-4 rounded-lg border border-border bg-card p-2"
          >
            {CHAPTERS.map((c, i) => (
              <button
                key={c.title}
                type="button"
                onClick={() => go(i)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-surface ${
                  i === index ? "font-bold text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="w-6 shrink-0 tabular-nums text-xs">{i + 1}.</span>
                {c.title}
              </button>
            ))}
          </nav>
        )}

        <h1 className="mt-6 font-display text-4xl uppercase leading-tight sm:text-5xl">
          Dumb Money
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          An immutable taxed token on PulseChain mainnet — 6% on every transfer: 5% instant burn, 1%
          reflections. The burn side: 1% protocol burn to the dead address, 4% into the
          contract&apos;s buckets, entombed forever. The auto-processing engine is dead and
          ownership is renounced — the rules are frozen.
        </p>

        <div className="mt-8 border-t-2 border-foreground/20 pt-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
            Chapter {index + 1} of {CHAPTERS.length}
          </p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-wide">{chapter.title}</h2>
          <div className="mt-2">{chapter.body}</div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t-2 border-foreground/20 pt-6">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-md border-2 border-foreground/30 bg-surface px-4 py-2 font-display text-xs uppercase tracking-widest text-foreground hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> Prev
          </button>
          <div className="flex gap-1.5" aria-hidden="true">
            {CHAPTERS.map((c, i) => (
              <span
                key={c.title}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-primary" : "bg-foreground/20"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === CHAPTERS.length - 1}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ArrowRight className="size-4" />
          </button>
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          <p>
            Dumb Money · Whitepaper v1 · September 2026 · Written for the live token on PulseChain
            mainnet.
          </p>
        </div>
      </main>
    </div>
  );
}
