import { RANKS, rankFor } from "@/data/dump";
import { MAX_MISSION_XP } from "./missions";

export type XpStats = {
  points: number;
  completed: number;
  streak: number;
  lastDay: string;
  displayName: string;
  history: XpEvent[];
  /** Mission IDs already awarded — stops "Mark completed" farming. */
  completedIds: string[];
};

export type XpEvent = {
  id: string;
  at: string;
  title: string;
  type: string;
  vibe: string;
  xp: number;
  daily?: boolean;
};

export type LeaderboardEntry = {
  id: string;
  displayName: string;
  points: number;
  completed: number;
  streak: number;
  rank: string;
  updatedAt: string;
  isYou?: boolean;
};

const STATS_KEY = "dumb-hub-stats-v1";
const BOARD_KEY = "dumb-hub-leaderboard-v1";

/** Fired by saveStats so live components refresh without a page reload. */
export const XP_UPDATED_EVENT = "dumb:xp-updated";

export const EMPTY_STATS: XpStats = {
  points: 0,
  completed: 0,
  streak: 0,
  lastDay: "",
  displayName: "Retail Raider",
  history: [],
  completedIds: [],
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v)) || 0;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

/** Non-negative finite integer — Infinity/NaN/negatives become 0. */
const safeInt = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

/** Longest streak the hub could possibly have seen — generous by design. */
const MAX_STREAK = 3650; // 10 years

function parseStats(raw: unknown): XpStats {
  if (!isRecord(raw)) return { ...EMPTY_STATS };
  const completed = safeInt(raw["completed"]);
  // Clamp to what real play can produce: every point was earned by completing
  // a mission worth at most MAX_MISSION_XP, and every streak day needed at
  // least one completion. A forged export (points: 999999999, completed: 0)
  // collapses to zeros instead of minting max rank. This runs on import AND
  // on load, so hand-edited localStorage gets the same treatment.
  const points = Math.min(safeInt(raw["points"]), MAX_MISSION_XP * completed);
  const streak = Math.min(safeInt(raw["streak"]), completed, MAX_STREAK);
  const historyRaw = raw["history"];
  const idsRaw = raw["completedIds"];
  return {
    points,
    completed,
    streak,
    lastDay: str(raw["lastDay"]),
    displayName:
      str(raw["displayName"], EMPTY_STATS.displayName).trim().slice(0, 24) ||
      EMPTY_STATS.displayName,
    history: Array.isArray(historyRaw)
      ? ((historyRaw as unknown[])
          .filter(isRecord)
          .slice(0, 50)
          .map((e) => ({ ...e, xp: Math.min(safeInt(e["xp"]), MAX_MISSION_XP) })) as XpEvent[])
      : [],
    completedIds: Array.isArray(idsRaw)
      ? idsRaw.filter((v): v is string => typeof v === "string").slice(0, 500)
      : [],
  };
}

export function loadStats(): XpStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS };
    return parseStats(JSON.parse(raw) as unknown);
  } catch {
    return { ...EMPTY_STATS };
  }
}

export function saveStats(stats: XpStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  publishToBoard(stats);
  // Live components (leaderboard, arcade chips) refresh without a reload.
  try {
    window.dispatchEvent(new CustomEvent<XpStats>(XP_UPDATED_EVENT, { detail: stats }));
  } catch {
    /* non-browser or old engine */
  }
}

export function completeMission(
  stats: XpStats,
  mission: { id: string; title: string; type: string; vibe: string; xp: number; daily?: boolean },
  day: string,
): XpStats {
  // Same mission ID twice = no double XP. Rerolls and new generations get
  // fresh IDs, so real play is unaffected — only repeat-click farming stops.
  if (stats.completedIds.includes(mission.id)) return stats;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak =
    stats.lastDay === day ? stats.streak : stats.lastDay === yesterday ? stats.streak + 1 : 1;
  const event: XpEvent = {
    id: mission.id,
    at: new Date().toISOString(),
    title: mission.title,
    type: mission.type,
    vibe: mission.vibe,
    xp: mission.xp,
  };
  if (mission.daily) event.daily = true;
  return {
    ...stats,
    points: stats.points + mission.xp,
    completed: stats.completed + 1,
    streak,
    lastDay: day,
    history: [event, ...stats.history].slice(0, 50),
    completedIds: [mission.id, ...stats.completedIds].slice(0, 500),
  };
}

export function exportStats(stats: XpStats) {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      stats,
    },
    null,
    2,
  );
}

export function importStats(raw: string): XpStats {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) throw new Error("Invalid export file");
  const statsBlob = isRecord(parsed["stats"]) ? parsed["stats"] : parsed;
  const next = parseStats(statsBlob);
  saveStats(next);
  return next;
}

function publishToBoard(stats: XpStats) {
  try {
    const board = loadBoard().filter((e) => !e.isYou);
    const you: LeaderboardEntry = {
      id: "local-you",
      displayName: stats.displayName || "Retail Raider",
      points: stats.points,
      completed: stats.completed,
      streak: stats.streak,
      rank: rankFor(stats.points),
      updatedAt: new Date().toISOString(),
      isYou: true,
    };
    const merged = [...board.filter((e) => e.id !== "local-you"), you]
      .sort((a, b) => b.points - a.points)
      .slice(0, 25);
    localStorage.setItem(BOARD_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

export function loadBoard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecord)
      .map((e) => ({
        id: str(e["id"], crypto.randomUUID()),
        displayName: str(e["displayName"], "Raider").slice(0, 24),
        points: num(e["points"]),
        completed: num(e["completed"]),
        streak: num(e["streak"]),
        rank: str(e["rank"], rankFor(num(e["points"]))),
        updatedAt: str(e["updatedAt"], new Date().toISOString()),
        ...(e["isYou"] === true ? { isYou: true } : {}),
      }))
      .sort((a, b) => b.points - a.points);
  } catch {
    return [];
  }
}

/** The user's own board row — no demo ghosts, no placeholder rows. */
export function buildYouEntry(stats: XpStats): LeaderboardEntry {
  return {
    id: "local-you",
    displayName: stats.displayName || "Retail Raider",
    points: stats.points,
    completed: stats.completed,
    streak: stats.streak,
    rank: rankFor(stats.points),
    updatedAt: new Date().toISOString(),
    isYou: true,
  };
}

export function nextRankInfo(points: number) {
  const next = RANKS.find((r) => r.min > points);
  if (!next) return { label: "Max rank", pointsNeeded: 0, progress: 1 };
  const prev = [...RANKS].reverse().find((r) => r.min <= points) ?? RANKS[0]!;
  const span = next.min - prev.min;
  const progress = span <= 0 ? 1 : (points - prev.min) / span;
  return {
    label: next.label,
    pointsNeeded: next.min - points,
    progress: Math.min(1, Math.max(0, progress)),
  };
}
