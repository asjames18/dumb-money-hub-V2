# Signed Sync — wallet-signature data sync (SPEC, not built)

Status: spec only (2026-10-04, Antonio: "local first then" — localStorage ships first,
signed sync is the fast follow). Do not build without Antonio's explicit go-ahead.

## Goal

Let a user prove they own a wallet with one signature, then sync their hub data
(watchlist first) across devices. No accounts, no emails, no passwords, no custody.
The wallet remains the only signing layer; the site never sees keys.

## Reuse, don't reinvent

`src/lib/ai/pro.ts` + `src/server/ai-pro.ts` already implement the pattern:
- `proSessionMessage(address, expiresAt)` — byte-identical message on both sides,
  expiry INSIDE the signed text so it can't be stretched.
- Server-side `verifyMessage` recovery — a browser-supplied address alone proves nothing.
Mirror this exactly for sync sessions.

## Design

**Signed message** (new `syncSessionMessage` in `src/lib/sync.ts`):
```
Dumb Money Hub — device sync

Address: 0x…
Nonce: <server-issued, single-use>
Issued: <unix ms>
Expires: <unix ms, issued + 5 min>
Chain: 369
Site: dumbmoneypulse.melanatedintech.com

This only proves you control this wallet so your saved data can sync.
It never moves funds.
```
Domain + chain id inside the message kill cross-site replay. Nonce is single-use
(KV, 5-min TTL). 60s clock skew allowed, same as Pro sessions.

**Flow:**
1. User clicks "Sync across devices" → `GET /api/sync/nonce?address=` returns `{nonce}`.
2. Wallet signs the message (wagmi `signMessage` — user signs in their own wallet).
3. `POST /api/sync/session {address, message, signature}` → server re-verifies via
   viem `verifyMessage`, checks nonce unused + unexpired, then returns an opaque
   session token (32 random bytes, KV `sess:{token}` → address, 30-day TTL).
4. Client keeps the token in memory + sessionStorage (tab lifetime, same as /stats
   passphrase pattern). Every sync call sends `Authorization: Bearer <token>`.

**Storage:** existing `ANALYTICS_KV` namespace (or a new `dump-money-sync` ns —
   decide at build time). Key `sync:{address-lower}` → JSON `{watchlist: [...], updatedAt}`.
   Watchlist entries carry per-entry `updatedAt`; merge is last-write-wins per entry,
   so two devices don't clobber each other.

**What's synced (v1):** watchlist entries + labels only. Snapshots/diffs stay
   computed client-side from live chain reads — the server never stores derived data.

**Fallback:** localStorage remains fully functional when signed out. Signing in
   merges local → cloud (local wins ties on first merge, then per-entry timestamps).

## Security notes

- Nonce single-use + 5-min expiry; session token 30 days, re-sign to refresh.
- Rate-limit nonce issuance per IP (same 200/day global-cap pattern as /api/feedback).
- Never accept an address without a valid signature over the exact message.
- Watchlist contents (watched addresses + labels) are stored server-side — disclose
  this honestly in the UI ("synced to the hub so it follows you; only you can read
  it with your wallet"). Labels could reveal intent — no analytics on sync keys.
- No new external dependencies. No contract calls. No custody.

## Build checklist (when approved)

1. `src/lib/sync.ts` — message builder, nonce/session client, merge logic.
2. `src/server/sync.ts` — nonce + session + get/put endpoints, verifyMessage,
   KV wiring via the same `request.runtime.cloudflare.env` pattern as analytics.
3. Wire into `src/routes/api/` (check how ai-pro routes are registered first).
4. UI: "Sync across devices" button in the WalletWatch panel + signed-in indicator.
5. Tests: message byte-identity, nonce replay rejection, expired-message rejection,
   wrong-address signature rejection, merge tie-breaking.
6. `npx tsc --noEmit`, eslint, build, deploy, live verify with a real signature.
