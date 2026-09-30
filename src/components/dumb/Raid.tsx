import { useState } from "react";

import { ContentEngine } from "./ContentEngine";
import { Leaderboard } from "./Leaderboard";
import { RaidArcade, type PackSeed } from "./RaidArcade";
import { SectionHead } from "./SectionHead";

/**
 * Merged play loop: generate a raid mission, grab content from the packs,
 * post it, and watch your rank climb. Pack missions load straight into the
 * mission generator.
 */
export function Raid() {
  const [packSeed, setPackSeed] = useState<PackSeed | null>(null);

  return (
    <section id="raid" className="scroll-mt-24">
      <SectionHead
        asH1
        index="03"
        eyebrow="Raid"
        title="Raid. Post. Rank."
        blurb="There is no DUMB raid culture yet — we're founding it, for a token that outlived its team. Pick a mission type and a vibe, generate your raid kit, post it, mark it complete. XP lives in your browser — a fun scoreboard for the community grind, not a reward promise."
      />
      <RaidArcade packSeed={packSeed} />
      <ContentEngine
        onLoadMission={(type, vibe) => setPackSeed({ type, vibe, nonce: Date.now() })}
      />
      <Leaderboard />
    </section>
  );
}
