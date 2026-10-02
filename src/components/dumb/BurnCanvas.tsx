import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { Paintbrush } from "lucide-react";

import { explorerAddress, pulsechain } from "@/lib/pulsechain";
import { fetchEpochBurns, fmtCompactTok } from "@/lib/burns";

const MAX_TILES = 200;

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const amountOf = (
  r: { voluntaryDumbWei: bigint; voluntaryDampWei: bigint },
  tab: "DUMB" | "DAMP",
) => (tab === "DUMB" ? r.voluntaryDumbWei : r.voluntaryDampWei);

/**
 * BurnCanvas — the same verified voluntary-burn reads the leaderboard uses,
 * painted as a communal canvas: one tile per wallet that sent DUMB/DAMP
 * straight to the dead address since Sept 21 2026. Tiles brighten with the
 * amount burned; hovering a tile names the real wallet, its real burn total,
 * and links the explorer. Nothing is invented — an empty canvas is an honest
 * blank page, never a fake crowd. Read-only against the public RPC; shares
 * the leaderboard's cached query so no second chain scan runs.
 */
export function BurnCanvas() {
  const client = usePublicClient({ chainId: pulsechain.id });
  const [tab, setTab] = useState<"DUMB" | "DAMP">("DUMB");

  const { data, isLoading, isError } = useQuery({
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

  const rows = useMemo(() => {
    const rs = (data ?? []).filter((r) => amountOf(r, tab) > 0n);
    // Brightest first: descending by tokens burned, ties to whoever burned first.
    rs.sort((a, b) => {
      const diff = amountOf(b, tab) - amountOf(a, tab);
      if (diff !== 0n) return diff > 0n ? 1 : -1;
      return a.firstBlock < b.firstBlock ? -1 : a.firstBlock > b.firstBlock ? 1 : 0;
    });
    return rs.slice(0, MAX_TILES);
  }, [data, tab]);

  const { maxWei, totalWei } = useMemo(() => {
    let max = 0n;
    let total = 0n;
    for (const r of rows) {
      const a = amountOf(r, tab);
      if (a > max) max = a;
      total += a;
    }
    return { maxWei: max, totalWei: total };
  }, [rows, tab]);

  const brightness = (wei: bigint): number => {
    if (maxWei <= 0n) return 0;
    const toNum = (w: bigint) => Number(w) / 1e18;
    const s = Math.log10(toNum(wei) + 1) / Math.log10(toNum(maxWei) + 1);
    return 0.25 + 0.75 * Math.min(1, Math.max(0, s));
  };

  return (
    <section aria-label="Burn canvas" className="rounded-xl border-2 border-primary/40 bg-card p-5">
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-primary">
        <Paintbrush className="size-4" /> The burn canvas
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">
          {isLoading
            ? "Reading the chain…"
            : rows.length === 0
              ? "A blank canvas"
              : `${rows.length} burner${rows.length === 1 ? "" : "s"}, one canvas`}
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
                  tab === t ? "bg-primary text-background" : "text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Every tile is a real wallet that sent {tab} straight to the dead address since Sept 21, 2026
        — the same verified on-chain reads as the leaderboard, painted. Brighter tiles burned more.
        Nobody is invented here: a blank canvas means nobody has burned {tab} yet, honestly.
      </p>

      {isError && (
        <p className="mt-4 text-sm text-muted-foreground">
          The chain read failed — the canvas can&apos;t paint what it can&apos;t verify. Try again
          in a bit.
        </p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <>
          <div
            className="mt-4 flex flex-wrap gap-1.5"
            role="list"
            aria-label={`${rows.length} voluntary ${tab} burners`}
          >
            {rows.map((r) => {
              const a = amountOf(r, tab);
              const label = `${shortAddr(r.address)} burned ${fmtCompactTok(a)} ${tab} in ${r.txs} transaction${r.txs === 1 ? "" : "s"} — open in the explorer`;
              return (
                <a
                  key={r.address}
                  role="listitem"
                  href={explorerAddress(r.address)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className={`size-7 rounded-[4px] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    tab === "DUMB" ? "bg-primary" : "bg-gold"
                  }`}
                  style={{ opacity: brightness(a) }}
                />
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {fmtCompactTok(totalWei)} {tab} destroyed by these wallets since Sept 21. Burns shrink
            supply — they never promise price.
          </p>
        </>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No voluntary {tab} burns on record yet. The first tile is waiting — burn and claim it.
        </p>
      )}
    </section>
  );
}
