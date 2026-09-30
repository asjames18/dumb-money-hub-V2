// Shared per-page <head> metadata. Every public route uses this so link
// previews (X, Telegram, iMessage — the surfaces the share buttons post to)
// show the page's own title, description, and URL instead of silently
// inheriting the homepage's tags from the root route. Verified live
// 2026-09-27: shared /burn links were previewing og:url="/" and the
// homepage's twitter:title.

import {
  DAMP,
  DUMB,
  HELGO,
  HEX,
  INC,
  PCOCK,
  PLSX,
  PRVX,
  PTGC,
  SOLIDX,
  TEDDY,
  WBTC,
  WPLS,
} from "./pulsechain";

export const SITE_URL = "https://dumbmoneypulse.melanatedintech.com";

export function pageMeta(path: `/${string}` | "/", title: string, description: string) {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

// Curated share-link symbols for the /scan unfurl (2026-09-29). Shared report
// links (/scan?token=0x…) personalize ONLY the symbol — never a verdict — so a
// cached preview card can never go stale or lie about a result. Only the
// site's verified curated tokens get named (the ones most likely to be
// shared); every other address falls back to the generic scanner card, with
// zero RPC at crawl time. Symbols are literals — the UI's own display symbols
// (TEDDY per the site's convention, not the on-chain "TEDDY BEAR ㉾"), never
// user input — so nothing attacker-controlled lands in <head>. The ?token=
// param itself is only ever a map key (lowercased, format-validated first).
const SHARE_SYMBOLS: Record<string, string> = {
  [DUMB.toLowerCase()]: "DUMB",
  [DAMP.toLowerCase()]: "DAMP",
  [WPLS.toLowerCase()]: "WPLS",
  [HEX.toLowerCase()]: "HEX",
  [TEDDY.toLowerCase()]: "TEDDY",
  [SOLIDX.toLowerCase()]: "SOLIDX",
  [PCOCK.toLowerCase()]: "PCOCK",
  [HELGO.toLowerCase()]: "HELGO",
  [INC.toLowerCase()]: "INC",
  [PLSX.toLowerCase()]: "PLSX",
  [PRVX.toLowerCase()]: "PRVX",
  [PTGC.toLowerCase()]: "pTGC",
  [WBTC.toLowerCase()]: "WBTC",
};

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export function shareSymbolFor(token: unknown): string | undefined {
  if (typeof token !== "string" || !ADDR_RE.test(token)) return undefined;
  return SHARE_SYMBOLS[token.toLowerCase()];
}
