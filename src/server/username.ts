// Opt-in username registry: wallet-signed display names for the
// burn/donor leaderboards (raw addresses otherwise).
//
// Off-chain only: no contract, no gas, no custody. KV lives in the existing
// ANALYTICS_KV namespace under the `uname:` prefix — one namespace is enough
// for these tiny records, and the wrangler.patch.json binding needs no change.
// Wired in src/server.ts (not here): GET+POST /api/username.
//
// KV schema:
//   uname:addr:<lowercase 0x-address> -> JSON { name, updatedAt }
//   uname:name:<lowercase name>        -> lowercase 0x-address (uniqueness index)
//   uname:rl:<YYYY-MM-DD>:<iphash>     -> POST count (10/day per IP)
//
// Writes are check-then-set (KV has no transactions). A crash between the two
// puts can leave a dangling name index pointing at an addr record that still
// holds the old name — the next set/clear from the real owner heals it, and
// the name index never hands a name to a second wallet while the check runs.

import { verifyMessage } from "viem";

import {
  buildClearUsernameMessage,
  buildSetUsernameMessage,
  isValidAddress,
  isValidUsername,
  USERNAME_SIG_WINDOW_MS,
} from "../lib/username";
import type { AnalyticsKV } from "./analytics";

/** The real KV binding supports delete; the shared minimal type doesn't. */
type UsernameKV = AnalyticsKV & { delete(key: string): Promise<void> };

const MAX_BODY_BYTES = 2048;
const GET_ADDR_CAP = 100;
const POST_DAILY_CAP_PER_IP = 10;
const KV_TTL_SECONDS = 365 * 24 * 3600; // usernames persist 1 year, refreshed on write

type Env = { ANALYTICS_KV?: UsernameKV };

// Same env plumbing as analytics.ts: nitro's lazyService wrapper calls the
// SSR fetch with the request only, so bindings come from request.runtime or
// globalThis.__env__.
function getEnv(request: Request): Env {
  const viaRequest = (request as unknown as { runtime?: { cloudflare?: { env?: Env } } }).runtime
    ?.cloudflare?.env;
  if (viaRequest) return viaRequest;
  const viaGlobal = (globalThis as unknown as { __env__?: Env }).__env__;
  if (viaGlobal) return viaGlobal;
  return {};
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/** FNV-1a — just a rate-limit bucket key, not security. Never log the raw IP. */
function hashIp(ip: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function checkRateLimit(kv: AnalyticsKV, request: Request): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = `uname:rl:${dayKey()}:${hashIp(ip)}`;
  const count = (Number.parseInt((await kv.get(key)) ?? "0", 10) || 0) + 1;
  if (count > POST_DAILY_CAP_PER_IP) return false;
  await kv.put(key, String(count), { expirationTtl: 2 * 24 * 3600 });
  return true;
}

/**
 * GET /api/username?addresses=0x..,0x.. — batch-resolve display names for
 * leaderboards. Returns { "<lowercase-address>": "<name>" }; unknown
 * addresses are simply absent.
 */
export async function handleUsernameGet(request: Request): Promise<Response> {
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return json({ error: "username registry not configured" }, 503);
    const param = new URL(request.url).searchParams.get("addresses") ?? "";
    const addrs = [
      ...new Set(
        param
          .split(",")
          .map((a) => a.trim().toLowerCase())
          .filter((a) => isValidAddress(a)),
      ),
    ].slice(0, GET_ADDR_CAP);
    const out: Record<string, string> = {};
    await Promise.all(
      addrs.map(async (addr) => {
        const raw = await kv.get(`uname:addr:${addr}`);
        if (!raw) return;
        try {
          const rec = JSON.parse(raw) as { name?: unknown };
          if (typeof rec.name === "string" && isValidUsername(rec.name)) {
            out[addr] = rec.name;
          }
        } catch {
          // Malformed record — treat as absent.
        }
      }),
    );
    return json(out, 200);
  } catch {
    return json({ error: "unavailable" }, 500);
  }
}

interface UsernamePostBody {
  address?: unknown;
  username?: unknown;
  timestamp?: unknown;
  signature?: unknown;
}

/**
 * POST /api/username — set or clear the caller's username.
 * Body: { address, username, timestamp, signature }.
 * Empty/missing username = clear (still signature-verified).
 * Errors: 400 validation, 401 bad/expired signature, 409 name taken,
 * 429 rate-limited, 503 KV unavailable.
 */
export async function handleUsernamePost(request: Request): Promise<Response> {
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return json({ error: "username registry not configured" }, 503);
    const text = await request.text();
    if (!text || text.length > MAX_BODY_BYTES) {
      return json({ error: "bad request" }, 400);
    }
    const body = JSON.parse(text) as UsernamePostBody;
    const address = typeof body.address === "string" ? body.address : "";
    const signature = typeof body.signature === "string" ? body.signature : "";
    const timestamp = typeof body.timestamp === "number" ? body.timestamp : NaN;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!isValidAddress(address) || !signature || !Number.isFinite(timestamp)) {
      return json({ error: "address, signature and timestamp are required" }, 400);
    }
    if (Math.abs(Date.now() - timestamp) > USERNAME_SIG_WINDOW_MS) {
      return json({ error: "signature expired — sign again" }, 401);
    }
    const clearing = username === "";
    if (!clearing && !isValidUsername(username)) {
      return json({ error: "username must be 3–20 characters: letters, numbers, _ or -" }, 400);
    }
    if (!(await checkRateLimit(kv, request))) {
      return json({ error: "too many username changes — try again tomorrow" }, 429);
    }

    // The signed text binds name + address + timestamp together.
    const message = clearing
      ? buildClearUsernameMessage(address, timestamp)
      : buildSetUsernameMessage(username, address, timestamp);
    let ok = false;
    try {
      ok = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      ok = false;
    }
    if (!ok) {
      return json({ error: "signature does not match this wallet and message" }, 401);
    }

    const addrKey = `uname:addr:${address.toLowerCase()}`;
    const existingRaw = await kv.get(addrKey);
    let oldName = "";
    if (existingRaw) {
      try {
        const rec = JSON.parse(existingRaw) as { name?: unknown };
        if (typeof rec.name === "string") oldName = rec.name;
      } catch {
        oldName = "";
      }
    }

    if (clearing) {
      if (oldName) await kv.delete(`uname:name:${oldName.toLowerCase()}`);
      await kv.delete(addrKey);
      return json({ ok: true, cleared: true }, 200);
    }

    // Uniqueness, case-insensitive: a live index entry owned by another
    // wallet blocks the claim.
    const nameKey = `uname:name:${username.toLowerCase()}`;
    const takenBy = await kv.get(nameKey);
    if (takenBy && takenBy !== address.toLowerCase()) {
      return json({ error: `the name "${username}" is already taken` }, 409);
    }

    await kv.put(addrKey, JSON.stringify({ name: username, updatedAt: Date.now() }), {
      expirationTtl: KV_TTL_SECONDS,
    });
    await kv.put(nameKey, address.toLowerCase(), { expirationTtl: KV_TTL_SECONDS });
    if (oldName && oldName.toLowerCase() !== username.toLowerCase()) {
      await kv.delete(`uname:name:${oldName.toLowerCase()}`);
    }
    return json({ ok: true, username }, 200);
  } catch {
    return json({ error: "unavailable" }, 500);
  }
}
