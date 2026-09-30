import { useEffect } from "react";
import { usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { ShieldCheck } from "lucide-react";

import {
  DAMP,
  DUMB,
  erc20Abi,
  HELGO,
  HEX,
  INC,
  PCOCK,
  PLSX,
  PRVX,
  PTGC,
  PULSEX_V2_ROUTER,
  pulsechain,
  SOLIDX,
  TEDDY,
  WBTC,
  WPLS,
} from "@/lib/pulsechain";

const MAX_UINT = 2n ** 256n - 1n;

/** Tokens the swap box trades — the only contracts this site has ever asked
 *  a wallet to approve (the PulseX v2 router). Approvals granted on other
 *  sites are out of scope for this scan, by design. */
const TOKENS = [
  { key: "DUMB", address: DUMB, decimals: 18 },
  { key: "DAMP", address: DAMP, decimals: 18 },
  { key: "WPLS", address: WPLS, decimals: 18 },
  { key: "HEX", address: HEX, decimals: 8 },
  { key: "TEDDY", address: TEDDY, decimals: 18 },
  { key: "SOLIDX", address: SOLIDX, decimals: 18 },
  { key: "PCOCK", address: PCOCK, decimals: 18 },
  { key: "HELGO", address: HELGO, decimals: 18 },
  { key: "INC", address: INC, decimals: 18 },
  { key: "PLSX", address: PLSX, decimals: 18 },
  { key: "PRVX", address: PRVX, decimals: 18 },
  { key: "pTGC", address: PTGC, decimals: 18 },
  { key: "WBTC", address: WBTC, decimals: 8 },
] as const;

function fmtTok(bi: bigint, decimals: number): string {
  const s = formatUnits(bi, decimals);
  const [i, d = ""] = s.split(".");
  const int = Number(i).toLocaleString("en-US");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  return dec ? `${int}.${dec}` : int;
}

function useRouterAllowances(wallet: `0x${string}` | undefined) {
  const client = usePublicClient({ chainId: pulsechain.id });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["router-allowances", wallet ?? "none"],
    queryFn: async (): Promise<Record<string, bigint | null>> => {
      if (!client || !wallet) return {};
      const entries = await Promise.all(
        TOKENS.map(async (t) => {
          try {
            const a = (await client.readContract({
              address: t.address,
              abi: erc20Abi,
              functionName: "allowance",
              args: [wallet, PULSEX_V2_ROUTER],
            })) as unknown as bigint;
            return [t.key, typeof a === "bigint" ? a : null] as const;
          } catch {
            return [t.key, null] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: !!wallet,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  return { allowances: data ?? {}, loading: isLoading, error: isError, refetch };
}

function RevokeButton({
  token,
  onRevoked,
}: {
  token: (typeof TOKENS)[number];
  onRevoked: () => void;
}) {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({ hash });
  const confirmed = !!receipt && receipt.status === "success";
  const reverted = !!receipt && receipt.status === "reverted";

  useEffect(() => {
    if (!confirmed) return;
    const t = setTimeout(onRevoked, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  if (confirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400">
        Revoked ✓
      </span>
    );
  }

  const busy = isPending || confirming;
  return (
    <div className="text-right">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          reset();
          writeContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "approve",
            args: [PULSEX_V2_ROUTER, 0n],
          });
        }}
        className="rounded-md border-2 border-gold/60 px-3 py-1.5 font-display text-xs uppercase tracking-widest text-gold hover:bg-gold/10 disabled:cursor-wait disabled:opacity-50"
      >
        {isPending ? "Check wallet…" : confirming ? "Confirming…" : "Revoke"}
      </button>
      {writeError && !isPending ? (
        <p className="mt-1 text-[11px] text-muted-foreground">Rejected — nothing changed.</p>
      ) : null}
      {reverted ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Reverted on-chain — nothing changed.
        </p>
      ) : null}
    </div>
  );
}

export function ApprovalChecker({ wallet }: { wallet: `0x${string}` }) {
  const { allowances, loading, error, refetch } = useRouterAllowances(wallet);

  const nonzero = TOKENS.filter((t) => (allowances[t.key] ?? 0n) > 0n);
  const unlimited = nonzero.filter((t) => allowances[t.key] === MAX_UINT);

  return (
    <div className="mt-6 border-t border-foreground/10 pt-5">
      <p className="flex items-center gap-2 font-display text-xl uppercase tracking-wide">
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        Token approvals
      </p>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        Every swap on this site asks your wallet to approve the PulseX router so it can move your
        tokens during the trade. Those approvals stay open until you revoke them — handy for
        trading, but good hygiene to revoke when you&apos;re done. This scans the verified tokens
        this site trades; approvals you granted anywhere else won&apos;t show here.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border-2 border-red-500/60 bg-red-500/10 p-4 text-sm leading-relaxed">
          <p className="font-bold text-foreground">Couldn&apos;t read approvals.</p>
          <p className="mt-1 text-muted-foreground">
            The PulseChain RPC may be down or rate-limiting.{" "}
            <button
              type="button"
              onClick={() => refetch()}
              className="font-bold text-primary hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      ) : loading ? (
        <p className="mt-4 text-xs text-muted-foreground">Reading approvals…</p>
      ) : nonzero.length === 0 ? (
        <p className="mt-4 rounded-lg border border-foreground/15 bg-background p-4 text-sm text-muted-foreground">
          All clear — the PulseX router currently can&apos;t move any of these tokens from your
          wallet.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-foreground/15">
          {nonzero.map((t) => {
            const a = allowances[t.key] ?? 0n;
            const isUnlimited = a === MAX_UINT;
            return (
              <div
                key={t.key}
                className="flex items-center justify-between gap-4 border-b border-foreground/10 bg-background px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="font-display text-lg uppercase tracking-wide">{t.key}</p>
                  <p className="text-xs text-muted-foreground">
                    {isUnlimited ? (
                      <span className="font-bold text-gold">Unlimited — revoke when done</span>
                    ) : (
                      `Can move up to ${fmtTok(a, t.decimals)} ${t.key}`
                    )}
                  </p>
                </div>
                <RevokeButton token={t} onRevoked={() => refetch()} />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
        Revoking sets the allowance to zero — it never moves your tokens, and it costs only a little
        PLS for gas.{" "}
        {unlimited.length > 0
          ? "Unlimited approvals are normal for frequent trading, but they&apos;re also the first thing a drained wallet wishes it had revoked."
          : null}
      </p>
    </div>
  );
}
