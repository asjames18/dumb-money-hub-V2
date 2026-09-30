import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { canNativeShare, nativeShareOrFallback } from "@/lib/share";

type Props = {
  /** Share-sheet title shown by the OS. */
  title: string;
  /** The exact honest pre-filled copy (same text the intent buttons use). */
  text: string;
  /** Link attached to the share payload. */
  url: string;
  /** Where to go if the native sheet isn't available or errors. */
  fallbackUrl: string;
  className?: string;
};

/**
 * "Share anywhere" button — renders ONLY where the Web Share API exists
 * (checked after mount to avoid SSR/hydration mismatch). On phones this
 * opens the native share sheet so users can post to any installed app;
 * desktop keeps the X/Telegram intent buttons unchanged.
 */
export function NativeShareButton({ title, text, url, fallbackUrl, className }: Props) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(canNativeShare());
  }, []);
  if (!supported) return null;
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        trackEvent("share_tap");
        void nativeShareOrFallback({ title, text, url, fallbackUrl });
      }}
      className={`gap-1.5 rounded-md border-accent text-xs font-bold text-accent hover:bg-accent hover:text-accent-foreground ${className ?? ""}`}
    >
      <Share2 className="size-3.5" /> Share anywhere
    </Button>
  );
}
