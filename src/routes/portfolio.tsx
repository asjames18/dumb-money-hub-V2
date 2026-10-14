import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { ScanSearch, Wallet } from "lucide-react";

import { ConnectButton } from "@/components/dumb/ConnectButton";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { PageShell } from "@/components/dumb/PageShell";
import { PortfolioDashboard } from "@/components/dumb/PortfolioDashboard";
import { WalletWatchPanel } from "@/components/dumb/WalletWatch";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Portfolio — Dumb Money Hub";
const DESCRIPTION =
  "Instant wallet intelligence on PulseChain: connect your wallet (or paste any address) for portfolio value, holdings, allocation, plain-English activity, and wallet-health checks. Read-only — the site never moves your funds.";

export const Route = createFileRoute("/portfolio")({
  head: () => pageMeta("/portfolio", TITLE, DESCRIPTION),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { address: connected } = useAccount();
  // Watched address lives in component state only — never persisted, never
  // sent anywhere except the public explorer reads below (Local Mode).
  const [watched, setWatched] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addrError, setAddrError] = useState<string | null>(null);

  const viewAddress = connected ?? watched;

  const watch = () => {
    const v = draft.trim();
    if (!isAddress(v)) {
      setAddrError("That doesn't look like a valid address — check and try again.");
      return;
    }
    setAddrError(null);
    setWatched(v);
  };

  /** Load a watched wallet from the panel into watch mode. */
  const selectWatched = (addr: string) => {
    setAddrError(null);
    setDraft("");
    setWatched(addr);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Disclaimer className="mb-6" />
        <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">Portfolio</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-6xl">
          Your crypto, explained
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Connect your wallet for instant intelligence — what you hold, what it&apos;s worth, what
          happened lately in plain English, and what deserves a second look. Read-only: this page
          can never move your funds; only your wallet signs transactions.
        </p>

        {!viewAddress ? (
          <div className="mt-8 rounded-xl border-2 border-primary/50 bg-card p-8 text-center">
            <Wallet className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-display text-xl uppercase tracking-wide">
              Connect to see your intelligence
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Your portfolio value, holdings, allocation, recent activity, and wallet health —
              computed live from public PulseChain data. Nothing leaves this browser — watched
              wallets are saved on this device only.
            </p>
            <div className="mt-5 flex justify-center">
              <ConnectButton />
            </div>
            <div className="mx-auto mt-8 max-w-md border-t border-foreground/10 pt-6 text-left">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <ScanSearch className="size-4" /> Or watch any public address
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && watch()}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="PulseChain address to watch"
                  className="min-w-0 flex-1 rounded-md border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={watch}
                  className="shrink-0 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
                >
                  Watch
                </button>
              </div>
              {addrError && <p className="mt-2 text-xs font-bold text-red-400">{addrError}</p>}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Any public PulseChain address works — researchers welcome. A pasted address stays in
                this tab only; use “Watch this wallet” on its page to keep it in your browser-local
                watchlist.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            {!connected && watched && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-foreground/15 bg-card px-4 py-2 text-xs text-muted-foreground">
                <span>
                  Watching a public address —{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setWatched(null);
                      setDraft("");
                    }}
                    className="font-bold text-primary hover:underline"
                  >
                    stop watching
                  </button>
                </span>
              </div>
            )}
            <PortfolioDashboard address={viewAddress} />
            <WalletWatchPanel onSelect={selectWatched} connected={!!connected} />
          </div>
        )}
        {!viewAddress && <WalletWatchPanel onSelect={selectWatched} connected={!!connected} />}
      </main>
    </PageShell>
  );
}
