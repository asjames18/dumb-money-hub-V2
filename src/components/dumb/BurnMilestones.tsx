import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/page-meta";
import { fetchRootEngines } from "@/lib/proof/fetch-roots";
import { NativeShareButton } from "./NativeShareButton";

const MILESTONES = [16_000_000_000, 17_000_000_000, 18_000_000_000];
const BAR_MIN = 15_000_000_000;
const BAR_MAX = 18_000_000_000;

const fmtB = (n: number) =>
  n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(2)}B` : `${Math.round(n / 1_000_000)}M`;

/** The next unhit milestone, or null once all three are crushed. */
const nextMilestone = (burned: number): number | null => MILESTONES.find((m) => burned < m) ?? null;

const milestoneShareUrl = (): string => `${SITE_URL}/burn`;

const milestoneShareText = (burned: number, next: number | null): string =>
  next === null
    ? `DUMB crushed the 16B / 17B / 18B burn milestones: ${fmtB(burned)} burned so far. 1% of every taxed transfer burns. Verified on-chain.`
    : `DUMB burn update: ${fmtB(burned)} burned — the ${fmtB(next)} milestone is next. 1% of every taxed transfer burns. Verified on-chain.`;

const milestoneShareXUrl = (text: string): string =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(milestoneShareUrl())}`;

const milestoneShareTelegramUrl = (text: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(milestoneShareUrl())}&text=${encodeURIComponent(text)}`;

/**
 * Burn milestones strip — frontend-only, reads the same dead-address balance
 * the /roots tracker uses (shared react-query cache). Celebratory but honest:
 * most of this was the 14B launch-day burn, and the 1% protocol burn on every
 * taxed transfer keeps it growing — every trade pushes the next milestone.
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

  const burned = data ? Number(data[0].burned) / 1e18 : null;
  const pct =
    burned === null
      ? 0
      : Math.min(100, Math.max(0, ((burned - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100));
  // The share row only renders on a live number — never a loading or error state.
  const next = burned === null ? null : nextMilestone(burned);
  const shareText = burned === null ? null : milestoneShareText(burned, next);

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
          {burned === null ? "Loading…" : `${fmtB(burned)} DUMB burned`}
        </h2>
        <p className="text-xs text-muted-foreground">verified on-chain</p>
      </div>

      <div
        className="relative mt-4 h-3 rounded-full bg-secondary"
        role="img"
        aria-label={burned === null ? "Burn progress loading" : `${fmtB(burned)} of 18B milestone`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold transition-all"
          style={{ width: `${pct}%` }}
        />
        {MILESTONES.map((m) => {
          const left = ((m - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100;
          const hit = burned !== null && burned >= m;
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
          <span key={m} className={burned !== null && burned >= m ? "text-gold" : ""}>
            {fmtB(m)}
            {burned !== null && burned >= m ? " ✓" : ""}
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
        <strong className="text-foreground">1% of every taxed transfer is burned</strong> — so every
        trade pushes the next milestone closer.{" "}
        <a href="/roots" className="underline decoration-gold underline-offset-2 hover:text-gold">
          See the receipts
        </a>
        .
      </p>
    </section>
  );
}
