import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { ExternalLink, Flame } from "lucide-react";

import { explorerTx, pulsechain } from "@/lib/pulsechain";
import { fetchRecentBurns, fmtCompactTok, timeAgo } from "@/lib/burns";

/**
 * Live burns ticker — makes the (previously invisible) 1% protocol burn on
 * every taxed transfer visible, plus any voluntary burns to the dead
 * address. Read-only against the public RPC; honest loading / error / empty
 * states; never invented, never promising price.
 */
export function BurnTicker() {
  const client = usePublicClient({ chainId: pulsechain.id });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["burn-ticker"],
    queryFn: () => {
      if (!client) throw new Error("no public client");
      return fetchRecentBurns(client);
    },
    enabled: !!client,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const totals: Record<"DUMB" | "DAMP", bigint> = { DUMB: 0n, DAMP: 0n };
  for (const e of data ?? []) totals[e.token] += e.burnedWei;

  return (
    <section
      aria-label="Live burns ticker"
      className="rounded-xl border-2 border-pink/50 bg-card p-5"
    >
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-pink">
        <Flame className="size-4" /> Live burns
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">
          {isLoading
            ? "Reading the chain…"
            : `${fmtCompactTok(totals.DUMB)} DUMB · ${fmtCompactTok(totals.DAMP)} DAMP`}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isLoading ? "" : "arrived at the dead address in the last 20,000 blocks"}
        </p>
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">Scanning recent burn legs…</p>
      )}
      {isError && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t read recent burns from the chain. The 1% protocol burn is still live on
            every taxed transfer.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-bold text-pink underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No burns in the scanned window — every taxed transfer still burns 1%, and this ticker
          lights up the moment one lands.
        </p>
      )}
      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <ul className="mt-4 divide-y divide-foreground/10">
          {data!.map((e) => (
            <li
              key={`${e.hash}-${e.sender}-${e.token}`}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="font-display text-sm font-bold uppercase tracking-wide">
                  {fmtCompactTok(e.burnedWei)} {e.token}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.kind === "voluntary" ? (
                    <span className="font-bold text-pink">voluntary burn</span>
                  ) : (
                    <>
                      1% protocol burn of a{" "}
                      <strong className="text-foreground">
                        ~{fmtCompactTok(e.burnedWei * 100n)} {e.token}
                      </strong>{" "}
                      transfer
                    </>
                  )}
                  {e.timestamp !== null && <> · {timeAgo(e.timestamp)}</>}
                </p>
              </div>
              <a
                href={explorerTx(e.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline decoration-pink underline-offset-2 hover:text-pink"
              >
                receipt <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        A <strong className="text-foreground">voluntary burn</strong> is someone sending tokens
        straight to the dead address. A{" "}
        <strong className="text-foreground">1% protocol burn</strong> is the live tax-burn leg of a
        taxed transfer — verified on-chain 2026-09-27. Burns shrink supply; they never promise
        price.
      </p>
    </section>
  );
}
