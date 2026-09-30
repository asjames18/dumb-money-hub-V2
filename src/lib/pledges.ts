// Public burn pledges (shared client/server shapes).
//
// A pledge is a wallet-signed PUBLIC PROMISE — it is never presented as a
// burn. The card marks a pledge redeemed only when that wallet's verified
// on-chain voluntary burns reach the pledged amount (arrival-leg accounting:
// ~95% of DUMB / ~98% of DAMP sent reaches the dead address — see the
// verified tax math in BUILD_LOOP.md backlog #1).
//
// KEEP buildPledgeMessage IN SYNC with src/server/pledges.ts.

export type PledgeToken = "DUMB" | "DAMP";

export interface Pledge {
  /** Lowercase 0x address of the pledging wallet. */
  address: string;
  /** Opt-in display name (null = show a shortened address). */
  name: string | null;
  token: PledgeToken;
  /** Whole raw tokens pledged (integer string, no decimals). */
  amount: string;
  /** ms epoch when the pledge was signed. */
  pledgedAt: number;
}

/** Anti-dust floor and absurdity ceiling, in whole tokens. */
export const PLEDGE_MIN_TOKENS = 1_000;
export const PLEDGE_MAX_TOKENS = 10_000_000_000;

/** Pledges expire after 30 days without redemption. */
export const PLEDGE_TTL_SECONDS = 30 * 24 * 3600;
export const PLEDGE_WINDOW_MS = PLEDGE_TTL_SECONDS * 1000;

/** Signature freshness window (ms) — replay protection on the POST. */
export const PLEDGE_SIG_WINDOW_MS = 10 * 60 * 1000;

export function isValidPledgeToken(t: unknown): t is PledgeToken {
  return t === "DUMB" || t === "DAMP";
}

export function isValidPledgeAmount(s: unknown): s is string {
  if (typeof s !== "string" || !/^[0-9]+$/.test(s)) return false;
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= PLEDGE_MIN_TOKENS && n <= PLEDGE_MAX_TOKENS;
}

/** Signed when making (or replacing) a pledge. Timestamp = Date.now() (ms). */
export function buildPledgeMessage(
  token: PledgeToken,
  amount: string,
  address: string,
  timestamp: number,
): string {
  return `I pledge to burn ${amount} ${token} within 30 days\nAddress: ${address}\nTimestamp: ${timestamp}`;
}

/** Arrival-leg factor: what fraction of SENT tokens the chain-verified
 *  voluntary-burn sums count (the transfer tax takes the rest). */
export function pledgeArrivalFactor(token: PledgeToken): { num: bigint; den: bigint } {
  return token === "DUMB" ? { num: 95n, den: 100n } : { num: 98n, den: 100n };
}

/** True when verified voluntary burns (arrival-leg sums, 18-dec wei) cover
 *  the pledged amount of whole tokens. */
export function pledgeRedeemed(
  pledge: Pick<Pledge, "token" | "amount">,
  burnedWei: bigint,
): boolean {
  const { num, den } = pledgeArrivalFactor(pledge.token);
  const pledgedWei = BigInt(pledge.amount) * 10n ** 18n;
  return burnedWei * den >= pledgedWei * num;
}
