import { Fragment, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { CopyButton } from "@/components/dumb/CopyButton";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { PageShell } from "@/components/dumb/PageShell";
import { explorerAddress } from "@/lib/pulsechain";
import { pageMeta } from "@/lib/page-meta";
import { fmtUsd } from "@/lib/pls-price";
import type { PriceTokenKey } from "@/lib/token-prices";
import { fmtUsdCompact, useDirectoryMarketData } from "@/lib/token-prices";
import type { ScanCheck, ScanStatus } from "@/lib/token-scan";
import { DELISTED_TOKENS, LISTED_TOKENS, type VettedListing } from "@/data/vetted";
import { cn } from "@/lib/utils";

const TITLE = "Vetted Token Screener — Dumb Money Hub";
const DESCRIPTION =
  "Live prices and liquidity for PulseChain tokens that passed the hub's public vetting checklist. Only vetted tokens appear here — a listing is never a safety promise.";

export const Route = createFileRoute("/directory")({
  head: () => pageMeta("/directory", TITLE, DESCRIPTION),
  component: DirectoryPage,
});

const STATUS_ICON: Record<ScanStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: TriangleAlert,
  fail: XCircle,
  unknown: CircleHelp,
};

const STATUS_STYLE: Record<ScanStatus, string> = {
  pass: "text-emerald-400",
  warn: "text-gold",
  fail: "text-red-400",
  unknown: "text-muted-foreground",
};

const LOAD_FAIL_TITLE = "Couldn't load — the RPC dropped this read. Try again shortly.";
const AGE_UNKNOWN_TITLE = "Deployment date not verified for this token.";

/** Whole years since deployment, floored. null when the date is unknown or invalid. */
function ageYears(deployedAt: string | null): number | null {
  if (!deployedAt) return null;
  const deployed = new Date(`${deployedAt}T00:00:00Z`).getTime();
  if (Number.isNaN(deployed) || deployed > Date.now()) return null;
  return Math.floor((Date.now() - deployed) / (365.25 * 24 * 60 * 60 * 1000));
}

/** <1yr -> "New", 1yr -> "1 yr", n -> "n yrs". null when the date is unknown. */
function ageLabel(deployedAt: string | null): string | null {
  const years = ageYears(deployedAt);
  if (years == null) return null;
  if (years < 1) return "New";
  return years === 1 ? "1 yr" : `${years} yrs`;
}

function CheckRow({ check }: { check: ScanCheck }) {
  const Icon = STATUS_ICON[check.status];
  return (
    <li className="flex items-start gap-2 py-1.5">
      <Icon className={cn("mt-0.5 size-4 shrink-0", STATUS_STYLE[check.status])} aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest">
          {check.label}{" "}
          <span className={cn("font-display", STATUS_STYLE[check.status])}>{check.status}</span>
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{check.detail}</p>
      </div>
    </li>
  );
}

/** The full checklist + address block, revealed by the per-row Details toggle. */
function ListingDetails({ listing }: { listing: VettedListing }) {
  const isNative = listing.address === "native";
  return (
    <div className="rounded-lg border border-foreground/10 bg-background/50 p-4">
      {listing.note && (
        <p className="text-xs leading-relaxed text-muted-foreground">{listing.note}</p>
      )}
      {!isNative && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground">
            {listing.address}
          </code>
          <CopyButton value={listing.address} label={`${listing.symbol} contract address`} />
          <a
            href={explorerAddress(listing.address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            Explorer <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      )}
      <ul className="mt-2 divide-y divide-foreground/10 border-t border-foreground/10">
        {listing.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>
    </div>
  );
}

/** Compact pass/warn/fail/unknown summary + vetted date for the screener row. */
function VettingBadge({ listing }: { listing: VettedListing }) {
  const counts: Record<ScanStatus, number> = { pass: 0, warn: 0, fail: 0, unknown: 0 };
  for (const check of listing.checks) counts[check.status] += 1;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold">
        {counts.pass > 0 && (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {counts.pass}
          </span>
        )}
        {counts.warn > 0 && (
          <span className="inline-flex items-center gap-1 text-gold">
            <TriangleAlert className="size-3.5" aria-hidden />
            {counts.warn}
          </span>
        )}
        {counts.fail > 0 && (
          <span className="inline-flex items-center gap-1 text-red-400">
            <XCircle className="size-3.5" aria-hidden />
            {counts.fail}
          </span>
        )}
        {counts.unknown > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CircleHelp className="size-3.5" aria-hidden />
            {counts.unknown}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] whitespace-nowrap text-muted-foreground">
        Vetted {listing.vettedAt}
      </p>
    </div>
  );
}

function Actions({
  listing,
  expanded,
  onToggle,
}: {
  listing: VettedListing;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isNative = listing.address === "native";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isNative && (
        <Link
          to="/scan"
          search={{ token: listing.address, burn: undefined, tx: undefined }}
          className="inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          <ScanSearch className="size-3.5" aria-hidden /> Scan
        </Link>
      )}
      <Link
        to="/trade"
        className="inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
      >
        Trade
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "Show"} vetting details for ${listing.symbol}`}
        className="inline-flex items-center gap-1 rounded-md border border-foreground/20 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
      >
        Details
        <ChevronDown
          className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
    </div>
  );
}

type SortKey = "price" | "liquidity" | "age";
type SortDir = "asc" | "desc";

function SortButton({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align?: "right" | "left";
}) {
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 font-display text-xs uppercase tracking-widest hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        align === "right" && "flex-row-reverse",
      )}
      aria-label={`Sort by ${label} ${active && dir === "asc" ? "descending" : "ascending"}`}
    >
      {label}
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-t border-foreground/10" aria-hidden>
          <td className="px-4 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-foreground/10" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-foreground/10" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-foreground/10" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-4 w-14 animate-pulse rounded bg-foreground/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-foreground/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-8 w-40 animate-pulse rounded bg-foreground/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

function MobileSkeletonCards() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="animate-pulse rounded-xl border-2 border-foreground/15 bg-card p-4 sm:hidden"
        >
          <div className="h-5 w-32 rounded bg-foreground/10" />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="h-4 w-20 rounded bg-foreground/10" />
            <div className="h-4 w-20 rounded bg-foreground/10" />
            <div className="h-4 w-20 rounded bg-foreground/10" />
          </div>
        </div>
      ))}
    </>
  );
}

function MobileCard({
  listing,
  priceUsd,
  liquidityUsd,
  expanded,
  onToggle,
}: {
  listing: VettedListing;
  priceUsd: number | null;
  liquidityUsd: number | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-xl border-2 border-foreground/15 bg-card p-4 sm:hidden">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-xl uppercase tracking-wide">
          {listing.symbol}{" "}
          <span className="text-xs normal-case tracking-normal text-muted-foreground">
            {listing.name}
          </span>
        </h3>
        <VettingBadge listing={listing} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Price
          </p>
          <p
            className="mt-0.5 font-mono text-sm"
            title={priceUsd == null ? LOAD_FAIL_TITLE : undefined}
          >
            {priceUsd == null ? "—" : fmtUsd(priceUsd)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Liquidity
          </p>
          <p
            className="mt-0.5 font-mono text-sm"
            title={liquidityUsd == null ? LOAD_FAIL_TITLE : undefined}
          >
            {liquidityUsd == null ? "—" : fmtUsdCompact(liquidityUsd)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Age
          </p>
          <p
            className="mt-0.5 font-mono text-sm"
            title={listing.deployedAt ? `Deployed ${listing.deployedAt}` : AGE_UNKNOWN_TITLE}
          >
            {ageLabel(listing.deployedAt) ?? "—"}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Actions listing={listing} expanded={expanded} onToggle={onToggle} />
      </div>
      {expanded && (
        <div className="mt-3">
          <ListingDetails listing={listing} />
        </div>
      )}
    </article>
  );
}

type Filter = "listed" | "delisted";

function DirectoryPage() {
  const [filter, setFilter] = useState<Filter>("listed");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "liquidity",
    dir: "desc",
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const { rows, isLoading } = useDirectoryMarketData();

  const marketByKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);

  const sorted = useMemo(() => {
    const value = (listing: VettedListing): number | null => {
      if (sort.key === "age") {
        if (!listing.deployedAt) return null;
        const t = new Date(`${listing.deployedAt}T00:00:00Z`).getTime();
        return Number.isNaN(t) ? null : t;
      }
      const row = marketByKey.get(listing.symbol as PriceTokenKey);
      if (!row) return null;
      return sort.key === "price" ? row.priceUsd : row.liquidityUsd;
    };
    return [...LISTED_TOKENS].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return sort.dir === "asc" ? va - vb : vb - va;
    });
  }, [sort, marketByKey]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
    );

  const toggleExpanded = (address: string) => setExpanded((e) => (e === address ? null : address));

  const shown = filter === "listed" ? sorted : DELISTED_TOKENS;

  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Disclaimer className="mb-6" />
        <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-pink">
          <ShieldCheck className="size-4" aria-hidden /> Token directory
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-6xl">
          Vetted tokens
        </h1>
        <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Live prices and liquidity for every vetted token, read from on-chain reserves and
            refreshed about every minute. Only tokens that passed the hub&apos;s public checklist
            appear here — nothing unvetted, ever.
          </p>
          <p>
            <strong className="text-foreground">A listing is a snapshot, not a promise.</strong> It
            means the checks below passed on the vetted date. Contracts can change behavior,
            liquidity can move, and no checklist proves a token is safe. Always run the live scan
            before you trust anything with real money.
          </p>
        </div>

        <div className="mt-8 flex gap-2" role="tablist" aria-label="Listing status">
          {(["listed", "delisted"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-4 py-2 font-display text-sm uppercase tracking-widest",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-foreground/20 text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "listed"
                ? `Listed (${LISTED_TOKENS.length})`
                : `Delisted (${DELISTED_TOKENS.length})`}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="mt-8 rounded-xl border border-foreground/15 bg-card p-8 text-center text-sm text-muted-foreground">
            {filter === "delisted"
              ? "No delistings — every token here still holds its listing. If a token ever fails re-vetting, it lands here with the reason published."
              : "No tokens listed yet."}
          </p>
        ) : filter === "delisted" ? (
          <div className="mt-6 space-y-4">
            {DELISTED_TOKENS.map((listing) => (
              <article
                key={listing.address}
                className="rounded-xl border-2 border-foreground/15 bg-card p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-2xl uppercase tracking-wide">
                    {listing.symbol}{" "}
                    <span className="text-sm normal-case tracking-normal text-muted-foreground">
                      {listing.name}
                    </span>
                  </h3>
                  <VettingBadge listing={listing} />
                </div>
                {listing.delistReason && (
                  <p className="mt-2 text-sm text-red-400">{listing.delistReason}</p>
                )}
                <div className="mt-3">
                  <ListingDetails listing={listing} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop screener table */}
            <div className="mt-6 hidden overflow-x-auto rounded-xl border-2 border-foreground/15 bg-card sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/15 text-left">
                    <th scope="col" className="px-4 py-3">
                      <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                        Token
                      </span>
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right"
                      aria-sort={
                        sort.key === "price"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortButton
                        label="Price"
                        sortKey="price"
                        active={sort.key === "price"}
                        dir={sort.dir}
                        onClick={toggleSort}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right"
                      aria-sort={
                        sort.key === "liquidity"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortButton
                        label="Liquidity"
                        sortKey="liquidity"
                        active={sort.key === "liquidity"}
                        dir={sort.dir}
                        onClick={toggleSort}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right"
                      aria-sort={
                        sort.key === "age"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortButton
                        label="Age"
                        sortKey="age"
                        active={sort.key === "age"}
                        dir={sort.dir}
                        onClick={toggleSort}
                      />
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                        Vetting
                      </span>
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <SkeletonRows />
                  ) : (
                    sorted.map((listing) => {
                      const row = marketByKey.get(listing.symbol as PriceTokenKey);
                      const isOpen = expanded === listing.address;
                      return (
                        <Fragment key={listing.address}>
                          <tr className="border-t border-foreground/10">
                            <td className="px-4 py-3">
                              <p className="font-display text-base uppercase tracking-wide">
                                {listing.symbol}
                              </p>
                              <p className="text-xs text-muted-foreground">{listing.name}</p>
                            </td>
                            <td
                              className="px-4 py-3 text-right font-mono"
                              title={row?.priceUsd == null ? LOAD_FAIL_TITLE : undefined}
                            >
                              {row?.priceUsd == null ? "—" : fmtUsd(row.priceUsd)}
                            </td>
                            <td
                              className="px-4 py-3 text-right font-mono"
                              title={row?.liquidityUsd == null ? LOAD_FAIL_TITLE : undefined}
                            >
                              {row?.liquidityUsd == null ? "—" : fmtUsdCompact(row.liquidityUsd)}
                            </td>
                            <td
                              className="px-4 py-3 text-right font-mono"
                              title={
                                listing.deployedAt
                                  ? `Deployed ${listing.deployedAt}`
                                  : AGE_UNKNOWN_TITLE
                              }
                            >
                              {ageLabel(listing.deployedAt) ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <VettingBadge listing={listing} />
                            </td>
                            <td className="px-4 py-3">
                              <Actions
                                listing={listing}
                                expanded={isOpen}
                                onToggle={() => toggleExpanded(listing.address)}
                              />
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-foreground/10">
                              <td colSpan={6} className="px-4 py-3">
                                <ListingDetails listing={listing} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="mt-6 space-y-4">
              {rows.length === 0 ? (
                <MobileSkeletonCards />
              ) : (
                sorted.map((listing) => {
                  const row = marketByKey.get(listing.symbol as PriceTokenKey);
                  return (
                    <MobileCard
                      key={listing.address}
                      listing={listing}
                      priceUsd={row?.priceUsd ?? null}
                      liquidityUsd={row?.liquidityUsd ?? null}
                      expanded={expanded === listing.address}
                      onToggle={() => toggleExpanded(listing.address)}
                    />
                  );
                })
              )}
            </div>

            {!isLoading && (
              <p className="mt-4 text-xs text-muted-foreground">
                Prices and liquidity estimated from WPLS pair reserves × PLS/USD. Indicative only —
                execution price varies. Refreshes about every minute.
              </p>
            )}
          </>
        )}

        <div className="mt-10 rounded-xl border border-foreground/15 bg-card p-5">
          <h2 className="font-display text-lg uppercase tracking-wide">Want your token listed?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Applications aren&apos;t open yet — when they are, every applicant goes through the same
            public checklist, and failures get delisted here with the reason published. No
            pay-to-list, no favorites.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
