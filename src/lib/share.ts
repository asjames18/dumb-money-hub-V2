/** Share helpers — the Web Share API path with intent-link fallback.
 *
 * On phones, `navigator.share` opens the native share sheet (Messages,
 * WhatsApp, any installed app) instead of forcing the X/Telegram web
 * intents, which are clunky inside mobile browsers. Everything stays
 * user-initiated: nothing is ever posted automatically, and the copy is
 * exactly the same honest pre-filled text the intent buttons use.
 */

/** True where the native share sheet exists (mostly mobile browsers). */
export const canNativeShare = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * Try the native share sheet; if it fails for a reason other than the user
 * dismissing it, open the provided intent URL so the user still has a
 * working share path. User dismissal returns silently — don't ambush them
 * with a popup after they chose to cancel.
 */
export async function nativeShareOrFallback(args: {
  title: string;
  text: string;
  url: string;
  fallbackUrl: string;
}): Promise<void> {
  if (!canNativeShare()) {
    window.open(args.fallbackUrl, "_blank", "noopener");
    return;
  }
  try {
    await navigator.share({ title: args.title, text: args.text, url: args.url });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return; // dismissed — leave them alone
    window.open(args.fallbackUrl, "_blank", "noopener");
  }
}
