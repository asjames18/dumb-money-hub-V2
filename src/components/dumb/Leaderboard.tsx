import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rankFor } from "@/data/dump";
import {
  EMPTY_STATS,
  buildYouEntry,
  exportStats,
  importStats,
  loadStats,
  nextRankInfo,
  saveStats,
  XP_UPDATED_EVENT,
  type LeaderboardEntry,
  type XpStats,
} from "@/lib/xp";

export function Leaderboard() {
  const [stats, setStats] = useState<XpStats>(EMPTY_STATS);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [name, setName] = useState(EMPTY_STATS.displayName);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => {
      const s = loadStats();
      setStats(s);
      setName(s.displayName);
      setBoard([buildYouEntry(s)]);
    };
    refresh();
    // RaidArcade (above) writes stats on completion — stay live, no reload.
    window.addEventListener(XP_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(XP_UPDATED_EVENT, refresh);
  }, []);

  const next = nextRankInfo(stats.points);

  const saveName = () => {
    const displayName = name.trim().slice(0, 24) || "Retail Raider";
    const nextStats = { ...stats, displayName };
    saveStats(nextStats);
    setStats(nextStats);
    setName(displayName);
    setBoard([buildYouEntry(nextStats)]);
    toast.success("Display name saved locally");
  };

  const onExport = () => {
    const blob = new Blob([exportStats(stats)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dump-hub-xp-${stats.displayName.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("XP export downloaded");
  };

  const onImport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const nextStats = importStats(text);
      setStats(nextStats);
      setName(nextStats.displayName);
      setBoard([buildYouEntry(nextStats)]);
      toast.success("XP import loaded");
    } catch {
      toast.error("Could not import that file");
    }
  };

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="sticker bg-gold px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-black">
          Your rank
        </span>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          Your personal board only — no fake rows, no other raiders. Export/import your progress; a
          shared community board ships later. Fun points only, not financial rewards.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Your run
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight">{stats.points}</p>
          <p className="text-sm font-bold text-primary">{rankFor(stats.points)}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border bg-surface p-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Missions
              </dt>
              <dd className="text-lg font-black">{stats.completed}</dd>
            </div>
            <div className="rounded-md border border-border bg-surface p-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Streak
              </dt>
              <dd className="text-lg font-black">{stats.streak}d</dd>
            </div>
            <div className="rounded-md border border-border bg-surface p-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Next
              </dt>
              <dd className="text-[11px] font-black leading-tight">{next.label}</dd>
            </div>
          </dl>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-[image:var(--gradient-hype)]"
              style={{ width: `${Math.round(next.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {next.pointsNeeded > 0
              ? `${next.pointsNeeded} XP to ${next.label}`
              : "You cleared the local rank ladder."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Display name"
              aria-label="Display name"
              className="max-w-[12rem] rounded-md border-border bg-surface"
            />
            <Button
              type="button"
              size="sm"
              onClick={saveName}
              className="rounded-md bg-primary font-black text-primary-foreground"
            >
              Save name
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onExport}
              className="gap-1.5 rounded-md border-border font-bold"
            >
              <Download className="size-3.5" /> Export JSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="gap-1.5 rounded-md border-border font-bold"
            >
              <Upload className="size-3.5" /> Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                // Reset the input so the same file can be imported twice.
                void onImport(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>

          {stats.history.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Recent missions
              </p>
              <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                {stats.history.slice(0, 8).map((h) => (
                  <li
                    key={`${h.id}-${h.at}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
                  >
                    <span className="truncate font-semibold">
                      {h.title}
                      {h.daily ? (
                        <Badge
                          variant="outline"
                          className="ml-1 rounded-md border-accent text-[9px] text-accent"
                        >
                          Daily
                        </Badge>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-black text-primary">+{h.xp}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Local board
            </p>
            <Badge variant="outline" className="rounded-md border-pink text-[10px] text-pink">
              Browser only
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Only your row appears here — the shared community board ships later.
          </p>
          <ol className="mt-3 space-y-2">
            {board.map((row, i) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-md border border-pink bg-pink/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    <span className="mr-2 text-muted-foreground">#{i + 1}</span>
                    {row.displayName}
                    <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-pink">
                      you
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.rank} · {row.completed} missions · {row.streak}d streak
                  </p>
                </div>
                <p className="shrink-0 text-base font-black text-primary">{row.points}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
