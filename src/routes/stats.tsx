import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { PageShell } from "@/components/dumb/PageShell";

// PRIVATE page: unlisted (no nav link anywhere, not in sitemap.xml),
// robots noindex + disallowed in robots.txt, excluded from the analytics
// beacon itself, and passphrase-gated server-side. The passphrase is verified
// by /api/analytics against the ANALYTICS_PASS Worker secret — it is never
// in code. The browser keeps it in sessionStorage only (tab lifetime).

const TITLE = "Usage stats — Dumb Money Hub (private)";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [{ title: TITLE }, { name: "robots", content: "noindex, nofollow, noarchive" }],
  }),
  component: StatsPage,
});

const EVENT_LABELS: Record<string, string> = {
  scan_started: "Scans started",
  quick_scan: "Quick scans",
  deep_scan: "Deep scans",
  pass_burn_dumb: "Pass burns (DUMB)",
  pass_burn_pls: "Pass burns (PLS)",
  burn_started: "Burns started",
  burn_voluntary: "Voluntary burns (DUMB)",
  burn_voluntary_pls: "Voluntary burns (PLS)",
  swap_quote: "Swap quotes",
  swap_attempt: "Swap attempts",
  swap_confirmed: "Swaps confirmed",
  swap_failed: "Swaps failed",
  wallet_connect: "Wallet connects",
  share_tap: "Share taps",
  copy_contract: "Contract copies",
  add_to_wallet: "Add-to-wallet taps",
  raid_play: "Raid arcade plays",
  rating_submitted: "Ratings submitted",
  brag_share: "Brag cards shared",
  err_quote: "Quote errors",
  err_tx: "Tx rejections",
  err_scan: "Scan errors",
};

type FeedbackItem = {
  ts: string;
  category: string;
  message: string;
  page: string;
};

type Aggregates = {
  days: string[];
  byDay: Record<string, number>;
  byPath: Record<string, number>;
  byEvent: Record<string, number>;
  byCountry: Record<string, number>;
  feedback: FeedbackItem[];
};

const FEEDBACK_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  comment: "Comment",
  other: "Other",
};

const PASS_KEY = "dumb-stats-pass";

async function fetchAggregates(pass: string): Promise<Aggregates> {
  const res = await fetch("/api/analytics", {
    headers: { authorization: `Bearer ${pass}` },
  });
  if (res.status === 401) throw new Error("wrong-pass");
  if (!res.ok) throw new Error("unavailable");
  return (await res.json()) as Aggregates;
}

function StatsPage() {
  const [pass, setPass] = useState(() => {
    try {
      return sessionStorage.getItem(PASS_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [data, setData] = useState<Aggregates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = async (p: string) => {
    const trimmed = p.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const agg = await fetchAggregates(trimmed);
      try {
        sessionStorage.setItem(PASS_KEY, trimmed);
      } catch {
        // private mode — the page still works for this load
      }
      setPass(trimmed);
      setData(agg);
    } catch (e) {
      try {
        sessionStorage.removeItem(PASS_KEY);
      } catch {
        /* ignore */
      }
      setData(null);
      setError(
        e instanceof Error && e.message === "wrong-pass"
          ? "That passphrase didn't work — try again."
          : "Stats are unavailable right now. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  // Auto-unlock when a passphrase is already in this tab's session.
  useEffect(() => {
    if (pass && !data && !busy && !error) void unlock(pass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {!data ? (
          <div className="mx-auto max-w-md rounded-xl border-2 border-foreground/20 bg-card p-6 sm:p-8">
            <h1 className="flex items-center gap-2 font-display text-xl uppercase tracking-wide">
              <Lock className="size-5" /> Private stats
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This page is unlisted and passphrase-protected. Enter the passphrase to see how the
              hub is being used. Looking for token numbers instead? The{" "}
              <a href="/roots" className="underline underline-offset-2 hover:text-primary">
                public dashboard
              </a>{" "}
              has live DUMB and DAMP figures — no passphrase needed.
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void unlock(pass);
              }}
            >
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Passphrase"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !pass.trim()}
                className="rounded-md bg-primary px-4 py-2 font-display text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Checking…" : "Unlock"}
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        ) : (
          <Dashboard data={data} />
        )}
      </main>
    </PageShell>
  );
}

function Dashboard({ data }: { data: Aggregates }) {
  const totalVisits = Object.values(data.byDay).reduce((a, b) => a + b, 0);
  const scans = (data.byEvent["quick_scan"] ?? 0) + (data.byEvent["deep_scan"] ?? 0);
  const burns =
    (data.byEvent["pass_burn_dumb"] ?? 0) +
    (data.byEvent["pass_burn_pls"] ?? 0) +
    (data.byEvent["burn_voluntary"] ?? 0) +
    (data.byEvent["burn_voluntary_pls"] ?? 0);
  const connects = data.byEvent["wallet_connect"] ?? 0;

  const kpis: [string, number][] = [
    ["Visits (30d)", totalVisits],
    ["Scans", scans],
    ["Burns", burns],
    ["Wallet connects", connects],
  ];

  const maxDay = Math.max(1, ...data.days.map((d) => data.byDay[d] ?? 0));
  const topPages = Object.entries(data.byPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const events = Object.entries(data.byEvent).sort((a, b) => b[1] - a[1]);
  const countries = Object.entries(data.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Funnels: each step shows its share of the previous step, so drop-off is visible.
  const ev = (k: string) => data.byEvent[k] ?? 0;
  const scanFunnel: [string, number][] = [
    ["Scans started", ev("scan_started")],
    ["Quick scans finished", ev("quick_scan")],
    ["Deep scans finished", ev("deep_scan")],
    ["Pass burns", ev("pass_burn_dumb") + ev("pass_burn_pls")],
  ];
  const swapFunnel: [string, number][] = [
    ["Quotes seen", ev("swap_quote")],
    ["Swap attempts", ev("swap_attempt")],
    ["Swaps confirmed", ev("swap_confirmed")],
    ["Swaps failed", ev("swap_failed")],
  ];
  const burnFunnel: [string, number][] = [
    ["Burns started", ev("burn_started")],
    ["Voluntary burns", ev("burn_voluntary") + ev("burn_voluntary_pls")],
  ];
  const issues: [string, number][] = [
    ["Quote errors", ev("err_quote")],
    ["Tx rejections", ev("err_tx")],
    ["Scan errors", ev("err_scan")],
  ];
  const unused = Object.keys(EVENT_LABELS).filter((k) => ev(k) === 0);

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wide">
        Hub usage <span className="text-muted-foreground">(last 30 days)</span>
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Anonymous counts only — no cookies, no tracking, no wallet data. Numbers are directional: ad
        blockers hide some visitors.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-xl border-2 border-foreground/20 bg-card p-4">
            <div className="font-display text-2xl text-primary">{value.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
        <h2 className="font-display text-lg uppercase tracking-wide">Visits per day</h2>
        <div className="mt-4 flex h-32 items-end gap-1">
          {data.days
            .slice()
            .reverse()
            .map((day) => {
              const v = data.byDay[day] ?? 0;
              return (
                <div
                  key={day}
                  title={`${day}: ${v} visits`}
                  className="min-w-0 flex-1 rounded-sm bg-primary/80"
                  style={{ height: `${Math.max(3, (v / maxDay) * 100)}%` }}
                />
              );
            })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{data.days[data.days.length - 1]}</span>
          <span>{data.days[0]}</span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
          <h2 className="font-display text-lg uppercase tracking-wide">Top pages</h2>
          <Rows
            rows={topPages.map(([k, v]) => [k, v.toLocaleString()])}
            empty="No pageviews yet."
          />
        </section>
        <section className="rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
          <h2 className="font-display text-lg uppercase tracking-wide">Actions</h2>
          <Rows
            rows={events.map(([k, v]) => [EVENT_LABELS[k] ?? k, v.toLocaleString()])}
            empty="No actions tracked yet."
          />
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Funnel title="Scan funnel" steps={scanFunnel} />
        <Funnel title="Swap funnel" steps={swapFunnel} />
        <Funnel title="Burn funnel" steps={burnFunnel} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
          <h2 className="font-display text-lg uppercase tracking-wide">Issues</h2>
          <Rows
            rows={issues.map(([k, v]) => [k, v.toLocaleString()])}
            empty="No errors tracked — either everything works or nobody hit a snag."
          />
        </section>
        <section className="rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
          <h2 className="font-display text-lg uppercase tracking-wide">Unused features</h2>
          {unused.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Everything tracked got used at least once in the last 30 days.
            </p>
          ) : (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {unused.map((k) => (
                <li key={k}>{EVENT_LABELS[k] ?? k} — zero uses</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
        <h2 className="font-display text-lg uppercase tracking-wide">
          Feedback inbox <span className="text-muted-foreground">({data.feedback.length})</span>
        </h2>
        {data.feedback.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No feedback yet. Submissions from the public /feedback form land here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.feedback.map((f, i) => (
              <article key={`${f.ts}-${i}`} className="rounded-lg border border-foreground/10 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 font-bold uppercase tracking-widest text-primary">
                    {FEEDBACK_LABELS[f.category] ?? f.category}
                  </span>
                  <span className="text-muted-foreground">{f.page}</span>
                  <span className="ml-auto text-muted-foreground">{f.ts}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
        <h2 className="font-display text-lg uppercase tracking-wide">Countries</h2>
        <Rows
          rows={countries.map(([k, v]) => [k, v.toLocaleString()])}
          empty="No country data yet."
        />
      </section>
    </div>
  );
}

function Funnel({ title, steps }: { title: string; steps: [string, number][] }) {
  return (
    <section className="rounded-xl border-2 border-foreground/20 bg-card p-4 sm:p-6">
      <h2 className="font-display text-lg uppercase tracking-wide">{title}</h2>
      <div className="mt-3 space-y-2">
        {steps.map(([label, value], i) => {
          const prev = i > 0 ? (steps[i - 1]?.[1] ?? 0) : 0;
          const pct = i > 0 && prev > 0 ? ` · ${Math.round((value / prev) * 100)}% of prev` : "";
          return (
            <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                <span className="mr-2 font-bold text-foreground">{i + 1}.</span>
                {label}
              </span>
              <span className="shrink-0 font-bold text-foreground">
                {value.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground">{pct}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Rows({ rows, empty }: { rows: [string, string][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <dl className="mt-3 space-y-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
          <dt className="min-w-0 truncate text-muted-foreground">{label}</dt>
          <dd className="shrink-0 font-mono">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
