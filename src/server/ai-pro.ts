// Dumb AI Pro — $20 pass, split 80/20.
//
// Freemium shape (Antonio, 2026-09-29): the basic helper chat stays free
// forever (free OpenRouter models, costs the hub $0). Pro is the paid tier:
// $20 of value split 80/20 — $16 of DUMB burns to the dead address, ~$4
// goes to the model wallet (a public address Antonio controls) that funds
// OpenRouter. No Stripe, no custody, no new contract.
//
// Payment (2026-09-29, Antonio): any of the hub's curated, on-chain-verified
// tokens (PRO_PAY_TOKENS). The burn leg ALWAYS ends up as DUMB at dead —
// a direct transfer for DUMB, or a PulseX V2 swap with `to` = dead for
// anything else (same shape as the scan pass's PLS fallback). The model
// leg is a plain transfer of the payment token to the model wallet.
//
// Activation binds four things together so funds can't be replayed:
//   1. the wallet signs a message naming its address AND both tx hashes
//   2. each tx is fetched on-chain: must succeed and be FROM the signer
//   3. burn leg: DUMB must provably ARRIVE at dead (receipt Transfer
//      logs), either via a direct DUMB transfer or an allowlisted router
//      swap path ending in DUMB with `to` = dead; arrival must be >= $16
//   4. model leg: the payment token (or native PLS) must provably arrive
//      at the configured model wallet; arrival must be >= $3.50
//   5. each tx hash activates Pro exactly once (KV reuse guard)
//
// The model wallet address is server config (AI_MODEL_WALLET env), never
// client-supplied — otherwise a user could redirect their 20% to
// themselves and still get Pro.

import {
  decodeFunctionData,
  keccak256,
  parseAbi,
  stringToHex,
  toFunctionSelector,
  verifyMessage,
} from "viem";

import {
  PRO_BURN_MIN_USD,
  PRO_BURN_SWAP_MIN_USD,
  PRO_DAYS,
  PRO_MODEL_MIN_USD,
  PRO_PAY_TOKENS,
  PRO_ROUTER,
  PRO_SESSION_MS,
  proActivationMessage,
  proSessionMessage,
} from "../lib/ai/pro";

const DUMB = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D";
const DEAD = "0x000000000000000000000000000000000000dEaD";
const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
// WPLS/DUMB flagship pair (token0=WPLS, token1=DUMB) — on-chain DUMB/WPLS price.
const WPLS_DUMB_PAIR = "0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186";
const TRANSFER_TOPIC = keccak256(stringToHex("Transfer(address,address,uint256)"));
const GET_RESERVES_SELECTOR = "0x0902f1ac";
const PULSE_RPC = "https://rpc.pulsechain.com";
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=pulsechain&vs_currencies=usd";
// DexScreener token API (Antonio approved 2026-09-29): free, no key —
// replaces CryptoCompare, which now requires an API key. Highest-liquidity
// WPLS pair's USD price.
const DEXSCREENER_WPLS_URL =
  "https://api.dexscreener.com/latest/dex/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27";

// The one router call shape per payment kind. Selectors are computed from
// the ABI, never hand-typed (same discipline as /api/brag-image).
const SWAP_ETH_ABI = parseAbi([
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)",
]);
const SWAP_TOKENS_ABI = parseAbi([
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
]);
const SWAP_ETH_SELECTOR = toFunctionSelector(SWAP_ETH_ABI[0]);
const SWAP_TOKENS_SELECTOR = toFunctionSelector(SWAP_TOKENS_ABI[0]);

/** WPLS pair per pay token for server-side USD pricing (verified pairs —
 *  same set the client's useTokenPrices uses; ordering/decimals verified
 *  on-chain 2026-09-26). PLS is priced directly via plsUsd(). */
const WPLS_PAIRS: Record<string, { pair: string; wplsIsToken0: boolean; decimals: number }> = {
  DUMB: { pair: WPLS_DUMB_PAIR, wplsIsToken0: true, decimals: 18 },
  HEX: { pair: "0x19bb45a7270177e303dee6eaa6f5ad700812ba98", wplsIsToken0: false, decimals: 8 },
  TEDDY: { pair: "0x31eF9a41500E6BD18524404aC9c5B88D04AA924E", wplsIsToken0: true, decimals: 18 },
  SOLIDX: { pair: "0x58Ce9f72Be187BB0cb44F4f0b05465D170AC4c86", wplsIsToken0: false, decimals: 18 },
  PCOCK: { pair: "0xCb99800B71B7FB0696D19c3aaAa20c03d2D7e449", wplsIsToken0: true, decimals: 18 },
  HELGO: { pair: "0xFdDbFa9497270cDb16300482C1bF43F5bDe28beD", wplsIsToken0: false, decimals: 18 },
  INC: { pair: "0x5b9661276708202dd1a0dd2346a3856b00d3c251", wplsIsToken0: false, decimals: 18 },
  PLSX: { pair: "0x149b2c629e652f2e89e11cd57e5d4d77ee166f9f", wplsIsToken0: false, decimals: 18 },
  PRVX: { pair: "0x62f7d076c92db76cf84223b6309801ea461d7afe", wplsIsToken0: true, decimals: 18 },
  pTGC: { pair: "0x2491574f78410460ab6b1e9b39b21ce3bcfb69e8", wplsIsToken0: false, decimals: 18 },
  WBTC: { pair: "0xe0e1f83a1c64cf65c1a86d7f3445fc4f58f7dcbf", wplsIsToken0: false, decimals: 8 },
};

export type ProState = { pro: boolean; expiresAt: number | null };

type AiKV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

export type AiProEnv = {
  ANALYTICS_KV?: AiKV;
  AI_MODEL_WALLET?: string;
};

function getEnv(request: Request): AiProEnv {
  const viaRequest = (request as unknown as { runtime?: { cloudflare?: { env?: AiProEnv } } })
    .runtime?.cloudflare?.env;
  if (viaRequest) return viaRequest;
  const viaGlobal = (globalThis as unknown as { __env__?: AiProEnv }).__env__;
  if (viaGlobal) return viaGlobal;
  return {};
}

const HEX40 = /^0x[0-9a-fA-F]{40}$/;
const HEX64 = /^0x[0-9a-fA-F]{64}$/;

export function isAddress(v: string): boolean {
  return HEX40.test(v.trim());
}

/** The configured model wallet, or null when Antonio hasn't set it yet. */
export function getModelWallet(env: AiProEnv): string | null {
  const w = env.AI_MODEL_WALLET?.trim() ?? "";
  return isAddress(w) ? w.toLowerCase() : null;
}

/** Raw JSON-RPC call with retries — rpc.pulsechain.com drops under load. */
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(PULSE_RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: attempt + 1, method, params }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`rpc ${res.status}`);
      const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
      if (data.error) throw new Error(data.error.message ?? "rpc error");
      return data.result ?? null;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("rpc failed");
}

type RpcTx = {
  from?: string;
  to?: string | null;
  input?: string;
  value?: string;
} | null;
type RpcLog = { address?: string; topics?: string[]; data?: string };
type RpcReceipt = { status?: string; logs?: RpcLog[]; blockNumber?: string } | null;

type LegCheck =
  | { ok: true; token: string; arrived: bigint; blockNumber: string; viaSwap?: boolean }
  | { ok: false; reason: string };

/** The mined block of a verified leg, as a 0x-hex block tag for eth_call. */
function legBlockTag(receipt: RpcReceipt): string | null {
  const b = receipt?.blockNumber;
  return typeof b === "string" && /^0x[0-9a-fA-F]+$/.test(b) ? b : null;
}

/** Tokens of `tokenAddress` that provably arrived at `recipient` in the
 *  receipt's Transfer logs. */
function arrivedAt(receipt: RpcReceipt, tokenAddress: string, recipient: string): bigint {
  const recipientTopic = `0x${recipient.slice(2).toLowerCase().padStart(64, "0")}`;
  let arrived = 0n;
  for (const log of receipt?.logs ?? []) {
    if (
      (log.address ?? "").toLowerCase() === tokenAddress.toLowerCase() &&
      (log.topics?.[0] ?? "").toLowerCase() === TRANSFER_TOPIC &&
      (log.topics?.[2] ?? "").toLowerCase() === recipientTopic
    ) {
      try {
        arrived += BigInt(log.data ?? "0x0");
      } catch {
        /* skip malformed log data */
      }
    }
  }
  return arrived;
}

/** Allowlisted router paths, derived from PRO_PAY_TOKENS — a burn swap
 *  must match one of the hub's own verified routes exactly. */
function allowedSwapPaths(): Set<string> {
  const set = new Set<string>();
  for (const t of PRO_PAY_TOKENS) {
    if (t.swapPath.length > 0) {
      set.add(t.swapPath.map((a) => a.toLowerCase()).join(">"));
    }
  }
  return set;
}

/**
 * Burn-leg verification, server-side. Two accepted shapes, both ending
 * with DUMB provably ARRIVING at the dead address:
 *   A. a plain DUMB transfer() straight to dead (the DUMB payment path);
 *   B. a PulseX V2 router swap (PLS or ERC-20, fee-on-transfer variants
 *      only) with `to` = dead and an allowlisted T->DUMB path.
 * The tx must succeed and be sent FROM the claimed wallet.
 */
async function verifyBurnLeg(address: string, txHash: string): Promise<LegCheck> {
  const hash = txHash.trim().toLowerCase();
  let tx: RpcTx;
  let receipt: RpcReceipt;
  try {
    [tx, receipt] = (await Promise.all([
      rpcCall("eth_getTransactionByHash", [hash]),
      rpcCall("eth_getTransactionReceipt", [hash]),
    ])) as [RpcTx, RpcReceipt];
  } catch {
    return { ok: false, reason: "The PulseChain RPC didn't answer — try again in a moment." };
  }
  if (!tx || !receipt) {
    return { ok: false, reason: "Transaction not found on PulseChain — check the hash." };
  }
  if (receipt.status !== "0x1") {
    return { ok: false, reason: "That transaction failed on-chain — nothing moved." };
  }
  const blockTag = legBlockTag(receipt);
  if (!blockTag) {
    return { ok: false, reason: "Couldn't confirm that transaction's block — try again." };
  }
  if ((tx.from ?? "").toLowerCase() !== address.toLowerCase()) {
    return { ok: false, reason: "The burn wasn't sent from your wallet." };
  }
  const to = (tx.to ?? "").toLowerCase();
  const input = (tx.input ?? "").toLowerCase();

  // Shape A: direct DUMB transfer to dead.
  if (to === DUMB.toLowerCase()) {
    // transfer(address,uint256): 0xa9059cbb + address(32) + amount(32)
    if (input.startsWith("0xa9059cbb") && input.length >= 138) {
      const recipient = `0x${input.slice(34, 74)}`;
      if (recipient.toLowerCase() === DEAD.toLowerCase()) {
        const arrived = arrivedAt(receipt, DUMB, DEAD);
        if (arrived > 0n)
          return { ok: true, token: "DUMB", arrived, blockNumber: blockTag, viaSwap: false };
        return { ok: false, reason: "No DUMB arrived at the dead address in that transaction." };
      }
    }
    return { ok: false, reason: "That wasn't a DUMB burn to the dead address." };
  }

  // Shape B: router swap with `to` = dead and an allowlisted path.
  if (to === PRO_ROUTER.toLowerCase()) {
    const isEthSwap = input.startsWith(SWAP_ETH_SELECTOR);
    const isTokensSwap = input.startsWith(SWAP_TOKENS_SELECTOR);
    if (!isEthSwap && !isTokensSwap) {
      return { ok: false, reason: "That wasn't a recognized Pro burn transaction." };
    }
    try {
      const decoded = decodeFunctionData({
        abi: isEthSwap ? SWAP_ETH_ABI : SWAP_TOKENS_ABI,
        data: input as `0x${string}`,
      });
      const path = (isEthSwap ? decoded.args[1] : decoded.args[2]) as readonly string[];
      const swapTo = (isEthSwap ? decoded.args[2] : decoded.args[3]) as string;
      if (swapTo.toLowerCase() !== DEAD.toLowerCase()) {
        return { ok: false, reason: "That swap didn't send its DUMB to the dead address." };
      }
      const pathKey = path.map((a) => a.toLowerCase()).join(">");
      if (!allowedSwapPaths().has(pathKey)) {
        return { ok: false, reason: "That swap path isn't one of the hub's verified Pro routes." };
      }
      if (isEthSwap && BigInt(tx.value ?? "0x0") <= 0n) {
        return { ok: false, reason: "That swap sent no PLS." };
      }
      const arrived = arrivedAt(receipt, DUMB, DEAD);
      if (arrived <= 0n) {
        return { ok: false, reason: "No DUMB arrived at the dead address in that swap." };
      }
      return { ok: true, token: "DUMB", arrived, blockNumber: blockTag, viaSwap: true };
    } catch {
      return { ok: false, reason: "That wasn't a recognized Pro burn transaction." };
    }
  }

  return { ok: false, reason: "That transaction wasn't a DUMB burn." };
}

/**
 * Model-leg verification, server-side. The payment token (or native PLS)
 * must provably ARRIVE at the configured model wallet:
 *   A. native PLS: plain value transfer to the model wallet;
 *   B. ERC-20: transfer() of a trusted pay token to the model wallet.
 * The tx must succeed and be sent FROM the claimed wallet.
 */
async function verifyModelLeg(
  address: string,
  txHash: string,
  modelWallet: string,
): Promise<LegCheck> {
  const hash = txHash.trim().toLowerCase();
  let tx: RpcTx;
  let receipt: RpcReceipt;
  try {
    [tx, receipt] = (await Promise.all([
      rpcCall("eth_getTransactionByHash", [hash]),
      rpcCall("eth_getTransactionReceipt", [hash]),
    ])) as [RpcTx, RpcReceipt];
  } catch {
    return { ok: false, reason: "The PulseChain RPC didn't answer — try again in a moment." };
  }
  if (!tx || !receipt) {
    return { ok: false, reason: "Transaction not found on PulseChain — check the hash." };
  }
  if (receipt.status !== "0x1") {
    return { ok: false, reason: "That transaction failed on-chain — nothing moved." };
  }
  const blockTag = legBlockTag(receipt);
  if (!blockTag) {
    return { ok: false, reason: "Couldn't confirm that transaction's block — try again." };
  }
  if ((tx.from ?? "").toLowerCase() !== address.toLowerCase()) {
    return { ok: false, reason: "The model payment wasn't sent from your wallet." };
  }
  const to = (tx.to ?? "").toLowerCase();
  const input = (tx.input ?? "").toLowerCase();
  const value = BigInt(tx.value ?? "0x0");
  const mw = modelWallet.toLowerCase();

  // Shape A: native PLS transfer straight to the model wallet.
  if (to === mw && (input === "0x" || input === "") && value > 0n) {
    return { ok: true, token: "PLS", arrived: value, blockNumber: blockTag };
  }

  // Shape B: ERC-20 transfer() of a trusted pay token to the model wallet.
  // Here tx.to is the TOKEN contract, so the token is identified from tx.to
  // and the recipient from the calldata. (The old blanket "to === modelWallet"
  // check rejected every ERC-20 payment before this branch could run.)
  const payToken = PRO_PAY_TOKENS.find((t) => t.address !== null && t.address.toLowerCase() === to);
  if (
    payToken &&
    input.startsWith("0xa9059cbb") &&
    input.length >= 138 &&
    `0x${input.slice(34, 74)}`.toLowerCase() === mw
  ) {
    const arrived = arrivedAt(receipt, to, modelWallet);
    if (arrived > 0n) return { ok: true, token: payToken.symbol, arrived, blockNumber: blockTag };
    return { ok: false, reason: "No tokens arrived at the model wallet in that transaction." };
  }

  return { ok: false, reason: "That wasn't a recognized model-wallet payment." };
}

/** Highest-liquidity WPLS pair's USD price from DexScreener (free, no key). */
function parseDexScreener(json: unknown): number | null {
  const pairs = (json as { pairs?: unknown })?.pairs;
  if (!Array.isArray(pairs)) return null;
  let best: number | null = null;
  let bestLiq = -1;
  for (const p of pairs) {
    const rec = p as { priceUsd?: unknown; liquidity?: { usd?: unknown } };
    const raw = rec?.priceUsd;
    const price = typeof raw === "string" ? Number(raw) : raw;
    const liqRaw = rec?.liquidity?.usd;
    const liq = typeof liqRaw === "number" ? liqRaw : -1;
    if (typeof price === "number" && Number.isFinite(price) && price > 0 && liq > bestLiq) {
      best = price;
      bestLiq = liq;
    }
  }
  return best;
}

async function plsUsd(): Promise<number | null> {
  // DexScreener first (reliable, no key), CoinGecko as fallback.
  try {
    const res = await fetch(DEXSCREENER_WPLS_URL, { signal: AbortSignal.timeout(8_000) });
    if (res.ok) {
      const price = parseDexScreener(await res.json());
      if (price !== null) return price;
    }
  } catch {
    /* fall through to CoinGecko */
  }
  try {
    const res = await fetch(COINGECKO_URL, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { pulsechain?: { usd?: unknown } };
    const price = data.pulsechain?.usd;
    if (typeof price === "number" && Number.isFinite(price) && price > 0) return price;
  } catch {
    /* no price available */
  }
  return null;
}

/**
 * USD value of a pay-token amount, from its verified WPLS pair × PLS/USD.
 *
 * The pair reserves are read at the block the payment was MINED IN — not
 * "latest". A user takes two separate wallet confirmations (burn, then
 * model payment) and may dawdle between them; valuing at "latest" would
 * let market drift between signing and verification fail a legit payment.
 * Block-anchored valuation shrinks the volatility window to quote → mined
 * (usually under a minute). The arrival minimums (PRO_BURN_MIN_USD,
 * PRO_BURN_SWAP_MIN_USD, PRO_MODEL_MIN_USD) sit just under the expected
 * post-tax arrival, so a small adverse price move in that window doesn't
 * fail a legit payment. If the node can't serve that block, one "latest"
 * retry; if that fails, null (fail conservative, never guess).
 */
async function tokenUsdValue(
  symbol: string,
  amount: bigint,
  decimals: number,
  blockTag: string,
): Promise<number | null> {
  try {
    const usd = await plsUsd();
    if (usd === null) return null;
    if (symbol === "PLS") {
      const pls = Number(amount) / 1e18;
      return Number.isFinite(pls) && pls > 0 ? pls * usd : null;
    }
    const cfg = WPLS_PAIRS[symbol];
    if (!cfg) return null;
    let raw: string | null = null;
    for (const tag of [blockTag, "latest"]) {
      try {
        raw = (await rpcCall("eth_call", [{ to: cfg.pair, data: GET_RESERVES_SELECTOR }, tag])) as
          string | null;
        if (raw && raw.length >= 130) break;
        raw = null;
      } catch {
        raw = null;
      }
    }
    if (!raw) return null;
    const reserve0 = BigInt(`0x${raw.slice(2, 66)}`);
    const reserve1 = BigInt(`0x${raw.slice(66, 130)}`);
    if (reserve0 <= 0n || reserve1 <= 0n) return null;
    const reserveWpls = cfg.wplsIsToken0 ? reserve0 : reserve1;
    const reserveToken = cfg.wplsIsToken0 ? reserve1 : reserve0;
    const wplsPerToken = Number(reserveWpls) / 1e18 / (Number(reserveToken) / 10 ** cfg.decimals);
    const tokenAmt = Number(amount) / 10 ** decimals;
    const value = tokenAmt * wplsPerToken * usd;
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Verify a short-lived Pro chat session: the signature must recover to
 * the claimed address over the session message with this exact expiry.
 * Expiry must still be in the future (30s clock-skew slack) and never
 * more than one session TTL ahead (60s skew) — an attacker can't mint
 * long-lived sessions. Local crypto, no RPC: safe on every request.
 */
export async function verifyProSession(
  address: string,
  expiresAt: number,
  signature: string,
): Promise<boolean> {
  if (!isAddress(address)) return false;
  const now = Date.now();
  if (!Number.isFinite(expiresAt) || expiresAt <= now + 30_000) return false;
  if (expiresAt > now + PRO_SESSION_MS + 60_000) return false;
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) return false;
  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message: proSessionMessage(address, expiresAt),
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

/** Current Pro state for an address — shared with /api/ai-chat. */
export async function getProState(env: AiProEnv, address: string): Promise<ProState> {
  const kv = env.ANALYTICS_KV;
  if (!kv || !isAddress(address)) return { pro: false, expiresAt: null };
  try {
    const raw = await kv.get(`aipro:${address.trim().toLowerCase()}`);
    if (!raw) return { pro: false, expiresAt: null };
    const grant = JSON.parse(raw) as { expiresAt?: number };
    if (
      typeof grant.expiresAt !== "number" ||
      !Number.isFinite(grant.expiresAt) ||
      grant.expiresAt <= Date.now()
    ) {
      return { pro: false, expiresAt: null };
    }
    return { pro: true, expiresAt: grant.expiresAt };
  } catch {
    return { pro: false, expiresAt: null };
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleAiProStatus(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  const state = await getProState(getEnv(request), address);
  return json(state);
}

/** Public config for the upgrade flow: the model wallet + accepted tokens. */
export async function handleAiProConfig(request: Request): Promise<Response> {
  return json({
    modelWallet: getModelWallet(getEnv(request)),
    payTokens: PRO_PAY_TOKENS.map((t) => ({
      symbol: t.symbol,
      address: t.address,
      decimals: t.decimals,
    })),
  });
}

// Cached PLS/USD for client price displays (the Pro pay button, proof
// tiles, etc.). Every visitor's phone hitting CoinGecko directly gets
// rate-limited — and CryptoCompare now requires an API key, so the old
// no-key fallback is dead. The worker makes at most one upstream call per
// 5 minutes and shares it with everyone. Same CoinGecko source the
// activation path already uses — no new dependency. A stale cached value
// is served rather than nothing; a price is never invented.
let plsCache: { usd: number; at: number } | null = null;
const PLS_CACHE_MS = 5 * 60_000;

export async function handlePlsPrice(): Promise<Response> {
  const now = Date.now();
  if (plsCache && now - plsCache.at < PLS_CACHE_MS) {
    return json({ usd: plsCache.usd, cached: true });
  }
  const usd = await plsUsd();
  if (usd === null) {
    if (plsCache) return json({ usd: plsCache.usd, cached: true, stale: true });
    return json({ ok: false, reason: "Price unavailable." }, 502);
  }
  plsCache = { usd, at: now };
  return json({ usd });
}

export async function handleAiProActivate(request: Request): Promise<Response> {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return new Response("body too large", { status: 413 });
    body = JSON.parse(raw) as unknown;
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }
  const b = body as {
    address?: unknown;
    burnTxHash?: unknown;
    modelTxHash?: unknown;
    signature?: unknown;
  };
  const address = typeof b.address === "string" ? b.address.trim() : "";
  const burnTxHash = typeof b.burnTxHash === "string" ? b.burnTxHash.trim() : "";
  const modelTxHash = typeof b.modelTxHash === "string" ? b.modelTxHash.trim() : "";
  const signature = typeof b.signature === "string" ? b.signature.trim() : "";
  if (!isAddress(address)) return json({ ok: false, reason: "Invalid wallet address." }, 400);
  if (!HEX64.test(burnTxHash) || !HEX64.test(modelTxHash)) {
    return json({ ok: false, reason: "Invalid transaction hash." }, 400);
  }
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
    return json({ ok: false, reason: "Invalid signature." }, 400);
  }

  // The signature must name this address AND both tx hashes — otherwise
  // anyone could replay someone else's transfers for their own Pro.
  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: address as `0x${string}`,
      message: proActivationMessage(address, burnTxHash, modelTxHash),
      signature: signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) {
    return json(
      {
        ok: false,
        reason: "Signature didn't match — sign the activation message with your wallet.",
      },
      400,
    );
  }

  const env = getEnv(request);
  const kv = env.ANALYTICS_KV;
  if (!kv) return json({ ok: false, reason: "Pro activation is unavailable right now." }, 503);
  const modelWallet = getModelWallet(env);
  if (!modelWallet) {
    return json(
      { ok: false, reason: "The Pro split isn't configured yet — check back soon." },
      503,
    );
  }

  const burnKey = `aiprotx:${burnTxHash.toLowerCase()}`;
  const modelKey = `aiprotx:${modelTxHash.toLowerCase()}`;
  try {
    if ((await kv.get(burnKey)) || (await kv.get(modelKey))) {
      return json(
        { ok: false, reason: "Those transfers were already used for a Pro activation." },
        409,
      );
    }
  } catch {
    return json({ ok: false, reason: "Couldn't reach the grant store — try again." }, 503);
  }

  // 80% leg: DUMB provably arriving at dead (direct transfer or swap),
  // valued at the block the burn was mined in.
  const burn = await verifyBurnLeg(address, burnTxHash);
  if (!burn.ok) return json({ ok: false, reason: burn.reason }, 400);
  const burnUsd = await tokenUsdValue("DUMB", burn.arrived, 18, burn.blockNumber);
  if (burnUsd === null) {
    return json(
      { ok: false, reason: "Couldn't price the burn right now — try again in a moment." },
      502,
    );
  }
  // Swap burns lose value to slippage + DUMB's arrival tax, so the floor
  // is path-aware. Both floors sit just under the expected arrival to
  // absorb a small adverse price move between quote and mining.
  const burnMinUsd = burn.viaSwap ? PRO_BURN_SWAP_MIN_USD : PRO_BURN_MIN_USD;
  if (burnUsd < burnMinUsd) {
    return json(
      {
        ok: false,
        reason: `The burn was worth about $${burnUsd.toFixed(2)} — Pro needs $${burnMinUsd} of DUMB burned.`,
        burnedUsd: burnUsd,
      },
      400,
    );
  }

  // 20% leg: the payment token provably arriving at the model wallet,
  // valued at the block the payment was mined in.
  const model = await verifyModelLeg(address, modelTxHash, modelWallet);
  if (!model.ok) return json({ ok: false, reason: model.reason }, 400);
  const payToken = PRO_PAY_TOKENS.find((t) => t.symbol === model.token);
  const modelUsd = await tokenUsdValue(
    model.token,
    model.arrived,
    payToken?.decimals ?? 18,
    model.blockNumber,
  );
  if (modelUsd === null) {
    return json(
      { ok: false, reason: "Couldn't price the model payment right now — try again in a moment." },
      502,
    );
  }
  if (modelUsd < PRO_MODEL_MIN_USD) {
    return json(
      {
        ok: false,
        reason: `The model payment was worth about $${modelUsd.toFixed(2)} — Pro needs $${PRO_MODEL_MIN_USD} for the models.`,
        modelUsd,
      },
      400,
    );
  }

  const expiresAt = Date.now() + PRO_DAYS * 86_400_000;
  const ttl = (PRO_DAYS + 1) * 86_400;
  try {
    await kv.put(
      `aipro:${address.toLowerCase()}`,
      JSON.stringify({
        expiresAt,
        burnTxHash: burnTxHash.toLowerCase(),
        modelTxHash: modelTxHash.toLowerCase(),
        payToken: model.token,
      }),
      { expirationTtl: ttl },
    );
    await kv.put(burnKey, address.toLowerCase(), { expirationTtl: ttl });
    await kv.put(modelKey, address.toLowerCase(), { expirationTtl: ttl });
  } catch {
    return json({ ok: false, reason: "Couldn't write the Pro grant — try again." }, 503);
  }
  return json({ ok: true, expiresAt, burnedUsd: burnUsd, modelUsd });
}
