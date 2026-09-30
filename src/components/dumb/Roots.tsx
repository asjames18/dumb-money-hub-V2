import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Flame } from "lucide-react";

import { addressUrl, CHAINS } from "@/lib/proof/chains";
import { fetchMarket, type MarketQuote, type MarketSnapshot } from "@/lib/proof/fetch-market";
import { fetchRootEngines, type RootEngineState } from "@/lib/proof/fetch-roots";
import { DAMP_WPLS_PAIR, WPLS_DUMB_PAIR } from "@/lib/pulsechain";
import { CopyButton } from "./CopyButton";

/**
 * /roots — the DUMB dashboard: live market data (DexScreener flagship pairs,
 * served server-side), the flagship pairs, the transfer tax reality, holder
 * concentration, and burn history. Thin liquidity is shown as thin liquidity.
 * Nothing is guessed; every figure names its source.
 */

const fmtTokens = (raw: bigint) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(
    Number(raw) / 1e18,
  );

const fmtUsdCompact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);

/** Tiny token prices need significant digits, not decimals: $0.000004078. */
const fmtPriceUsd = (n: number | null) => (n === null ? "—" : `$${n.toPrecision(4)}`);

const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

function SectionHead({ sticker, title }: { sticker: string; title: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <span className="sticker bg-pink px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-black">
        {sticker}
      </span>
      <h3 className="text-base font-black tracking-tight">{title}</h3>
    </div>
  );
}

function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

function DataError({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-border bg-card p-4 text-[13px] text-muted-foreground">
      Couldn&apos;t load {what} right now — the source might be rate-limiting. It fills in on retry.
      Nothing is guessed in the meantime.
    </p>
  );
}

function PairCard({ name, pair, note }: { name: string; pair: string; note: string }) {
  const chain = CHAINS.pulsechain;
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h4 className="font-display text-lg font-black uppercase tracking-wide">{name}</h4>
        <code className="font-mono text-[11px] text-muted-foreground">{shortAddr(pair)}</code>
        <CopyButton value={pair} label={`${name} pair address`} />
        <a
          href={addressUrl(chain, pair)}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open ${name} pair on the block explorer`}
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{note}</p>
      <a
        href={`https://dexscreener.com/pulsechain/${pair}`}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 inline-flex items-center gap-1 font-display text-xs uppercase tracking-widest text-foreground hover:text-primary"
      >
        Chart on DEXScreener <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function MarketCard({ quote }: { quote: MarketQuote }) {
  if (!quote.ok) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h4 className="font-display text-lg font-black uppercase tracking-wide">{quote.symbol}</h4>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Market data unavailable right now — the feed might be rate-limiting. Nothing is guessed in
          the meantime.
        </p>
      </div>
    );
  }
  const chg = quote.priceChangeH24;
  const chgClass =
    chg === null
      ? "text-muted-foreground"
      : chg > 0
        ? "text-green-400"
        : chg < 0
          ? "text-red-400"
          : "text-muted-foreground";
  const stats: { label: string; value: string }[] = [
    {
      label: "24h change",
      value: chg === null ? "—" : `${chg > 0 ? "▲ +" : chg < 0 ? "▼ " : ""}${chg.toFixed(2)}%`,
    },
    {
      label: "Liquidity",
      value: quote.liquidityUsd === null ? "—" : fmtUsdCompact(quote.liquidityUsd),
    },
    { label: "24h volume", value: quote.volumeH24 === null ? "—" : fmtUsdCompact(quote.volumeH24) },
    {
      label: "24h txns",
      value:
        quote.txnsH24 === null ? "—" : `${quote.txnsH24.buys} buys · ${quote.txnsH24.sells} sells`,
    },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h4 className="font-display text-lg font-black uppercase tracking-wide">{quote.symbol}</h4>
        <code className="font-mono text-[11px] text-muted-foreground">
          {shortAddr(quote.pairAddress)}
        </code>
        <CopyButton value={quote.pairAddress} label={`${quote.symbol} pair address`} />
      </div>
      <p className="font-mono text-2xl font-black tracking-tight sm:text-3xl">
        {fmtPriceUsd(quote.priceUsd)}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        {quote.priceNative === null ? "—" : `${quote.priceNative.toPrecision(4)} WPLS`} per{" "}
        {quote.symbol}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </dt>
            <dd
              className={`font-mono text-sm font-semibold ${s.label === "24h change" ? chgClass : ""}`}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      {quote.marketCap !== null && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Mkt cap ≈ {fmtUsdCompact(quote.marketCap)} (DexScreener&apos;s circulating method —
          excludes the dead address).
        </p>
      )}
      <a
        href={quote.chartUrl ?? `https://dexscreener.com/pulsechain/${quote.pairAddress}`}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 inline-flex items-center gap-1 font-display text-xs uppercase tracking-widest text-foreground hover:text-primary"
      >
        Chart on DEXScreener <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function EngineCard({ engine }: { engine: RootEngineState }) {
  const taxPct = engine.taxBps / 100;
  const deadForever = engine.renounced && !engine.engineOn;
  const { buyAndBurn, liquidity, burn, reflection } = engine.feeSplit;
  // feeSplit is shares of the tax summing to 10000 — convert to % of transfer.
  const toTransferPct = (share: number) => (share / 10000) * taxPct;
  const fmtPct = (v: number) => {
    const r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1);
  };
  const bucketPct = fmtPct(toTransferPct(buyAndBurn) + toTransferPct(liquidity));
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-1 flex items-center gap-2">
        <h4 className="font-display text-lg font-black uppercase tracking-wide">
          {engine.symbol} — {taxPct}% on every trade
        </h4>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        The tax hits buys, sells, <em>and</em> wallet-to-wallet transfers. A $100 buy puts about $
        {(100 * (1 - engine.taxBps / 10000)).toFixed(0)} of {engine.symbol} in your wallet — DEX
        quotes show the pre-tax price, so mentally shave the tax off.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Where the {taxPct}% goes, on <strong className="text-foreground">every</strong> taxed
        transfer: {fmtPct(toTransferPct(buyAndBurn))}% into the contract's buy-back bucket
        {liquidity > 0
          ? ` · ${fmtPct(toTransferPct(liquidity))}% into its liquidity bucket`
          : null}{" "}
        · <strong className="text-foreground">{fmtPct(toTransferPct(burn))}% burned</strong> to the
        dead address ·{" "}
        <strong className="text-foreground">{fmtPct(toTransferPct(reflection))}% reflected</strong>{" "}
        to holders. Read live from the contract — this split is not a setting anyone can change.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        The live/dead line: the per-transfer split above{" "}
        <strong className="text-foreground">is live</strong> — every trade burns and reflects. Net
        effect:{" "}
        <strong className="text-foreground">
          {fmtPct(taxPct - toTransferPct(reflection))}% of every transfer is permanently burned
        </strong>
        , {fmtPct(toTransferPct(reflection))}% reflected to holders. What&apos;s dead is the{" "}
        <strong className="text-foreground">auto-processing engine</strong>: the {bucketPct}% that
        accumulates in the contract's buckets was supposed to be auto-swapped into liquidity and
        buy-backs, but the engine is off and ownership is renounced, so those tokens sit in the
        contract forever.
      </p>
      <dl className="mt-4 grid gap-3">
        <div className="rounded-lg bg-secondary/60 p-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Fee engine
          </dt>
          <dd className="mt-1 text-[13px] font-semibold">
            {deadForever ? (
              <>
                Auto-processing permanently disabled{" "}
                <span className="font-normal text-muted-foreground">
                  — ownership is renounced, so no one can ever switch it back on. The fee buckets
                  already in the contract are stuck there forever.
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Status unclear from the live read — treat fee claims with skepticism.
              </span>
            )}
          </dd>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-secondary/60 p-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Flame className="h-3.5 w-3.5" /> Burned forever
            </dt>
            <dd className="mt-1 font-mono text-lg font-black tabular-nums">
              {fmtTokens(engine.burned)}{" "}
              <span className="text-xs font-semibold text-muted-foreground">
                {engine.symbol} · {engine.burnedPct.toFixed(2)}% of supply
              </span>
            </dd>
            <dd className="mt-1 text-[11px] text-muted-foreground">
              Live total — the 1% protocol burn on every taxed transfer keeps growing this. (
              {engine.symbol === "DAMP"
                ? "The 300M launch-day burn is most of it."
                : "The 14B launch-day burn is most of it."}
              )
            </dd>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Entombed in the contract
            </dt>
            <dd className="mt-1 font-mono text-lg font-black tabular-nums">
              {fmtTokens(engine.dormant)}{" "}
              <span className="text-xs font-semibold text-muted-foreground">
                {engine.symbol} · {engine.dormantPct.toFixed(2)}% of supply
              </span>
            </dd>
            <dd className="mt-1 text-[11px] text-muted-foreground">
              Fee shares the dead auto-processing engine never used. No one can move them — not a
              rug vector, but not liquidity either.
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
}

export function Roots() {
  const enginesQuery = useQuery({
    queryKey: ["roots-engines"],
    queryFn: fetchRootEngines,
    staleTime: 60 * 60_000,
    refetchInterval: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const marketQuery = useQuery({
    queryKey: ["roots-market"],
    queryFn: fetchMarket,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const market: MarketSnapshot | undefined = marketQuery.data;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="sticker bg-pink px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-black">
          Dashboard
        </span>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
          The DUMB dashboard
        </h1>
      </div>
      <p className="mb-10 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
        DUMB is the live token this site revolves around — and{" "}
        <strong className="text-foreground">DAMP</strong> is its dormant sibling: a 3% tax token
        designed to market-buy-and-burn DUMB that never switched on. Same family, older machinery:
        transfer taxes on every trade, an auto-processing fee engine that never started, ownership
        renounced to the void. This page is the main dashboard — live market numbers up top, the
        flagship pairs, every tax, every burn. Brutally honest numbers only.
      </p>

      <section aria-label="Live market data" className="mb-12">
        <SectionHead sticker="Market" title="Live market numbers" />
        {marketQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton rows={3} />
            <Skeleton rows={3} />
          </div>
        ) : marketQuery.isError || !market ? (
          <DataError what="the market numbers" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <MarketCard quote={market.dumb} />
              <MarketCard quote={market.damp} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Source: {market.source} · updated{" "}
              {new Date(market.at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
              {market.stale ? " (stale — feed unreachable, last good snapshot)" : ""} · refreshes
              every minute. Flagship PulseX V2 pairs only — not every pool is indexed by the feed,
              so thin markets can read thinner than reality. A single trade can move these prices.
            </p>
          </>
        )}
      </section>

      <section aria-label="Flagship liquidity pairs" className="mb-12">
        <SectionHead sticker="Pairs" title="The flagship pairs" />
        <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          The two verified flagship pairs, pinned below with their contracts — the numbers above
          come from these. Open the pair pages and check for yourself before sizing anything.
        </p>
        <div className="grid gap-4">
          <PairCard
            name="WPLS / DUMB"
            pair={WPLS_DUMB_PAIR}
            note="The main DUMB market on PulseX v2 — the pair the on-site swap quotes."
          />
          <PairCard
            name="DAMP / WPLS"
            pair={DAMP_WPLS_PAIR}
            note="The Dumb Amplifier's market. 3% tax, same live burn-and-reflect mechanics as DUMB."
          />
        </div>
      </section>

      <section aria-label="Transfer taxes and fee engine">
        <SectionHead sticker="Mechanics" title="The taxman cometh" />
        <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          Both tokens tax every transfer — that&apos;s the Safemoon-fork playbook. The twist: the
          fee engine that was supposed to turn taxes into liquidity and buy-backs is permanently
          off, verified live below. What you see is what there is.
        </p>
        {enginesQuery.isLoading ? (
          <div className="grid gap-4">
            <Skeleton rows={3} />
            <Skeleton rows={3} />
          </div>
        ) : enginesQuery.isError || !enginesQuery.data ? (
          <DataError what="the tax and burn figures" />
        ) : (
          <div className="grid gap-4">
            {enginesQuery.data.map((e) => (
              <EngineCard key={e.symbol} engine={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
