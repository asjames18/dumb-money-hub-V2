// Public burn pledges: wallet-signed public promises, off-chain.
//
// Off-chain only: no contract, no gas, no custody. KV lives in the existing
// ANALYTICS_KV namespace under the `pledge:` prefix — one namespace is enough
// for these tiny records, and the wrangler.patch.json binding needs no change.
// Wired in src/server.ts (not here): GET+POST /api/pledges + /api/pledge.
//
// KV schema:
//   pledge:<lowercase 0x-address> -> JSON { name, token, amount, pledgedAt }
//   pledge:index                   -> JSON string[] of lowercase addresses
//   pledge:rl:<YYYY-MM-DD>:<iphash> -> POST count (10/day per IP)
//
// A pledge is NEVER presented as a burn anywhere. The client marks it
// redeemed only from the verified on-chain voluntary-burn sums. Pledges
// expire after 30 days (KV TTL + a pledgedAt check on read). One pledge per
// wallet — a new pledge replaces the old one.

import { verifyMessage } from "viem";

import { isValidAddress, isValidUsername } from "../lib/username";
import {
  buildPledgeMessage,
  isValidPledgeAmount,
  isValidPledgeToken,
  PLEDGE_SIG_WINDOW_MS,
  PLEDGE_TTL_SECONDS,
  PLEDGE_WINDOW_MS,
  type Pledge,
} from "../lib/pledges";
import type { AnalyticsKV } from "./analytics";

const MAX_BODY_BYTES = 2048;
const POST_DAILY_CAP_PER_IP = 10;

/** The real KV binding supports delete; the shared minimal type doesn't. */
type PledgeKV = AnalyticsKV & { delete(key: string): Promise<void> };
type Env = { ANALYTICS_KV?: PledgeKV };

// Same env plumbing as analytics.ts / username.ts: nitro's lazyService
// wrapper calls the SSR fetch with the request only, so bindings come from
// request.runtime or globalThis.__env__.
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
  const key = `pledge:rl:${dayKey()}:${hashIp(ip)}`;
  const count = (Number.parseInt((await kv.get(key)) ?? "0", 10) || 0) + 1;
  if (count > POST_DAILY_CAP_PER_IP) return false;
  await kv.put(key, String(count), { expirationTtl: 2 * 24 * 3600 });
  return true;
}

function isExpired(rec: { pledgedAt?: unknown }): boolean {
  return typeof rec.pledgedAt !== "number" || Date.now() - rec.pledgedAt > PLEDGE_WINDOW_MS;
}

async function readIndex(kv: PledgeKV): Promise<string[]> {
  const raw = await kv.get("pledge:index");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((a) => isValidAddress(a)) : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/pledges — the active public pledges. Returns
 * { pledges: Pledge[] } (newest first). Expired rows are pruned on read.
 * Every pledge is labeled a promise, never a burn — the client renders the
 * redeemed state from verified on-chain sums.
 */
export async function handlePledgesGet(request: Request): Promise<Response> {
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return json({ error: "pledge board not configured" }, 503);
    const index = await readIndex(kv);
    const live: string[] = [];
    const pledges: Pledge[] = [];
    for (const addr of index) {
      const raw = await kv.get(`pledge:${addr}`);
      if (!raw) continue;
      let rec: { name?: unknown; token?: unknown; amount?: unknown; pledgedAt?: unknown };
      try {
        rec = JSON.parse(raw) as typeof rec;
      } catch {
        await kv.delete(`pledge:${addr}`);
        continue;
      }
      if (isExpired(rec) || !isValidPledgeToken(rec.token) || !isValidPledgeAmount(rec.amount)) {
        await kv.delete(`pledge:${addr}`);
        continue;
      }
      live.push(addr);
      // Resolve the opt-in display name server-side — one namespace read.
      let name: string | null = null;
      try {
        const unameRaw = await kv.get(`uname:addr:${addr}`);
        if (unameRaw) {
          const unameRec = JSON.parse(unameRaw) as { name?: unknown };
          if (typeof unameRec.name === "string" && isValidUsername(unameRec.name)) {
            name = unameRec.name;
          }
        }
      } catch {
        name = null;
      }
      pledges.push({
        address: addr,
        name,
        token: rec.token,
        amount: rec.amount,
        pledgedAt: rec.pledgedAt as number,
      });
    }
    if (live.length !== index.length) {
      await kv.put("pledge:index", JSON.stringify(live), {
        expirationTtl: PLEDGE_TTL_SECONDS,
      });
    }
    pledges.sort((a, b) => b.pledgedAt - a.pledgedAt);
    return json({ pledges }, 200);
  } catch {
    return json({ error: "unavailable" }, 500);
  }
}

interface PledgePostBody {
  address?: unknown;
  token?: unknown;
  amount?: unknown;
  timestamp?: unknown;
  signature?: unknown;
}

/**
 * POST /api/pledge — publish (or replace) the caller's public burn pledge.
 * Body: { address, token, amount, timestamp, signature }.
 * The signed text binds token + amount + address + timestamp together.
 * Errors: 400 validation, 401 bad/expired signature, 429 rate-limited,
 * 503 KV unavailable.
 */
export async function handlePledgePost(request: Request): Promise<Response> {
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return json({ error: "pledge board not configured" }, 503);
    const text = await request.text();
    if (!text || text.length > MAX_BODY_BYTES) {
      return json({ error: "bad request" }, 400);
    }
    const body = JSON.parse(text) as PledgePostBody;
    const address = typeof body.address === "string" ? body.address : "";
    const signature = typeof body.signature === "string" ? body.signature : "";
    const timestamp = typeof body.timestamp === "number" ? body.timestamp : NaN;
    if (
      !isValidAddress(address) ||
      !isValidPledgeToken(body.token) ||
      !isValidPledgeAmount(body.amount) ||
      !signature ||
      !Number.isFinite(timestamp)
    ) {
      return json({ error: "address, token, amount, signature and timestamp are required" }, 400);
    }
    if (Math.abs(Date.now() - timestamp) > PLEDGE_SIG_WINDOW_MS) {
      return json({ error: "signature expired — sign again" }, 401);
    }
    if (!(await checkRateLimit(kv, request))) {
      return json({ error: "too many pledges — try again tomorrow" }, 429);
    }

    let ok = false;
    try {
      ok = await verifyMessage({
        address: address as `0x${string}`,
        message: buildPledgeMessage(body.token, body.amount, address, timestamp),
        signature: signature as `0x${string}`,
      });
    } catch {
      ok = false;
    }
    if (!ok) {
      return json({ error: "signature does not match this wallet and message" }, 401);
    }

    const addrLc = address.toLowerCase();
    const now = Date.now();
    await kv.put(
      `pledge:${addrLc}`,
      JSON.stringify({
        token: body.token,
        amount: body.amount,
        pledgedAt: now,
      }),
      { expirationTtl: PLEDGE_TTL_SECONDS },
    );
    const index = await readIndex(kv);
    if (!index.includes(addrLc)) index.push(addrLc);
    await kv.put("pledge:index", JSON.stringify(index), {
      expirationTtl: PLEDGE_TTL_SECONDS,
    });
    return json({ ok: true, pledgedAt: now }, 200);
  } catch {
    return json({ error: "unavailable" }, 500);
  }
}
