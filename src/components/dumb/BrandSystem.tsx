import {
  Ban,
  Coins,
  Footprints,
  Gem,
  Hand,
  Palette,
  Shirt,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import mascot from "@/assets/smiley-mascot.png";
import { Smiley } from "@/components/dumb/Smiley";
import { BRAND_RULES } from "@/data/dump";

const ICONS: Record<string, LucideIcon> = {
  coins: Coins,
  shirt: Shirt,
  gem: Gem,
  hand: Hand,
  footprints: Footprints,
  ban: Ban,
  users: Users,
  palette: Palette,
};

const SWATCHES = [
  { name: "Charcoal", className: "bg-background" },
  { name: "Coin green", className: "bg-primary" },
  { name: "Gold", className: "bg-gold" },
  { name: "Hot pink", className: "bg-pink" },
  { name: "White", className: "bg-foreground" },
];

export function BrandSystem() {
  return (
    <div id="brand" className="mt-8 scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="sticker bg-gold px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-black">
          Brand rules
        </span>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          The official mascot rules. Anyone making Dumb Money content follows this checklist.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="relative overflow-hidden rounded-lg border border-border bg-card p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-street)] opacity-60"
          />
          <img
            src={mascot}
            alt="Smiley mascot reference sheet render"
            loading="lazy"
            width={1024}
            height={1024}
            className="relative mx-auto w-48"
          />
          <div className="relative mt-3 flex items-end justify-center gap-4 rounded-md border border-border bg-surface p-3">
            <Smiley variant="full" className="w-24" />
            <p className="max-w-[9rem] text-[10px] leading-relaxed text-muted-foreground">
              In-app CSS build of Smiley: coin head, black hoodie, gold $DUMB pendant, white gloves,
              pink-accent sneakers.
            </p>
          </div>
          <div className="relative mt-3 grid grid-cols-5 gap-1.5">
            {SWATCHES.map((s) => (
              <div key={s.name}>
                <div
                  className={`h-8 rounded-md border border-border ${s.className}`}
                  title={s.name}
                />
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  {s.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {BRAND_RULES.map((r) => {
            const Icon = ICONS[r.icon] ?? Sparkles;
            return (
              <div
                key={r.title}
                className="rounded-md border border-border bg-card p-3 transition-colors hover:border-pink"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-primary" />
                  <h3 className="text-sm font-black tracking-tight">{r.title}</h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
