import { Route } from "lucide-react";

import { ROADMAP } from "@/data/dump";

export function Roadmap() {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="sticker bg-primary px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground">
          Roadmap
        </span>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          Plans, not promises. Shipping order can change as the community steers it.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ROADMAP.map((r) => (
          <div
            key={r.title}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <Route className="size-4 text-accent" />
              {r.done ? (
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
                  Shipped
                </span>
              ) : (
                <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-accent">
                  {r.when}
                </span>
              )}
            </div>
            <h3 className="mt-2 text-base font-black tracking-tight">{r.title}</h3>
            <ul className="mt-2 space-y-1">
              {r.items.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
