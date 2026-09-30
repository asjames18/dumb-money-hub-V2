import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useBalance, usePublicClient, useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { ArrowUpRight, TriangleAlert, Wallet } from "lucide-react";

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
  pulsechain,
  SOLIDX,
  TEDDY,
  WBTC,
  WPLS,
} from "@/lib/pulsechain";
import { fmtUsd, priceAgeLabel, usePlsPrice, weiToUsd } from "@/lib/pls-price";
import { useTokenPrices } from "@/lib/token-prices";
import { ApprovalChecker } from "@/components/dumb/ApprovalChecker";
import { ConnectButton } from "@/components/dumb/ConnectButton";
import { ContractGuardrail } from "@/components/dumb/ContractGuardrail";
import { CopyButton } from "@/components/dumb/CopyButton";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { PageShell } from "@/components/dumb/PageShell";
import { UsernameCard } from "@/components/dumb/UsernameCard";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Wallet — Dumb Money Hub";
const DESCRIPTION =
  "Your PulseChain wallet holdings — PLS, DUMB, DAMP and every verified token this wallet holds, read straight from the chain. Read-only: the site never moves your funds.";

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

/** The site's curated ("verified") token list — same contracts the swap box trades. */
const VERIFIED_TOKENS = [
  { key: "WPLS", name: "Wrapped Pulse — 1:1 with PLS", address: WPLS, decimals: 18 },
  { key: "HEX", name: "HEX", address: HEX, decimals: 8 },
  { key: "TEDDY", name: "Teddy Bear", address: TEDDY, decimals: 18 },
  { key: "SOLIDX", name: "Solid X", address: SOLIDX, decimals: 18 },
  { key: "PCOCK", name: "PulseChain Peacock", address: PCOCK, decimals: 18 },
  { key: "HELGO", name: "HELGO", address: HELGO, decimals: 18 },
  { key: "INC", name: "INC", address: INC, decimals: 18 },
  { key: "PLSX", name: "PulseX", address: PLSX, decimals: 18 },
  { key: "PRVX", name: "PRVX", address: PRVX, decimals: 18 },
  { key: "pTGC", name: "pTGC", address: PTGC, decimals: 18 },
  { key: "WBTC", name: "Wrapped BTC", address: WBTC, decimals: 8 },
] as const;

/**
 * Balances for the verified list. Single readContract calls (the proven
 * primitive on PulseChain — multicall3 isn't deployed there), one per token,
 * failures resolve to 0n for that token, never throw.
 */
function useVerifiedBalances(wallet: `0x${string}` | undefined, onPulse: boolean) {
  const client = usePublicClient({ chainId: pulsechain.id });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["verified-balances", wallet ?? "none"],
    queryFn: async (): Promise<Record<string, bigint>> => {
      if (!client || !wallet) return {};
      const entries = await Promise.all(
        VERIFIED_TOKENS.map(async (t) => {
          try {
            const bal = (await client.readContract({
              address: t.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [wallet],
            })) as unknown as bigint;
            return [t.key, typeof bal === "bigint" ? bal : 0n] as const;
          } catch {
            return [t.key, 0n] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: !!wallet && onPulse,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  return { balances: data ?? {}, vLoading: isLoading, refetchVerified: refetch };
}

/** Compact token amount: up to 4 significant decimals, no trailing zeros. */
function fmtTok(bi: bigint | null | undefined, decimals = 18): string {
  if (bi == null) return "—";
  const s = formatUnits(bi, decimals);
  const [i, d = ""] = s.split(".");
  const int = Number(i).toLocaleString("en-US");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  return dec ? `${int}.${dec}` : int;
}

export const Route = createFileRoute("/wallet")({
  head: () => pageMeta("/wallet", TITLE, DESCRIPTION),
  component: WalletPage,
});

function WalletPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Disclaimer className="mb-6" />
        <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">Wallet</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-6xl">
          What&apos;s in your wallet
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Read-only balances on PulseChain — PLS, DUMB, DAMP, and every verified token this wallet
          holds, pulled straight from the chain. This page can never move your funds; only your
          wallet signs transactions.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
          PulseChain · mainnet · 369
        </p>
        <div className="mt-8">
          <ContractGuardrail />
        </div>
        <div className="mt-8">
          <Holdings />
        </div>
        <div className="mt-8 max-w-2xl">
          <UsernameCard />
        </div>
      </main>
    </PageShell>
  );
}

function Holdings() {
  const { address, chainId } = useAccount();
  const onPulse = chainId === pulsechain.id;
  const zero = "0x0000000000000000000000000000000000000000" as const;

  const {
    data: plsBal,
    isLoading: plsLoading,
    isError: plsError,
    refetch: refetchPls,
  } = useBalance({ address, query: { enabled: !!address && onPulse } });
  const {
    data: dumbBal,
    isLoading: dumbLoading,
    isError: dumbError,
    refetch: refetchDumb,
  } = useReadContract({
    address: DUMB,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? zero],
    query: { enabled: !!address && onPulse },
  });
  const {
    data: dampBal,
    isLoading: dampLoading,
    isError: dampError,
    refetch: refetchDamp,
  } = useReadContract({
    address: DAMP,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? zero],
    query: { enabled: !!address && onPulse },
  });

  const {
    data: plsUsd,
    isLoading: priceLoading,
    isError: priceError,
    dataUpdatedAt,
  } = usePlsPrice();
  const prices = useTokenPrices();
  const { balances, vLoading, refetchVerified } = useVerifiedBalances(address, onPulse);

  if (!address) {
    return (
      <div className="rounded-xl border-2 border-primary/50 bg-card p-8 text-center">
        <Wallet className="mx-auto size-8 text-primary" />
        <p className="mt-3 font-display text-xl uppercase tracking-wide">
          Connect to see your holdings
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your PLS, DUMB, DAMP and verified token balances on PulseChain — read straight from the
          chain, never moved by this site.
        </p>
        <div className="mt-5 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!onPulse) {
    return (
      <div className="rounded-xl border-2 border-gold/60 bg-card p-8 text-center">
        <TriangleAlert className="mx-auto size-8 text-gold" />
        <p className="mt-3 font-display text-xl uppercase tracking-wide">Wrong network</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your wallet is connected but not on PulseChain. Switch networks to see your holdings.
        </p>
        <div className="mt-5 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const loading = plsLoading || dumbLoading || dampLoading;
  const rpcError = plsError || dumbError || dampError;
  const retry = () => {
    void refetchPls();
    void refetchDumb();
    void refetchDamp();
    void refetchVerified();
  };

  const held = VERIFIED_TOKENS.filter((t) => (balances[t.key] ?? 0n) > 0n);
  const usdFor = (key: string, bal: bigint, decimals: number): string | undefined => {
    const price = key === "WPLS" ? plsUsd : (prices as Record<string, number | null>)[key];
    if (price == null || bal <= 0n) return undefined;
    return `~${fmtUsd((Number(bal) / 10 ** decimals) * price)} est.`;
  };

  const explorerAddr = `${pulsechain.blockExplorers.default.url}/address/${address}`;
  const plsValue = plsUsd != null && plsBal ? fmtUsd(weiToUsd(plsBal.value, plsUsd)) : "—";
  const age = priceAgeLabel(dataUpdatedAt);
  // DUMB/DAMP dollar figures are on-chain estimates (verified WPLS pair
  // reserves × PLS/USD) — "~…est."; null renders nothing, the token amount
  // stands alone.
  const dumbValue =
    prices.DUMB != null && dumbBal != null
      ? `~${fmtUsd((Number(dumbBal) / 1e18) * prices.DUMB)} est.`
      : undefined;
  const dampValue =
    prices.DAMP != null && dampBal != null
      ? `~${fmtUsd((Number(dampBal) / 1e18) * prices.DAMP)} est.`
      : undefined;

  return (
    <div className="rounded-xl border-2 border-primary/50 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className="font-mono text-lg">{short(address)}</span>
          <CopyButton value={address} label="wallet address" />
          <a
            href={explorerAddr}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Explorer <ArrowUpRight className="size-3" />
          </a>
        </div>
        <Link
          to="/trade"
          className="rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
        >
          Trade
        </Link>
      </div>

      {rpcError ? (
        <div className="mt-6 rounded-lg border-2 border-red-500/60 bg-red-500/10 p-4 text-sm leading-relaxed">
          <p className="font-bold text-foreground">Couldn&apos;t read balances.</p>
          <p className="mt-1 text-muted-foreground">
            The PulseChain RPC may be down or rate-limiting. Your funds are safe — this is a read
            problem, not a wallet problem.{" "}
            <button
              type="button"
              onClick={retry}
              className="font-bold text-primary hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-foreground/15">
          <Row
            symbol="PLS"
            name="Pulse — native gas token"
            balance={loading ? null : (plsBal?.value ?? null)}
            loading={loading}
            usd={priceLoading ? "…" : priceError ? "—" : plsValue}
            usdNote={age ?? undefined}
          />
          <Row
            symbol="DUMB"
            name="Dumb Money — 6% transfer tax"
            balance={loading ? null : (dumbBal ?? null)}
            loading={loading}
            usd={dumbValue}
          />
          <Row
            symbol="DAMP"
            name="Dumb Amplifier — 3% transfer tax"
            balance={loading ? null : (dampBal ?? null)}
            loading={loading}
            usd={dampValue}
          />
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        PLS dollars use the site price feed. DUMB and DAMP figures are estimates from their WPLS
        pair reserves × PLS/USD — indicative only, execution price varies. Balances refresh when you
        revisit the page.
      </p>

      {vLoading ? (
        <p className="mt-6 text-xs text-muted-foreground">Reading verified tokens…</p>
      ) : held.length > 0 ? (
        <div className="mt-6 border-t border-foreground/10 pt-5">
          <p className="font-display text-xl uppercase tracking-wide">Verified tokens</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Other curated tokens held by this wallet — the same verified contracts the swap box
            trades. Only tokens with a balance are listed.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-foreground/15">
            {held.map((t) => (
              <Row
                key={t.key}
                symbol={t.key}
                name={t.name}
                tokenAddr={t.address}
                balance={balances[t.key] ?? null}
                decimals={t.decimals}
                loading={false}
                usd={usdFor(t.key, balances[t.key] ?? 0n, t.decimals)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <ApprovalChecker wallet={address} />
    </div>
  );
}

function Row({
  symbol,
  name,
  tokenAddr,
  balance,
  decimals = 18,
  loading,
  usd,
  usdNote,
}: {
  symbol: string;
  name: string;
  tokenAddr?: string | undefined;
  balance: bigint | null;
  decimals?: number | undefined;
  loading: boolean;
  usd?: string | undefined;
  usdNote?: string | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-foreground/10 bg-background px-4 py-4 last:border-b-0">
      <div>
        <p className="font-display text-lg uppercase tracking-wide">{symbol}</p>
        <p className="text-xs text-muted-foreground">
          {name}
          {tokenAddr ? (
            <>
              {" · "}
              <a
                href={`${pulsechain.blockExplorers.default.url}/address/${tokenAddr}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary hover:underline"
              >
                {short(tokenAddr)}
              </a>
            </>
          ) : null}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-xl">{loading ? "…" : fmtTok(balance, decimals)}</p>
        {usd ? (
          <p className="text-xs text-muted-foreground">
            {usd}
            {usdNote ? <span> {usdNote}</span> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
