// Opt-in username registry (shared client/server shapes).
//
// The signed message format is the anti-spoofing contract between the card
// and the API: name + address + timestamp all travel inside the signed text,
// so a signature captured for one wallet/action can't be replayed for
// another. KEEP THE BUILDERS BELOW IN SYNC with src/server/username.ts.

export const USERNAME_MIN_LEN = 3;
export const USERNAME_MAX_LEN = 20;
/** Letters, digits, underscore, hyphen. No spaces, no emoji, no lookalike tricks. */
export const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
/** Signature freshness window (ms) — replay protection on the POST. */
export const USERNAME_SIG_WINDOW_MS = 10 * 60 * 1000;

export function isValidUsername(name: string): boolean {
  return (
    name.length >= USERNAME_MIN_LEN && name.length <= USERNAME_MAX_LEN && USERNAME_RE.test(name)
  );
}

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/** Signed when setting a name. Timestamp = Date.now() (ms epoch). */
export function buildSetUsernameMessage(name: string, address: string, timestamp: number): string {
  return `Set my Dumb Money Hub username to "${name}"\nAddress: ${address}\nTimestamp: ${timestamp}`;
}

/** Signed when clearing a name. Still signature-verified — a clear is a write. */
export function buildClearUsernameMessage(address: string, timestamp: number): string {
  return `Clear my Dumb Money Hub username\nAddress: ${address}\nTimestamp: ${timestamp}`;
}
