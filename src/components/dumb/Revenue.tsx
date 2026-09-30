import {
  Bot,
  Coins,
  Flame,
  GraduationCap,
  Megaphone,
  Package,
  Shirt,
  type LucideIcon,
} from "lucide-react";

import { REVENUE_RAILS } from "@/data/dump";

const ICONS: Record<string, LucideIcon> = {
  shirt: Shirt,
  bot: Bot,
  package: Package,
  megaphone: Megaphone,
  "graduation-cap": GraduationCap,
  flame: Flame,
};

export function Revenue() {
  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="sticker bg-gold px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-black">
          Revenue rails
        </span>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          How the project plans to fund itself. None of these are statements about token price.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REVENUE_RAILS.map((r) => {
          const Icon = ICONS[r.icon] ?? Coins;
          return (
            <div
              key={r.title}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent"
            >
              <Icon className="size-5 text-accent" />
              <h3 className="mt-2 text-base font-black tracking-tight">{r.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
