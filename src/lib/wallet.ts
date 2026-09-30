// Minimal EIP-1193 wallet layer.
//
// Deliberately dependency-free. wagmi + viem + a connector kit is ~200kB and a
// provider tree for what is, here, one contract with two write methods. This
// talks to `window.ethereum` directly, which every injected wallet implements —
// MetaMask, Rabby, Frame, Coinbase Wallet.
//
// This file never sees a private key. Every state change goes out as an
// eth_sendTransaction the wallet renders and the user approves.

import { CHAINS, type ChainKey } from "./proof/chains";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const getProvider = (): Eip1193Provider | null =>
  typeof window !== "undefined" && window.ethereum ? window.ethereum : null;

export const hasWallet = () => getProvider() !== null;

export class WalletError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "WalletError";
  }
}

/** Turns the wallet's rejection codes into something a person can read. */
const humanize = (err: unknown): WalletError => {
  const e = err as { code?: number; message?: string };
  if (e?.code === 4001) return new WalletError("You rejected the request.", 4001);
  if (e?.code === -32002)
    return new WalletError(
      "Your wallet already has a pending request — open it and finish that first.",
      -32002,
    );
  return new WalletError(e?.message ?? "Wallet request failed", e?.code);
};

async function req<T>(method: string, params?: unknown[]): Promise<T> {
  const p = getProvider();
  if (!p) throw new WalletError("No wallet found. Install MetaMask or another Web3 wallet.");
  try {
    return (await p.request({ method, ...(params ? { params } : {}) })) as T;
  } catch (err) {
    throw humanize(err);
  }
}

export async function connect(): Promise<string> {
  const accounts = await req<string[]>("eth_requestAccounts");
  const first = accounts?.[0];
  if (!first) throw new WalletError("Wallet returned no accounts.");
  return first;
}

export async function currentAccount(): Promise<string | null> {
  const p = getProvider();
  if (!p) return null;
  try {
    const accounts = (await p.request({ method: "eth_accounts" })) as string[];
    return accounts?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function currentChainId(): Promise<number | null> {
  try {
    const hex = await req<string>("eth_chainId");
    return Number.parseInt(hex, 16);
  } catch {
    return null;
  }
}

/**
 * Ensures the wallet is on the right network, adding it first if the wallet
 * has never seen it — which is the normal case for a testnet.
 */
export async function ensureChain(key: ChainKey): Promise<void> {
  const chain = CHAINS[key];
  const target = `0x${chain.chainId.toString(16)}`;
  const now = await currentChainId();
  if (now === chain.chainId) return;

  try {
    await req("wallet_switchEthereumChain", [{ chainId: target }]);
  } catch (err) {
    // 4902 = chain unknown to the wallet. Offer to add it, then switch.
    if ((err as WalletError).code === 4902) {
      await req("wallet_addEthereumChain", [
        {
          chainId: target,
          chainName: chain.label,
          nativeCurrency: { name: "PLS", symbol: "PLS", decimals: 18 },
          rpcUrls: [chain.rpc],
          blockExplorerUrls: [chain.explorer],
        },
      ]);
      await req("wallet_switchEthereumChain", [{ chainId: target }]);
      return;
    }
    throw err;
  }
}

// ---------------------------------------------------------------- encoding

export const SELECTORS = {
  buy: "0x40993b26", // buy(uint256,uint256,uint256)
  sell: "0xd3c9727c", // sell(uint256,uint256,uint256)
  quoteBuy: "0x4beb394c", // quoteBuy(uint256)
  quoteSell: "0xa64190c4", // quoteSell(uint256)
  balanceOf: "0x70a08231", // balanceOf(address)
  floorPrice: "0x9363c812", // floorPrice()
  spotPrice: "0x398482d8", // spotPrice()
  totalSupply: "0x18160ddd", // totalSupply()
  maxSupply: "0xd5abeb01", // maxSupply()
} as const;

const pad = (v: bigint) => v.toString(16).padStart(64, "0");
const padAddr = (a: string) => a.replace(/^0x/, "").toLowerCase().padStart(64, "0");

export const encodeBuy = (tokens: bigint, maxCost: bigint, deadline: bigint) =>
  SELECTORS.buy + pad(tokens) + pad(maxCost) + pad(deadline);

export const encodeSell = (tokens: bigint, minPayout: bigint, deadline: bigint) =>
  SELECTORS.sell + pad(tokens) + pad(minPayout) + pad(deadline);

export const encodeQuoteBuy = (tokens: bigint) => SELECTORS.quoteBuy + pad(tokens);
export const encodeQuoteSell = (tokens: bigint) => SELECTORS.quoteSell + pad(tokens);
export const encodeBalanceOf = (who: string) => SELECTORS.balanceOf + padAddr(who);

// ---------------------------------------------------------------- calls

export async function ethCallVia(to: string, data: string): Promise<string> {
  return req<string>("eth_call", [{ to, data }, "latest"]);
}

export async function sendTx(args: {
  from: string;
  to: string;
  data: string;
  value?: bigint;
}): Promise<string> {
  return req<string>("eth_sendTransaction", [
    {
      from: args.from,
      to: args.to,
      data: args.data,
      ...(args.value != null ? { value: `0x${args.value.toString(16)}` } : {}),
    },
  ]);
}

/** Polls for a receipt. Resolves true on success, false on a reverted tx. */
export async function waitForReceipt(hash: string, timeoutMs = 90_000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await req<{ status?: string } | null>("eth_getTransactionReceipt", [hash]);
      if (r) return r.status === "0x1";
    } catch {
      // Transient RPC failures are expected while a tx is propagating.
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  throw new WalletError("Timed out waiting for confirmation. Check your wallet or the explorer.");
}

/** Reads the first two 32-byte words of a call result (cost, fee). */
export const decodePair = (hex: string): [bigint, bigint] => {
  const b = hex.replace(/^0x/, "");
  if (b.length < 128) return [0n, 0n];
  return [BigInt(`0x${b.slice(0, 64)}`), BigInt(`0x${b.slice(64, 128)}`)];
};

export const decodeUint = (hex: string): bigint => {
  const b = hex.replace(/^0x/, "");
  return b.length >= 64 ? BigInt(`0x${b.slice(0, 64)}`) : 0n;
};
