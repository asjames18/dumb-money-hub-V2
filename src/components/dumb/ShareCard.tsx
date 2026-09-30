import { Download, ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Mission } from "@/lib/missions";
import { downloadBlob, renderShareCard } from "@/lib/share-card";

const sceneModules = import.meta.glob("../../assets/gallery/*.{webp,png,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const SCENES = Object.entries(sceneModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => {
    const key = path
      .split("/")
      .pop()!
      .replace(/\.\w+$/, "")
      .replace(/^smiley_/, "")
      .replace(/_/g, " ");
    return {
      src,
      label: key.replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  });

type Props = {
  mission: Mission;
};

export function ShareCard({ mission }: Props) {
  const [scene, setScene] = useState(SCENES[0]?.src ?? "");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const sceneLabel = useMemo(() => SCENES.find((s) => s.src === scene)?.label ?? "Scene", [scene]);

  const make = async (download: boolean) => {
    if (!scene) {
      toast.error("No gallery scene available");
      return;
    }
    setBusy(true);
    try {
      const blob = await renderShareCard({
        title: mission.title,
        caption: mission.caption,
        type: mission.type,
        vibe: mission.vibe,
        imageUrl: scene,
      });
      const url = URL.createObjectURL(blob);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      if (download) {
        downloadBlob(blob, `dump-${mission.type.toLowerCase().replace(/\s+/g, "-")}.png`);
        toast.success("Share card downloaded");
      } else {
        toast.message("Share card ready", { description: sceneLabel });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not render share card");
    } finally {
      setBusy(false);
    }
  };

  if (SCENES.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <ImageIcon className="size-3.5 text-pink" /> Share card
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Pick a Smiley scene, render a 1080×1350 raid card, download for X / Telegram.
      </p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SCENES.map((s) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setScene(s.src)}
            aria-pressed={scene === s.src}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
              scene === s.src ? "border-pink ring-2 ring-pink/40" : "border-border"
            }`}
            title={s.label}
          >
            <img src={s.src} alt={s.label} className="size-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void make(false)}
          className="gap-1.5 rounded-md border-border text-xs font-bold"
        >
          Preview card
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void make(true)}
          className="gap-1.5 rounded-md bg-primary text-xs font-black text-primary-foreground hover:bg-primary/90"
        >
          <Download className="size-3.5" /> {busy ? "Rendering…" : "Download PNG"}
        </Button>
      </div>

      {preview ? (
        <img
          src={preview}
          alt={`Share card preview for ${mission.title}`}
          className="mt-3 max-h-80 w-full rounded-md border border-border object-contain bg-background"
        />
      ) : null}
    </div>
  );
}
