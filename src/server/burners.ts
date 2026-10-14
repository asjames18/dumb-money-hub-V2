// Public burners wall: newest-first voluntary DUMB burns.
//
// The daily scan script (goals/pulsechain-dumb-damp-build-loop/hidden_files/
// burners-wall-scan.py) writes one `burn:{block}:{txhash}` key per voluntary
// burn and keeps `wall:index` (JSON array of burn keys, newest-first, capped
// at 500). This endpoint reads the index, then does bounded direct KV gets —
// never kv.list, so a growing namespace can't silently drop the newest rows.
// Public data only: every row is a real on-chain Transfer to the dead
// address. Recognition only — no prizes, no contests, no invented rows.

import type { AnalyticsKV } from "./analytics";

export type BurnersEnv = {
  BURNERS_WALL_KV?: AnalyticsKV;
};

// Same env pattern as analytics.ts: nitro's lazyService wrapper calls the
// SSR module's fetch(request) with the request ONLY, so the handlers read
// env via request.runtime.cloudflare.env with a globalThis.__env__ fallback.
function getEnv(request: Request): BurnersEnv {
  const viaRequest = (request as unknown as { runtime?: { cloudflare?: { env?: BurnersEnv } } })
    .runtime?.cloudflare?.env;
  if (viaRequest) return viaRequest;
  const viaGlobal = (globalThis as unknown as { __env__?: BurnersEnv }).__env__;
  if (viaGlobal) return viaGlobal;
  return {};
}

export type BurnerRow = {
  /** Burner wallet, lowercased. */
  wallet: string;
  /** Gross DUMB burned (what the burner sent, before the 6% tax), decimal token units. */
  amountGross: string;
  /** Net DUMB that arrived at the dead address, in wei, decimal string. */
  amountRaw: string;
  block: number;
  tx: string;
  /** Block timestamp, unix seconds. */
  timestamp: number;
};

const INDEX_KEY = "wall:index";
const MAX_ROWS = 500;

function isBurnerRow(v: unknown): v is BurnerRow {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r["wallet"] === "string" &&
    (r["wallet"] as string).startsWith("0x") &&
    typeof r["amountGross"] === "string" &&
    typeof r["amountRaw"] === "string" &&
    typeof r["block"] === "number" &&
    Number.isSafeInteger(r["block"]) &&
    typeof r["tx"] === "string" &&
    (r["tx"] as string).startsWith("0x") &&
    typeof r["timestamp"] === "number"
  );
}

/** GET /api/burners — newest-first voluntary DUMB burns. Public, cached 60s. */
export async function handleBurnersGet(request: Request): Promise<Response> {
  const json = (body: unknown, status: number, cacheSeconds: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${cacheSeconds}`,
      },
    });
  try {
    const kv = getEnv(request).BURNERS_WALL_KV;
    if (!kv) return json({ error: "unavailable" }, 503, 60);
    let keys: string[] = [];
    try {
      const parsed: unknown = JSON.parse((await kv.get(INDEX_KEY)) ?? "[]");
      if (Array.isArray(parsed)) {
        keys = parsed.filter((k): k is string => typeof k === "string" && k.startsWith("burn:"));
      }
    } catch {
      keys = [];
    }
    keys = keys.slice(0, MAX_ROWS);
    // Bounded batches: a Worker invocation caps parallel subrequests, so a
    // full wall (500 rows) must never fire them all at once — or the wall
    // 503s the moment it grows. Sequential batches of 25 stay well under
    // any plan's limit and keep worst-case latency bounded.
    const rows: BurnerRow[] = [];
    for (let i = 0; i < keys.length; i += 25) {
      const batch = await Promise.all(
        keys.slice(i, i + 25).map(async (key) => {
          try {
            const raw = await kv.get(key);
            if (!raw) return null;
            const row: unknown = JSON.parse(raw);
            return isBurnerRow(row) ? row : null;
          } catch {
            return null;
          }
        }),
      );
      for (const r of batch) if (r !== null) rows.push(r);
    }
    return json({ burns: rows }, 200, 60);
  } catch {
    return json({ error: "unavailable" }, 503, 60);
  }
}
