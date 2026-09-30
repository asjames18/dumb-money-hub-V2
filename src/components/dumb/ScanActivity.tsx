import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

type ScanStats = {
  window_days: number;
  deep_scans: number;
  pass_burns: number;
  dumb_destroyed_min: number;
};

/**
 * Honest community activity strip for the scanner: real 30-day counts from
 * this site's own anonymous usage counters (the same KV events behind
 * /api/ping — no cookies, no wallet data, privacy tools undercount).
 * Renders nothing when there's no activity yet or the fetch fails — never a
 * fabricated "0 scans" line.
 */
export function ScanActivity() {
  const [stats, setStats] = useState<ScanStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/scan-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (!alive || typeof d !== "object" || d === null) return;
        const s = d as Partial<ScanStats>;
        if (typeof s.deep_scans !== "number" || s.deep_scans <= 0) return;
        if (typeof s.pass_burns !== "number" || typeof s.dumb_destroyed_min !== "number") return;
        setStats({
          window_days: 30,
          deep_scans: s.deep_scans,
          pass_burns: s.pass_burns,
          dumb_destroyed_min: s.dumb_destroyed_min,
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!stats) return null;

  const fmt = (n: number) => n.toLocaleString("en-US");
  const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

  return (
    <div className="mt-4 rounded-lg border border-border bg-background/60 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-semibold">
        <Flame className="size-4 shrink-0 text-primary" aria-hidden />
        In the last 30 days, this community ran {fmt(stats.deep_scans)}{" "}
        {plural(stats.deep_scans, "deep scan")}.
      </p>
      {stats.pass_burns > 0 && (
        <p className="mt-1 text-muted-foreground">
          {fmt(stats.pass_burns)} {plural(stats.pass_burns, "scan pass")} bought — at least{" "}
          {fmt(stats.dumb_destroyed_min)} DUMB destroyed for them.
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground/70">
        Real counts from this site&rsquo;s anonymous usage counters — no cookies, no wallet data.
        Privacy tools undercount.
      </p>
    </div>
  );
}
