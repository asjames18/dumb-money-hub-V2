// Money-math unit tests (backlog #18): pure bigint invariants, no React,
// no network. Run: npm run test:money-math
//
// Why this exists: a deep-scan regression shipped green through build AND
// lint, and only adversarial review caught it — a user's PLS could be spent
// on a PLS-fallback burn whose dead-address arrival landed under the
// promised 100k pass threshold. These tests pin the floor math so that
// class of bug fails loudly here instead of on mainnet.
//
// The tests import the REAL modules (not re-implementations): the alias
// loader (scripts/test-alias-hook.mjs, registered via --import) maps "@/*"
// to ./src/* so node type-stripping can load the source directly.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { MISSION_TYPES } from "@/data/dump";
import { MAX_MISSION_XP, generateMission } from "../src/lib/missions.ts";
import { PLS_BURN_TARGET_DUMB, plsBurnMinOut, preTaxForArrival } from "../src/lib/token-scan.ts";

const WEI = 10n ** 18n;
/** The deep-scan pass threshold: 100k DUMB must verifiably land at dead. */
const PASS_THRESHOLD = 100_000n * WEI;

// plsIn is irrelevant to the floor — amountOutMin depends only on the
// quoted pre-tax DUMB output — so probes pass 0n for it.
const quoteOf = (dumbOut: bigint) => ({ plsIn: 0n, dumbOut });

describe("PLS burn floor invariant", () => {
  it("plsBurnMinOut(preTaxForArrival(T)) >= T for every probed T", () => {
    // Named edge cases: 0, 1 (forces the round-up branch), an exact
    // multiple of the floor bps (no round-up), the pass threshold in raw
    // and wei units plus its neighbors, and 10^24 (contract-scale).
    const edges: bigint[] = [
      0n,
      1n,
      2n,
      7n,
      8740n,
      100_000n,
      PASS_THRESHOLD - 1n,
      PASS_THRESHOLD,
      PASS_THRESHOLD + 1n,
      10n ** 24n,
    ];
    // Deterministic pseudo-random spread over [0, 10^24) — fixed seed so a
    // failure reproduces. Built from two 32-bit halves for real spread
    // (Math.random can't cover 80 bits in one double).
    let s = 0x9e3779b9;
    const rand32 = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return BigInt(s);
    };
    const spread: bigint[] = [];
    for (let i = 0; i < 5000; i++) {
      spread.push(((rand32() << 32n) | rand32()) % 10n ** 24n);
    }
    // Dense sweep of raw units: catches off-by-one at the integer boundary
    // where the round-up and the floor division interact.
    const dense: bigint[] = [];
    for (let t = 0n; t <= 200_000n; t++) dense.push(t);

    for (const t of [...edges, ...spread, ...dense]) {
      const floor = plsBurnMinOut(quoteOf(preTaxForArrival(t)));
      assert.ok(floor >= t, `floor invariant broken at T=${t}: amountOutMin=${floor}`);
    }
  });

  it("the derived pass target clears the 100k threshold at full slippage", () => {
    assert.equal(PLS_BURN_TARGET_DUMB, preTaxForArrival(PASS_THRESHOLD));
    assert.ok(
      plsBurnMinOut(quoteOf(PLS_BURN_TARGET_DUMB)) >= PASS_THRESHOLD,
      "derived target must still clear the pass threshold at the amountOutMin floor",
    );
  });

  it("a round 110k buffer would NOT clear the threshold (the shipped regression)", () => {
    // 110k x 0.874 = 96,140 < 100k: the swap would settle successfully and
    // the pass would then be refused on-chain AFTER the user's PLS was
    // spent. This pins why the target must be derived (preTaxForArrival),
    // not guessed — if the constants ever change so that 110k clears, this
    // fails and the reasoning above needs a re-check.
    const minOut = plsBurnMinOut(quoteOf(110_000n * WEI));
    assert.ok(
      minOut < PASS_THRESHOLD,
      "110k buffer unexpectedly clears the threshold — recheck the floor math and this guard",
    );
  });
});

describe("mission XP cap", () => {
  const vibe = "Funny" as const;

  it("every real mission's xp fits inside MAX_MISSION_XP", () => {
    for (const type of MISSION_TYPES) {
      for (const daily of [false, true]) {
        const m = generateMission(type, vibe, daily ? { daily: true } : undefined);
        assert.ok(
          m.xp <= MAX_MISSION_XP,
          `${type} (daily=${daily}) awards ${m.xp} > MAX_MISSION_XP=${MAX_MISSION_XP}`,
        );
      }
    }
  });

  it("the cap is tight: max real daily award, exactly", () => {
    // The documented rule: dailies award a flat +10 on top of the type
    // value, so the cap must be maxTypeXp + 10 — no more (a silently
    // inflated cap defeats the parseStats clamp sanity check), no less
    // (a top-tier daily would get clamped). If the +10 rule ever changes
    // deliberately, update this pin alongside it.
    const maxDailyAward = Math.max(
      ...MISSION_TYPES.map((t) => generateMission(t, vibe, { daily: true }).xp),
    );
    assert.equal(MAX_MISSION_XP, maxDailyAward);
  });
});
