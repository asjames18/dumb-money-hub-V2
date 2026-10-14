import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/page-meta";
import { fetchRootEngines } from "@/lib/proof/fetch-roots";
import { NativeShareButton } from "./NativeShareButton";

const MILESTONES = [20_000_000_000, 21_000_000_000, 22_000_000_000];
const BAR_MIN = 19_000_000_000;
const BAR_MAX = 22_000_000_000;

const fmtB = (n: number) =>
  n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(2)}B` : `${Math.round(n / 1_000_000)}M`;

/** The next unhit milestone, or null once all three are crushed. */
const nextMilestone = (gone: number): number | null => MILESTONES.find((m) => gone < m) ?? null;

const milestoneShareUrl = (): string => `${SITE_URL}/burn`;

const milestoneShareText = (gone: number, next: number | null): string =>
  next === null
    ? `DUMB crushed the ${MILESTONES.map(fmtB).join(" / ")} burn milestones: ${fmtB(gone)} gone for good. 5% of every taxed transfer is destroyed. Verified on-chain.`
    : `DUMB burn update: ${fmtB(gone)} gone for good — the ${fmtB(next)} milestone is next. 5% of every taxed transfer is destroyed. Verified on-chain.`;

const milestoneShareXUrl = (text: string): string =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(milestoneShareUrl())}`;

const milestoneShareTelegramUrl = (text: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(milestoneShareUrl())}&text=${encodeURIComponent(text)}`;

/**
 * Burn milestones strip — frontend-only, reads the same /roots engine data
 * the tracker uses (shared react-query cache): the dead-address burns PLUS
 * the tax buckets entombed in the token contract. Antonio 2026-10-02: the
 * milestone tracks the true "gone for good" total (dead + locked), not the
 * dead address alone. Celebratory but honest: most of this was the 14B
 * launch-day burn, and the live tax keeps it growing — every taxed transfer
 * destroys 5% for good (1% to the dead address, 4% entombed in the contract),
 * so every trade pushes the total higher.
 */
export function BurnMilestones() {
  const { data } = useQuery({
    queryKey: ["roots-engines"],
    queryFn: fetchRootEngines,
    staleTime: 60 * 60_000,
    refetchInterval: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // The milestone tracks "gone for good": dead-address burns plus the tax
  // buckets entombed in the token contract — both live in the shared engine
  // read, so this adds zero RPC calls.
  const engine = data ? data[0] : null;
  const gone = engine ? (Number(engine.burned) + Number(engine.dormant)) / 1e18 : null;
  const burned = engine ? Number(engine.burned) / 1e18 : null;
  const dormant = engine ? Number(engine.dormant) / 1e18 : null;
  const pct =
    gone === null ? 0 : Math.min(100, Math.max(0, ((gone - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100));
  // The share row only renders on a live number — never a loading or error state.
  const next = gone === null ? null : nextMilestone(gone);
  const shareText = gone === null ? null : milestoneShareText(gone, next);

  return (
    <section
      aria-label="Burn milestones"
      className="rounded-xl border-2 border-gold/50 bg-card p-5"
    >
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-gold">
        <Flame className="size-4" /> Burn milestones
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">
          {gone === null ? "Loading…" : `${fmtB(gone)} DUMB gone for good`}
        </h2>
        <p className="text-xs text-muted-foreground">verified on-chain</p>
      </div>
      {gone !== null && burned !== null && dormant !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          {fmtB(burned)} burned to the dead address · {fmtB(dormant)} locked in the contract — both
          can never move
        </p>
      )}

      <div
        className="relative mt-4 h-3 rounded-full bg-secondary"
        role="img"
        aria-label={
          gone === null
            ? "Burn progress loading"
            : next === null
              ? `${fmtB(gone)} gone for good — all milestones crushed`
              : `${fmtB(gone)} gone for good — next milestone ${fmtB(next)}`
        }
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold transition-all"
          style={{ width: `${pct}%` }}
        />
        {MILESTONES.map((m) => {
          const left = ((m - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100;
          const hit = gone !== null && gone >= m;
          return (
            <div
              key={m}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
              title={`${fmtB(m)}${hit ? " — reached" : ""}`}
            >
              <div
                className={`size-4 rounded-full border-2 ${
                  hit ? "border-gold bg-gold" : "border-gold/50 bg-card"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {MILESTONES.map((m) => (
          <span key={m} className={gone !== null && gone >= m ? "text-gold" : ""}>
            {fmtB(m)}
            {gone !== null && gone >= m ? " ✓" : ""}
          </span>
        ))}
      </div>

      {shareText !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Rally the milestone:
          </span>
          <NativeShareButton
            title="DUMB burn milestone"
            text={shareText}
            url={milestoneShareUrl()}
            fallbackUrl={milestoneShareXUrl(shareText)}
          />
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-md bg-foreground text-xs font-bold text-background hover:bg-foreground/90"
          >
            <a href={milestoneShareXUrl(shareText)} target="_blank" rel="noreferrer noopener">
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
              href={milestoneShareTelegramUrl(shareText)}
              target="_blank"
              rel="noreferrer noopener"
            >
              Share to Telegram
            </a>
          </Button>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Most of this was the 14B burn in the first minute after launch. What keeps it growing is the
        live mechanic:{" "}
        <strong className="text-foreground">
          5% of every taxed transfer is destroyed for good
        </strong>{" "}
        — 1% burned to the dead address, 4% entombed in the contract&apos;s tax buckets — so every
        trade pushes the total {next === null ? "higher" : "toward the next milestone"}.{" "}
        <a href="/roots" className="underline decoration-gold underline-offset-2 hover:text-gold">
          See the receipts
        </a>
        .
      </p>
    </section>
  );
}
