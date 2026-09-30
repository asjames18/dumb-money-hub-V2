// Dumb AI Pro — shared bits between the client upgrade flow and the
// server verifier. The activation message MUST be byte-identical on both
// sides: the wallet signs it, the worker re-verifies it.

export const PRO_USD_THRESHOLD = 20;
export const PRO_DAYS = 30;

/** 80/20 split of the $20 pass: $16 burns, $4 funds the AI models. */
export const PRO_BURN_USD = 16;
export const PRO_MODEL_USD = 4;

/**
 * Client-side send targets. Antonio's rule: the pass costs $20, never
 * more — so the two targets sum to exactly $20.00 and the client adds no
 * markup on top. Volatility slack lives in the server minimums below,
 * not in the price the user pays.
 */
export const PRO_BURN_TARGET_USD = 16; // 80% of $20
export const PRO_MODEL_TARGET_USD = 4; // 20% of $20

/**
 * Server-side arrival minimums, valued at the mined block.
 *
 * Direct DUMB burn: $16 sent → ~$15.20 lands at dead (95%: 94% transfer
 * + 1% protocol burn). The $15 floor allows a small adverse price move
 * between quote and mining. The rest of the 6% tax is destroyed anyway
 * (entombed buckets), so ~$15.84 of the $16 is gone forever.
 */
export const PRO_BURN_MIN_USD = 15;
/**
 * Swap burn (any pay token except DUMB): $16 of input → worst case 8%
 * slippage guard × 5% DUMB arrival tax ≈ $13.98 of DUMB at dead. The
 * $13.50 floor keeps a legit worst-case execution passing while still
 * requiring the full $16 input.
 */
export const PRO_BURN_SWAP_MIN_USD = 13.5;

/**
 * Server-side model-leg arrival minimum: $4 sent → ~$3.76+ arrives
 * (~94% for a DUMB transfer; ~100% for untaxed tokens). The $3.50 floor
 * allows a small adverse price move between quote and mining.
 */
export const PRO_MODEL_MIN_USD = 3.5;

/**
 * Client-side send target for the burn leg when it goes through a PulseX
 * swap (any payment token except DUMB): the full $16 burn share goes in.
 * The 8% slippage guard on minOut protects execution; the server's
 * PRO_BURN_SWAP_MIN_USD reflects the post-slippage, post-tax arrival.
 */
export const PRO_BURN_SWAP_TARGET_USD = 16;

/**
 * Arrival ratios per leg: the burn leg lands ~95% at dead (94% transfer
 * leg + 1% protocol burn); the model-wallet leg lands ~94% (the 1%
 * protocol burn goes to dead, not the recipient).
 */
export const BURN_ARRIVAL_NUM = 95n;
export const BURN_ARRIVAL_DEN = 100n;
export const MODEL_ARRIVAL_NUM = 94n;
export const MODEL_ARRIVAL_DEN = 100n;

export function proActivationMessage(
  address: string,
  burnTxHash: string,
  modelTxHash: string,
): string {
  return (
    `Dumb Money Hub — Dumb AI Pro activation\n\n` +
    `Address: ${address}\n` +
    `Burn tx: ${burnTxHash}\n` +
    `Model tx: ${modelTxHash}\n\n` +
    `This only proves you own this wallet. It never moves funds.`
  );
}

/**
 * Short-lived Pro chat session TTL. The wallet signs the session message
 * below once per 30 minutes; each paid-chat request must carry a live
 * session signature, so a browser-supplied address alone can never unlock
 * paid models or spend someone else's Pro quota.
 */
export const PRO_SESSION_MS = 30 * 60_000;

/**
 * Message a Pro wallet signs to open a chat session. Byte-identical on
 * both sides — the wallet signs it, the worker re-verifies it. The expiry
 * is INSIDE the signed message, so it can't be stretched; an intercepted
 * session signature stops working the moment it lapses. Never moves funds.
 */
export function proSessionMessage(address: string, expiresAt: number): string {
  return (
    `Dumb Money Hub — Dumb AI Pro chat session\n\n` +
    `Address: ${address.toLowerCase()}\n` +
    `Expires: ${expiresAt}\n\n` +
    `This only proves you control this wallet for Pro chat. It never moves funds.`
  );
}

/** localStorage key carrying a scan report from the scanner to /ai. */
export const AI_SCAN_STORAGE_KEY = "dumb-ai-scan";

/** Compact scan summary the scanner hands to the AI explainer. The
 *  readings are the scanner's own on-chain checks — the model only
 *  interprets them. Shape is re-validated server-side. */
export type AiScanPayload = {
  symbol: string | null;
  address: string;
  taxBps: number | null;
  pair: string | null;
  checks: Array<{ label: string; status: string; detail: string }>;
};

/**
 * Tokens the Pro split accepts — exactly the hub's curated, on-chain
 * verified list (the swap box's buy-side set + DUMB). Addresses are
 * canonical in src/lib/pulsechain.ts (verified on-chain 2026-09-26/28);
 * duplicated here so the worker verifier stays dependency-light, like
 * src/routes/api/brag-image.ts does.
 *
 * Burn leg: the payment always ends up as DUMB at the dead address — a
 * direct transfer for DUMB, or a PulseX V2 swap with `to` = dead for
 * anything else (same shape as the scan pass's PLS fallback).
 * Model leg: a plain transfer of the payment token to the model wallet.
 */
export type ProPayToken = {
  symbol: string;
  /** null = native PLS. */
  address: `0x${string}` | null;
  decimals: number;
  /** Router path for T -> DUMB. Empty = direct DUMB transfer, no swap. */
  swapPath: `0x${string}`[];
};

const WPLS_L = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as const;
const DUMB_L = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D" as const;

export const PRO_PAY_TOKENS: readonly ProPayToken[] = [
  { symbol: "DUMB", address: DUMB_L, decimals: 18, swapPath: [] },
  { symbol: "PLS", address: null, decimals: 18, swapPath: [WPLS_L, DUMB_L] },
  {
    symbol: "HEX",
    address: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    decimals: 8,
    swapPath: ["0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39", DUMB_L],
  },
  {
    symbol: "INC",
    address: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
    decimals: 18,
    swapPath: ["0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d", DUMB_L],
  },
  {
    symbol: "WBTC",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    swapPath: ["0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", DUMB_L],
  },
  {
    symbol: "PLSX",
    address: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    decimals: 18,
    swapPath: ["0x95B303987A60C71504D99Aa1b13B4DA07b0790ab", DUMB_L],
  },
  {
    symbol: "TEDDY",
    address: "0xd6c31bA0754C4383A41c0e9DF042C62b5e918f6d",
    decimals: 18,
    swapPath: ["0xd6c31bA0754C4383A41c0e9DF042C62b5e918f6d", WPLS_L, DUMB_L],
  },
  {
    symbol: "SOLIDX",
    address: "0x8Da17Db850315A34532108f0f5458fc0401525f6",
    decimals: 18,
    swapPath: ["0x8Da17Db850315A34532108f0f5458fc0401525f6", WPLS_L, DUMB_L],
  },
  {
    symbol: "PCOCK",
    address: "0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F",
    decimals: 18,
    swapPath: ["0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F", WPLS_L, DUMB_L],
  },
  {
    symbol: "HELGO",
    address: "0x0567CA0dE35606E9C260CC2358404B11DE21DB44",
    decimals: 18,
    swapPath: ["0x0567CA0dE35606E9C260CC2358404B11DE21DB44", WPLS_L, DUMB_L],
  },
  {
    symbol: "PRVX",
    address: "0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11",
    decimals: 18,
    swapPath: ["0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11", WPLS_L, DUMB_L],
  },
  {
    symbol: "pTGC",
    address: "0x94534EeEe131840b1c0F61847c572228bdfDDE93",
    decimals: 18,
    swapPath: ["0x94534EeEe131840b1c0F61847c572228bdfDDE93", WPLS_L, DUMB_L],
  },
];

/** PulseX V2 router — the only contract a Pro swap leg may call. */
export const PRO_ROUTER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9";
