// Dumb AI chat — OpenRouter free models, server-side.
//
// Why here (not a server function): this module is invoked through the
// custom worker entry (src/server.ts), which is the only place the
// Cloudflare env (OPENROUTER_API_KEY secret, ANALYTICS_KV) reliably
// reaches server code — nitro's lazyService wrapper drops env/ctx for the
// SSR module. Same pattern as src/server/analytics.ts.
//
// Cost posture: free models only, zero spend. The OpenRouter free tier
// caps free-model requests per day per key (50/day with no credits
// purchased — verified 2026-09-29), so this endpoint enforces its own
// stricter caps in KV: 10/day per visitor, 40/day globally. Over the
// cap (or no key configured) the chat keeps working in local RAG mode —
// the AI never hard-fails.
//
// Privacy: no IP is ever stored. Rate-limit counters are keyed by a
// salted SHA-256 of the IP + day, truncated — irreversible, never
// logged, 1-day TTL.

import {
  liveAnswer,
  liveAnswerPro,
  localAnswer,
  explainScanPro,
  findSuggested,
  isOnTopic,
  OFF_TOPIC_FREE_ANSWER,
  type AskResult,
  type ScanCheckSummary,
  type ScanSummary,
} from "../lib/ai/rag";
import { getProState, isAddress, verifyProSession } from "./ai-pro";

const MAX_QUESTION_LEN = 500;
const MAX_BODY_BYTES = 8192;

// Stays under OpenRouter's no-credit free-model daily cap (50/day).
const IP_DAY_CAP = 10;
const GLOBAL_DAY_CAP = 40;

// Pro caps: 100/day + 1,000/month per wallet. At measured per-request cost
// (~$0.0009 on the default Pro model) even a maxed-out user stays inside
// the $2 AI slice of the $20 pass. The global Pro cap is a circuit breaker
// against runaway spend, not a quota users should ever see.
const PRO_DAY_CAP = 100;
const PRO_MONTH_CAP = 1000;
const PRO_GLOBAL_DAY_CAP = 1000;

type AiKV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

type AiEnv = {
  OPENROUTER_API_KEY?: string;
  ANALYTICS_KV?: AiKV;
};

// Same env-resolution as analytics.ts: nitro's lazyService calls fetch
// with the request only, but augments it with runtime.cloudflare and sets
// globalThis.__env__ on every fetch.
function getEnv(request: Request): AiEnv {
  const viaRequest = (request as unknown as { runtime?: { cloudflare?: { env?: AiEnv } } }).runtime
    ?.cloudflare?.env;
  if (viaRequest) return viaRequest;
  const viaGlobal = (globalThis as unknown as { __env__?: AiEnv }).__env__;
  if (viaGlobal) return viaGlobal;
  return {};
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function sha256hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function consumeCap(
  kv: AiKV,
  key: string,
  cap: number,
  ttl = 86_400,
): Promise<{ capped: boolean; remaining: number }> {
  const cur = Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
  if (cur >= cap) return { capped: true, remaining: 0 };
  await kv.put(key, String(cur + 1), { expirationTtl: ttl });
  return { capped: false, remaining: Math.max(0, cap - cur - 1) };
}

type ChatResponse = AskResult & {
  hasLiveKey: boolean;
  limited?: boolean;
  pro?: boolean;
  proRequired?: boolean;
  /** The wallet claimed Pro but didn't prove it — sign a session and retry. */
  sessionRequired?: boolean;
  proExpiresAt?: number | null;
  /** Free tier only: model-backed answers left today for this visitor. */
  freeRemaining?: number;
  /** Free tier only: question was off-topic, answer nudges toward Pro. */
  proNudge?: boolean;
};

function json(body: ChatResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function localWithKey(question: string, hasLiveKey: boolean, note?: string): ChatResponse {
  const result = localAnswer(question);
  return {
    ...result,
    answer: note ? `${result.answer}\n\n${note}` : result.answer,
    hasLiveKey,
  };
}

export async function handleAiChatGet(request: Request): Promise<Response> {
  const key = getEnv(request).OPENROUTER_API_KEY?.trim();
  return new Response(JSON.stringify({ hasLiveKey: Boolean(key) }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

/** Pro spend guard: 100/day + 1,000/month per wallet, 1,000/day global. */
async function proOverCap(kv: AiKV, address: string): Promise<boolean> {
  try {
    const day = dayKey();
    if ((await consumeCap(kv, `aiproq:${day}:${address}`, PRO_DAY_CAP)).capped) return true;
    if ((await consumeCap(kv, `aiproqm:${monthKey()}:${address}`, PRO_MONTH_CAP, 2_592_000)).capped)
      return true;
    if ((await consumeCap(kv, `aiproqg:${day}`, PRO_GLOBAL_DAY_CAP)).capped) return true;
    return false;
  } catch {
    return false; // KV hiccup — never break Pro chat on a counter failure
  }
}

const SCAN_STATUSES = new Set(["pass", "warn", "fail", "unknown"]);

/**
 * Validate + bound the client-built scan summary. The scanner's readings
 * are trusted as the user's own on-chain data, but shape and size are
 * enforced — the model interprets, never invents.
 */
function sanitizeScanSummary(raw: unknown): ScanSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const rawAddress = s["address"];
  const address = typeof rawAddress === "string" ? rawAddress.trim() : "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return null;
  const rawChecks = s["checks"];
  const checksRaw = Array.isArray(rawChecks) ? rawChecks : [];
  const checks = checksRaw.slice(0, 40).map((c) => {
    const cc = (typeof c === "object" && c !== null ? c : {}) as Record<string, unknown>;
    const rawStatus = cc["status"];
    const status =
      typeof rawStatus === "string" && SCAN_STATUSES.has(rawStatus) ? rawStatus : "unknown";
    const rawLabel = cc["label"];
    const rawDetail = cc["detail"];
    return {
      label: typeof rawLabel === "string" ? rawLabel.slice(0, 120) : "check",
      status: status as ScanCheckSummary["status"],
      detail: typeof rawDetail === "string" ? rawDetail.slice(0, 500) : "",
    };
  });
  if (!checks.length) return null;
  const rawTax = s["taxBps"];
  const taxBps = typeof rawTax === "number" && Number.isFinite(rawTax) ? rawTax : null;
  const rawPair = s["pair"];
  const pair =
    typeof rawPair === "string" && /^0x[0-9a-fA-F]{40}$/.test(rawPair.trim())
      ? rawPair.trim()
      : null;
  const rawSymbol = s["symbol"];
  return {
    symbol: typeof rawSymbol === "string" ? rawSymbol.slice(0, 24) : null,
    address,
    taxBps,
    pair,
    checks,
  };
}

export async function handleAiChatPost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response("body too large", { status: 413 });
    }
    body = JSON.parse(raw) as unknown;
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  const question =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { question?: unknown }).question === "string"
      ? (body as { question: string }).question.trim().slice(0, MAX_QUESTION_LEN)
      : "";
  const address =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { address?: unknown }).address === "string" &&
    isAddress((body as { address: string }).address)
      ? (body as { address: string }).address.trim().toLowerCase()
      : null;
  // Pro chat session: the wallet signs a short-lived session message
  // (30 min) and the browser sends expiresAt + signature with each
  // paid-chat request. A claimed address ALONE never unlocks paid models —
  // the signature proves the wallet is behind this request.
  const sessionExpiresAt =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { sessionExpiresAt?: unknown }).sessionExpiresAt === "number"
      ? (body as { sessionExpiresAt: number }).sessionExpiresAt
      : 0;
  const sessionSignature =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { sessionSignature?: unknown }).sessionSignature === "string"
      ? (body as { sessionSignature: string }).sessionSignature.trim()
      : "";
  const scan =
    typeof body === "object" && body !== null && (body as { scan?: unknown }).scan !== undefined
      ? sanitizeScanSummary((body as { scan: unknown }).scan)
      : null;
  // Client hint that this was a tapped suggested question — the server
  // re-validates it against the FAQ below; the flag alone grants nothing.
  const suggestedFlag =
    typeof body === "object" &&
    body !== null &&
    (body as { suggested?: unknown }).suggested === true;
  // Conversation memory (Pro only): earlier turns so follow-ups resolve.
  // Validated shape, capped count + length — caller-supplied, never trusted blindly.
  const history: { role: "user" | "assistant"; text: string }[] =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { history?: unknown }).history)
      ? (body as { history: unknown[] }).history
          .filter(
            (t): t is { role: "user" | "assistant"; text: string } =>
              typeof t === "object" &&
              t !== null &&
              ((t as { role?: unknown }).role === "user" ||
                (t as { role?: unknown }).role === "assistant") &&
              typeof (t as { text?: unknown }).text === "string",
          )
          .slice(-6)
          .map((t) => ({ role: t.role, text: t.text.trim().slice(0, 600) }))
          .filter((t) => t.text.length > 0)
      : [];
  if (!question && !scan) return new Response("question required", { status: 400 });

  const env = getEnv(request);
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    // No key configured on the worker yet — local RAG mode, same as before.
    return json(localWithKey(question || "scan", false));
  }

  // Suggested questions: always answered, for everyone, from the canned
  // FAQ — $0, never capped, no model call. The match is validated
  // server-side so the flag can't be used to bypass free-tier caps.
  if (suggestedFlag && !scan) {
    const hit = findSuggested(question);
    if (hit) {
      return json({
        mode: "local" as const,
        sources: ["hub knowledge"],
        answer: hit.a,
        hasLiveKey: true,
      });
    }
  }

  const kv = env.ANALYTICS_KV;
  // Pro authz: only a wallet-PROVEN address counts. Without a valid
  // session signature, even the real grant holder's address gets the
  // free tier — nobody can spend someone else's Pro quota.
  const sessionOk =
    address !== null && sessionExpiresAt > 0 && sessionSignature !== ""
      ? await verifyProSession(address, sessionExpiresAt, sessionSignature)
      : false;
  const proAddress = sessionOk && address !== null ? address : null;
  const proState = proAddress
    ? await getProState(env, proAddress)
    : { pro: false, expiresAt: null };

  // Scan explainer is Pro-only — it's the flagship paid feature.
  if (scan) {
    if (!proState.pro || !proAddress) {
      return json({
        mode: "local" as const,
        sources: ["token safety scan"],
        answer:
          "The scan explainer is a Dumb AI Pro feature — grab a Pro pass below and Smiley will walk through any scan in plain English.",
        hasLiveKey: true,
        proRequired: true,
        // Claimed a wallet but didn't prove it — the client should sign
        // a Pro session and retry instead of showing the generic upsell.
        sessionRequired: address !== null && !sessionOk,
      });
    }
    if (kv && (await proOverCap(kv, proAddress))) {
      return json({
        ...localWithKey(
          "scan",
          true,
          "Pro daily/monthly budget used up — served local receipts instead.",
        ),
        pro: true,
        proExpiresAt: proState.expiresAt,
        limited: true,
      });
    }
    try {
      const result = await explainScanPro(scan, question, key);
      return json({ ...result, hasLiveKey: true, pro: true, proExpiresAt: proState.expiresAt });
    } catch {
      return json({
        ...localWithKey("scan", true, "Live model hiccup — served local receipts instead."),
        pro: true,
        proExpiresAt: proState.expiresAt,
      });
    }
  }

  if (proState.pro && proAddress) {
    if (kv && (await proOverCap(kv, proAddress))) {
      return json({
        ...localWithKey(
          question,
          true,
          "Pro daily/monthly budget used up — served local receipts instead.",
        ),
        pro: true,
        proExpiresAt: proState.expiresAt,
        limited: true,
      });
    }
    try {
      const result = await liveAnswerPro(question, key, history);
      return json({ ...result, hasLiveKey: true, pro: true, proExpiresAt: proState.expiresAt });
    } catch {
      return json({
        ...localWithKey(question, true, "Live model hiccup — served local receipts instead."),
        pro: true,
        proExpiresAt: proState.expiresAt,
      });
    }
  }

  // Free tier: Dumb Money questions get the free model (10/day per
  // visitor, 40/day hub-wide, then local receipts). Off-topic questions
  // get no model call at all — just the Pro nudge. Suggested questions
  // were already answered above and never touch the caps.
  const onTopic = isOnTopic(question);
  let freeRemaining: number | undefined;
  // Set when the shared-budget check passed: the global counter is consumed
  // only after a SUCCESSFUL model call — a provider hiccup must never burn
  // the hub's 40/day free quota on an answer nobody received.
  let freeGlobalKey: string | null = null;
  if (kv && onTopic) {
    try {
      const day = dayKey();
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      const ipHash = (await sha256hex(`dumb-ai-v1|${day}|${ip}`)).slice(0, 32);
      const ipCap = await consumeCap(kv, `aichat:${day}:${ipHash}`, IP_DAY_CAP);
      if (ipCap.capped) {
        return json(
          {
            ...localWithKey(
              question,
              true,
              "Daily free-AI budget used up — served local receipts instead.",
            ),
            limited: true,
            freeRemaining: 0,
          },
          200,
        );
      }
      // Read-only check of the shared budget — do NOT consume here. The
      // consume happens after a successful model call below, so failed
      // calls never spend quota the hub's visitors need.
      freeGlobalKey = `aichatg:${day}`;
      const globalUsed = Number.parseInt((await kv.get(freeGlobalKey)) ?? "0", 10) || 0;
      if (globalUsed >= GLOBAL_DAY_CAP) {
        freeGlobalKey = null;
        return json(
          {
            ...localWithKey(
              question,
              true,
              "The hub's daily free-AI budget is used up — served local receipts instead.",
            ),
            limited: true,
            freeRemaining: ipCap.remaining,
          },
          200,
        );
      }
      freeRemaining = ipCap.remaining;
    } catch {
      // KV hiccup — fall through and try the model anyway; worst case a
      // few extra free-tier requests, never a broken chat.
      freeGlobalKey = null;
    }
  }

  if (!onTopic) {
    const nudge: ChatResponse = {
      mode: "local" as const,
      sources: [],
      answer: OFF_TOPIC_FREE_ANSWER,
      hasLiveKey: true,
      proNudge: true,
    };
    if (freeRemaining !== undefined) nudge.freeRemaining = freeRemaining;
    return json(nudge);
  }

  try {
    const result = await liveAnswer(question, key);
    if (kv && freeGlobalKey) {
      // The call succeeded — this is the one that spends the shared
      // free-model quota. Counter bookkeeping must never break the answer.
      try {
        await consumeCap(kv, freeGlobalKey, GLOBAL_DAY_CAP);
      } catch {
        // ignore
      }
    }
    const reply: ChatResponse = { ...result, hasLiveKey: true };
    if (freeRemaining !== undefined) reply.freeRemaining = freeRemaining;
    return json(reply);
  } catch {
    const fallback: ChatResponse = {
      ...localWithKey(question, true, "Live model hiccup — served local receipts instead."),
    };
    if (freeRemaining !== undefined) fallback.freeRemaining = freeRemaining;
    return json(fallback);
  }
}
