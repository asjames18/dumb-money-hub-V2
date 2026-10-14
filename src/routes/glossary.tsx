import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";

import { PageShell } from "../components/dumb/PageShell";
import { pageMeta } from "../lib/page-meta";
import { GLOSSARY_TERMS } from "../data/glossary";

const TITLE = "Safety glossary — Dumb Money Hub";
const DESCRIPTION =
  "Plain-English definitions for every safety term the Dumb Money token scanner uses — honeypot, transfer tax, renounced ownership, locked liquidity, slippage, and more. Education, not advice.";

export const Route = createFileRoute("/glossary")({
  head: () => pageMeta("/glossary", TITLE, DESCRIPTION),
  component: GlossaryPage,
});

function GlossaryPage() {
  return (
    <PageShell>
      {/* FAQPage schema: hardcoded constants only, same pattern as the homepage WebSite block. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: GLOSSARY_TERMS.map((t) => ({
              "@type": "Question",
              name: t.term,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${t.plain} ${t.why}`,
              },
            })),
          }),
        }}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-pink">
          <BookOpen className="h-4 w-4" aria-hidden />
          Learn the words
        </p>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-wide">
          The safety <span className="text-pink">glossary</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every term a scan report can throw at you, defined in plain English. Read these once and
          no report will ever talk over your head again. Definitions are facts about how things work
          — <strong className="text-foreground">not advice, not recommendations</strong>, and never
          a promise about price.
        </p>

        <nav aria-label="Glossary index" className="mt-6 flex flex-wrap gap-2">
          {GLOSSARY_TERMS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="rounded-full border border-foreground/20 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-pink hover:text-foreground"
            >
              {t.term}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-8">
          {GLOSSARY_TERMS.map((t) => (
            <section key={t.id} id={t.id} aria-label={t.term} className="scroll-mt-24">
              <h2 className="font-display text-lg uppercase tracking-wide">{t.term}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.plain}</p>
              <p className="mt-2 text-sm leading-relaxed">
                <strong className="text-foreground">Why it matters: </strong>
                <span className="text-muted-foreground">{t.why}</span>
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border-2 border-pink/40 bg-pink/5 p-6">
          <p className="font-display text-lg uppercase tracking-wide">
            Words are step one. <span className="text-pink">Proof is step two.</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Now put the vocabulary to work — paste any PulseChain token address and watch the
            scanner measure the real tax, list the live owner powers, and simulate the sell.
          </p>
          <Link
            to="/scan"
            search={{ token: undefined, burn: undefined, tx: undefined }}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            Scan a token <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
