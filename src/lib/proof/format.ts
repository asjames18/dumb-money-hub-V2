// Shared formatting and transport helpers for the on-chain fetchers
// (fetch-roots). The Proof Hub metric helpers were removed with the
// shelved DumpCurve track (2026-09-26); what remains serves /roots.

import { RPC_TIMEOUT_MS } from "./chains";

export const DECIMALS = 18;
export const DEAD = "0x000000000000000000000000000000000000dEaD";
export const ZERO = "0x0000000000000000000000000000000000000000";

export const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export const formatUnits = (raw: string, decimals = DECIMALS) => {
  try {
    const neg = raw.startsWith("-");
    const digits = neg ? raw.slice(1) : raw;
    if (!/^\d+$/.test(digits)) return raw;
    const padded = digits.padStart(decimals + 1, "0");
    const whole = padded.slice(0, -decimals) || "0";
    const frac = padded.slice(-decimals).replace(/0+$/, "");
    const num = Number(`${whole}.${frac || "0"}`);
    if (!Number.isFinite(num)) return `${whole}${frac ? `.${frac.slice(0, 4)}` : ""}`;
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num);
  } catch {
    return raw;
  }
};

export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);

/** Renders a wei amount as PLS with enough precision for sub-gwei values. */
export const formatPls = (wei: bigint, maxFrac = 9) => {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, maxFrac);
  const trimmed = frac.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : `${whole}`;
};

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

type RpcResponse = { result?: string; error?: { message?: string } };

/** Single `eth_call`. Returns the raw hex result, or null on any failure. */
export async function ethCall(rpc: string, to: string, data: string): Promise<string | null> {
  try {
    const res = await getJson<RpcResponse>(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });
    if (!res.result || res.result === "0x") return null;
    return res.result;
  } catch {
    return null;
  }
}

/** Native balance of an address, in wei. Null on failure. */
export async function plsBalance(rpc: string, address: string): Promise<bigint | null> {
  try {
    const res = await getJson<RpcResponse>(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    });
    if (!res.result) return null;
    return BigInt(res.result);
  } catch {
    return null;
  }
}

/** Reads the first 32-byte word of an eth_call result as a uint256. */
export const asUint = (hex: string | null): bigint | null => {
  if (!hex) return null;
  try {
    const body = hex.replace(/^0x/, "");
    if (body.length < 64) return null;
    return BigInt(`0x${body.slice(0, 64)}`);
  } catch {
    return null;
  }
};

/** Reads the Nth 32-byte word of a multi-return eth_call result. */
export const asUintAt = (hex: string | null, index: number): bigint | null => {
  if (!hex) return null;
  try {
    const body = hex.replace(/^0x/, "");
    const start = index * 64;
    if (body.length < start + 64) return null;
    return BigInt(`0x${body.slice(start, start + 64)}`);
  } catch {
    return null;
  }
};

/** Left-pads an address into a 32-byte ABI word. */
export const abiAddress = (addr: string) => addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");

/** Encodes a uint256 as a 32-byte ABI word. */
export const abiUint = (v: bigint) => v.toString(16).padStart(64, "0");
