// First-party anonymous analytics: ping ingestion + passphrase-gated aggregates.
//
// Privacy posture (same as before, enforced in code):
// - No cookies, no fingerprinting, no wallet addresses, no IP storage — ever.
// - Pageview payloads are { path, referrer, ts }; event payloads add an
//   allowlisted `event` name. Country comes from Cloudflare's cf-ipcountry
//   header (an aggregate label, not an identifier).
// - Numbers are directional: ad blockers and privacy tools hide some visitors.
// - Every failure path is silent: analytics must never break the app.

const MAX_BODY_BYTES = 2048;
const MAX_PATH_LEN = 200;
const MAX_REFERRER_LEN = 500;

// Allowlisted event names. The client may only send these; anything else is
// silently dropped. Keep this list short and deliberate. Naming: start/attempt
// events pair with completion events so funnels (drop-off) can be computed;
// err_* events are fixed categories only — never free text, so nothing
// identifying can leak through error tracking. err_scan/err_quote cover the
// RPC-failure cases users actually hit (scanner + swap quotes).
export const ANALYTICS_EVENTS = new Set([
  "quick_scan",
  "deep_scan",
  "scan_started",
  "pass_burn_dumb",
  "pass_burn_pls",
  "burn_voluntary",
  "burn_voluntary_pls",
  "burn_started",
  "swap_quote",
  "swap_attempt",
  "swap_confirmed",
  "swap_failed",
  "wallet_connect",
  "share_tap",
  "watchlist_toggle",
  "bag_scan",
  "copy_contract",
  "add_to_wallet",
  "raid_play",
  "rating_submitted",
  "brag_share",
  "err_quote",
  "err_tx",
  "err_scan",
]);

// Counters expire after 90 days — rolling window, no permanent store.
const KV_TTL_SECONDS = 90 * 24 * 3600;

// Minimal structural type for the KV binding (no @cloudflare/workers-types dep).
export type AnalyticsKV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  list(opts: { prefix: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
};

export type AnalyticsEnv = {
  ANALYTICS_KV?: AnalyticsKV;
  ANALYTICS_PASS?: string;
};

// The SSR service is invoked through nitro's lazyService wrapper, which calls
// fetch(request) with ONLY the request — the worker's (request, env, ctx)
// args never reach this module. But nitro's cloudflare preset sets
// globalThis.__env__ = env on every fetch AND augments the request with
// request.runtime.cloudflare = { env, context }. Env (bindings + secrets) is
// identical for every request to this worker, so either source is correct.
function getEnv(request: Request): AnalyticsEnv {
  const viaRequest = (request as unknown as { runtime?: { cloudflare?: { env?: AnalyticsEnv } } })
    .runtime?.cloudflare?.env;
  if (viaRequest) return viaRequest;
  const viaGlobal = (globalThis as unknown as { __env__?: AnalyticsEnv }).__env__;
  if (viaGlobal) return viaGlobal;
  return {};
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function incr(kv: AnalyticsKV, key: string): Promise<void> {
  const cur = Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
  await kv.put(key, String(cur + 1), { expirationTtl: KV_TTL_SECONDS });
}

function isValidPing(value: unknown): value is {
  path: string;
  referrer: string;
  ts: number;
  event?: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const { path, referrer, ts, event } = v;
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.length > MAX_PATH_LEN ||
    typeof referrer !== "string" ||
    referrer.length > MAX_REFERRER_LEN ||
    typeof ts !== "number" ||
    !Number.isFinite(ts)
  ) {
    return false;
  }
  if (event !== undefined && (typeof event !== "string" || !ANALYTICS_EVENTS.has(event))) {
    return false;
  }
  return true;
}

/** POST /api/ping — ingest a pageview or allowlisted event. Always 204. */
export async function handlePing(request: Request): Promise<Response> {
  try {
    const text = await request.text();
    if (!text || text.length > MAX_BODY_BYTES) {
      return new Response(null, { status: 204 });
    }
    const payload: unknown = JSON.parse(text);
    if (!isValidPing(payload)) {
      return new Response(null, { status: 204 });
    }
    const isEvent = typeof payload.event === "string";
    // Keep the structured log line: the telemetry-query pattern in AGENTS.md
    // aggregates these as a fallback if KV is ever unavailable.
    const kv = getEnv(request).ANALYTICS_KV;
    const day = dayKey();
    // Abuse brake: per-visitor daily event cap, applied ONLY to the events
    // that feed the PUBLIC /api/scan-stats counters (deep_scan,
    // pass_burn_dumb, pass_burn_pls) rendered on the site ("N scan passes
    // bought — at least M DUMB destroyed"). The client fires those events
    // after its own on-chain verification, but /api/ping is unauthenticated
    // — anyone can POST the allowlisted names and print invented community
    // activity on the public site. A per-visitor (salted SHA-256 IP hash —
    // never stored, logged, or reversible) daily cap bounds a single-source
    // flood to MAX_EVENTS_PER_IP_PER_DAY. Other events feed only Antonio's
    // passphrase-gated /stats (directional data, already disclaimed), so
    // they skip the extra KV writes. Still 204 when the budget is spent;
    // fail-open on KV hiccup — the cap is a brake on abuse, never a gate on
    // legitimate traffic. Limitation by construction: on direct (non-CDN)
    // requests cf-connecting-ip is client-spoofable, so this is
    // defense-in-depth for the public counters, not a proof of humanity.
    const eventName = payload.event;
    const isPublicStatEvent =
      typeof eventName === "string" && (SCAN_STATS_EVENTS as readonly string[]).includes(eventName);
    if (isEvent && kv && isPublicStatEvent) {
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      const ipHash = (await sha256hex(`dumb-ping-v1|${day}|${ip}`)).slice(0, 32);
      if (!(await allowEvent(kv, day, ipHash).catch(() => true))) {
        return new Response(null, { status: 204 });
      }
    }
    console.log(
      JSON.stringify(
        isEvent
          ? { src: "event", event: payload.event, path: payload.path, ts: payload.ts }
          : {
              src: "pageview",
              path: payload.path,
              referrer: payload.referrer,
              ts: payload.ts,
            },
      ),
    );
    // KV counter writes are awaited (no waitUntil reaches this module), but
    // they can never fail the request: every failure path stays silent.
    if (kv) {
      if (isEvent) {
        // ev: keys are bounded by the 24-name allowlist — no cardinality risk.
        await incr(kv, `ev:${day}:${payload.event}`).catch(() => undefined);
      } else {
        // cc: is keyed by cf-ipcountry, which is client-spoofable on direct
        // requests — non-2-char values collapse into "XX" so an attacker
        // cannot mint unbounded cc: keys. pv: gets the same treatment via
        // the distinct-path registry below.
        const country = request.headers.get("cf-ipcountry");
        const ccKey = `cc:${day}:${country && COUNTRY_RE.test(country) ? country : "XX"}`;
        const allowPv = await allowNewPath(kv, day, payload.path).catch(() => true);
        const jobs: Promise<void>[] = allowPv
          ? [incr(kv, `pv:${day}:${payload.path}`), incr(kv, ccKey)]
          : [incr(kv, ccKey)];
        await Promise.all(jobs).catch(() => undefined);
      }
    }
  } catch {
    // fall through to 204
  }
  return new Response(null, { status: 204 });
}

// --- Public write-path hardening -----------------------------------------
// POST /api/ping is a public, unauthenticated write path. Two of its keys
// had UNBOUNDED cardinality: pv:{day}:{path} (any "/" path up to 200 chars)
// and cc:{day}:{country} (cf-ipcountry is client-spoofable on direct
// requests). A junk-path flood could burn KV write quota and silently crowd
// real paths out of /api/analytics' 1000-key list reads — poisoning
// Antonio's own stats with invented traffic. The fb: path already had a
// 200/day cap; ev: keys are bounded by the event allowlist. A third vector
// had UNBOUNDED volume: the three SCAN_STATS_EVENTS feed the PUBLIC
// /api/scan-stats counters rendered on the site, so an event-name flood
// could print invented community activity. The three public scan-stats
// events now carry a per-visitor daily cap (salted IP hash, 1-day TTL);
// other events feed only the passphrase-gated /stats and skip the brake. Guards are fail-open: any hiccup
// counts the ping exactly as before — the cap is a brake on abuse, never a
// gate on legitimate traffic.

// Distinct-path registry: at most this many new pv: keys per day. The site
// has ~25 real routes; 400 leaves wide headroom for legit growth while
// bounding flood damage to 400 registry writes + 400 counter writes a day.
const MAX_DISTINCT_PATHS_PER_DAY = 400;
// Event beacons per visitor (salted IP hash) per day, applied only to the
// three public scan-stats events. A real power visitor fires on the order
// of ~20 events/day; 25 bounds a single-source inflation script while
// leaving humans headroom. Shared-NAT offices may undercount — the public
// counters already disclose that privacy tools undercount, and
// undercounting is the fail-safe direction.
const MAX_EVENTS_PER_IP_PER_DAY = 25;
// Real Cloudflare country codes are 2 alphanumerics ("US", "XX", "T1" for Tor).
const COUNTRY_RE = /^[A-Z0-9]{2}$/;

/** True unless this is a NEW path and the day's distinct-path budget is
 * spent. Fail-open: any hiccup returns true. */
async function allowNewPath(kv: AnalyticsKV, day: string, path: string): Promise<boolean> {
  const regKey = `pvreg:${day}`;
  let reg: string[] = [];
  try {
    const raw = await kv.get(regKey);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        reg = parsed.filter((p): p is string => typeof p === "string");
      }
    }
  } catch {
    return true;
  }
  if (reg.includes(path)) return true;
  if (reg.length >= MAX_DISTINCT_PATHS_PER_DAY) return false;
  reg.push(path);
  try {
    await kv.put(regKey, JSON.stringify(reg), { expirationTtl: 2 * 24 * 3600 });
  } catch {
    // Registry write failed — still count this ping. The cap is a brake,
    // not a gate.
  }
  return true;
}

/** Salted SHA-256 hex of the visitor's IP + day — irreversible, never
 * stored or logged raw. Same privacy pattern as the Dumb AI rate limits. */
async function sha256hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** True unless this visitor already sent its daily event budget. The key
 * expires in 1 day (not the 90-day analytics TTL). Fail-open: any hiccup
 * returns true — the cap is a brake on abuse, never a gate. */
async function allowEvent(kv: AnalyticsKV, day: string, ipHash: string): Promise<boolean> {
  const key = `pingle:${day}:${ipHash}`;
  try {
    const cur = Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
    if (cur >= MAX_EVENTS_PER_IP_PER_DAY) return false;
    await kv.put(key, String(cur + 1), { expirationTtl: 86_400 });
    return true;
  } catch {
    return true;
  }
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  // Constant-time comparison without relying on SubtleCrypto.timingSafeEqual
  // (present at runtime in Workers, but absent from the TS DOM lib).
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}

/**
 * GET /api/analytics — passphrase-gated aggregates for the private /stats page.
 * The passphrase is verified server-side against the ANALYTICS_PASS Worker
 * secret (never in code, never logged). Wrong/missing passphrase → 401.
 */
export async function handleAnalytics(request: Request): Promise<Response> {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  try {
    const secret = getEnv(request).ANALYTICS_PASS;
    const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!secret || !given || !(await safeEqual(given, secret))) {
      return json({ error: "unauthorized" }, 401);
    }
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) {
      return json({ error: "analytics not configured" }, 503);
    }
    const days: string[] = [];
    for (let i = 0; i < 30; i++) {
      days.push(dayKey(new Date(Date.now() - i * 86_400_000)));
    }
    const daySet = new Set(days);
    const byDay: Record<string, number> = {};
    const byPath: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    for (const prefix of ["pv:", "ev:", "cc:"] as const) {
      const listed = await kv.list({ prefix, limit: 1000 });
      for (const k of listed.keys) {
        const val = Number.parseInt((await kv.get(k.name)) ?? "0", 10) || 0;
        if (!val) continue;
        // Key shape: "<prefix><YYYY-MM-DD>:<rest>"
        const day = k.name.slice(prefix.length, prefix.length + 10);
        if (!daySet.has(day)) continue;
        const rest = k.name.slice(prefix.length + 11);
        if (!rest) continue;
        if (prefix === "pv:") {
          byPath[rest] = (byPath[rest] ?? 0) + val;
          byDay[day] = (byDay[day] ?? 0) + val;
        } else if (prefix === "ev:") {
          byEvent[rest] = (byEvent[rest] ?? 0) + val;
        } else {
          byCountry[rest] = (byCountry[rest] ?? 0) + val;
        }
      }
    }
    return json({ days, byDay, byPath, byEvent, byCountry, feedback: await readFeedback(kv) }, 200);
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}

const SCAN_STATS_EVENTS = ["deep_scan", "pass_burn_dumb", "pass_burn_pls"] as const;

/**
 * GET /api/scan-stats — PUBLIC 30-day aggregates of deep-scan activity.
 * Unlike /api/analytics this needs no passphrase: it returns only three
 * coarse counts (deep scans completed, scan passes bought, and a
 * conservative DUMB-destroyed floor) — no paths, countries, or feedback.
 * Every pass burn is verified on-chain at >=100,000 DUMB to dead before the
 * pass exists (verifyScanBurn / verifyPlsScanBurn), so the floor is honest.
 *
 * Reads are direct key gets (ev:<YYYY-MM-DD>:<event>) instead of a kv.list
 * scan: exactly 3 events × 30 days = 90 reads per request, and the list's
 * 1000-key cap can never silently drop the newest days as the ev: namespace
 * grows — a public honesty surface must not be able to undercount itself.
 */
export async function handleScanStats(request: Request): Promise<Response> {
  const json = (body: unknown, status: number, cacheSeconds: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${cacheSeconds}`,
      },
    });
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return json({ error: "unavailable" }, 503, 60);
    const counts: Record<string, number> = {};
    await Promise.all(
      SCAN_STATS_EVENTS.map(async (event) => {
        let total = 0;
        for (let i = 0; i < 30; i++) {
          const raw = await kv.get(`ev:${dayKey(new Date(Date.now() - i * 86_400_000))}:${event}`);
          total += Number.parseInt(raw ?? "0", 10) || 0;
        }
        counts[event] = total;
      }),
    );
    const passBurns = (counts["pass_burn_dumb"] ?? 0) + (counts["pass_burn_pls"] ?? 0);
    return json(
      {
        window_days: 30,
        deep_scans: counts["deep_scan"] ?? 0,
        pass_burns: passBurns,
        dumb_destroyed_min: passBurns * 100_000,
      },
      200,
      600,
    );
  } catch {
    return json({ error: "unavailable" }, 503, 60);
  }
}

/** Newest-first feedback inbox for the private /stats page. Messages are
 * truncated for the list view; the full text lives in KV. */
async function readFeedback(
  kv: AnalyticsKV,
): Promise<{ ts: string; category: string; message: string; page: string }[]> {
  const listed = await kv.list({ prefix: "fb:", limit: 100 });
  const items: { name: string; ts: string; category: string; message: string; page: string }[] = [];
  for (const k of listed.keys) {
    // Key shape: "fb:<YYYY-MM-DD>:<id>" — descending key order is newest first.
    if (k.name === "fb:") continue;
    const raw = await kv.get(k.name);
    if (!raw) continue;
    try {
      const f = JSON.parse(raw) as { c?: unknown; m?: unknown; p?: unknown };
      if (typeof f.m !== "string" || !f.m) continue;
      items.push({
        name: k.name,
        ts: k.name.slice(3, 13),
        category: typeof f.c === "string" ? f.c : "other",
        message: f.m.length > 400 ? `${f.m.slice(0, 400)}…` : f.m,
        page: typeof f.p === "string" ? f.p : "/",
      });
    } catch {
      // Malformed entry — skip it.
    }
  }
  items.sort((a, b) => (a.name < b.name ? 1 : -1));
  return items
    .slice(0, 30)
    .map(({ ts, category, message, page }) => ({ ts, category, message, page }));
}

// --- Public feedback inbox ------------------------------------------------
// A visitor-facing form (bug reports, feature requests, comments) whose
// submissions land in KV and surface ONLY on the private /stats page.
// Free-text messages are never console.log'ed — they stay in KV.
// Spam brakes without identifying anyone: honeypot field, length limits,
// fixed category allowlist, and a coarse global daily cap.

const FEEDBACK_CATEGORIES = new Set(["bug", "feature", "comment", "other"]);
const FEEDBACK_DAILY_CAP = 200;
const FEEDBACK_TTL_SECONDS = 365 * 24 * 3600;

/** POST /api/feedback — accept one feedback submission. */
export async function handleFeedback(request: Request): Promise<Response> {
  try {
    const kv = getEnv(request).ANALYTICS_KV;
    if (!kv) return new Response(null, { status: 503 });
    const text = await request.text();
    if (!text || text.length > 4096) return new Response(null, { status: 400 });
    const body: unknown = JSON.parse(text);
    if (typeof body !== "object" || body === null) {
      return new Response(null, { status: 400 });
    }
    const { category, message, page, website } = body as Record<string, unknown>;
    // Honeypot: bots fill it, humans never see the field. Pretend success.
    if (typeof website === "string" && website !== "") {
      return new Response(null, { status: 204 });
    }
    if (typeof category !== "string" || !FEEDBACK_CATEGORIES.has(category)) {
      return new Response(null, { status: 400 });
    }
    const msg = typeof message === "string" ? message.trim() : "";
    if (msg.length < 4 || msg.length > 2000) {
      return new Response(null, { status: 400 });
    }
    const pg = typeof page === "string" && page.startsWith("/") && page.length <= 200 ? page : "/";
    const day = dayKey();
    const countKey = `fbcount:${day}`;
    const count = (Number.parseInt((await kv.get(countKey)) ?? "0", 10) || 0) + 1;
    if (count > FEEDBACK_DAILY_CAP) return new Response(null, { status: 429 });
    const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 0xffff)
      .toString(36)
      .padStart(4, "0")}`;
    await kv.put(`fb:${day}:${id}`, JSON.stringify({ c: category, m: msg, p: pg }), {
      expirationTtl: FEEDBACK_TTL_SECONDS,
    });
    await kv.put(countKey, String(count), { expirationTtl: 2 * 24 * 3600 });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
