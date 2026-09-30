import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Copy,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  ReceiptText,
  ScanSearch,
  TriangleAlert,
} from "lucide-react";

import { explainTx, isTxHash, type TxExplanation } from "@/lib/tx-explain";
import { Button } from "@/components/ui/button";
import { NativeShareButton } from "./NativeShareButton";

const short = (addr: string): string =>
  addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

// One-tap demo: a REAL on-chain burn tx (PLS → DUMB through the PulseX router,
// bought DUMB sent straight to the dead address — ~104,477 DUMB destroyed,
// block 27663514, verified 2026-09-29). The explainer re-runs live on-chain
// at tap time, so the demo always reflects current chain state — never a
// canned result. Fill-then-tap only: the button fills the input, the user
// still taps Explain (no unprompted RPC reads).
const DEMO_TX = "0x4757ca9767026ed1a70a8ada16a14c69a193a5ce94b84d67406efbd7a1047522" as const;

const explorerAddress = (addr: string): string => `https://scan.pulsechain.com/address/${addr}`;

// Shared /scan?tx= links carry only the hash — the explanation re-runs live
// on-chain at view time, so a shared link can never show a stale story.
const shareUrl = (hash: string): string => `${window.location.origin}/scan?tx=${hash}`;

// Honest pre-filled copy: our own words about what the tool does, never the
// tx's own (possibly attacker-controlled) token symbols or amounts.
const shareText = (hash: string): string =>
  `What did this PulseChain tx actually do? ${hash.slice(0, 10)}… explained live on-chain — what moved, what burned, what a swap really cost.`;

const shareXUrl = (hash: string): string =>
  `https://x.com/intent/post?text=${encodeURIComponent(shareText(hash))}&url=${encodeURIComponent(shareUrl(hash))}`;

const shareTelegramUrl = (hash: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(shareUrl(hash))}&text=${encodeURIComponent(shareText(hash))}`;

export function TxExplainer({ shareTx }: { shareTx?: string | undefined }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TxExplanation | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (raw: string) => {
    const trimmed = raw.trim();
    if (!isTxHash(trimmed)) {
      setError("That doesn't look like a transaction hash — 0x followed by 64 hex characters.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setResult(await explainTx(trimmed));
    } finally {
      setBusy(false);
    }
  };

  // Shared /scan?tx= links re-run the explanation live on-chain at view time —
  // the link carries a hash, never a result, so it can't show a stale story.
  useEffect(() => {
    if (!shareTx || !isTxHash(shareTx)) return;
    setInput(shareTx);
    void run(shareTx);
  }, [shareTx]);

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(shareUrl(result.hash));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — your browser blocked clipboard access.");
    }
  };

  return (
    <div className="rounded-xl border-2 border-foreground/20 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ReceiptText className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-xl uppercase tracking-wide">Explain a transaction</h2>
        <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
          Free
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste any PulseChain transaction hash. The explainer reads the receipt live on-chain and
        tells you what actually happened — what moved, what burned, what a swap really cost you — in
        plain English. Read-only, no wallet needed.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(input)}
          aria-label="Transaction hash to explain"
          placeholder="0x… paste the transaction hash"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
        />
        <button
          onClick={() => run(input)}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {busy ? "Reading…" : "Explain"}
        </button>
      </div>
      {input.trim() === "" && (
        <button
          type="button"
          onClick={() => setInput(DEMO_TX)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          No hash handy? See a real burn
        </button>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      {result && result.status !== "rpc-error" && result.status !== "not-found" && (
        <div className="mt-5">
          <h3 className="font-display text-2xl uppercase leading-tight">{result.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.subline}</p>

          {result.burnBragTx && (
            <p className="mt-3 flex items-center gap-2 rounded-md border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-sm">
              <Flame className="size-4 shrink-0 text-orange-500" aria-hidden />
              <span>
                That was a voluntary burn —{" "}
                <Link
                  to="/brag"
                  search={{ tx: result.burnBragTx }}
                  className="font-bold text-orange-500 underline decoration-dotted underline-offset-2 hover:text-orange-400"
                >
                  get your shareable brag card
                </Link>
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {result.called && (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 font-mono">
                Called: {result.called}
              </span>
            )}
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono underline decoration-dotted underline-offset-2"
            >
              {short(result.hash)} on the explorer <ExternalLink className="size-3" aria-hidden />
            </a>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-display uppercase tracking-widest hover:border-primary"
            >
              {copied ? (
                <Check className="size-3" aria-hidden />
              ) : (
                <Copy className="size-3" aria-hidden />
              )}
              {copied ? "Copied" : "Share this explanation"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Spread the word:
            </span>
            <NativeShareButton
              title="Transaction explanation"
              text={shareText(result.hash)}
              url={shareUrl(result.hash)}
              fallbackUrl={shareXUrl(result.hash)}
            />
            <Button
              asChild
              size="sm"
              className="gap-1.5 rounded-md bg-foreground text-xs font-bold text-background hover:bg-foreground/90"
            >
              <a href={shareXUrl(result.hash)} target="_blank" rel="noreferrer noopener">
                Post to X
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
            >
              <a href={shareTelegramUrl(result.hash)} target="_blank" rel="noreferrer noopener">
                Share to Telegram
              </a>
            </Button>
          </div>

          {result.flags.length > 0 && (
            <ul className="mt-4 space-y-2">
              {result.flags.map((f, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-relaxed ${
                    f.kind === "burn"
                      ? "border-orange-500/50 bg-orange-500/10"
                      : f.kind === "warn"
                        ? "border-amber-400/50 bg-amber-400/10"
                        : "border-border bg-background"
                  }`}
                >
                  {f.kind === "burn" ? (
                    <Flame className="mt-0.5 size-4 shrink-0 text-orange-500" aria-hidden />
                  ) : f.kind === "warn" ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          )}

          {result.movements.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">From</th>
                    <th className="px-3 py-2">To</th>
                  </tr>
                </thead>
                <tbody>
                  {result.movements.map((m, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 font-mono font-bold">
                        {m.amount} {m.symbol}
                        {m.isBurnLeg && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 align-middle font-sans text-[10px] font-normal uppercase tracking-widest text-orange-500">
                            <Flame className="size-3" aria-hidden /> burn
                          </span>
                        )}
                        {m.token !== "0x0000000000000000000000000000000000000000" && (
                          <Link
                            to="/scan"
                            search={{ token: m.token, burn: undefined, tx: undefined }}
                            title="Safety-check this token in the scanner"
                            className="ml-1.5 inline-flex items-center gap-0.5 align-middle font-sans text-[10px] font-normal uppercase tracking-widest text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
                          >
                            <ScanSearch className="size-3" aria-hidden /> scan token
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={explorerAddress(m.from)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs underline decoration-dotted underline-offset-2"
                        >
                          {short(m.from)}
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={explorerAddress(m.to)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs underline decoration-dotted underline-offset-2"
                        >
                          {m.isBurnLeg ? "dead address" : short(m.to)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Honest limits: this shows what moved on-chain — not why, and not what anyone promised
            you. Internal transfers inside a contract call aren't visible to this tool. "Nothing
            suspicious in the movements" is not the same as "this was safe."
          </p>
        </div>
      )}

      {result && (result.status === "rpc-error" || result.status === "not-found") && (
        <div className="mt-5 rounded-md border border-border bg-background p-4">
          <h3 className="font-display text-lg uppercase">{result.headline}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{result.subline}</p>
        </div>
      )}
    </div>
  );
}
