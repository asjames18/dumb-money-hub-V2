import { CalendarDays, Flame, Gamepad2, RefreshCw, Send, Trophy, Twitter, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/dumb/CopyButton";
import { NativeShareButton } from "@/components/dumb/NativeShareButton";
import { ShareCard } from "@/components/dumb/ShareCard";
import { trackEvent } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MISSION_TYPES, SITE, VIBES, rankFor, type MissionType, type Vibe } from "@/data/dump";
import { generateDailyMission, generateMission, todayKey, type Mission } from "@/lib/missions";
import {
  EMPTY_STATS,
  completeMission,
  loadStats,
  saveStats,
  XP_UPDATED_EVENT,
  type XpStats,
} from "@/lib/xp";

const shareUrl = () => SITE.url || (typeof window !== "undefined" ? window.location.origin : "");

export type PackSeed = { type: MissionType; vibe: Vibe; nonce: number };

type Props = {
  packSeed?: PackSeed | null;
};

export function RaidArcade({ packSeed = null }: Props) {
  const [type, setType] = useState<MissionType>("Raid Sprint");
  const [vibe, setVibe] = useState<Vibe>("Funny");
  const [mission, setMission] = useState<Mission | null>(null);
  const [stats, setStats] = useState<XpStats>(EMPTY_STATS);
  const [dailyPreview] = useState(() => generateDailyMission());

  useEffect(() => {
    setStats(loadStats());
    const refresh = () => setStats(loadStats());
    window.addEventListener(XP_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(XP_UPDATED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!packSeed) return;
    setType(packSeed.type);
    setVibe(packSeed.vibe);
    setMission(generateMission(packSeed.type, packSeed.vibe));
  }, [packSeed]);

  const persist = (next: XpStats) => {
    setStats(next);
    saveStats(next);
  };

  const generate = () => {
    trackEvent("raid_play");
    setMission(generateMission(type, vibe));
  };

  const loadDaily = () => {
    trackEvent("raid_play");
    const daily = generateDailyMission();
    setType(daily.type);
    setVibe(daily.vibe);
    setMission(daily);
    toast.message("Mission of the Day loaded", {
      description: `${daily.type} · ${daily.vibe} · +${daily.xp} XP`,
    });
  };

  const complete = () => {
    if (!mission) return;
    if (stats.completedIds.includes(mission.id)) {
      toast.message("Already logged", {
        description:
          "This mission's XP is already on your board — generate or reroll for a new one.",
      });
      return;
    }
    const next = completeMission(stats, mission, todayKey());
    persist(next);
    toast.success(`+${mission.xp} DUMB Points`, {
      description: `Rank: ${rankFor(next.points)}`,
    });
  };

  const missionLogged = mission != null && stats.completedIds.includes(mission.id);

  const outputs = mission
    ? [
        { label: "Mission brief", value: mission.brief },
        { label: "X post", value: mission.xPost },
        { label: "Telegram hype line", value: mission.telegram },
        { label: "Meme caption", value: mission.caption },
        { label: "Image prompt", value: mission.imagePrompt },
        { label: "CTA", value: mission.cta },
      ]
    : [];

  return (
    <div id="arcade" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="sticker bg-pink px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-pink-foreground">
          Mission generator
        </span>
        <div className="flex flex-wrap gap-2">
          <StatChip icon={<Zap className="size-3.5" />} label="DUMB Points" value={stats.points} />
          <StatChip
            icon={<Trophy className="size-3.5" />}
            label="Rank"
            value={rankFor(stats.points)}
          />
          <StatChip
            icon={<Flame className="size-3.5" />}
            label="Streak"
            value={`${stats.streak}d`}
          />
          <StatChip
            icon={<Gamepad2 className="size-3.5" />}
            label="Missions"
            value={stats.completed}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pink/40 bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-pink">
            <CalendarDays className="size-3.5" /> Mission of the Day
          </p>
          <p className="mt-1 truncate text-sm font-bold">
            {dailyPreview.title}{" "}
            <span className="font-medium text-muted-foreground">
              · {dailyPreview.type} · {dailyPreview.vibe}
            </span>
          </p>
        </div>
        <Button
          onClick={loadDaily}
          variant="outline"
          className="shrink-0 gap-2 rounded-md border-pink bg-pink font-black text-pink-foreground hover:bg-pink/90"
        >
          <CalendarDays className="size-4" /> Load today&apos;s mission
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="relative overflow-hidden rounded-lg border border-border bg-card p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hype)]"
          />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Mission type
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MISSION_TYPES.map((t) => (
              <Chip key={t} active={t === type} onClick={() => setType(t)}>
                {t}
              </Chip>
            ))}
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Vibe
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <Chip key={v} active={v === vibe} onClick={() => setVibe(v)} accent>
                {v}
              </Chip>
            ))}
          </div>

          <Button
            onClick={generate}
            className="mt-6 w-full gap-2 rounded-md bg-primary font-black text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="size-4" /> Generate Mission
          </Button>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            XP is stored locally in this browser. It is a fun scoreboard, not a reward promise.
            Daily missions add a small bonus and stay the same for everyone until UTC midnight.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          {!mission ? (
            <div className="grid h-full min-h-56 place-items-center text-center">
              <div>
                <p className="text-sm font-bold">No mission loaded</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hit Generate Mission or load today&apos;s shared pack.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-md bg-primary text-primary-foreground">
                  {mission.type}
                </Badge>
                <Badge variant="outline" className="rounded-md border-pink text-pink">
                  {mission.vibe}
                </Badge>
                {mission.daily ? (
                  <Badge variant="outline" className="rounded-md border-accent text-accent">
                    Mission of the Day
                  </Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">+{mission.xp} XP on complete</span>
              </div>
              <h3 className="text-xl font-black tracking-tight">{mission.title}</h3>

              <div className="flex flex-wrap gap-2">
                <NativeShareButton
                  title="Dumb Money raid mission"
                  text={mission.xPost}
                  url={shareUrl()}
                  fallbackUrl={`https://x.com/intent/post?text=${encodeURIComponent(mission.xPost)}`}
                />
                <Button
                  asChild
                  size="sm"
                  className="gap-1.5 rounded-md bg-foreground text-xs font-black text-background hover:bg-foreground/90"
                >
                  <a
                    href={`https://x.com/intent/post?text=${encodeURIComponent(mission.xPost)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Twitter className="size-3.5" /> Post to X
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
                >
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(mission.telegram)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Send className="size-3.5" /> Share to Telegram
                  </a>
                </Button>
              </div>

              <ShareCard mission={mission} />

              {outputs.map((o) => (
                <div key={o.label} className="rounded-md border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      {o.label}
                    </p>
                    <CopyButton value={o.value} label={o.label} />
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{o.value}</p>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={complete}
                  disabled={missionLogged}
                  className="gap-2 rounded-md bg-pink font-black text-pink-foreground hover:bg-pink/90 disabled:opacity-60"
                >
                  <Zap className="size-4" /> {missionLogged ? "Logged" : "Mark completed"}
                </Button>
                <Button
                  variant="outline"
                  onClick={generate}
                  className="gap-2 rounded-md border-border bg-secondary hover:bg-secondary/70"
                >
                  <RefreshCw className="size-4" /> Reroll
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-2.5 py-1.5 text-xs font-bold transition-colors ${
        active
          ? accent
            ? "border-pink bg-pink text-pink-foreground shadow-[var(--shadow-pink)]"
            : "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
          : "border-border bg-secondary text-muted-foreground hover:border-pink/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
      <span className="text-primary">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}
