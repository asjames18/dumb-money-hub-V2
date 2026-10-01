import { ExternalLink, Flame, Lock, PieChart } from "lucide-react";

import { CopyButton } from "@/components/dumb/CopyButton";
import { SectionHead } from "@/components/dumb/SectionHead";
import { DUMB_TOKEN_URL } from "@/data/dump";

/** The supply story of the live DUMB token on PulseChain.
 *
 * Static, verified facts — not a launch plan. The full live tables are on
 * /roots; this page is the story those numbers tell.
 */
const SLICES = [
  {
    icon: Flame,
    title: "~56.6% burned",
    value: "~15.84B of 28B",
    desc: "Burned to the dead address — gone, verifiable on-chain. The 14B launch-day burn is most of it; the 1% protocol burn on every taxed transfer keeps adding.",
  },
  {
    icon: Lock,
    title: "~12.5% entombed",
    value: "~3.5B of 28B",
    desc: "4% of every taxed transfer (the buy-back and liquidity buckets) accumulates inside the token contract itself. The contract can't spend it, nobody can move it — it just grows.",
  },
  {
    icon: PieChart,
    title: "~31% circulating",
    value: "the rest",
    desc: "What's left actually trades — on PulseX v2 pairs, with the flagship WPLS/DUMB pair carrying the market.",
  },
];

export function Genesis() {
  const address = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D";
  return (
    <section id="genesis" className="scroll-mt-24">
      <SectionHead
        asH1
        index="01"
        eyebrow="Supply story"
        title="69% can never move again."
        blurb="DUMB launched with a 28B fixed supply. Most of it is already gone — burned to the dead address or entombed in the token contract by the 6% tax. That's the supply story: fixed, mostly immobilized, immutable."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SLICES.map((s) => (
          <div key={s.title} className="rounded-xl border-2 border-foreground/20 bg-card p-5">
            <s.icon className="size-6 text-primary" />
            <h3 className="mt-3 font-display text-lg uppercase tracking-wide">{s.title}</h3>
            <p className="mt-1 font-mono text-xs font-bold text-foreground">{s.value}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-5">
        <h3 className="font-display text-lg uppercase tracking-wide">The contract</h3>
        <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-foreground">
          {address}
          <CopyButton value={address} label="contract address" />
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Safemoon fork, ownership renounced — no pause, no fee changes, no rescue. The
          auto-processing fee engine is permanently dead and nobody can restart it. Verified
          on-chain 2026-09-29.
        </p>
        <a
          href={DUMB_TOKEN_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 font-display text-xs uppercase tracking-widest text-primary-foreground hover:opacity-90"
        >
          Open on explorer <ExternalLink className="size-3.5" />
        </a>
      </div>
    </section>
  );
}
