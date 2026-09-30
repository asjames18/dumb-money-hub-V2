import type { MissionType, Vibe } from "@/data/dump";

export type PackMission = {
  type: MissionType;
  vibe: Vibe;
  note: string;
};

export type MissionPack = {
  id: string;
  title: string;
  blurb: string;
  theme: string;
  missions: PackMission[];
};

export const MISSION_PACKS: readonly MissionPack[] = [
  {
    id: "proof-week",
    title: "Proof Week",
    theme: "Receipts first",
    blurb: "Five days of verify-the-address energy. No price talk — only explorer receipts.",
    missions: [
      { type: "Proof Post", vibe: "Proof-first", note: "Post both contracts + how to verify." },
      {
        type: "Retail Lesson",
        vibe: "Educational",
        note: "Teach one explorer tab in plain English.",
      },
      { type: "Burn Hype", vibe: "Proof-first", note: "Explain burns without promising anything." },
      { type: "Raid Sprint", vibe: "Clean Street", note: "Reply with receipts, not hype." },
      { type: "Meme Drop", vibe: "Proof-first", note: "Meme the explorer, not the candle." },
    ],
  },
  {
    id: "meme-week",
    title: "Meme Week",
    theme: "Smiley on main",
    blurb: "Retail humor only. Use gallery scenes, keep captions under 12 words when you can.",
    missions: [
      { type: "Meme Drop", vibe: "Funny", note: "Turn 'dumb money' into a badge." },
      { type: "Smiley Reaction", vibe: "Bold", note: "Make the grin your reply signature." },
      { type: "Meme Drop", vibe: "Clean Street", note: "Wall Street roast poster energy." },
      { type: "Raid Sprint", vibe: "Funny", note: "Five short funny replies, zero spam." },
      { type: "Recruit Holder", vibe: "Funny", note: "Invite a friend with a meme, not a pitch." },
    ],
  },
  {
    id: "retail-school",
    title: "Retail School",
    theme: "Teach one thing",
    blurb: "Onboarding pack for people who are still asking their bank for advice.",
    missions: [
      { type: "Retail Lesson", vibe: "Educational", note: "Seed phrase never leaves the wallet." },
      { type: "Proof Post", vibe: "Educational", note: "How to spot a fake contract address." },
      { type: "Recruit Holder", vibe: "Educational", note: "Bring one beginner into Telegram." },
      { type: "Burn Hype", vibe: "Educational", note: "Burns vs reflections in two sentences." },
      { type: "Smiley Reaction", vibe: "Clean Street", note: "Smile, then drop one safety tip." },
    ],
  },
] as const;

export const MEME_CONTEST = {
  title: "Smiley Meme Contest",
  status: "Season 1 soon",
  blurb:
    "The first meme season is still being set up. Brand rules apply. No price promises, no scammy captions.",
  rules: [
    "Use the official Smiley look: green coin head, black hoodie, gold $DUMB chain, hot-pink sneakers.",
    "Caption must be community / culture / receipts — never guaranteed gains.",
    "When the season opens, entries post in Telegram and the community votes.",
    "Winners get bragging rights + XP shoutouts in the hub (no financial prize claims here).",
  ],
  // The CTA is honest about the not-yet-open state: joining the crew now,
  // so you're in when the season drops — not "entering" a closed contest.
  cta: "Join the Telegram crew",
} as const;

export const CONTENT_KIT = {
  title: "Raid Content Kit",
  blurb: "Grab a Smiley scene, follow the brand checklist, post with a mission pack line.",
  checklist: [
    "Green coin head + simple grin",
    "Black hoodie, gold $DUMB chain",
    "White gloves, hot-pink sneaker accents",
    "No outside logos or random $ clutter",
    "Disclaimer mindset: community tool, not advice",
  ],
} as const;
