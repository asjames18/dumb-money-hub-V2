import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, ScanSearch } from "lucide-react";

import { Disclaimer } from "@/components/dumb/Disclaimer";
import { PageShell } from "@/components/dumb/PageShell";
import { TokenScanner } from "@/components/dumb/TokenScanner";
import { BagScan } from "@/components/dumb/BagScan";
import { ScanWatchlist } from "@/components/dumb/ScanWatchlist";
import { ScanActivity } from "@/components/dumb/ScanActivity";
import { TxExplainer } from "@/components/dumb/TxExplainer";
import { pageMeta, shareSymbolFor, SITE_URL } from "@/lib/page-meta";

const TITLE = "Token Safety Scanner — Dumb Money Hub";
const DESCRIPTION =
  "Paste any PulseChain token address for a free read-only safety scan: taxes, owner powers, pause switches, and liquidity lock state — in plain English. Or paste any transaction hash to see what actually happened. No wallet needed.";

export const Route = createFileRoute("/scan")({
  // Shareable report links: /scan?token=0x… re-runs the quick scan live on-chain
  // at view time (the link carries an address, never a result — no spoofing,
  // no stale screenshots). &burn=0x… re-verifies the burn, then runs the deep scan.
  // &tx=0x… opens the transaction explainer and re-runs it live on-chain.
  // Absent params stay undefined (not empty strings) so plain /scan visits
  // don't get a normalize redirect to /scan?token=&burn=.
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? (search["token"] as string) : undefined,
    burn: typeof search["burn"] === "string" ? (search["burn"] as string) : undefined,
    tx: typeof search["tx"] === "string" ? (search["tx"] as string) : undefined,
  }),
  head: ({ match }) => {
    // Symbol-only unfurl personalization (2026-09-29): a shared report link
    // for a curated token unfurls as e.g. "DUMB — live safety report on
    // Dumb Money Hub" instead of the generic scanner card — friendlier to
    // outsiders. Honesty gate: the symbol is the ONLY personalization — no
    // verdict, no result, so a cached card can never go stale or lie. Any
    // non-curated or malformed token falls back to the generic card.
    const symbol = shareSymbolFor(match.search["token"]);
    if (!symbol) return pageMeta("/scan", TITLE, DESCRIPTION);
    const token = (match.search["token"] as string).toLowerCase();
    const title = `${symbol} — live safety report on Dumb Money Hub`;
    const description = `Opening this link re-runs the Dumb Money Hub safety scan of ${symbol} live on-chain — taxes, owner powers, pause switches, liquidity — in plain English. Free, read-only, no wallet needed. It flags the obvious traps; it can't bless a token as safe.`;
    const url = `${SITE_URL}/scan?token=${encodeURIComponent(token)}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ScanPage,
});

function ScanPage() {
  const { token, burn, tx } = Route.useSearch();
  const [tab, setTab] = useState<"token" | "tx">(() => (tx ? "tx" : "token"));
  // Shared report links (?tx=, ?token=/&burn=) followed while already on /scan
  // change search params without remounting — retarget the tab so the linked
  // tool actually opens and re-runs. (Fresh page loads initialize the tab above.)
  useEffect(() => {
    if (tx && tab !== "tx") setTab("tx");
    else if ((token || burn) && tab !== "token") setTab("token");
  }, [token, burn, tx, tab]);
  return (
    <PageShell>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <Disclaimer className="mb-6" />
        <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">The safety desk</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-6xl">
          Scan it. <span className="text-pink">Don't get rekt.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          PulseChain's wildest corner is full of copy-paste tokens with hidden taxes, live owners,
          and unlocked liquidity. This scanner reads the contract live on-chain and tells you what
          it can verify — in plain English, not bytecode. It flags the obvious traps; it can't bless
          a token as safe.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <ScanSearch className="size-3.5 text-primary" aria-hidden />
          Read-only · no wallet · no signing · PulseChain 369
        </p>

        <div className="mt-8">
          <div className="mb-4 inline-flex rounded-md border border-border bg-background p-1">
            {(
              [
                { id: "token", label: "Scan a token" },
                { id: "tx", label: "Explain a transaction" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded px-4 py-1.5 font-display text-xs uppercase tracking-[0.2em] ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "token" ? (
            <TokenScanner shareToken={token} shareBurn={burn} />
          ) : (
            <TxExplainer shareTx={tx} />
          )}
          {tab === "token" && <BagScan />}
          {tab === "token" && <ScanWatchlist />}
        </div>

        {tab === "token" && (
          <div className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-5">
            <h2 className="font-display text-lg uppercase tracking-wide">
              Deep scan is live — burn-gated
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              After any quick scan of a token with a PulseX WPLS pair, you can run the{" "}
              <strong className="text-foreground">deep scan</strong>: a simulated 1 WPLS buy plus an
              immediate sell-back against real liquidity, and a liquidity-depth probe — the real
              round-trip cost in plain English. It costs a 100,000 DUMB burn to the dead address
              (verified on-chain before the report renders), so every deep scan shrinks the supply.
            </p>
            <p className="mt-3">
              <a
                href="#token-scanner"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline decoration-dotted underline-offset-2"
              >
                <Flame className="size-4" aria-hidden />
                Quick-scan a token above — the deep-scan burn step appears with your report
              </a>
            </p>
            <ScanActivity />
          </div>
        )}
      </main>
    </PageShell>
  );
}
