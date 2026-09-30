import { useState } from "react";
import { Download, ImageIcon, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadBlob, renderBurnBragCard } from "@/lib/share-card";
import { trackEvent } from "@/lib/analytics";

type Props = {
  /** Formatted amount, e.g. "1,250". */
  amount: string;
  token: "DUMB" | "DAMP";
  /** Full tx hash of the CONFIRMED burn — the short form goes on the card so the brag is checkable. */
  txHash: string;
  /** Honest pre-filled copy (same text the intent buttons use). */
  shareText: string;
};

/**
 * Meme-style brag card for a confirmed voluntary burn. Renders a 1080×1080
 * PNG on a canvas (typography + emoji only — no gallery or mascot imagery),
 * then shares it through the native sheet where file sharing is supported,
 * falling back to a download. Only mount for confirmed burns with real
 * amounts: the card carries the tx hash, never invented numbers.
 */
export function BurnBragCard({ amount, token, txHash, shareText }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const filename = `dumb-burn-${token.toLowerCase()}-${txHash.slice(2, 8)}.png`;

  const render = async (): Promise<Blob | null> => {
    setBusy(true);
    try {
      const blob = await renderBurnBragCard({ amount, token, txHash });
      const url = URL.createObjectURL(blob);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      return blob;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not render brag card");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const shareImage = async () => {
    const blob = await render();
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Burned ${token} on PulseChain`,
          text: shareText,
          files: [file],
        });
        toast.success("Shared — go brag");
        trackEvent("brag_share");
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return; // dismissed — leave them alone
      }
    }
    downloadBlob(blob, filename);
    trackEvent("brag_share");
    toast.message("Image downloaded", { description: "Attach it to your post" });
  };

  const download = async () => {
    const blob = await render();
    if (!blob) return;
    downloadBlob(blob, filename);
    trackEvent("brag_share");
    toast.success("Brag card downloaded");
  };

  return (
    <div className="mt-3 rounded-md border border-border bg-surface p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <ImageIcon className="size-3.5 text-pink" /> Burn brag card
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        A meme-style image with your real burned amount and tx — made for X, Telegram, anywhere.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void shareImage()}
          className="gap-1.5 rounded-md bg-primary text-xs font-black text-primary-foreground hover:bg-primary/90"
        >
          <Share2 className="size-3.5" /> {busy ? "Rendering…" : "Share image"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void download()}
          className="gap-1.5 rounded-md border-border text-xs font-bold"
        >
          <Download className="size-3.5" /> Download PNG
        </Button>
      </div>
      {preview ? (
        <img
          src={preview}
          alt={`Brag card: burned ${amount} ${token}`}
          className="mt-3 max-h-80 w-full rounded-md border border-border bg-background object-contain"
        />
      ) : null}
    </div>
  );
}
