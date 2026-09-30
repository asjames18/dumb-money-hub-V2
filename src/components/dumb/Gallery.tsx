import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Auto-discovered gallery: drop any .webp/.png/.jpg into src/assets/gallery/
// and it shows up here automatically — no code changes needed. Overwrite the
// existing files (same names) to swap in official renders, or add new ones.
const modules = import.meta.glob("../../assets/gallery/*.{webp,png,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// Optional nice titles/captions for known files. Any file without an entry
// still appears, with a title derived from its filename.
const META: Record<string, { title: string; caption: string }> = {
  smiley_night_arrival: {
    title: "Night Arrival",
    caption: "Smiley clocks in past the neon storefront.",
  },
  smiley_festival_stage: {
    title: "Festival Stage",
    caption: "Retail crowd, phones up, community first.",
  },
  smiley_proof_vault: {
    title: "Proof Vault",
    caption: "Reading the receipts, not the rumors.",
  },
  smiley_arcade_button: {
    title: "Arcade Control",
    caption: "Slamming the daily raid button.",
  },
  smiley_ai_lounge: {
    title: "Dumb AI Lounge",
    caption: "Onboarding retail with the mascot in training.",
  },
  smiley_rooftop_comeback: {
    title: "Rooftop Comeback",
    caption: "The key is gone. The code is in charge.",
  },
  smiley_street_clock_in: {
    title: "Street Clock-In",
    caption: "Charts overhead. Retail on the pavement.",
  },
};

const prettify = (name: string) =>
  name
    .replace(/^smiley[_-]?/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "Smiley Scene";

const SCENES = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => {
    const file = path
      .split("/")
      .pop()!
      .replace(/\.\w+$/, "");
    const meta = META[file];
    return { key: file, src, title: meta?.title ?? prettify(file), caption: meta?.caption ?? "" };
  });

type Scene = (typeof SCENES)[number];

export function Gallery() {
  const [active, setActive] = useState<Scene | null>(null);

  if (SCENES.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="sticker bg-pink px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-pink-foreground">
          Scenes
        </span>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          Cinematic mascot scenes for posts, memes and headers. Tap any scene to open it full size.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCENES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(s)}
            className="group relative block overflow-hidden rounded-lg border border-border bg-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink"
          >
            <img
              src={s.src}
              alt={`Smiley mascot scene: ${s.title}${s.caption ? ` — ${s.caption}` : ""}`}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent opacity-80"
            />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-sm font-black tracking-tight text-foreground drop-shadow">
                {s.title}
              </p>
              {s.caption ? (
                <p className="text-[11px] leading-snug text-muted-foreground">{s.caption}</p>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Scenes follow the Smiley brand system: green coin head, black hoodie, gold $DUMB chain,
        white gloves, hot-pink accent sneakers.
      </p>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl overflow-hidden border-border bg-card p-0 sm:rounded-lg">
          {active ? (
            <>
              <img
                src={active.src}
                alt={`Smiley mascot scene: ${active.title}`}
                className="max-h-[70vh] w-full object-contain bg-background"
              />
              <DialogHeader className="space-y-1 p-4 text-left">
                <DialogTitle className="text-lg font-black tracking-tight">
                  {active.title}
                </DialogTitle>
                {active.caption ? (
                  <DialogDescription className="text-sm text-muted-foreground">
                    {active.caption}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">Smiley gallery scene</DialogDescription>
                )}
                <a
                  href={active.src}
                  download
                  className="pt-1 text-xs font-bold text-pink hover:underline"
                >
                  Open / download original
                </a>
              </DialogHeader>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
