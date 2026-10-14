import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useSignMessage } from "wagmi";
import { BadgeCheck, HandCoins, Loader2 } from "lucide-react";

import { pulsechain } from "@/lib/pulsechain";
import { SITE_URL } from "@/lib/page-meta";
import { fetchEpochBurns, fmtCompactTok, type EpochBurnRow } from "@/lib/burns";
import {
  buildPledgeMessage,
  isValidPledgeAmount,
  PLEDGE_MAX_TOKENS,
  PLEDGE_MIN_TOKENS,
  pledgeBurnWei,
  pledgeRedeemed,
  type Pledge,
  type PledgeToken,
} from "@/lib/pledges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeShareButton } from "./NativeShareButton";

const short = (a: string): string => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Share helpers for the connected wallet's own pledge — the site's words
// plus the pledger's own amount/token (real signed data, never invented).
// Copy carries numbers only, never the address or opt-in username.
const pledgeShareUrl = (): string => `${SITE_URL}/burn`;

const pledgeShareText = (p: Pledge, redeemed: boolean): string =>
  redeemed
    ? `I pledged to burn ${Number(p.amount).toLocaleString()} ${p.token} — and my burns are verified on-chain. Watch the pledge board.`
    : `I pledged to burn ${Number(p.amount).toLocaleString()} ${p.token} in the next 30 days — holding me to it. Watch the pledge board.`;

const pledgeShareXUrl = (p: Pledge, redeemed: boolean): string =>
  `https://x.com/intent/post?text=${encodeURIComponent(pledgeShareText(p, redeemed))}&url=${encodeURIComponent(pledgeShareUrl())}`;

const pledgeShareTelegramUrl = (p: Pledge, redeemed: boolean): string =>
  `https://t.me/share/url?url=${encodeURIComponent(pledgeShareUrl())}&text=${encodeURIComponent(pledgeShareText(p, redeemed))}`;

const burnedOf = (row: EpochBurnRow | undefined, pledge: Pick<Pledge, "token" | "block">): bigint =>
  pledgeBurnWei(row, pledge);

function pledgeDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Public burn pledges — a rally board, not a burn counter. A connected wallet
 * signs ONE message (no gas, no funds move) publishing a public promise:
 * "I'll burn X DUMB/DAMP within 30 days." The row flips to redeemed only
 * when that wallet's verified on-chain voluntary burns cover the pledged
 * amount (arrival-leg accounting). Pledges are labeled promises, never
 * burns; expired pledges drop off. One pledge per wallet — pledging again
 * replaces the old one.
 */
export function PledgeCard() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: pulsechain.id });
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<PledgeToken>("DUMB");
  const [amountInput, setAmountInput] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const pledgesQuery = useQuery({
    queryKey: ["burn-pledges"],
    queryFn: async (): Promise<Pledge[]> => {
      const res = await fetch("/api/pledges");
      if (!res.ok) throw new Error("pledge board unavailable");
      const data = (await res.json()) as { pledges?: Pledge[] };
      return Array.isArray(data.pledges) ? data.pledges : [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Shares the leaderboard's cached epoch scan (same queryKey) — no extra
  // RPC fan-out when the leaderboard already fetched it.
  const burnsQuery = useQuery({
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

  const burnsByAddr = new Map((burnsQuery.data ?? []).map((r) => [r.address, r]));

  async function pledge() {
    if (!address) return;
    const amount = amountInput.replace(/[,_\s]/g, "");
    if (!isValidPledgeAmount(amount)) {
      setError(
        `Pledge ${PLEDGE_MIN_TOKENS.toLocaleString()}–${PLEDGE_MAX_TOKENS.toLocaleString()} ${token}, whole tokens.`,
      );
      return;
    }
    setError(null);
    setStatus("signing");
    const timestamp = Date.now();
    let signature: string;
    try {
      signature = await signMessageAsync({
        message: buildPledgeMessage(token, amount, address, timestamp),
      });
    } catch {
      setError("Signature rejected in wallet — nothing was published.");
      setStatus("idle");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/pledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, token, amount, timestamp, signature }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't publish — try again.");
        setStatus("idle");
        return;
      }
      setStatus("saved");
      setAmountInput("");
      await pledgesQuery.refetch();
    } catch {
      setError("Network error — try again.");
      setStatus("idle");
    }
  }

  const pledges = pledgesQuery.data ?? [];
  const busy = status === "signing" || status === "saving";

  // The connected wallet's own active pledge (addresses are stored lowercase).
  const myAddr = address?.toLowerCase();
  const myPledge = myAddr ? pledges.find((p) => p.address === myAddr) : undefined;
  const myRedeemed = myPledge
    ? pledgeRedeemed(myPledge, burnedOf(burnsByAddr.get(myPledge.address), myPledge))
    : false;

  return (
    <section
      id="pledge-board"
      aria-label="Burn pledges"
      className="rounded-xl border-2 border-primary/40 bg-card p-5"
    >
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-primary">
        <HandCoins className="size-4" /> Burn pledges
      </p>
      <h2 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">
        Put your burn where your mouth is
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Pledge publicly to burn DUMB or DAMP within 30 days — sign one message, no gas, nothing
        moves. Your row turns <span className="font-semibold text-foreground">burned ✓</span> only
        when your verified on-chain voluntary burns made after your pledge cover it — burns from
        before the pledge don&apos;t count. A pledge is a promise, not a burn — pledges expire after
        30 days, and only real burns count. Burning shrinks supply; it never promises price.
      </p>

      {address ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div
            className="flex gap-1 rounded-lg border border-border p-1"
            role="group"
            aria-label="Pledge token"
          >
            {(["DUMB", "DAMP"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setToken(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  token === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="pledge-amount" className="mb-1 block text-xs text-muted-foreground">
              Pledge amount ({token}, whole tokens)
            </label>
            <Input
              id="pledge-amount"
              inputMode="numeric"
              placeholder="e.g. 100000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-44"
              disabled={busy}
            />
          </div>
          <Button onClick={pledge} disabled={busy} className="min-w-36">
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {status === "signing"
              ? "Sign in wallet…"
              : status === "saving"
                ? "Publishing…"
                : "Pledge publicly"}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Connect your wallet above to publish a pledge.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {status === "saved" && !error && (
        <p className="mt-3 text-sm text-primary">
          Pledge published — now go make it real. It shows below until it&apos;s redeemed or
          expires.
        </p>
      )}

      {myPledge && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Share your pledge:
          </span>
          <NativeShareButton
            title="Burn pledge"
            text={pledgeShareText(myPledge, myRedeemed)}
            url={pledgeShareUrl()}
            fallbackUrl={pledgeShareXUrl(myPledge, myRedeemed)}
          />
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-md bg-foreground text-xs font-bold text-background hover:bg-foreground/90"
          >
            <a
              href={pledgeShareXUrl(myPledge, myRedeemed)}
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
              href={pledgeShareTelegramUrl(myPledge, myRedeemed)}
              target="_blank"
              rel="noreferrer noopener"
            >
              Share to Telegram
            </a>
          </Button>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Active pledges{" "}
          {pledges.length > 0 && <span className="text-foreground">({pledges.length})</span>}
        </h3>
        {pledgesQuery.isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading pledges…
          </p>
        ) : pledgesQuery.isError ? (
          <p className="mt-3 text-sm text-muted-foreground">
            The pledge board is unavailable right now — try again shortly.
          </p>
        ) : pledges.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No active pledges yet. The board is empty on purpose — every pledge here is a real
            wallet-signed promise, never seeded.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pledges.map((p) => {
              const row = burnsByAddr.get(p.address);
              const burnedWei = burnedOf(row, p);
              const redeemed = pledgeRedeemed(p, burnedWei);
              return (
                <li
                  key={`${p.address}-${p.pledgedAt}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      {p.name ?? short(p.address)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      pledged{" "}
                      <span className="font-semibold text-foreground">
                        {Number(p.amount).toLocaleString()} {p.token}
                      </span>
                      {" · "}
                      {pledgeDate(p.pledgedAt)}
                    </span>
                  </div>
                  {redeemed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
                      <BadgeCheck className="size-4" />
                      burned ✓ — {fmtCompactTok(burnedWei)} {p.token}{" "}
                      {p.block == null ? "burned" : "burned since pledge"}, verified on-chain
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                      promise — awaiting on-chain burn
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
