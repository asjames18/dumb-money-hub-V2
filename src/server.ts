import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleAnalytics, handleFeedback, handlePing, handleScanStats } from "./server/analytics";
import { handleAiChatGet, handleAiChatPost } from "./server/ai-chat";
import {
  handleAiProActivate,
  handleAiProConfig,
  handleAiProStatus,
  handlePlsPrice,
} from "./server/ai-pro";
import { handleUsernameGet, handleUsernamePost } from "./server/username";
import { handlePledgePost, handlePledgesGet } from "./server/pledges";
import { handleMarket } from "./server/market";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // First-party analytics endpoints are served here (not as file routes)
      // because they need the Cloudflare env (KV counters + the
      // ANALYTICS_PASS secret). Note: nitro's lazyService wrapper calls this
      // fetch with the request ONLY — env/ctx args never arrive — so the
      // handlers read env via the request/global instead (see analytics.ts).
      const { pathname } = new URL(request.url);
      if (pathname === "/api/ping" && request.method === "POST") {
        return handlePing(request);
      }
      if (pathname === "/api/feedback" && request.method === "POST") {
        return handleFeedback(request);
      }
      if (pathname === "/api/analytics" && request.method === "GET") {
        return handleAnalytics(request);
      }
      // Dumb AI chat — OpenRouter free models server-side (the key lives
      // only on the worker; the browser never sees it). GET reports whether
      // a live key is configured.
      if (pathname === "/api/ai-chat" && request.method === "POST") {
        return handleAiChatPost(request);
      }
      if (pathname === "/api/ai-chat" && request.method === "GET") {
        return handleAiChatGet(request);
      }
      // Dumb AI Pro — $20 DUMB pass, split 80/20 burn / model wallet
      // (verified on-chain, grant in KV). POST activates with
      // { address, burnTxHash, modelTxHash, signature }; GET status reports
      // Pro state for an address; GET config exposes the model wallet.
      if (pathname === "/api/ai-pro/status" && request.method === "GET") {
        return handleAiProStatus(request);
      }
      if (pathname === "/api/ai-pro/config" && request.method === "GET") {
        return handleAiProConfig(request);
      }
      // Cached PLS/USD for client price displays (one shared upstream call
      // per 5 minutes instead of every visitor hitting CoinGecko directly).
      if (pathname === "/api/pls-price" && request.method === "GET") {
        return handlePlsPrice();
      }
      if (pathname === "/api/ai-pro/activate" && request.method === "POST") {
        return handleAiProActivate(request);
      }
      // Public deep-scan activity aggregates (coarse counts only — no
      // passphrase needed, no paths/countries/feedback exposed).
      if (pathname === "/api/scan-stats" && request.method === "GET") {
        return handleScanStats(request);
      }
      // Public market snapshot for the /roots dashboard (DexScreener
      // flagship pairs, server-side, cached 60s).
      if (pathname === "/api/market" && request.method === "GET") {
        return handleMarket(request);
      }
      // Opt-in username registry (wallet-signed display names for the
      // leaderboards). Same custom-entry pattern as the analytics endpoints.
      if (pathname === "/api/username" && request.method === "GET") {
        return handleUsernameGet(request);
      }
      if (pathname === "/api/username" && request.method === "POST") {
        return handleUsernamePost(request);
      }
      // Public burn pledges (wallet-signed promises, never presented as
      // burns — the client marks them redeemed from verified on-chain sums).
      if (pathname === "/api/pledges" && request.method === "GET") {
        return handlePledgesGet(request);
      }
      if (pathname === "/api/pledge" && request.method === "POST") {
        return handlePledgePost(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
