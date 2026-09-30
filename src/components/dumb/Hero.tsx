import { FileCheck2, Gamepad2, ScanSearch, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

import heroSmiley from "@/assets/smiley_portal_hero.webp";
import { ContractGuardrail } from "@/components/dumb/ContractGuardrail";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { Ticker } from "@/components/dumb/Ticker";
import { Button } from "@/components/ui/button";

// 2026-09-29 (#8 bullish-demand): the hero's CTAs now funnel the newcomer to
// the free flagship utility first. The old external "Explorer · PulseChain"
// button is gone — trust coverage didn't move: ContractGuardrail (pinned
// addresses + explorer links + copy buttons) sits directly under the CTAs,
// and /roots keeps every explorer link.
const CTAS = [
  { href: "/trade", label: "Trade DUMB", icon: Zap, primary: true },
  { href: "/scan", label: "Scan any token", icon: ScanSearch, primary: false },
  { href: "/raid", label: "Join the raid", icon: Gamepad2, primary: false },
  {
    href: "/roots",
    label: "See the receipts",
    icon: FileCheck2,
    primary: false,
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b-2 border-foreground/20 bg-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-street)] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-pink/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-10 size-96 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <p className="sticker inline-block bg-gold px-3 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-black">
            PulseChain · DUMB live on PulseX
          </p>
          <h1 className="mt-5 font-display uppercase leading-[0.9] tracking-tight">
            <span className="block text-5xl text-foreground sm:text-8xl">The home of</span>
            <span className="text-outline block text-5xl sm:text-8xl">retail crypto</span>
          </h1>
          <p className="mt-5 max-w-xl text-base font-bold leading-relaxed text-foreground sm:text-lg">
            Wall Street called us dumb money — so we took the insult and turned it into a brand.
            DUMB is already launched on PulseChain: a 6% transfer-tax token with no owner, no
            upgrades, and 69% of its supply immobilized. Memes on the front, receipts on everything,
            and a community that raids together.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            The key is gone. The code is in charge. Every trade pays a 6% tax — 5% burns, 1%
            reflects. (The 5%: 1% to the dead address, 4% entombed in the contract&apos;s dead
            buckets.) Nothing can be restarted. This is information, not advice.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {CTAS.map(({ href, label, icon: Icon, primary }) => (
              <Button
                key={label}
                asChild
                className={
                  primary
                    ? "gap-2 rounded-md bg-primary px-5 py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary/90"
                    : "gap-2 rounded-md border-2 border-foreground/30 bg-surface px-5 py-2.5 font-display text-sm uppercase tracking-widest text-foreground hover:border-pink hover:text-pink"
                }
              >
                <Link to={href}>
                  <Icon className="size-4" /> {label}
                </Link>
              </Button>
            ))}
          </div>

          <div className="mt-7 max-w-xl">
            <ContractGuardrail />
          </div>

          <Disclaimer className="mt-6 max-w-xl" />
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div
            aria-hidden="true"
            className="absolute inset-6 rounded-full bg-primary/25 blur-3xl"
          />
          <img
            src={heroSmiley}
            alt="Smiley, the Dumb Money mascot, opening a glowing green portal: green coin head, black hoodie, gold $DUMB chain, white gloves and hot-pink accent sneakers"
            width={1000}
            height={1333}
            fetchPriority="high"
            className="relative w-full -rotate-2 rounded-xl border-2 border-foreground/40 shadow-[8px_8px_0_0_var(--color-pink)]"
          />
          <p className="sticker absolute -bottom-3 left-6 bg-pink px-3 py-1 font-display text-xs uppercase tracking-[0.2em] text-pink-foreground">
            Smiley runs the front desk
          </p>
        </div>
      </div>

      <Ticker />
    </section>
  );
}
