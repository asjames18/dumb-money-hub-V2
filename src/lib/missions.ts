import { MISSION_TYPES, VIBES, type MissionType, type Vibe } from "@/data/dump";

export type Mission = {
  id: string;
  type: MissionType;
  vibe: Vibe;
  title: string;
  brief: string;
  xPost: string;
  telegram: string;
  caption: string;
  imagePrompt: string;
  cta: string;
  xp: number;
  daily?: boolean;
};

type Rng = () => number;

const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashSeed = (input: string) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const pick = <T>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)]!;

const VIBE_FLAVOR: Record<Vibe, { tone: string; sign: string }> = {
  Funny: { tone: "keep it dumb-funny, zero corporate words", sign: "😐📈" },
  Bold: { tone: "loud, short lines, retail-first swagger", sign: "🟢" },
  "Proof-first": { tone: "lead with receipts, hype after", sign: "🧾" },
  "Clean Street": { tone: "clean street energy, minimal words, big attitude", sign: "🖤🟢" },
  Educational: { tone: "teach one thing clearly, no jargon", sign: "📚" },
};

const TITLES: Record<MissionType, string[]> = {
  "Raid Sprint": [
    "10 Minute Timeline Takeover",
    "Smiley Swarm Sprint",
    "Retail Rush Hour",
    "PulseChain Reply Circuit",
  ],
  "Meme Drop": [
    "Drop The Dumbest Meme",
    "Smiley Meme Airstrike",
    "Meme First, Explain Later",
    "Wall Street Roast Poster",
  ],
  "Proof Post": [
    "Receipts Over Rumors",
    "Show The Address",
    "Proof Beats Promises",
    "Explorer Screenshot Day",
  ],
  "Recruit Holder": [
    "Bring One Retail Friend",
    "Recruit A Smiley",
    "One Invite, One Explainer",
    "Onboard Without The Pitch",
  ],
  "Retail Lesson": [
    "Teach One Safety Habit",
    "Beginner Lesson Drop",
    "Explain It Like They Are New",
    "Seed Phrase Never Share",
  ],
  "Burn Hype": [
    "Burn Talk, No Promises",
    "Explain The Burn Wallet",
    "Supply Story Sprint",
    "Facts Before Flames",
  ],
  "Smiley Reaction": [
    "Smiley Reply Raid",
    "React With The Face",
    "Smiley In Every Thread",
    "Grin Signature Challenge",
  ],
};

const BRIEFS: Record<MissionType, string[]> = {
  "Raid Sprint": [
    "Spend 10 focused minutes replying to 5 crypto posts with the DUMB smiley and one useful sentence. No spam, no price talk.",
    "Find 3 crypto threads and add real value: answer a question, then drop the smiley signature.",
    "Pick one busy timeline window. Leave five short, helpful replies that end with the smiley — never a buy pitch.",
  ],
  "Meme Drop": [
    "Make one meme that turns the 'dumb money' insult into a badge. Post it, then reply to your own post with the contract receipt link.",
    "Remix the smiley into a Wall Street scene. Caption it in under 12 words.",
    "Use a Smiley Gallery scene as the base. Add one sharp line about receipts over rumors.",
  ],
  "Proof Post": [
    "Post the DUMP contract address with a note telling people to verify for themselves. State only what you can prove.",
    "Screenshot a block explorer page and explain one thing you personally checked.",
    "Share the explorer link and walk through one tab: holders, source, or transfers — no speculation.",
  ],
  "Recruit Holder": [
    "Invite one person who is new to crypto. Send them the beginner lesson, not a buy pitch.",
    "DM one friend the wallet-safety basics, then invite them to the community chat.",
    "Bring one retail friend into Telegram with a 3-bullet explainer: what DUMP is, where receipts live, how to verify.",
  ],
  "Retail Lesson": [
    "Teach one habit: verify addresses, never share a seed phrase, size positions you can lose. One post, one lesson.",
    "Write a 4-line explainer of what a block explorer is, aimed at a total beginner.",
    "Post a plain-English tip on spotting fake contract addresses and phishing links.",
  ],
  "Burn Hype": [
    "Explain in plain words what a burn wallet is and what it does not guarantee. Link the receipts section.",
    "Post a supply-mechanics explainer with zero price predictions. Facts, then the smiley.",
    "Describe burns vs reflections in two sentences a beginner can repeat.",
  ],
  "Smiley Reaction": [
    "Reply to 5 big crypto posts with the smiley plus one honest retail take.",
    "Turn the smiley into your reaction signature for the day. Consistency is the raid.",
    "Quote-reply one viral market take with the smiley and a receipts-first line.",
  ],
};

const HOOKS = [
  "They called us dumb money.",
  "The key is gone. The code is in charge.",
  "Meme first. Proof second. Community always.",
  "Wall Street wanted quiet retail. Awkward.",
  "Retail built this without permission.",
  "Home of retail crypto. Grin optional. Receipts required.",
];

const CTAS = [
  "Check the receipts, then decide for yourself.",
  "Grab a mission in the Raid Arcade and post it.",
  "Verify both contracts before you touch anything.",
  "Bring one friend into the community chat.",
  "Post it, then log your XP in the hub.",
  "Open the Proof Hub and read what is live vs awaiting feed.",
];

const XP: Record<MissionType, number> = {
  "Raid Sprint": 40,
  "Meme Drop": 35,
  "Proof Post": 50,
  "Recruit Holder": 60,
  "Retail Lesson": 45,
  "Burn Hype": 30,
  "Smiley Reaction": 25,
};

/** Most XP any single real mission can award — used to sanity-check imports. */
export const MAX_MISSION_XP = Math.max(...Object.values(XP));

export const todayKey = () => new Date().toISOString().slice(0, 10);

export function generateMission(
  type: MissionType,
  vibe: Vibe,
  options?: { seed?: string; daily?: boolean },
): Mission {
  const rng = options?.seed ? mulberry32(hashSeed(options.seed)) : Math.random;
  const flavor = VIBE_FLAVOR[vibe];
  const hook = pick(HOOKS, rng);
  const title = pick(TITLES[type], rng);
  const brief = pick(BRIEFS[type], rng);

  const mission: Mission = {
    id: options?.seed
      ? `seed-${options.seed}`
      : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    vibe,
    title,
    brief: `${brief} Vibe check: ${flavor.tone}.`,
    xPost: `${hook}\n\n${type} unlocked: ${title}.\n${
      vibe === "Proof-first"
        ? "Receipts first: both contracts are public, go verify them yourself."
        : vibe === "Educational"
          ? "One lesson: verify the address before you trust the hype."
          : "Dumb Money is the home of retail crypto. Community tool, not advice."
    }\n\n#DUMB #PulseChain ${flavor.sign}`,
    telegram: `${flavor.sign} ${title.toUpperCase()} IS LIVE — ${type} mode, ${vibe.toLowerCase()} energy. Everyone posts once, nobody posts price promises. Receipts in the hub. Let's go retail. 🟢`,
    caption: `${hook} Still here. Still grinning.`,
    imagePrompt: `Bold ${vibe.toLowerCase()} meme illustration: a glossy neon-green smiley coin standing on a charcoal Wall Street trading floor, ticker screens glitching, high contrast, thick outlines, retail-crypto street poster style, text space at bottom for "${title}"`,
    cta: pick(CTAS, rng),
    xp: XP[type] + (options?.daily ? 10 : 0),
  };
  if (options?.daily) mission.daily = true;
  return mission;
}

/** Deterministic mission shared by everyone for the UTC calendar day. */
export function generateDailyMission(day = todayKey()): Mission {
  const type = MISSION_TYPES[hashSeed(`type-${day}`) % MISSION_TYPES.length]!;
  const vibe = VIBES[hashSeed(`vibe-${day}`) % VIBES.length]!;
  return generateMission(type, vibe, { seed: `daily-${day}`, daily: true });
}
