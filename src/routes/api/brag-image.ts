import { createFileRoute } from "@tanstack/react-router";
import { decodeFunctionData, keccak256, parseAbi, stringToHex, toFunctionSelector } from "viem";

import { fmtTok, renderBragCard } from "@/server/brag-card.server";

// Server-generated burn brag images, so X/Telegram shares unfurl the card.
//
// GET /api/brag-image?tx=0x… — verifies on-chain that the tx is a real
// voluntary burn of DUMB/DAMP to the dead address, then renders the brag
// card PNG on the fly. Two shapes are accepted:
//   1. a direct transfer() of DUMB/DAMP straight to the dead address
//      (amount decoded from the transfer input);
//   2. the PLS-fallback shape: the PulseX V2 router's
//      swapExactETHForTokensSupportingFeeOnTransferTokens with `to` = dead
//      and a path ending in DUMB (amount = the DUMB that provably arrived
//      at dead in the receipt — the honest destroyed number, since the
//      arrival itself is taxed).
// Nothing is uploaded and nothing is stored: the image is deterministic per
// tx, so it is safe to cache immutably and nobody can spoof someone else's
// burn with an arbitrary upload. Unverified txs 404.

const RPC = "https://rpc.pulsechain.com";
const DUMB = "0xe65112d2f120c8cb23adc80d8e8122c0c8b7ff8d";
const DAMP = "0x8357aa9070dc7d8d154da74561cec58ca30c41c3";
const DEAD = "0x000000000000000000000000000000000000dead";
// PulseX V2 router — src/lib/pulsechain.ts, verified on-chain 2026-09-26
// via DUMB.ROUTER()/DAMP.ROUTER().
const ROUTER = "0x165c3410fc91ef562c50559f7d2289febed552d9";
/** Canonical ERC-20 Transfer topic — computed, never hand-typed. */
const TRANSFER_TOPIC = keccak256(stringToHex("Transfer(address,address,uint256)"));
const TRANSFER_SELECTOR = "0xa9059cbb"; // transfer(address,uint256)
/** The one router call the site's PLS fallback makes — ABI parsed, selector
    computed, never hand-typed. */
const SWAP_ABI = parseAbi([
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)",
]);
const SWAP_SELECTOR = toFunctionSelector(SWAP_ABI[0]);

const TX_RE = /^0x[0-9a-fA-F]{64}$/;

/** Edge cache when the runtime provides it (Workers); null in plain node.
    `caches.default` is Workers-only — DOM's CacheStorage type doesn't know it. */
function edgeCache(): Cache | null {
  if (typeof caches === "undefined") return null;
  return (caches as unknown as { default: Cache }).default;
}

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const body = (await res.json()) as { error?: { message?: string }; result?: unknown };
  if (body.error) throw new Error(body.error.message ?? "rpc error");
  return body.result;
}

type RpcTx = { to?: string; from?: string; input?: string } | null;
type RpcLog = { address?: string; topics?: string[]; data?: string };
type RpcReceipt = { status?: string; logs?: RpcLog[] } | null;

type VerifiedBurn = { token: "DUMB" | "DAMP"; amount: bigint };

const deadTopic = `0x${DEAD.slice(2).padStart(64, "0")}`;

/**
 * Shape 1: a direct transfer() of DUMB/DAMP straight to the dead address,
 * mined successfully, with the tokens actually arriving (checked in the
 * receipt logs). Returns the token and the amount that actually ARRIVED at
 * dead — the honest burned amount. A direct burn is itself taxed on arrival
 * (5% on DUMB, 2% on DAMP), so calldata's pre-tax A would overstate the
 * dead balance by 5%/2%; the summed from→dead Transfer logs are the truth.
 */
function getDirectBurn(tx: RpcTx, receipt: RpcReceipt): VerifiedBurn | null {
  if (!tx || !receipt || receipt.status !== "0x1") return null;
  const to = (tx.to ?? "").toLowerCase();
  const token = to === DUMB ? "DUMB" : to === DAMP ? "DAMP" : null;
  if (!token) return null;
  const input = (tx.input ?? "").toLowerCase();
  // 0x + selector(8) + address(64) + amount(64)
  if (!input.startsWith(TRANSFER_SELECTOR) || input.length < 138) return null;
  const recipient = `0x${input.slice(34, 74)}`;
  if (recipient !== DEAD) return null;
  if (BigInt(`0x${input.slice(74, 138)}`) <= 0n) return null;
  const from = (tx.from ?? "").toLowerCase();
  const fromTopic = `0x${from.slice(2).padStart(64, "0")}`;
  // Sum the from→dead Transfer logs (same pattern getSwapBurnArrival uses)
  // instead of trusting calldata's pre-tax amount.
  let arrived = 0n;
  for (const log of receipt.logs ?? []) {
    if ((log.address ?? "").toLowerCase() !== to) continue;
    if ((log.topics?.[0] ?? "").toLowerCase() !== TRANSFER_TOPIC) continue;
    if ((log.topics?.[1] ?? "").toLowerCase() !== fromTopic) continue;
    if ((log.topics?.[2] ?? "").toLowerCase() !== deadTopic) continue;
    if (!/^0x[0-9a-fA-F]+$/.test(log.data ?? "")) return null;
    arrived += BigInt(log.data as string);
  }
  if (arrived <= 0n) return null;
  return { token, amount: arrived };
}

/**
 * Shape 2: the PLS-fallback burn — the PulseX V2 router's
 * swapExactETHForTokensSupportingFeeOnTransferTokens with `to` = dead and a
 * path ending in DUMB, mined successfully, with DUMB actually arriving at
 * dead (checked in the receipt logs). Returns the summed dead-arrival — the
 * honest destroyed amount, since the swap output is taxed on arrival.
 */
function getSwapBurnArrival(tx: RpcTx, receipt: RpcReceipt): bigint | null {
  if (!tx || !receipt || receipt.status !== "0x1") return null;
  if ((tx.to ?? "").toLowerCase() !== ROUTER) return null;
  const input = (tx.input ?? "").toLowerCase();
  if (!input.startsWith(SWAP_SELECTOR)) return null;
  let swapTo: string;
  let path: readonly string[];
  try {
    const decoded = decodeFunctionData({ abi: SWAP_ABI, data: input as `0x${string}` });
    // args: (amountOutMin, path, to, deadline)
    path = decoded.args[1];
    swapTo = decoded.args[2];
  } catch {
    return null;
  }
  if (swapTo.toLowerCase() !== DEAD) return null;
  if (path.length === 0 || path[path.length - 1]!.toLowerCase() !== DUMB) return null;
  let arrived = 0n;
  for (const log of receipt.logs ?? []) {
    if ((log.address ?? "").toLowerCase() !== DUMB) continue;
    if ((log.topics?.[0] ?? "").toLowerCase() !== TRANSFER_TOPIC) continue;
    if ((log.topics?.[2] ?? "").toLowerCase() !== deadTopic) continue;
    if (!/^0x[0-9a-fA-F]+$/.test(log.data ?? "")) return null;
    arrived += BigInt(log.data as string);
  }
  return arrived > 0n ? arrived : null;
}

/**
 * The tx must be a real voluntary burn of DUMB/DAMP to the dead address —
 * either a direct transfer() or the PLS-fallback router swap — mined
 * successfully, with the tokens actually arriving (checked in the receipt
 * logs). Returns the token and the amount to print on the card.
 */
async function getVerifiedBurn(txHash: string): Promise<VerifiedBurn | null> {
  try {
    const [tx, receipt] = (await Promise.all([
      rpc("eth_getTransactionByHash", [txHash]),
      rpc("eth_getTransactionReceipt", [txHash]),
    ])) as [RpcTx, RpcReceipt];
    const direct = getDirectBurn(tx, receipt);
    if (direct) return direct;
    const swapArrived = getSwapBurnArrival(tx, receipt);
    if (swapArrived !== null) return { token: "DUMB", amount: swapArrived };
    return null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/brag-image")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const tx = new URL(request.url).searchParams.get("tx") ?? "";
        if (!TX_RE.test(tx)) return new Response("bad tx", { status: 400 });
        // Edge-cache read-through: every social unfurl of a shared brag link
        // would otherwise re-run 2 RPC reads + a full 1080x1080 software PNG
        // render. Keyed on the full URL (the tx hash is the only input).
        const cache = edgeCache();
        const cached = cache ? await cache.match(request) : null;
        if (cached) return cached;
        const txHash = tx.toLowerCase();
        const burn = await getVerifiedBurn(txHash);
        if (!burn) {
          const miss = new Response("not a verified burn", {
            status: 404,
            headers: { "cache-control": "public, max-age=60" },
          });
          // Short negative cache: random-hash spam can't re-pay 2 RPC reads
          // per request. Safe because a tx hash names immutable contents — a
          // "not a burn" can never become one later. Pending-then-mined is
          // covered by the 60s window.
          if (cache) await cache.put(request, miss.clone());
          return miss;
        }
        const png = await renderBragCard({
          amount: fmtTok(burn.amount),
          token: burn.token,
          txHash,
        });
        // Slice: Response wants an exact ArrayBuffer, not a view.
        const body = png.slice().buffer as ArrayBuffer;
        const hit = new Response(body, {
          headers: {
            "content-type": "image/png",
            // Deterministic per tx: safe to cache long at the edge.
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
        if (cache) await cache.put(request, hit.clone());
        return hit;
      },
    },
  },
});
