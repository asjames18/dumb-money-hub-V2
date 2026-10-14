import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Flame } from "lucide-react";

import { explorerAddress, explorerTx } from "@/lib/pulsechain";
import { timeAgo } from "@/lib/burns";

type BurnerRow = {
  wallet: string;
  amountGross: string;
  amountRaw: string;
  block: number;
  tx: string;
  timestamp: number;
};

/** Gross DUMB with thousands separators and up to 2–4 decimals:
 *  "100000" → "100,000"; "7699.192585552358" → "7,699.19". */
function fmtGross(amountGross: string): string {
  const n = Number(amountGross);
  if (!Number.isFinite(n) || n < 0) return "—";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: n >= 1000 ? 2 : 4,
  });
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Burners wall — newest-first feed of voluntary DUMB burns to the dead
 * address. Rows come from GET /api/burners (KV written by the daily scan
 * script); every row links to the on-chain wallet and receipt. Recognition
 * only — no prizes, no contests. Honest loading / error / empty states;
 * never invented.
 */
export function BurnersWall() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["burners-wall"],
    queryFn: async () => {
      const res = await fetch("/api/burners");
      if (!res.ok) throw new Error(`http ${res.status}`);
      const body = (await res.json()) as { burns?: unknown };
      if (!Array.isArray(body.burns)) throw new Error("bad payload");
      return body.burns as BurnerRow[];
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return (
    <section aria-label="Burners wall" className="rounded-xl border-2 border-gold/50 bg-card p-5">
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-gold">
        <Flame className="size-4" /> Burners wall
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">
          {isLoading ? "Reading the wall…" : "Voluntary burns, newest first"}
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Every row is a real on-chain burn to the dead address — recognition only, no prizes, no
        contests. Burns shrink supply; they never promise price.
      </p>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading the wall…</p>}
      {isError && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load the burners wall right now. The burns are still on-chain — this is
            just the display.
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
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No voluntary burns recorded yet. Burn DUMB to the dead address and this wall lights up
          with your row.
        </p>
      )}
      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <ul className="mt-4 divide-y divide-foreground/10">
          {data!.map((r) => (
            <li
              key={`${r.block}-${r.tx}`}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="font-display text-sm font-bold uppercase tracking-wide">
                  {fmtGross(r.amountGross)} DUMB
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <a
                    href={explorerAddress(r.wallet)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline decoration-gold underline-offset-2 hover:text-gold"
                  >
                    {shortAddr(r.wallet)}
                  </a>
                  <span aria-hidden="true">·</span>
                  <span>block {r.block.toLocaleString("en-US")}</span>
                  {r.timestamp > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{timeAgo(r.timestamp)}</span>
                    </>
                  )}
                </p>
              </div>
              <a
                href={explorerTx(r.tx)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline decoration-gold underline-offset-2 hover:text-gold"
              >
                receipt <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
