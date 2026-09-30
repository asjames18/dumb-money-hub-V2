import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { ExternalLink, Flame, Trophy } from "lucide-react";

import { DRIP_VAULT, explorerAddress, pulsechain } from "@/lib/pulsechain";
import { fetchEpochBurns, fmtCompactTok, type EpochBurnRow } from "@/lib/burns";
import { useUsernames } from "@/lib/use-usernames";
import { Button } from "@/components/ui/button";
import { NativeShareButton } from "./NativeShareButton";

const MAX_ROWS = 25;

/** Known addresses get a plain-English label next to the truncated address. */
const KNOWN_LABELS: Record<string, string> = {
  [DRIP_VAULT.toLowerCase()]: "DripVault · community vault",
};

// Share helpers for the "That's you" banner — copy is the site's own words
// plus the connected wallet's own verified rank and amounts (real on-chain
// data, never invented). Same intent-button pattern as the /scan share rows.
const youShareUrl = (): string =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/burn`;

const youShareText = (rank: number, token: "DUMB" | "DAMP", burnedWei: bigint): string =>
  `I burned ${fmtCompactTok(burnedWei)} ${token} — rank #${rank} on the Dumb Money voluntary burn leaderboard (since Sept 21). All burns verified on-chain.`;

const youShareXUrl = (rank: number, token: "DUMB" | "DAMP", burnedWei: bigint): string =>
  `https://x.com/intent/post?text=${encodeURIComponent(youShareText(rank, token, burnedWei))}&url=${encodeURIComponent(youShareUrl())}`;

const youShareTelegramUrl = (rank: number, token: "DUMB" | "DAMP", burnedWei: bigint): string =>
  `https://t.me/share/url?url=${encodeURIComponent(youShareUrl())}&text=${encodeURIComponent(youShareText(rank, token, burnedWei))}`;

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const amountOf = (r: EpochBurnRow, token: "DUMB" | "DAMP"): bigint =>
  token === "DUMB" ? r.voluntaryDumbWei : r.voluntaryDampWei;

/**
 * Voluntary burn leaderboard — ranks wallets by total DUMB / DAMP they sent
 * straight to the dead address since Sept 21 2026. Strict rule: you move up
 * only by burning more than the wallet ahead of you. Ties go to whoever
 * burned first. No USD, no prices — price moves can never re-rank this
 * board. Only real on-chain burners appear — no invented names, no seeded
 * entries. Read-only against the public RPC.
 */
export function BurnLeaderboard() {
  const client = usePublicClient({ chainId: pulsechain.id });
  const { address } = useAccount();
  const [tab, setTab] = useState<"DUMB" | "DAMP">("DUMB");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["burn-leaderboard-epoch"],
    queryFn: () => {
      if (!client) throw new Error("no public client");
      return fetchEpochBurns(client);
    },
    enabled: !!client,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const allRows = useMemo(() => {
    const rows = (data ?? []).filter((r) => amountOf(r, tab) > 0n);
    // Strict descending by tokens burned; ties keep whoever burned first
    // ahead — nobody is bumped without burning more.
    rows.sort((a, b) => {
      const diff = amountOf(b, tab) - amountOf(a, tab);
      if (diff !== 0n) return diff > 0n ? 1 : -1;
      return a.firstBlock < b.firstBlock ? -1 : a.firstBlock > b.firstBlock ? 1 : 0;
    });
    return rows;
  }, [data, tab]);
  const rows = useMemo(() => allRows.slice(0, MAX_ROWS), [allRows]);

  // The connected wallet's rank across ALL burners on this tab (rows above
  // are capped at MAX_ROWS for display). Addresses are lowercased by
  // fetchEpochBurns.
  const youAddr = address?.toLowerCase();
  const youRow = youAddr ? allRows.find((r) => r.address === youAddr) : undefined;
  const youRank = youRow ? allRows.indexOf(youRow) + 1 : -1;
  const youBurned = youRow ? amountOf(youRow, tab) : 0n;

  // Opt-in display names (wallet-signed) — only for the visible rows.
  const names = useUsernames(rows.map((r) => r.address).concat(youAddr != null ? [youAddr] : []));

  return (
    <section
      aria-label="Burn leaderboard"
      className="rounded-xl border-2 border-gold/50 bg-card p-5"
    >
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-gold">
        <Trophy className="size-4" /> Burn leaderboard
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">
          {isLoading ? "Reading the chain…" : "Top voluntary burners"}
        </h2>
        {!isLoading && !isError && (
          <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs font-bold">
            {(["DUMB", "DAMP"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`rounded-full px-3 py-1 transition-colors ${
                  tab === t ? "bg-gold text-background" : "text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isLoading && !isError && youRow && (
        <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Flame className="size-5 shrink-0 text-gold" aria-hidden="true" />
            <p className="text-sm">
              <strong className="text-gold">That&apos;s you</strong> — rank #{youRank} on the {tab}{" "}
              board{youRank > MAX_ROWS && " (just outside the top 25 shown)"} with{" "}
              {fmtCompactTok(youBurned)} <span className="font-bold">{tab}</span> burned since Sept
              21.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Share your rank:
            </span>
            <NativeShareButton
              title="Burn leaderboard rank"
              text={youShareText(youRank, tab, youBurned)}
              url={youShareUrl()}
              fallbackUrl={youShareXUrl(youRank, tab, youBurned)}
            />
            <Button
              asChild
              size="sm"
              className="gap-1.5 rounded-md bg-foreground text-xs font-bold text-background hover:bg-foreground/90"
            >
              <a
                href={youShareXUrl(youRank, tab, youBurned)}
                target="_blank"
                rel="noreferrer noopener"
              >
                Post to X
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
            >
              <a
                href={youShareTelegramUrl(youRank, tab, youBurned)}
                target="_blank"
                rel="noreferrer noopener"
              >
                Share to Telegram
              </a>
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Pledge your next burn on the{" "}
            <a href="#pledge-board" className="font-bold text-gold underline underline-offset-2">
              promise board below
            </a>{" "}
            — a pledge is a promise, not a burn.
          </p>
        </div>
      )}
      {!isLoading && !isError && youAddr && !youRow && (
        <p className="mt-3 text-sm text-muted-foreground">
          Wallet connected — no voluntary {tab} burns from this address since Sept 21 yet. Burn from
          the box above and this board lights up.
        </p>
      )}

      {isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">
          Aggregating voluntary burns since Sept 21 from the chain…
        </p>
      )}
      {isError && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t read the leaderboard from the chain. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-bold text-gold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No voluntary {tab} burns since Sept 21 yet — burn from the box above and this board lights
          up.
        </p>
      )}
      {!isLoading && !isError && rows.length > 0 && (
        <ol className="mt-4 divide-y divide-foreground/10">
          {rows.map((r, i) => {
            const isYou = youAddr != null && r.address === youAddr;
            const label = KNOWN_LABELS[r.address];
            const displayName = names[r.address];
            return (
              <li
                key={r.address}
                className={`flex items-center justify-between gap-3 py-2.5 ${
                  isYou ? "-mx-2 rounded-lg bg-gold/10 px-2 ring-1 ring-gold/40" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`w-7 shrink-0 font-display text-lg font-bold ${
                      i === 0 ? "text-gold" : "text-muted-foreground"
                    }`}
                    aria-label={`rank ${i + 1}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <a
                        href={explorerAddress(r.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={displayName ? r.address : undefined}
                        className={`text-sm font-bold underline decoration-gold underline-offset-2 hover:text-gold ${
                          displayName ? "" : "font-mono"
                        }`}
                      >
                        {displayName ?? shortAddr(r.address)}
                      </a>
                      {label && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
                          {label}
                        </span>
                      )}
                      {isYou && (
                        <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-background">
                          That&apos;s you
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-pink/15 px-2 py-0.5 text-[11px] font-bold text-pink">
                        <Flame className="size-3" /> voluntary burner
                      </span>
                      <a
                        href={explorerAddress(r.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View on explorer"
                        className="text-muted-foreground hover:text-gold"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.txs} {r.txs === 1 ? "burn tx" : "burn txs"} since Sept 21
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right font-display text-sm font-bold uppercase tracking-wide">
                  <p>
                    {fmtCompactTok(amountOf(r, tab))}{" "}
                    <span className="text-muted-foreground">{tab}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Ranks wallets by total {tab} sent straight to the dead address since Sept 21, 2026 —{" "}
        <strong className="text-foreground">
          you move up only by burning more than the wallet ahead of you
        </strong>
        . Ties go to whoever burned first. No dollar values anywhere on this board, so price moves
        can never re-rank anyone. Only real on-chain burns appear — no invented names, no seeded
        entries. Display names are opt-in —{" "}
        <Link to="/wallet" className="font-bold text-gold underline underline-offset-2">
          claim yours on the /wallet page
        </Link>
        . Burns shrink supply; they never promise price.
      </p>
    </section>
  );
}
