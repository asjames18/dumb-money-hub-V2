import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { ArrowUpRight, Bot, RefreshCw, ScanSearch, Wallet } from "lucide-react";

import { explorerAddress, pulsechain } from "@/lib/pulsechain";
import { fmtUsd, usePlsPrice, weiToUsd } from "@/lib/pls-price";
import { useTokenPrices } from "@/lib/token-prices";
import {
  WALLET_WATCH_EVENT,
  diffSnapshots,
  getWalletEntry,
  isWalletWatched,
  notifyWalletWatchChanged,
  recordSnapshot,
  snapshotFromIntel,
  type WatchChange,
} from "@/lib/watchlist";
import { ApprovalChecker } from "./ApprovalChecker";
import { ConnectButton } from "./ConnectButton";
import { CopyButton } from "./CopyButton";
import { WhatsNewBanner, WatchToggleButton } from "./WalletWatch";
import {
  buildObservations,
  CURATED,
  describeTx,
  fetchIntelPls,
  fetchIntelTokens,
  fetchIntelTxs,
  shortAddr,
  timeAgo,
  type HealthObservation,
  type IntelToken,
} from "@/lib/wallet-intel";

/** Suggested wallet questions — deep-link to /ai with the question prefilled. */
const ASK_SUGGESTIONS = [
  "What changed in my wallet today?",
  "What are my largest holdings?",
  "Do I have any risky approvals?",
  "Explain my last transaction.",
];

/**
 * Holdings render cap — a pathological wallet (e.g. the dead address with
 * 120k+ tokens) hard-crashes the renderer if every row mounts at once.
 * Priced holdings come first (highest value), the rest page in on demand.
 */
const HOLDINGS_STEP = 50;

function fmtTok(balance: bigint, decimals: number): string {
  const s = formatUnits(balance, decimals);
  const [i, d = ""] = s.split(".");
  const int = Number(i).toLocaleString("en-US");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  return dec ? `${int}.${dec}` : int;
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border-2 border-foreground/15 bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      <span
        className="mr-2 inline-block size-3 animate-pulse rounded-full bg-primary align-middle"
        aria-hidden="true"
      />
      {label}…
    </p>
  );
}

function ErrorCard({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border-2 border-red-500/60 bg-red-500/10 p-4 text-sm leading-relaxed">
      <p className="font-bold text-foreground">Couldn&apos;t load {label}.</p>
      <p className="mt-1 text-muted-foreground">
        The PulseChain explorer API may be slow or rate-limiting. Your funds are safe — this is a
        read problem, not a wallet problem.{" "}
        <button type="button" onClick={onRetry} className="font-bold text-primary hover:underline">
          Try again
        </button>
      </p>
    </div>
  );
}

const toneStyles: Record<HealthObservation["tone"], string> = {
  ok: "border-emerald-500/50",
  review: "border-gold/60",
  info: "border-primary/50",
};

/**
 * Instant Wallet Intelligence — the product-thesis test.
 * Connect (or paste an address) → portfolio summary, holdings + values,
 * allocation, recent activity in plain English, health observations, Ask Dumb.
 * Read-only: every number comes from public chain/explorer reads, nothing is
 * persisted, and the site can never move funds.
 */
export function PortfolioDashboard({ address }: { address: string }) {
  const { address: connected } = useAccount();
  const isOwn = connected?.toLowerCase() === address.toLowerCase();

  const tokensQuery = useQuery({
    queryKey: ["intel-tokens", address.toLowerCase()],
    queryFn: () => fetchIntelTokens(address),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const plsQuery = useQuery({
    queryKey: ["intel-pls", address.toLowerCase()],
    queryFn: () => fetchIntelPls(address),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const txsQuery = useQuery({
    queryKey: ["intel-txs", address.toLowerCase()],
    queryFn: () => fetchIntelTxs(address, 8),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: plsUsd } = usePlsPrice();
  const prices = useTokenPrices();

  const tokens = tokensQuery.data ?? null;
  const txs = txsQuery.data ?? null;

  // Holdings list paging — reset whenever the viewed address changes.
  const [holdingsShown, setHoldingsShown] = useState(HOLDINGS_STEP);
  useEffect(() => {
    setHoldingsShown(HOLDINGS_STEP);
  }, [address]);
  const plsWei = plsQuery.data ?? null;

  // Wallet Watch: keep the watchlist ticking so the toggle + banner stay in
  // sync with localStorage (including cross-tab changes).
  const [watchTick, setWatchTick] = useState(0);
  useEffect(() => {
    const bump = () => setWatchTick((t) => t + 1);
    window.addEventListener(WALLET_WATCH_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(WALLET_WATCH_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  const watched = isWalletWatched(address);

  // Snapshot-on-view: when a watched wallet's reads all land, diff the fresh
  // state against the previous snapshot, surface the changes, and store the
  // new snapshot. Dedupe by data signature so identical refetches don't
  // re-diff; no background polling — diffs compute on view only.
  const snapshotKeyRef = useRef<string | null>(null);
  const [watchDiff, setWatchDiff] = useState<WatchChange[] | null | undefined>(undefined);
  useEffect(() => {
    snapshotKeyRef.current = null;
    setWatchDiff(undefined);
  }, [address]);
  useEffect(() => {
    void watchTick;
    if (!watched || tokens == null || plsWei == null || txs == null) return;
    const key = [
      address.toLowerCase(),
      plsWei.toString(),
      tokens.map((t) => `${t.address.toLowerCase()}:${t.balance.toString()}`).join(";"),
      txs.map((t) => t.hash).join(";"),
    ].join("|");
    if (snapshotKeyRef.current === key) return;
    snapshotKeyRef.current = key;
    const prev = getWalletEntry(address)?.lastSnapshot ?? null;
    const next = snapshotFromIntel(plsWei, tokens, txs);
    const diff = prev
      ? diffSnapshots(
          prev,
          next,
          txs.map((t) => t.timeStamp),
        )
      : null;
    recordSnapshot(address, next, diff);
    notifyWalletWatchChanged();
    setWatchDiff(diff);
  }, [address, tokens, plsWei, txs, watched, watchTick]);

  const refreshAll = () => {
    void tokensQuery.refetch();
    void plsQuery.refetch();
    void txsQuery.refetch();
  };

  // USD math — only for tokens the hub can price on-chain. Everything else
  // is shown without a dollar figure, never guessed.
  const usdByToken: Record<string, number> = {};
  if (tokens) {
    for (const t of tokens) {
      const curated = CURATED[t.address.toLowerCase()];
      if (!curated) continue;
      const price = curated.key === "PLS" ? plsUsd : prices[curated.key];
      if (price == null) continue;
      const amount = Number(formatUnits(t.balance, t.decimals));
      if (Number.isFinite(amount) && amount > 0) {
        usdByToken[t.address.toLowerCase()] = amount * price;
      }
    }
  }
  const plsUsdValue = plsWei != null && plsUsd != null ? weiToUsd(plsWei, plsUsd) : null;
  const tokensUsdTotal = Object.values(usdByToken).reduce((s, v) => s + v, 0);
  const portfolioUsd = (plsUsdValue ?? 0) + tokensUsdTotal;
  const hasAnyValue = plsUsdValue != null || Object.keys(usdByToken).length > 0;

  const observations = tokens && txs ? buildObservations({ tokens, txs, usdByToken }) : null;

  const pricedHoldings = (tokens ?? [])
    .map((t) => ({ token: t, usd: usdByToken[t.address.toLowerCase()] ?? null }))
    .filter((h) => h.usd != null)
    .sort((a, b) => (b.usd as number) - (a.usd as number));
  const unpricedCount = (tokens ?? []).length - pricedHoldings.length;
  const allocTotal = pricedHoldings.reduce((s, h) => s + (h.usd as number), 0);
  const allocTop = pricedHoldings.slice(0, 5);
  const allocOther = allocTotal - allocTop.reduce((s, h) => s + (h.usd as number), 0);

  // Render order: priced holdings first (highest value), then the rest —
  // sliced so a pathological wallet can't mount 120k rows at once.
  const pricedSet = new Set(pricedHoldings.map((h) => h.token.address.toLowerCase()));
  const orderedTokens = [
    ...pricedHoldings.map((h) => h.token),
    ...(tokens ?? []).filter((t) => !pricedSet.has(t.address.toLowerCase())),
  ];
  const visibleTokens = orderedTokens.slice(0, holdingsShown);

  const summaryForClipboard = [
    `Wallet ${address} on PulseChain:`,
    hasAnyValue
      ? `Valued holdings ~${fmtUsd(portfolioUsd)} (priced tokens only).`
      : "No priced holdings.",
    `PLS: ${plsWei != null ? fmtTok(plsWei, 18) : "—"}`,
    ...pricedHoldings
      .slice(0, 5)
      .map(
        (h) =>
          `${h.token.symbol}: ${fmtTok(h.token.balance, h.token.decimals)} (~${fmtUsd(h.usd as number)})`,
      ),
    unpricedCount > 0 ? `${unpricedCount} token(s) without a price feed.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className="font-mono text-lg">{shortAddr(address)}</span>
          <CopyButton value={address} label="wallet address" />
          <a
            href={explorerAddress(address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Explorer <ArrowUpRight className="size-3" />
          </a>
          <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {isOwn ? "Your wallet" : "Watching"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WatchToggleButton address={address} />
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
      </div>

      {watched && watchDiff !== undefined && <WhatsNewBanner diff={watchDiff} />}

      {/* Portfolio summary */}
      <Section title="Portfolio summary">
        {tokensQuery.isLoading || plsQuery.isLoading ? (
          <LoadingLine label="Reading balances" />
        ) : tokensQuery.isError || plsQuery.isError || tokens === null || plsWei === null ? (
          <ErrorCard label="balances" onRetry={refreshAll} />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Valued holdings
                </p>
                <p className="mt-1 font-display text-4xl">
                  {hasAnyValue ? `~${fmtUsd(portfolioUsd)}` : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Priced tokens only —{" "}
                  {unpricedCount > 0
                    ? `${unpricedCount} token${unpricedCount === 1 ? "" : "s"} without a price feed.`
                    : "every holding priced."}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  PLS balance
                </p>
                <p className="mt-1 font-display text-2xl">{fmtTok(plsWei, 18)} PLS</p>
                {plsUsdValue != null && (
                  <p className="mt-1 text-xs text-muted-foreground">~${fmtUsd(plsUsdValue)} est.</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Tokens held
                </p>
                <p className="mt-1 font-display text-2xl">{tokens.length}</p>
              </div>
            </div>
            {allocTotal > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Allocation
                </p>
                <div
                  className="mt-2 flex h-3 overflow-hidden rounded-full bg-secondary"
                  role="img"
                  aria-label="Portfolio allocation by token"
                >
                  {allocTop.map((h, i) => (
                    <div
                      key={h.token.address}
                      className="h-full"
                      style={{
                        width: `${(((h.usd as number) / allocTotal) * 100).toFixed(1)}%`,
                        backgroundColor: `hsl(${(150 + i * 47) % 360} 70% 45%)`,
                      }}
                      title={`${h.token.symbol}: ${(((h.usd as number) / allocTotal) * 100).toFixed(1)}%`}
                    />
                  ))}
                  {allocOther > 0 && (
                    <div
                      className="h-full bg-muted-foreground/40"
                      style={{ width: `${((allocOther / allocTotal) * 100).toFixed(1)}%` }}
                      title={`Other: ${((allocOther / allocTotal) * 100).toFixed(1)}%`}
                    />
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {allocTop.map((h) => (
                    <li key={h.token.address}>
                      <span className="font-bold text-foreground">{h.token.symbol}</span>{" "}
                      {(((h.usd as number) / allocTotal) * 100).toFixed(0)}%
                    </li>
                  ))}
                  {allocOther > 0 && <li>Other {((allocOther / allocTotal) * 100).toFixed(0)}%</li>}
                </ul>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Holdings */}
      <Section
        title="Holdings"
        action={
          <Link
            to="/wallet"
            className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
          >
            Full wallet view
          </Link>
        }
      >
        {tokensQuery.isLoading ? (
          <LoadingLine label="Reading token balances" />
        ) : tokensQuery.isError || tokens === null ? (
          <ErrorCard label="holdings" onRetry={() => void tokensQuery.refetch()} />
        ) : tokens.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No ERC-20 tokens found for this address.{" "}
            {isOwn ? "When you hold tokens, they show up here automatically." : ""}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/15">
              {visibleTokens.map((t: IntelToken) => {
                const usd = usdByToken[t.address.toLowerCase()];
                const curated = CURATED[t.address.toLowerCase()];
                return (
                  <li
                    key={t.address}
                    className="flex items-center justify-between gap-4 bg-background px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-base uppercase tracking-wide">
                        {t.symbol}
                        {!curated && (
                          <span className="ml-2 rounded-full border border-gold/60 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-widest text-gold">
                            Unverified
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{t.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-display text-lg">{fmtTok(t.balance, t.decimals)}</p>
                        {usd != null && (
                          <p className="text-xs text-muted-foreground">~${fmtUsd(usd)} est.</p>
                        )}
                      </div>
                      <Link
                        to="/scan"
                        search={{ token: t.address, burn: undefined, tx: undefined }}
                        className="inline-flex items-center gap-1 rounded-md border border-foreground/20 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                        aria-label={`Scan ${t.symbol} contract`}
                      >
                        <ScanSearch className="size-3.5" /> Scan
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            {orderedTokens.length > holdingsShown && (
              <button
                type="button"
                onClick={() => setHoldingsShown((n) => n + HOLDINGS_STEP)}
                className="mt-3 w-full rounded-md border border-foreground/20 px-4 py-2 font-display text-sm uppercase tracking-widest text-muted-foreground hover:text-primary"
              >
                Show {(orderedTokens.length - holdingsShown).toLocaleString("en-US")} more tokens
              </button>
            )}
          </>
        )}
      </Section>

      {/* Recent activity */}
      <Section title="Recent activity">
        {txsQuery.isLoading ? (
          <LoadingLine label="Reading recent transactions" />
        ) : txsQuery.isError || txs === null ? (
          <ErrorCard label="activity" onRetry={() => void txsQuery.refetch()} />
        ) : txs.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No recent transactions found for this address.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/15">
            {txs.map((tx) => {
              const { headline, detail } = describeTx(tx, address);
              return (
                <li key={tx.hash} className="bg-background px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">
                        {tx.isError && <span className="mr-1 text-red-400">✕</span>}
                        {headline}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {detail}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {shortAddr(tx.hash)} ·{" "}
                        {tx.timeStamp > 0 ? timeAgo(tx.timeStamp) : "unknown time"}
                      </p>
                    </div>
                    <Link
                      to="/scan"
                      search={{ token: undefined, burn: undefined, tx: tx.hash }}
                      className="shrink-0 rounded-md border border-foreground/20 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
                    >
                      Explain
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          One-line summaries from explorer data. “Explain” opens the full on-chain transaction
          explainer for that hash.
        </p>
      </Section>

      {/* Wallet health */}
      <Section title="Wallet health">
        {!observations ? (
          <LoadingLine label="Checking wallet health" />
        ) : (
          <ul className="space-y-3">
            {observations.map((o, i) => (
              <li key={i} className={`rounded-lg border-2 ${toneStyles[o.tone]} bg-background p-4`}>
                <p className="font-bold text-foreground">{o.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
                {o.scanTokens && o.scanTokens.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-2">
                    {o.scanTokens.map((a) => (
                      <Link
                        key={a}
                        to="/scan"
                        search={{ token: a, burn: undefined, tx: undefined }}
                        className="inline-flex items-center gap-1 rounded-md border border-foreground/20 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
                      >
                        <ScanSearch className="size-3" /> Scan {shortAddr(a)}
                      </Link>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Narrow deterministic checks — unrecognized tokens, concentration, recent failures. Not a
          safety verdict.
        </p>
        {isOwn ? (
          <div className="mt-4">
            <ApprovalChecker wallet={address as `0x${string}`} />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-foreground/15 bg-background p-4 text-sm text-muted-foreground">
            Approval review is available for your own connected wallet — connect it to see and
            revoke token approvals.
          </p>
        )}
      </Section>

      {/* Ask Dumb */}
      <Section title="Ask Dumb about this wallet">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Dumb AI answers in plain English. These open the chat with the question ready — review and
          send.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ASK_SUGGESTIONS.map((q) => (
            <Link
              key={q}
              to="/ai"
              search={{ q }}
              className="rounded-full border border-primary/50 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
            >
              {q}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            to="/ai"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            <Bot className="size-4" /> Open Ask Dumb
          </Link>
          <span className="inline-flex items-center gap-2 rounded-md border border-foreground/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Copy wallet summary <CopyButton value={summaryForClipboard} label="wallet summary" />
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Paste the summary into Ask Dumb for questions about your holdings — the AI never invents
          on-chain facts.
        </p>
      </Section>

      {!isOwn && (
        <div className="rounded-xl border-2 border-primary/50 bg-card p-5 text-center sm:p-6">
          <Wallet className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-display text-xl uppercase tracking-wide">This is a watch view</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            You&apos;re viewing a public address — nothing here is saved or linked to you. Connect
            your own wallet for your intelligence dashboard.
          </p>
          <div className="mt-5 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      )}
    </div>
  );
}
