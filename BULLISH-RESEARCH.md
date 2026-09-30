# Bullish-demand research — PulseChain DUMB/DAMP

## 2026-09-30 00:33 — #13 real-utility research: audit-only, no ship

- **Revisit scan:** no ripened items — every prior rejection's revisit condition (baseline traffic, burn-step volume, aged epoch, pass volume) unmet; /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}). The 13:03 og-symbol deferral is confirmed FULLY CLOSED (14:23 shipped, 15:13 crawler-verified live) — nothing deferred remains to claim. Trading-cooldown probe stays DEFERRED: the owner-power family is complete through 5n + measured tax, and the auditors' first-timer input asked for copy/IA work, not scanner depth — designing it now would be depth nobody asked for.
- **AI knowledge staleness check (23:33 precedent):** nothing new user-facing since the 23:33 AI_QA ship except the 00:23 ROADMAP dashboard-line text, covered by the existing "Where can I see the live price?" answer. Served-layer verified: POST /api/ai-chat {"question":"What is Dumb AI Pro?","suggested":true} → mode=local, sources=["hub knowledge"], 1,070-char canned answer, /terms mentioned, zero Robinhood references — freemium boundary intact through the 23:53/00:23 deploys.
- **Considered and REJECTED:** (1) designing the trading-cooldown probe now — rejected per the 19:33/23:33 precedent (no user input asking for scanner depth; auditors' findings are in and asked for copy/IA); (2) any demand move on flat confounded numbers — statistically meaningless (09:23 precedent); (3) touching src or shipping this run — nothing earned it; tree quiet, loop's own ships only.
- **Site health:** / /scan /burn /ai /plan /roots all 200 on the custom domain. /api/market note: two reads returned the designed honest "Market data unavailable" (DexScreener itself 200 in 0.76s, payload matching the 23:53 guards — worker-edge transient ~2–3 min, no invented prices); third read 30s later → 200 with real data through both guards. Self-recovered, zero code touched. Zero wallet/signing/data-source/mascot touch. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-29 18:33 — review-of-ship: the "Measured buy/sell tax" probe (5o) as shipped by the concurrent process (#13 slot / #9 lens, audit-only → ONE REAL BUG LOGGED, no fix shipped)

- **SCOPE:** the 17:53 review approved the 17:33 #13 5o design with two required refinements; the ship turn for this run found the probe already implemented by the concurrent process (token-scan.ts ~1906-2242, `measured-tax`; 18:27 edit) with roadmap (dump.ts:231) + both Dumb AI answers (dump.ts:388, knowledge.ts:64) updated in each surface's own words. Review-of-ship per the 15:43 → 16:03 precedent; no src writes — the concurrent process was still editing at 18:38 (ai-pro.ts, AiPreview.tsx).
- **VERDICT: ship is faithful to the approved design; one real null-safety bug found.** R1 (direction-aware fail copy) ✓, R2 (logIndex-scoped attribution + ambiguity skips + claimedFunding) ✓, R3 (IQR > 3 warn) ✓, R4 (no stale "comes with the deep scan" copy; all surfaces describe the measured check) ✓. Bands, {pair, token, dead, zero} recipient set with the zero-address burn-leg comment, parseAbiItem topic0s, n<5 gate, block placement after 5n before #6 — all match the design. 5n surfaces verified intact through the concurrent deploys (src block + served /plan SSR + both AI answers).
- **THE BUG:** the both-sides PASS branch assumes `claimed !== null`. When a token has no `fees()`/`taxFee()` getters, `taxBps` stays null → `claimed` is null → the `bb === "pass" && bs === "pass" && spread <= 4` branch calls `f1(claimed as number)` → `TypeError: Cannot read properties of null (reading 'toFixed')`. The `as number` cast silences tsc. Reachable: any getterless token with ≥5 buys and ≥5 sells measuring < 10% and ≤ 4pp spread — the whole quick scan throws because the 5o block has no enclosing try/catch (the single-side pass branch has the `claimed !== null` guard; the both-sides branch doesn't). Reproduced mechanically in node with the exact branch logic. Suggested fix: guard the both-sides pass branch and render "no tax either way, and the contract's getters claim no transfer tax." Deferred to the next quiet run (no writing into the active concurrent deploy window). Utility note: every legit no-tax PulseChain token (plain ERC-20s with WPLS pairs and volume) is one quick scan away from a blank report until this is fixed.
- **Considered and REJECTED:** (1) fixing the bug this run — REJECTED: the concurrent process is actively editing + deploying; a colliding edit + deploy risks clobbering its work; the loop's last three runs (17:23/17:33/17:53) held the same no-collision line. (2) setting status paused — REJECTED: paused is for red things the loop can't fix; this is a logged, one-line-guard defect with a clear next-run owner. (3) served-bundle verification of the new 5o chunk — REJECTED this run: the concurrent process may deploy again within minutes; bundle identity can't be pinned while it's mid-flight. Next quiet run re-verifies served content.
- #13 stays open as recurring (the null-guard fix is the next #13/#9 item when quiet); #5 idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring. Zero wallet/signing/data-source/mascot touch.

## 2026-09-29 17:53 — adversarial review of the "Measured buy/sell tax" probe design (5o) (#9 security pass, audit-only, NO code changes, no build/deploy)

- **SCOPE:** the 17:33 #13 design pass for the 5o probe (behavioral buy/sell tax measurement from Swap + Transfer logs, 2× getLogs / 100k-block window, check id `measured-tax`). Per the 16:23→16:33→16:43 precedent, this run is the review; the ship run comes next.
- **VERDICT: APPROVED WITH TWO REQUIRED REFINEMENTS.** The method is sound and the ground truth independently reproduces — but the review found one copy-correctness defect and one attribution defect the ship run must fix, plus one strong recommendation.
- **INDEPENDENT VERIFICATIONS (not trusted from the design):**
  1. Topic0s re-derived in code via viem keccak256 (the 17:33 recon lesson): Swap `0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822`, Transfer `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` — match the design exactly.
  2. Ground truth re-measured from scratch vs live RPC (independent script, /tmp/review-5o): DUMB buy n=11 median **5.99%** (all 6.0%) — reproduces the design's n=10/5.99%. DUMB sell n=28 median **5.30%** — reproduces the design's 5.35% within window slide.
  3. Pre-write diff re-confirmed: zero measured-tax coverage in token-scan.ts — the only "real vs claimed" text is the aspirational line-476 deep-scan pointer. The gap is real.
  4. Placement slot confirmed: the 5n block ends ~1903, `// 6. Pause switch` at 1905 — "after 5n, before #6" is clean. The outer `pair` from section 8 is in scope there (null → skip; WPLS itself → skip at 1938-1944).
  5. The design's deep-scan claim verified in src (token-scan.ts:2239): the round-trip check applies the CLAIMED tax symmetrically and labels it as the claim — "if it takes more than it claims, real trades cost more." The gap statement is accurate.
  6. The claim model is symmetric-only: `taxBps` = `fees()`/`taxFee()` (line 468-470), copy reads "X%-of-every-transfer". No directional claim exists — relevant to the refinements below.
- **REQUIRED R1 — direction-aware fail copy.** The design's |buy−sell|≥10pp fail copy hardcodes "Buys cost ~X% but sells cost ~Y% — cheap to enter, expensive to leave." For a buy-heavy-tax token (buy ~10%, sell ~0%) that sentence is factually backwards — the token is expensive to ENTER, cheap to leave. Template the copy per which side is higher; never assert the soft-rug direction when the numbers say the opposite.
- **REQUIRED R2 — logIndex-scoped Swap↔Transfer attribution.** The design's "all exactly 5.3%" sell claim does NOT survive independent re-derivation: this run's window contains outlier samples at 4.5%, 5.0%, and ~0%. Drilled in: the outliers are contract-driven swaps — an aggregator contract and the WBTC/DUMB pair multihopping through the WPLS/DUMB pair — where a single tx holds MULTIPLE Transfer(to==pair) events, so "the sender of the Transfer(to==pair)" is ambiguous and the first-match attribution misfires (measured 4.55% on a true-6% taxed transfer). The median is robust (28 samples → still 5.30%), but the probe's value is highest on low-activity tokens where n≈5 and the median has no robustness to spare. The ship run must scope matching by logIndex: the funding transfer is the token Transfer(to==pair) with the greatest logIndex below the Swap's logIndex in the same tx (buy side: the pair→* transfer closest-after the Swap); skip the swap when ambiguous. Both sides need it, not just sells.
- **RECOMMENDED R3 — spread/bimodality signal (the anti-gaming complement).** The outlier drill also exposes the gaming hole the design doesn't cover: exempt wash-traders (tax-free addresses churning volume) and a mid-window tax hike both surface as HIGH DISPERSION across samples, not a shifted median. If per-side samples show wide spread (e.g., IQR > 3pp, or a clear 0%-vs-X% bimodality), warn that the measured tax is inconsistent across recent trades instead of reporting the median as the rate. This pairs with the 5c fee-setter probe: 5c warns about the POWER to change the tax, 5o-with-spread catches the EXERCISE and the exempt-wash.
- **RECOMMENDED R4 — update the line-476 quick-scan copy on the ship run.** After 5o ships, "Real vs claimed comparison comes with the deep scan" is stale — the quick scan itself will measure real vs claimed. The design's ship notes list ROADMAP + both AI answers but miss this line.
- **NOTES (non-blocking):** (a) The recipient set {pair, token, dead, zero} is load-bearing, not incidental: the 1% burn leg lands on the ZERO address (verified in the outlier legs), not the dead address — keep it and say why in the code comment. (b) The design's own DAMP example (buy n=3) exercises the n<5 gate → buy side "unmeasured", sell side compared, other side honest-unknown — the gate does real work; the ship run's e2e should use DAMP as the one-side-measured test case. (c) Future synergy, not this ship: if the 5m probe named current fee wallets, 5o could admit those recipients in gross reconstruction instead of skipping — forks with wallet legs currently degrade to "unknown" via skips (honest, but sample-poor). (d) The sell blind spot isn't a fixed constant — it scales with the token's eventless-leg share (≈1pp for the fork family's 1% reflection; DAMP matched the (t−r)/(1−r) model at 2.02% vs 2.08% observed, DUMB reads ~0.3pp above it). The fixed bands ([claimed−4pp, claimed+3pp]) are calibrated for ~1pp blind spots; the fail line at claimed+10pp keeps 6pp+ of headroom, so fail verdicts stay honest — document the calibration assumption in the code comment. (e) Directional-tax tokens vs the symmetric claim model: a 10%-sell-only token with taxBps=1000 fails with the R1-fixed copy naming the numbers — acceptable, since the copy carries the direction and the numbers.
- **SHIP-RUN NOTES:** the 17:33 pre-ship validation list stands, PLUS: R1 (direction-templated fail copy), R2 (logIndex-scoped matching both sides), R4 (line-476 copy update); e2e must include a low-activity token exercising the n<5 path (DAMP's buy side is the natural case) and a contract-driven tx in the window to prove R2. **CAUTION:** a concurrent process edited token-scan.ts during this review run (mtimes post-17:30) — the ship run must re-run the pre-write diff against the then-current file, not trust this run's line numbers.
- **Site health:** / /scan /burn /plan 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution. Zero wallet/signing/data-source/mascot touch, no new data sources. #9 stays open as recurring; #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#10/#13 stay open as recurring.

Standing practice (Antonio, 2026-09-26): actively research legitimate ways to
grow demand and rally the community. Log every idea CONSIDERED and every idea
REJECTED, with reasons. Rules: never invent community members, burns, ratings,
or enthusiasm; never promise price appreciation; everything must benefit the
community and be safe — Mosheh vetoes anything too risky, and it doesn't ship.

## 2026-09-29 17:33 — "Measured buy/sell tax" probe (5o) DESIGN (#13 real-utility research, design pass, NO code changes, no build/deploy)

- **GAP FOUND (pre-write diff re-confirmed):** no scan tier measures the REAL buy/sell tax. The transfer-tax check (token-scan.ts ~9, the `taxBps` getter read) reports only the contract's CLAIM; the deep scan applies that same claimed rate symmetrically to both legs and labels it as the claim ("the tax the contract claims"). The quick-scan line "Real vs claimed comparison comes with the deep scan" is therefore aspirational — nothing measures actuals today. The classic soft-rug shape (low buy tax to attract buyers, high sell tax to trap them) is invisible to the scanner.
- **SETTLED METHOD (5o, "Buy/sell tax, measured")** — behavioral, read-only, no impersonation, no new data sources, 2× `eth_getLogs` over a 100k-block window (~2.3 days) on the pair + token:
  - Buy leg: Swap `amountOut` (token side) is GROSS (what the pair sent, pre-user-tax); the matching token Transfer(pair→user, same tx) is NET. `buyTax = 1 − net/gross`, exact — take the largest pair→* transfer (user's receipt dwarfs the 4% contract + 1% burn legs).
  - Sell leg: Swap `amountIn` is NET (the pair records what arrived, post-tax) — gross is unobservable there. Reconstruct: the user is the sender of the Transfer(to==pair); gross = Σ of that user's token outflows in the tx (recipients restricted to {pair, token, dead, zero}, else skip the swap). `sellTax = 1 − net/gross`. KNOWN SYSTEMATIC BLIND SPOT: reflections emit no Transfer event, so the reconstructed gross misses the reflection share and the sell side reads ~0.7–0.9pp LOW — calibrated into the verdict tolerance, documented in the code comment.
  - Per-side median, per-side sample gate: n<5 → that side unmeasured (thin history is not proof of fairness). Reuses outer `pair` from section 8 (null → skip; WPLS itself → skip).
- **GROUND TRUTH (live RPC, this run, /tmp recon — not shipped):** DUMB (claimed symmetric 6%) → buy n=10, median **5.99%** (all exactly 6.0%); sell n=29, median **5.35%** (all exactly 5.3%; the reflection blind spot, stable). DAMP (claimed symmetric 3%) → buy n=3, median **2.99%**; sell n=39, median **2.08%**. The method is exact on buys and stable within the blind spot on sells. DUMB had 40 swaps / 100k blocks — real activity, gate-clearing sample.
- **VERDICT BANDS (for the #9 review to pressure-test):** both sides measured → |buy−claimed|≤3pp AND sell within [claimed−4pp, claimed+3pp] AND |buy−sell|≤4pp → pass ("Recent trades paid ~X% going in and ~Y% coming out — matches the claimed Z%."); |buy−sell|≥10pp → fail, in plain words ("Buys cost ~X% but sells cost ~Y% — cheap to enter, expensive to leave. Asymmetric transfer tax is the classic soft-rug shape: the low buy tax attracts buyers while the high sell tax traps them."); either side > claimed+10pp → fail naming the side; 3–10pp off → warn naming numbers. One side measured → compare that side, other side honest-unknown. Neither → unknown ("Not enough recent trades on the WPLS pair to measure the real tax — thin history is not proof of fairness."). No-claim tokens (taxBps===null): fail at ≥25%, warn at ≥10%, else pass naming the measured numbers.
- **CONSIDERED AND REJECTED:** (1) `debug_traceCall` Transfer-net measurement — VERIFIED unavailable on the public RPC (code −32601, "does not exist"); (2) reserve-ratio benchmark vs current reserves — TESTED and rejected: reserve drift over the window made DUMB read −1.8% sell-tax signal vs the true +6% (noise swamps signal); (3) `reflectionFromToken` view — fork-specific, aggregate-only, never directional; (4) directional getter shapes (`buyTotalFees`/`sellTotalFees`) — custom-name misses, strictly weaker than the behavioral measurement; (5) editing the quick-scan "Real vs claimed" line as a standalone copy fix — SUPERSEDED: the probe makes the line true, so it stays; (6) a deployed helper contract for atomic transfer+balance reads — hard boundary (no new contracts without Antonio's approval).
- **RECON LESSON (reinforced the standing keccak256 rule):** hand-typed topic hashes failed TWICE this run — a 31-byte Transfer hash that silently returned zero logs, then wrong Swap/Sync hashes that returned zero DUMB swaps (the pair DOES have 40 swaps/100k blocks). All hashes re-derived with viem keccak256: Swap 0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822, Transfer 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef, Sync 0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1. Ship run must derive topic0s in code, never paste.
- **SHIP-RUN NOTES:** check id `measured-tax`, title "Buy/sell tax, measured"; block after 5n (before #6 pause). Pre-ship validation (per precedent): (1) pre-write diff re-confirm; (2) keccak256 topic0s in code; (3) end-to-end quickScan in node vs live RPC — DUMB→pass (matches claimed 6%), DAMP→pass (3%), a pair-less token→skip, WPLS→skip; (4) ROADMAP "Token safety scanner" line + both Dumb AI scanner answers extended in each surface's own words; (5) tsc + eslint clean, build, deploy, served-bundle verify.
- **DEFERRED, not shipped:** zero repo writes this run — a concurrent process was actively editing + deploying the AI subsystem through the whole run (ContentEngine.tsx, AiPreview.tsx, TokenScanner.tsx, packs.ts, dump.ts, knowledge.ts, rag.ts, pro.ts, pls-price.ts all retouched in the last 25 min). The next #13 run can take this through the design→review→ship precedent.
- **LOG CORRECTION (1000x slip):** the 15:13 run's on-chain swap-health section wrote "~186,122 WPLS / ~505.5M DUMB" and "0.000368 WPLS/DUMB". Re-read live this run: **186,559,562 WPLS / 504,373,140.95 DUMB = 0.370 WPLS/DUMB** — matching the repo AGENTS.md's verified 0.3738 (2026-09-26). The 15:13 figures are a 1000x arithmetic slip in the LOG TEXT ONLY; site pricing (token-prices.ts, verified live 2026-09-26) is unaffected. Also cross-consistent: the 2026-09-28 PLS-fallback validation (~110k DUMB ≈ 41.3k PLS) implies ~0.375 PLS/DUMB.
- Live health: / /scan /burn /plan 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring (this defers to a ship run); #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-29 16:43 — SHIPPED the "Owner rescue/withdraw power" probe (5n) (#13 real-utility research → ship run)

- **SHIP RUN for the 16:23 design + 16:33 #9 review** (approved, no required revisions), following the design → review → ship precedent. Live on the token safety scanner (check id `owner-rescue-withdraw`): 6 rescue/withdraw shapes (withdrawStuckETH(), withdrawStuckETH(address), withdrawStuckTokens(address), rescueTokens(address,uint256), transferForeignToken(address,uint256), recoverERC20(address,uint256)) via read-only eth_call impersonating the live owner, keccak256 selectors, inside `if (liveOwner)`; fail-safe args = dead address on (address) shapes, (dead address, 1 wei) on (address,uint256) shapes — the impossible executed case can only burn, never steal. Warn at capability level (capability, never accusation — the airdrop-dust-hygiene acknowledgment, no rescued balance named since the scan never reads one); all-revert → pass with the family caveat adapted verbatim; all-noise/permissive-fallback → unknown; renounced skip. Block sits after 5m, before #6 pause.
- **Pre-ship validation (all five required):** (1) pre-write diff: zero rescue/withdraw coverage; (2) arg-encoding: 6 distinct selectors (0xf5648a4f / 0xd201b01e / 0xcb963728 / 0x57376198 / 0xd28e3ed4 / 0x8980f11f), calldata 4/36/36/68/68/68 bytes, fail-safe args round-trip; (3) end-to-end quickScan in node vs live RPC — DUMB (renounced) → check correctly absent, INC + WBTC (live owners) → present, pass-with-caveat; (4) ROADMAP scanner line + both Dumb AI scanner answers extended in each surface's own words ("a rescue/withdraw probe … the slow-rug tax-jar drain: the owner can drain the fee pool the holders funded"); (5) tsc + eslint clean, built, deployed to dump-money-hub-preview, served-bundle verified on the custom domain (scan chunk BurnBragCard-BKu1fFs2.js carries the check; /plan SSR carries the roadmap clause; served dump + ai chunks carry the new AI clauses). /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest.
- **Operational note:** a service restart mid-run wiped /tmp (bundle + e2e script). Recovered by re-bundling from src and re-running the e2e from durable paths — the repo edit is atomic and was verified before the wipe, so nothing half-written shipped. Standing lesson for future ship runs: keep build artifacts under the goal's hidden_files or re-derive cheaply.
- Deferred 16:23 entry → RESOLVED / shipped. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-29 16:33 — adversarial review of the deferred "Owner rescue/withdraw power" probe design (5n) (#9 security pass, audit-only, NO code changes, no build/deploy)

- **SCOPE:** the 16:23 #13 design pass for the 5n probe (6 rescue/withdraw shapes, read-only eth_call impersonating the live owner, dead-address fail-safe args, control-first, warn-at-capability-level). Per the 15:23 precedent (design → review → ship), this run is the review; the ship run comes next.
- **VERDICT: APPROVED, no required revisions.** Every structural claim verified independently; the one place a systematic false-negative could hide (the dead-address probe arg against real rescue implementations) was stress-tested to the EVM-semantics level and holds.
- **INDEPENDENT VERIFICATIONS (not trusted from the design):**
  1. Pre-write diff re-confirmed: zero rescue/withdraw probe coverage in token-scan.ts — every "rescue" hit in src is DUMB-immutability copy ("no rescue"), unrelated. The `if (liveOwner)` gating is the established family pattern (12 occurrences).
  2. Recon re-run read-only against live RPC: all 6 shapes revert honestly under owner impersonation on INC (owner 0xb2ca…02d4) and WBTC (owner 0xca06…beb7) — zero machinery in the curated set, zero false-positive risk there. Matches the design's claim exactly.
  3. Family-pattern fit confirmed against the shipped 5m block (token-scan.ts:1646-1775): owner impersonation, keccak256 selectors, dead-arg fail-safe, permissive-fallback control first with break-on-blind, revert→absent / noise→unknown triage with one retry, warn-at-capability-level copy, pass-with-caveats. The 5n design mirrors all of it; the 5l-suppression lesson is trivially honored (no getters in this probe).
- **THE DEEP-DIVE (the 14:03-class hunt):** the dead address has no code, so any high-level external call a rescue implementation makes against the probe arg (balanceOf/transfer) hits an EOA. If solc 0.8 reverted on empty returndata, the whole probe would read "absent" for contracts that genuinely have the machinery — a systematic false negative. Resolved by compiling the two canonical rescue patterns with solc 0.8.28 and disassembling the external-call epilogue: after CALL, the codegen does RETURNDATACOPY of returndatasize() bytes and MLOADs from zero-filled memory — NO minimum-size check, NO revert. Empty returndata zero-pads (balanceOf→0, transfer→false), consistent with the well-known mainnet USDT behavior. Consequences for the design: balance-sweep implementations (the common fork pattern — sweep full balance, return unchecked) report "found" honestly; fixed-amount unchecked ditto; only require-checked-return implementations revert → land in the family's pass-with-caveat, which is the honest bucket for them. Acknowledged residual: via-IR-compiled forks could theoretically differ on returndata handling — exotic, and the caveat covers it.
- **Confirmed sound, no change needed:** 7-typical/13-worst RPC budget (6 shapes × ≤2 attempts + 1 control); all-noise → unknown ("treat as risky") matching the family; renounced/absent owners skip via `if (liveOwner)`; the warn posture honors the 15:23 R5 precedent (capability level — "the owner can pull accumulated PLS or tokens out of the contract" — sweeping airdrop dust acknowledged as legitimate hygiene, NO rescued balance named since the scan doesn't read one); the three design rejections stand (real-token probe amounts, two-arg variants, balance-getter pair — balance ≠ drainability).
- **SHIP-RUN NOTES (non-blocking):** (1) the design never names the check id — family convention suggests `owner-rescue-withdraw`; (2) keep the family pass-caveat wording verbatim, adapted ("Custom rescue functions could hide under other names, or reject the probe's fail-safe test value"); (3) polish, not required: tailor "PLS" vs "tokens" in the warn per shape arity since the warn names the hit shape anyway; (4) block placement: after 5m, before #6 pause. The 16:23 pre-ship validation list (diff, arg-encoding, end-to-end node run vs DUMB/INC/WBTC, ROADMAP + both AI answers, tsc/eslint/build/deploy + served-bundle verify) stands unchanged — the next #13 run ships it.
- **Site health:** / /scan /burn /plan all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution (twelfth confirmation of the 09:23 reasoning). Zero wallet/signing/data-source/mascot touch, no new data sources. #9 stays open as recurring; #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#10/#13 stay open as recurring.

Standing practice (Antonio, 2026-09-26): actively research legitimate ways to
grow demand and rally the community. Log every idea CONSIDERED and every idea
REJECTED, with reasons. Rules: never invent community members, burns, ratings,
or enthusiasm; never promise price appreciation; everything must benefit the
community and be safe — Mosheh vetoes anything too risky, and it doesn't ship.

## Shipped

- **"Enter in Telegram" → "Join the Telegram crew" on the /raid Smiley Meme
  Contest card** (2026-09-29, #8 — bullish-demand research, SHIPPED): the card
  badges "Season 1 soon" and the blurb says "The first meme season is still
  being set up", but the button promised "Enter in Telegram" — a tap offered
  entry into a contest that hasn't opened. The CTA now joins the community
  where the season will open, without pretending entries are being accepted.
  The label lives on MEME_CONTEST in packs.ts (data-driven, next to status/
  blurb/rules — one edit keeps them consistent when the season opens; the
  season launch itself stays Antonio's call). Considered and REJECTED:
  softening the badge instead (the badge was already honest — the button was
  the mismatch); removing the card until the season opens (kills the only
  discoverable path to the contest); a "notify me" subscription (needs a
  backend — speculative churn for a season that doesn't exist yet).

- **"Owner mint power" probe in the /scan quick scan** (2026-09-29, #13 —
  real-utility research, SHIPPED): the adjacent inflation vector to the fee
  probe family (5e/5f): a live owner who can print new tokens is the classic
  mint-then-dump rug. Probes `mint(address,uint256)` / `mint(uint256)` with a
  read-only eth_call impersonating the live owner (never commits state; the
  simulated mint targets the dead address). Clean return = warn ("the owner
  can print new tokens… mint, then sell the new supply into buyers"); revert
  on both = pass with the honest custom-names caveat; all-RPC-noise =
  unknown ("treat as risky"); the permissive-fallback garbage-selector
  control gates first (a contract that answers fake functions degrades to
  unknown, never a false warn); renounced/absent owners skip it. Pre-ship
  validated against live chain data: INC (live owner) → warn, TRUE positive —
  its mint(address,uint256) answered the owner's call while a stranger's
  reverted (owner-gated, verified), so the warn path is proven reachable and
  honest; DUMB (renounced) → check correctly absent. Utility bar holds: real
  repeated pain, brings outsiders in (free quick scan, no wallet), no new
  data sources, no wallet/signing/mascot touch. ROADMAP scanner line + both
  Dumb AI scanner answers extended in the component's own words. Rejected as
  churn: probing extra mint shapes (mintTo, mintBatch, minter-role getters)
  — same RPC-volume reasoning as the 05:40 #13 exclusion-setter run; the
  pass-with-caveat already names the custom-names gap honestly.
- **Burn-page newcomer buy path in BurnBox** (2026-09-29, #8 — bullish-demand
  research, SHIPPED): funnel gap — the burn box's not-connected state showed only
  the connect button, and the connected-with-insufficient-balance state showed
  only "Insufficient DUMB balance." — neither told a newcomer with zero tokens
  where to get them. Both now link to /trade ("No DUMB yet? Buy it on the trade
  page" / "Buy DUMB|DAMP on the trade page"). Better (completes the buy → burn
  funnel from shared links), safer (points newcomers at the hub's curated trade
  page with ContractGuardrail instead of leaving them to search past the known
  name-collision scam risk). One-line change each, zero wallet/signing/data/
  mascot touch, no new data sources, no ROADMAP/AI churn (not a feature).
- Considered + REJECTED this run: extending the pointer into the BurnBox amount
  input itself (placeholder-only adornment adds noise for connected holders —
  the two empty-handed states are exactly where the question "where do I get
  some?" lives).

- **First-swap walkthrough on /trade** (designed 2026-09-27, #8 — VERIFIED
  SHIPPED + LIVE 2026-09-29, #13 research): the 5-step "Your first swap"
  section renders on /trade below the swap box (connect wallet / PulseChain
  auto-switch, keep PLS for gas, curated + verified inputs, tax already in
  the quote, exact-amount approve → swap → check the receipt on the
  explorer, never enter a seed phrase) — verified in src
  (src/routes/trade.tsx) AND in served SSR HTML on the custom domain
  (/trade 200, "Your first swap, in 5 steps" present). Research-log hygiene:
  the stale "Designed" entry is removed. Accessibility win that also lowers
  onboarding friction for new buyers.

- **Donor-board chain-read failure honesty: no more false "No donations yet"**
  (2026-09-29, #8 bullish-demand research — the 05:20 #9 audit's deferred
  unit, SHIPPED): the board swallowed every per-token `getLogs` failure as an
  empty array (`.catch(() => [])`), so a total RPC outage resolved `donors`
  to `[]` and the board rendered "No donations yet — be the first to feed the
  burn." — a verified-truth community board asserting a false negative about
  real donations, exactly the honesty defect class the 05:10/05:20 runs kept
  killing on the price side. Failures now resolve per-token to `null`, and a
  `readState` machine reports the round honestly: all five failed with nothing
  ever loaded → an announced error note ("The donation reads didn't land —
  the chain couldn't be reached…", `role="alert"` per the 04:50 a11y
  convention, 60s retry heals it); all failed with a good board cached →
  keeps the last good board under a "stale — last good read" caveat (no
  flicker on transient RPC blips); some failed → board renders on the real
  logs with a "may be a partial view" caveat under the header. Legit empty
  reads still show "No donations yet." State logic unit-tested in node
  (13/13: all-fail/stale/partial/clean branches, aggregation dedup, vault's
  own + zero-value logs excluded). No ROADMAP/AI churn — no ranking claim
  changed; the "Every donation since the vault launched" header is now
  honestly qualified by the partial caveat.
- **Considered and REJECTED**: (1) an honest error state for the vault stats
  cards ("Burned by the vault" / "Drips fired" show "…" on getLogs failure) —
  rejected as churn: "…" asserts nothing false, so the honesty bar isn't
  crossed; observed, may revisit. (2) Replacing the board with a retry button
  on failure — rejected: the 60s auto-retry already heals it; a button adds
  UI for a transient state.

- **Donor-board empty-state gate tightened: the partial-price-failure hole**
  (2026-09-29, #9 security pass — audit-found, SHIPPED): the 05:10 run's
  empty-state gate read `donors.length > 0 && !pricesLive`, i.e. it showed
  "Donations are on-chain, but current prices couldn't be read" only when NO
  price was live at all. But `useTokenPrices()` resolves null PER TOKEN, so a
  donor whose donated tokens' price reads failed — while some other token's
  price was live, keeping `pricesLive` true — still lands at usd = 0, is
  filtered out, and if that covers every donor the board renders the exact
  false state the 05:10 run killed: "No donations yet — be the first to feed
  the burn." The gate is now unconditional on prices: inside the
  `rows.length === 0` branch, `donors.length > 0` alone implies every donor's
  prices failed to read (donor ingest skips 0n amounts, so a non-empty donors
  map with zero rows means all usd computed to 0 on null prices), so the
  prices note is the truthful state in every case. The now-unused `pricesLive`
  const was removed and the code comment rewritten to state the invariant.
  Reviewed clean, no change needed: share copy ("I donated $X … rank #N …
  Every donation verified on-chain") — the header + footer frame the USD-value
  ranking so "donated $X" reads as donated value, the rank-shift-on-price-moves
  is now disclosed in the header, and every row is log-sourced (per the 05:10
  churn decision — not relitigated); donor addresses come from viem-decoded
  typed log args (no injection into explorerAddress hrefs); opt-in names stay
  charset-restricted + React-escaped; risk-first/verify flows untouched. Zero
  wallet/signing/data/mascot touch, no new data sources. tsc + eslint +
  prettier clean, built, deployed to dump-money-hub-preview — / /burn /scan
  200 on the custom domain, the served burn chunk carries the note with the
  old `pricesLive` gate gone. Observed, not churn: on a total getLogs RPC
  failure the board shows "Reading the chain…" until the 60s retry lands — a
  persistent outage would spin; an honest error state is a future #9 or #8
  unit, not this one.

- **Feed-the-Burn donor board honesty pass** (2026-09-29, #8 — bullish-demand
  research, a research-found unit): the donor leaderboard's header promised
  "You climb only when your total passes someone else's" — a factually false
  rule for a board ranked by current USD value of five independently-moving
  tokens (WPLS/HEX/INC/PRVX/PLSX): ranks CAN shift on price moves alone, with
  no new donations. It now reads honestly ("Ranked by current USD value — so
  prices can move ranks even with no new donations. No resets, no shortcuts,
  nothing invented."), matching the board's own footer footnote and the
  ROADMAP line ("ranked by cumulative donated value at current prices
  (estimate only, for bragging rights)"), and the code comment carries the
  same fix. Second genuine defect on the same surface: when every price read
  fails (RPC flakiness, price feed down) while the donation logs read fine,
  every row's usd lands at 0, the filter empties the board, and it rendered
  "No donations yet — be the first to feed the burn." — a false empty state.
  It now shows "Donations are on-chain, but current prices couldn't be read —
  the board will appear once prices load." Considered + REJECTED as churn:
  rewriting per-row "{X} donated" / "You're #N with {X} donated" / the
  share-text "I donated {X}" to "at current prices" — the fixed header +
  existing footnote now frame the board consistently; the share text's
  "Every donation verified on-chain" is true as written. Zero wallet/signing/
  data/mascot touch, no new data sources. tsc + eslint + prettier clean,
  built, deployed to dump-money-hub-preview — / /burn /scan 200 on the custom
  domain, the served burn chunk carries both new strings.

- **Burn-backed deep-scan share links for 30-day pass holders**
  (2026-09-29, #8 — closes the deferred gap this run flagged on 2026-09-28):
  a pass holder who ran a deep scan on their 30-day pass (no fresh burn this
  session) got only the quick-scan share copy — "Safety scan for 0x…" — never
  naming the deep scan that ran, backed by a real 100,000 DUMB burn. The
  pass-based path (`runDeep` in DeepScanPanel) now calls `onDeepComplete`
  with the pass's burn hash and a `viaPass` flag; the ShareReport links
  `?token=<addr>&burn=<passTxHash>`, which the shared-link path re-verifies
  on-chain at view time before re-running the deep scan (the pass's hash was
  verified before the pass was issued, and no pass is ever issued to the
  viewer — the existing anti-spoof properties hold). The copy is the honest
  variant the deferred note demanded: "… — run on a 30-day pass unlocked by a
  verified 100,000 DUMB burn, live on PulseChain via the Dumb Money Hub
  scanner" — never "burned to run it," never implying a fresh burn, and the
  brag card stays keyed on this-session burns only. ROADMAP "Token safety
  scanner" line, the Dumb AI "How do I check if a token is safe?" answer, and
  the token-scanner knowledge chunk updated. Zero wallet/signing/data/mascot
  touch, no new data sources. tsc + eslint clean, built, deployed to
  dump-money-hub-preview — / /scan /burn /plan /ai 200 on the custom domain,
  served scan chunk carries the new copy on both domains, roadmap line live
  in served /plan HTML.
- Considered + REJECTED this run: (1) using the fresh-burn copy ("100,000
  DUMB was burned to run it") for pass runs — loose: the burn happened days
  ago to unlock a pass, not to run this scan; the loop's honesty standard
  requires the distinction; (2) issuing a new brag card on pass-backed scans —
  the brag card's contract is "this session's verified burn" and an old pass
  burn would misattribute timing ("I just burned"); (3) a viewer-facing
  "runs on the sharer's pass" note in the share row — the existing "the link
  re-runs the scan live on-chain when opened" note plus the code's explicit
  no-pass-for-viewers already covers it; extra copy buys nothing.

- **"Fee-change powers" probe in the /scan quick scan** (2026-09-29, #13 —
  real-utility research): a research-found genuine gap — the owner check
  warned "it can still change fees… if those functions exist" but never
  tested whether they do. A token showing 6% today whose owner can set 99%
  tomorrow is the classic slow-rug, and the tax getter only reports today's
  value. The new check runs only for a live owner (renounced/absent skip
  it): 7 read-only eth_call probes impersonating the owner against the
  common safemoon-fork fee-setter shapes, arg repeating the current tax
  (eth_call never commits state). A clean return → warn ("the tax you see
  today isn't locked"); none answered → pass with the honest caveat that
  custom setters could hide under other names; RPC noise → unknown.
  Validated pre-ship against live chain data (WBTC → pass, INC → pass,
  DUMB renounced → skipped; plumbing proven with owner() → found and a
  garbage selector → revert/absent). Dumb AI answers + ROADMAP line updated.
  tsc + eslint clean, built, deployed to dump-money-hub-preview — /
  /scan /burn 200 on the custom domain, served chunk carries the new copy.
- **"Scan my bags" risk-first results + honest severity color + share row**
  (2026-09-29, #8 — bullish-demand research): a research-found gap in the
  shipped bag scanner — rows rendered in scan order, so the riskiest token
  could sit buried at the bottom, and the verdict chip painted actual FAILS
  the same amber as mere cautions. Results now re-rank risk-first on every
  progressive update (fails → cautions → clean → couldn't-scan, stable), and
  fails render in red while cautions stay amber — a safety tool shouldn't
  paint them the same color. A one-tap share row (native sheet + Post to X +
  Share to Telegram, nothing posts automatically) carries counts only — "I
  scanned my PulseChain bags — N tokens checked, F with red flags. Scan
  yours free" — never an address or wallet, and links /scan (the scanner
  funnel, where the burn-gated deep scan lives). The rally unit: every
  shared bag-scan is an invite into the scanner. tsc + eslint clean, built,
  deployed to dump-money-hub-preview — /scan /burn /ai /plan 200 on the
  custom domain, the served scan chunk carries the new row + share copy.
- **"Owner concentration" check in the /scan quick scan** (2026-09-29, #13 —
  real-utility research): a genuine gap the quick scan had — it caught
  rule-change risk (owner powers, pause, upgradeability) and exit risk (LP
  burn %, sell simulation, round-trip cost) but not the classic slow-rug
  shape: a live owner holding a huge share of supply while the LP looks
  clean. The check runs only when owner() points at a live address
  (renounced/absent owners skip it — no check added). One extra
  readContract (balanceOf(owner); totalSupply was already read): fail at
  ≥50% of supply, warn at ≥15%, pass below; unreadable → unknown ("treat
  as risky", never "fine"). Copy stays honest — "holding isn't dumping,
  but the power sits in one place." Pre-ship validation: live chain reads
  (WBTC's live owner holds ~0.00% → pass; DUMB/DAMP/TEDDY/PCOCK/PTGC/PLSX
  renounced, HEX/PRVX/SOLIDX/HELGO no owner() → correctly skipped) and
  node unit tests of the threshold math (7/7). Checks render generically,
  so no UI change; Dumb AI scanner answer + ROADMAP line updated. tsc +
  eslint clean, built, deployed to dump-money-hub-preview — / /scan /burn
  /plan /ai 200 on the custom domain, the new check verified in the served
  lazy chunk. #13 stays open as recurring.

- **Dust-burn amount honesty fix on all three brag surfaces**
  (2026-09-29, #8 — research found it, not the backlog): the brag
  verification gates accept any positive burn, but the amount formatters
  trim to 4 decimals — a real dust burn rendered "0 DUMB" on the server brag
  card, the client BurnBragCard, and the pre-filled share text ("I just
  burned 0 DUMB …"). A positive-but-sub-0.0001 amount now renders "<0.0001"
  on all three (server fmtTok, TokenScanner fmtBurnTok, a BurnBox-only
  fmtBragAmt wrapper — shared formatters for balances/quotes untouched).
  Formatter logic unit-tested in node (7/7). tsc + eslint clean, built,
  deployed to dump-money-hub-preview — / /burn /scan /plan /ai 200 on the
  custom domain, served chunks carry the fix. #8 stays open as recurring.
- Considered + REJECTED this run: (1) a "Share my bag-scan" summary row on
  the new "Scan my bags" panel — each row already opens the full report,
  which carries the vetted share surface, and a summary share would either
  leak the wallet's token list (privacy) or be too vague to matter; no new
  surface earned; (2) a "watch your burn land on the leaderboard" nudge in
  BurnBox — the leaderboard lives on the same /burn page below the box, so
  the deep-scan panel's cross-page link has no same-page equivalent gap;
  (3) extending the tx-explainer's significant-digits amount style to the
  brag formatters — the "<0.0001" guard is smaller and keeps the established
  4-decimal convention everywhere else.

- **Burn brag cards on the deep-scan success panel** (2026-09-29, #8 — the
  01:00 run's flagged follow-up): a deep-scan burner just paid a verified
  100,000 DUMB burn (one-click transfer, manual paste, or PLS-fallback swap)
  and the panel showed "Deep scan complete — burn verified" with no brag/share
  surface for the burn itself — while BurnBox's success panel has had the
  "Brag about it" card + share row for both paths since 01:00. Now the deep
  scan's success state renders the same vetted surface: the client-side
  BurnBragCard (real verified dead-arrival amount + tx hash, share/download —
  fires the allowlisted brag_share event) plus a text-only share row (native
  share + Post to X + Share to Telegram) linking /brag?tx=, whose preview
  unfurls the server-verified card (/api/brag-image verifies both the direct
  and PLS-swap shapes). The amount everywhere is the verifier's dead-arrival
  bigint — the same number the unfurl card prints, no mismatch between copy
  and card (the established BurnBox convention). The row keys on this
  session's verified burn only: it never fires from a stale pass or from a
  shared ?burn= link the viewer didn't do (no wrong-burn attribution), and it
  resets per token. Share copy stays honest ("I just burned X DUMB … — that
  unlocked 30 days of deep scans on the Dumb Money Hub. Supply shrank a
  little, no promises."). Dumb AI "How do I check if a token is safe?" answer
  + ROADMAP "Token safety scanner" line updated. Zero wallet/signing/data/
  mascot touch, no new data sources. tsc + eslint clean, built, deployed to
  dump-money-hub-preview — /scan + /burn 200 on the custom domain, the served
  scan chunk carries the new block, the served dump chunk carries the roadmap
  line + AI answer. #8 stays open as recurring.

- **Tx-explainer detects the PLS-swap burn shape** (2026-09-29, #8 — the
  research-flagged follow-up from the 01:00 run): the /scan transaction
  explainer deliberately refused to classify PLS-fallback burns — the comment
  said "swap-burns never set this" — because /api/brag-image only verified
  direct burns. Since the 01:00 run taught the endpoint the swap shape, the
  explainer was one ship behind its own API. Now it detects
  swapExactETHForTokensSupportingFeeOnTransferTokens on the PulseX router with
  `to` = dead and path ending in DUMB (the exact gate the endpoint verifies,
  mirrored condition-for-condition, mined-only): it gets a proper "Burn —
  X DUMB destroyed" headline (previously the generic "complex transaction"
  misclassification, since nothing comes back to the sender) and
  `burnBragTx` is set, so the "get your shareable brag card" link renders.
  Verified live: Antonio's real 40,868-PLS swap-burn
  (0x4757ca97…) explains as "Burn — 104,477.42 DUMB destroyed" with the brag
  link, while an ordinary 1M-PLS DUMB buy still explains as a swap with no
  link. Dumb AI's "What did my transaction actually do?" answer updated (it
  said only direct burns link the card). Zero wallet/signing/data/mascot
  touch, no new data sources. tsc + eslint clean, built, deployed to
  dump-money-hub-preview — /scan 200 on the custom domain. #8 stays open as
  recurring.

- **Brag cards for PLS-fallback burns** (2026-09-29, #8 — research found it,
  not the backlog): the PLS-fallback burners — often newcomers with small
  bags, the exact people most likely to share — got an explorer link while
  direct burners got the unfurling brag card, an accidental second-class
  share surface. `/api/brag-image` now verifies a second shape: the PulseX V2
  router's `swapExactETHForTokensSupportingFeeOnTransferTokens` with `to` =
  dead and a path ending in DUMB (selector computed from the ABI, never
  hand-typed; receipt must show DUMB actually arriving at dead). The card
  prints the verified dead-arrival — the honest destroyed number, since the
  swap output is taxed on arrival. The direct-transfer shape is unchanged.
  BurnBox's success panel now shows the same "Brag about it" card + share row
  for both paths (the dead `viaPls` share special-case removed), so every
  confirmed burn unfurls a card on X/Telegram/Discord. Safety: verification
  is fail-closed (anything unverified 404s), amounts come only from on-chain
  logs, nothing is uploaded or stored, the card names the tx hash so every
  brag stays checkable, and the /brag page's "voluntarily burned" copy still
  holds — both accepted shapes prove burn intent in the tx input. Zero
  wallet/signing/data/mascot touch, no new data sources. tsc + eslint clean,
  the swap-input decode unit-tested in node (selector match, to=dead,
  path-ends-in-DUMB, wrong-path rejected), built, deployed to
  dump-money-hub-preview — /burn 200 on both domains, /api/brag-image 400s
  on a malformed hash and 404s on a well-formed non-burn. A 20k-block chain
  scan found two router-swap txs with DUMB arriving at dead — one was a
  genuine swap-to-dead burn (card rendered, 200, real 1080×1080 PNG) and the
  other was an ordinary DUMB buy whose receipt only carried the 1% protocol
  tax-burn legs (correctly 404 — the decoded `to` != dead check refused to
  issue a "voluntary burn" card for someone's buy, which is exactly the
  honesty property the shape check exists for). #8 stays open as recurring.

- **Skip-to-content link sitewide** (2026-09-29, #8 — accessibility audit):
  keyboard and screen-reader users had to tab through the entire sticky
  header (nav, More dropdown, wallet connect, Trade CTA) on every page before
  reaching the page's content. PageShell now renders a visually-hidden "Skip
  to content" link first in the tree (revealed on focus) targeting a focusable
  `#page-content` wrapper (tabIndex=-1). Rationale: north-star "welcoming"
  includes visitors who don't use a mouse — a first-time keyboard user lands
  on the actual content immediately, including on /scan and /trade where the
  actions are the point. Safety: two lines of JSX, routes keep their own
  <main> landmarks (no nesting), zero wallet/signing/data/mascot touch, no
  new data sources. tsc + eslint clean, built, deployed to
  dump-money-hub-preview — / /scan /burn /wallet 200 on the custom domain,
  link + focus target verified in the served SSR HTML. #8 stays open as
  recurring.

- **"Pledge your next burn" nudge in the leaderboard's "That's you" banner**
  (2026-09-29, #8 — research found it, not the backlog): the burn-pledge board
  shipped 2026-09-28 and is honestly empty, and nothing connected the
  recognition moment (a verified burner seeing their rank lit up) to the
  promise board directly below it — a real burner at peak commitment had no
  pointer to the rally surface built for exactly their next move. Now the
  "That's you" banner carries one line under the share row: "Pledge your next
  burn on the promise board below — a pledge is a promise, not a burn." —
  an in-page anchor to the pledge card (`id="pledge-board"`). Rationale:
  closes the burn → recognized → pledge loop, same pattern as the deep-scan
  pass panel's "Watch your burn land on the burn leaderboard" link; copy
  stays inside the honesty frame (promises labeled promises). Safety: pure
  copy + in-page anchor, zero wallet/signing/data/mascot touch, no new data
  sources, nothing posts automatically, renders only when the wallet actually
  ranks. Considered + REJECTED as churn: showing the nudge only to wallets
  without an active pledge (would need a second /api/pledges fetch in the
  leaderboard — the copy "pledge your NEXT burn" is already honest for
  existing pledgers, so the extra fetch buys nothing). tsc + eslint clean,
  built, deployed to dump-money-hub-preview — /burn 200 both domains, the
  served burn chunk on the custom domain carries the new copy, `pledge-board`
  anchor in the SSR HTML. #8 stays open as recurring.

- **Scan watchlist on /scan** (2026-09-28, #13 — real-utility research):
  vetting a token then losing the verdict on reload is the repeated pain of
  every PulseChain user who checks contracts before aping. Now every
  quick-scan report has a Watch toggle; watched verdicts (red flags, tax,
  pair state, scanned time) live in a browser-local list under the scanner —
  localStorage only, nothing leaves the device, capped at 50, never
  presented as current (each row shows "scanned Xm ago"). Re-scan re-runs
  the scan live on-chain in the mounted scanner and refreshes the entry, so
  a verdict can never pretend to be fresh; entries with a PulseX pair show
  "Deep scan available", routing repeat vetters straight back through the
  100k-DUMB-burn deep scan. Utility bar: real repeated pain, keeps users in
  the burn-gated scanner, no backend, no signing, no new data source.
  Rejected alternative: rendering cached check details per row (stale copy
  on a safety tool is worse than none — the list carries only the verdict
  summary and forces a live re-run).

- **"Share your pledge" row on the PledgeCard** (2026-09-28, #8 — research
  found it, not the backlog): burn pledges shipped 23:10 but the board is
  honestly empty, and a pledger had no one-tap way to broadcast their
  commitment — every other rally point does (burn leaderboard "That's you"
  banner, Feed-the-Burn donor board share row, milestone strip, brag cards).
  Now the pledge card shows a "Share your pledge:" row for the connected
  wallet's own active pledge, using the exact vetted pattern (native share +
  Post to X + Share to Telegram, encodeURIComponent'd, own-origin /burn link,
  nothing posts automatically, renders only when that wallet actually has a
  pledge). Copy stays honest: active pledge = "I pledged to burn X DUMB in
  the next 30 days — holding me to it"; already redeemed = "…and my burns
  are verified on-chain". The redeemed-branch matters: proof of
  follow-through is the best recruitment for the next pledger. Safety: pure
  copy + share surface — zero wallet/signing/data/mascot touch, no new data
  sources; share text carries numbers only, never the address or opt-in
  username (same rule as the leaderboard share copy). Dumb AI "How do I
  share DUMB?" answer + the ROADMAP "Burn pledges" line updated. tsc +
  eslint clean, built, deployed to dump-money-hub-preview — /burn 200 both
  domains, the served burn chunk on the custom domain carries the new copy,
  the served dump chunk carries the AI + roadmap updates.

- **Burn pledges — the public promise board** (2026-09-28, #13 — the
  real-utility slot): the rally mechanic the utility hunt kept circling. On
  /burn below the leaderboard: a connected wallet signs ONE message (no gas,
  nothing moves) publishing "I pledge to burn X DUMB/DAMP within 30 days"
  (1k–10B whole tokens, DUMB or DAMP). Active pledges list with opt-in
  display names; each row flips to "burned ✓" only when that wallet's
  verified on-chain voluntary-burn sums (arrival-leg accounting: 95% of DUMB
  / 98% of DAMP sent reaches dead, per the verified tax math) cover the
  pledge — otherwise "promise — awaiting on-chain burn". Pledges are labeled
  promises everywhere, never burns; the empty board states it's empty on
  purpose (never seeded); one pledge per wallet, 30-day expiry. Server: GET
  /api/pledges + POST /api/pledge (signed token+amount+address+timestamp,
  10-min freshness, 10 POSTs/day/IP), KV under `pledge:` in the existing
  analytics namespace — no new binding, no new data source, no contract. The
  redemption join reuses the leaderboard's cached epoch scan (same
  react-query key, zero extra RPC). Dumb AI + ROADMAP updated. Live on the
  preview deploy; /api/pledges returns {"pledges":[]} — the board is empty,
  honestly.

- **Whitepaper FAQ tax-framing staleness fix** (2026-09-28, #8 — research found
  it, not the backlog): the 2026-09-27 framing-consistency audit concluded
  "the whitepaper leads with the net" but missed one line — the FAQ's "Does
  anything burn when I trade?" answer still read legs-first ("1% of every
  taxed transfer is burned to the dead address, and another 1% is reflected
  to holders"), omitting the entombed 4% and leaving the reader with a "1%
  burns" takeaway — exactly the understatement the locked canonical framing
  (DUMB 6% = 5% instant burn + 1% reflections) was created to fix. Now net-first:
  "5% of every taxed transfer is permanently destroyed: 1% burned to the dead
  address, 4% entombed in the contract's fee buckets (the auto-processing
  engine is dead and ownership is renounced, so nothing ever spends them) —
  and 1% is reflected to holders." Lead, intro, and DAMP FAQ were re-checked
  and already net-first; only this line was stale. Static copy only.
- **Dumb AI knowledge staleness fix: the /wallet page**
  (2026-09-28, #8 — research found it, not the backlog): the /wallet page had
  grown into a three-feature dashboard (read-only holdings of PLS/DUMB/DAMP +
  every curated verified token, the Token approvals hygiene section, the
  opt-in Username card) but Dumb AI had no knowledge chunk describing the
  page — only scattered mentions (the approvals section inside the scam-safety
  answer, the username inside its own question). A newcomer asking "what's on
  the wallet page?" got no coherent answer, and the approvals hygiene feature
  — a genuine safety surface — stayed undiscoverable through the AI. Now:
  (1) a new "wallet-page" knowledge chunk (holdings + approvals + username,
  with the honest scope note on the approvals scan and the read-only
  guarantee); (2) a new suggested question "What's on the /wallet page?"
  with the three features spelled out; (3) the missing ROADMAP line for the
  /wallet holdings list (the approvals section already had one; the holdings
  list — shipped earlier today — had none). Rationale: same judgment as the
  quote-card/proof-strip refresh — an AI that can't describe a flagship page
  is worse than one that stays quiet, and the approvals feature only protects
  people who can find it. All copy verified against the shipped code
  (wallet.tsx, ApprovalChecker.tsx, UsernameCard.tsx) before writing. Pure
  static copy — zero wallet/signing/data/mascot touch, no new data sources.
  tsc + eslint clean, build + deploy + live verify: /ai 200 with the new
  question in the served chunk, /plan 200 with the roadmap line, the served
  ai chunk carries the wallet-page knowledge chunk.

- **Dumb AI knowledge staleness fix: quote card + proof strip**
  (2026-09-28, #8 — research found it, not the backlog): two big ships from
  the day's loop runs were invisible to Dumb AI — (1) "How do I trade DUMB?"
  never mentioned the "Before you sign" quote card ("You pay X → Y% tax
  (A burned forever · B shared with holders) → you receive ≈Z", above the
  swap button on a live quote, with the "price can move either way" risk
  disclosure) — the exact tax moment a newcomer asks "why will I get less?";
  (2) nothing anywhere described the homepage proof strip (total DUMB
  destroyed, fixed supply, 6%/3% tax legs read live from the contracts'
  fees()/feesDistribution(), every figure with block number, read age, and
  explorer link) — a newcomer asking "what are these numbers?" got silence.
  Now: trade answer names the card, a new suggested question "What are the
  numbers at the top of the homepage?" answers the strip, and the "proof"
  RAG chunk covers it (+ "homepage"/"strip"/"hero" tags). Rationale: an AI
  that answers stale is worse than one that stays quiet — the same judgment
  as the first and second knowledge refreshes, applied to today's own
  ships. All copy verified against the shipped code before writing. Pure
  static copy — zero wallet/signing/data/mascot touch, no new data sources.
  tsc + eslint clean, build + deploy + live verify: /ai and / 200 on the
  custom domain, served /ai HTML carries the new question, served dump
  chunk carries the updated answers.

- **"Share your rank" row on the Feed-the-Burn donor board**
  (2026-09-28, #8 — research found it, not the backlog): the all-time donor
  leaderboard (Feed-the-Burn vault donors, live since this morning) already
  highlights the connected wallet as "you" but had no share surface — every
  other rally point does (burn leaderboard "That's you" banner, milestone
  strip, brag cards). A donor who just fed the vault had no one-tap way to
  post their verified rank. Now the donor board shows a "Share your rank:"
  row for any connected wallet that ranks (top 10 or outside it), with the
  same native-share + Post to X + Share to Telegram pattern: copy is the
  board's own live numbers — "I donated $X to the Feed-the-Burn vault — rank
  #N on the Dumb Money all-time donor board. Every donation verified
  on-chain." — and the link re-renders the same live /burn board for the
  viewer. Renders only when the wallet actually ranks; zero
  wallet/signing/data/mascot touch, no new data sources, nothing posts
  automatically. Also updated the "How do I share DUMB?" Dumb AI answer and
  added a "Feed the Burn" ROADMAP group (the vault itself had no roadmap line
  at all — closes part of the drift the 19:11 run flagged: DAI removal and
  the Sept-21 leaderboard rebuild are still undocumented here and stay on the
  main agent's plate). tsc + eslint clean, build + deploy + live verify:
  /burn 200 both domains, the served burn chunk on the custom domain is the
  new build and carries the new copy, /plan carries the new roadmap section
  + AI answer.

- **Username discoverability: Dumb AI answer + leaderboard footer link**
  (2026-09-28, #8 — research found it, not the backlog): the opt-in wallet
  username registry shipped (names on the burn + Feed-the-Burn boards, card on
  /wallet) but was invisible everywhere else — a newcomer seeing named rows
  had no path to claim one, and Dumb AI had no answer for "Can I put a name
  on my wallet?" Now: (1) a new AI_QA entry answering exactly that (sign one
  wallet message, no gas; 3–20 chars letters/numbers/_/-; unique
  first-come-first-served; one per wallet; rename/clear anytime; lives in the
  hub's signed registry — never posts, never moves funds); (2) one line in the
  burn-leaderboard footer — "Display names are opt-in — claim yours on the
  /wallet page" with an internal link. Also fixed the UsernameCard's stale
  docstring (said "NOT mounted on any route yet" — it has been mounted on
  /wallet since wiring). ROADMAP "Voluntary burns" leaderboard line updated.
  Rationale: completes the community feature loop (the username registry's
  whole point is identity on the boards — invisible = dead); all copy is the
  hub's own words + verified rules from src/lib/username.ts. Zero
  wallet/signing/data/mascot touch, no new data sources. tsc + eslint clean,
  build + deploy + live verify: /burn 200 both domains, served burn chunk
  carries the footer copy, served data chunk carries the AI answer + roadmap
  line.

- **Token approvals hygiene section on /wallet** (2026-09-28, #13 —
  research found it, not the backlog): the north-star claim is "the safest,
  simplest hub on the chain," and the hub had zero surface for the #1
  wallet-drain vector — stale token approvals. Every swap the site ever runs
  asks the wallet to approve the PulseX router, and those approvals stay open
  until revoked. Now a "Token approvals" section sits on /wallet (connected
  wallets only): it reads `allowance()` to the PulseX router for every curated
  token via the proven single-readContract pattern (13 reads, failures resolve
  null, never throw), flags "Unlimited" allowances, and offers a one-click
  revoke — the user signs `approve(router, 0)` themselves, receipt-status
  verified, "Rejected — nothing changed" on denial, "Reverted on-chain —
  nothing changed" on revert. Scope is deliberately honest: only the
  contracts this site has ever asked the user to approve are scanned, and the
  copy says so plainly ("approvals you granted anywhere else won't show
  here") — no false sense of a complete audit. Revoking never moves tokens,
  costs only a little PLS gas, and no approve() touches the transfer tax (not
  a transfer). All-clear and RPC-error states included. Rationale: genuine
  non-memefied utility for ANY PulseChain user (not just DUMB holders) —
  brings outsiders in under the utility bar's "brings people to the DApp"
  clause, deepens holding by making the hub the place you check before you
  trade, and hits three of the four every-loop questions (better, safer, more
  secure) with light brand copy for the fourth. Zero new data sources, no new
  contracts, no wallet/custody change (same user-signed pattern as swaps and
  burns), no mascot touch. Dumb AI "Scam safety" chunk + "How do I stay safe
  and spot scams?" answer + ROADMAP "Live on PulseChain" line updated. tsc
  clean on all touched files (22 pre-existing FeedTheBurn.tsx errors
  untouched — build unaffected), eslint clean, build + deploy + live verify:
  /wallet 200 both domains, served wallet chunk byte-identical to the local
  build on both, roadmap line live in the served /plan HTML on both.

- **"Rally the milestone" share row on the burn-milestones strip**
  (2026-09-28, #8 — research found it, not the backlog): the 16B/17B/18B
  milestone strip (mounted on /trade, /roots, and /burn — the community's
  rally point for the next milestone) had no share surface: anyone excited
  about burn progress had to hand-compose a post, and hand-composed milestone
  posts risk invented numbers. Now a "Rally the milestone:" row sits under
  the milestone markers (native share sheet + Post to X + Share to Telegram,
  the proven pattern) with pre-filled copy built from the strip's own live
  on-chain number: "DUMB burn update: X burned — the Y milestone is next.
  1% of every taxed transfer burns. Verified on-chain." (adapts to a
  "crushed all three" line once 18B is hit). Rationale: the rally surface
  the #8 mandate asks for, and it's SAFER than the status quo — the exact
  verified number is pre-filled instead of typed from memory, so a share can
  never misstate the burn. Safety: the row renders ONLY on a live number
  (never the loading state); copy asserts nothing the strip doesn't already
  assert; shareText/url/intents follow the proven allowlisted pattern (own
  literals + verified numbers, encodeURIComponent'd, rel="noreferrer
  noopener"); zero wallet/signing/data/mascot touch, no new data sources.
  Also fixed two staleness gaps found while auditing: the "How do I share
  DUMB?" answer now names the leaderboard "That's you" share buttons (shipped
  11:11, never added to the answer) and the milestone share row, and the
  "How do I check if a token is safe?" answer now names the deep-scan share
  copy (shipped 15:41, chunk was updated but the answer wasn't); the
  knowledge "share" chunk and the ROADMAP "Voluntary burns" milestones line
  updated. tsc clean on all touched files (note: `npx tsc --noEmit` reports
  22 pre-existing errors in FeedTheBurn.tsx from today's earlier Feed-the-
  Burn runs — untouched this run, build unaffected, flagged for a future
  maintenance pass), eslint clean, build + deploy + live verify (/burn 200
  both domains, served BurnMilestones chunk byte-identical to the local build
  and carries the new copy, roadmap line live on /plan, /trade /roots /
  homepage 200).

- **Deep-scan share copy now names the deep scan, its verdict, and the burn**
  (2026-09-28, #8 — research found it, not the backlog): the scanner's
  shareable report cards had a blind spot — a burn-backed deep scan's link
  (`?token=&burn=`) already re-ran the real deep scan for the viewer, but the
  pre-filled share copy only ever said "Safety scan for 0x…: no red flags
  found" and never mentioned the deep scan or the 100,000 DUMB burned to buy
  it. The sharer who paid the most had the weakest brag. Now, when a deep
  scan ran, the copy reads "Deep scan for 0x…: [verdict] — 100,000 DUMB was
  burned to run it" (verdict counts deep-scan fails/warns honestly, e.g.
  "clean on the on-chain buy-to-sell test"). Plumbing: `onDeepComplete` now
  passes the deep checks up alongside the burn hash; the parent resets both
  on fresh scans. Safety: the link already re-verifies the burn on-chain
  before the viewer sees anything, so the named verdict can never be stale
  or fabricated; burn-amount wording ("100,000 DUMB was burned") covers both
  the one-click DUMB burn and the PLS-fallback path honestly. Zero wallet/
  data/mascot touch, no new data sources. Dumb AI token-scanner chunk +
  ROADMAP "Token safety scanner" share line updated. tsc + eslint clean,
  build + deploy + live verify (/scan 200 both domains, served scan chunk
  carries the new copy, roadmap line live on /plan).
- Considered but DEFERRED (RESOLVED 2026-09-29, #8): deep-scan share links for
  30-day pass holders who run a deep scan without a fresh burn — the current
  `?token=` link gives the viewer a live quick scan only, so naming a deep scan
  in the copy would be dishonest. Needed a design that re-keys a shareable burn
  proof to an old pass burn without implying the viewer gets the same pass —
  shipped: the link now carries the pass's verified burn hash (re-verified at
  view time, no pass issued to the viewer) and the copy names the pass
  explicitly. Deferred note closed.

- **"Explain this swap" link on the /trade swap success panel**
  (2026-09-28, #8 — research found it, not the backlog): after a confirmed
  on-site swap, the success panel showed "View on explorer" + "Brag about it"
  but no path into the /scan transaction explainer — the surface that names
  the exact transfer-tax cost of a DUMB/DAMP swap. Now "Explain this swap"
  sits next to "View on explorer" (confirmed state only, never the
  confirming state), opening /scan?tx=<receipt hash>, which re-runs the
  explanation live on-chain at view time. Rationale: closes the swap →
  verify → understand loop at the exact moment a newcomer wonders "did I get
  what I was quoted?" and showcases the explainer's tax-cost feature.
  Safety: the hash is the receipt's own confirmed hash (internal, hex-gated
  by the explainer); pure client navigation; zero wallet/signing/data/mascot
  touch; no new data sources. Dumb AI "How do I trade DUMB?" answer +
  ROADMAP "Live on PulseChain" line updated. tsc + eslint clean, build +
  deploy + live verify (the served trade chunk is byte-identical to the
  local build and carries the link; roadmap line live on /plan).

- **"What the tax cost" swap-cost breakdown in the /scan transaction explainer**
  (2026-09-28, #13 — research found it, not the backlog): the explainer's swap
  branches promised "what a swap really cost you" but only told users to
  compare against their own quote. Now, on DUMB/DAMP swaps, the result names
  the exact transfer-tax cost as an info flag — computed from the receipt's
  own 1% protocol burn legs (dead-leg sum × 6 for DUMB, × 3 for DAMP), with
  the honest caveat that slippage can't be measured from the receipt alone.
  Rationale: the #1 confusion on taxed tokens is "why did I get less than
  quoted?" — answering it with the chain's own numbers turns the explainer
  into an education surface that deepens holding conviction (the north-star
  newcomer loop: swap → verify → understand the tax). Pre-ship validation on
  real swaps: buy 0x73a44f04… (1M PLS → DUMB, received/preTax = 0.9398 ✓),
  sell 0xb1c92cc3… (pair 94.95% / dead 1.01% / contract 4.04% ✓). Non-
  DUMB/DAMP swaps get no note — no invented tax math. Read-only, no wallet,
  no new data sources, no mascot touch. Dumb AI answer + token-scanner
  knowledge chunk + ROADMAP "Token safety scanner" explainer line updated.
  tsc + eslint clean, build + deploy + live verify (/scan 200 both domains,
  new copy in the served scan chunk, roadmap line live on /plan).

- **"Scan this token" links on the tx-explainer movements table**
  (2026-09-28, #8 — research found it, not the backlog): every token leg in
  the /scan transaction explainer now carries a "scan token" link that opens
  /scan?token=<exact contract>, flips to the "Scan a token" tab (the 05:41
  retarget fix covers in-page navigation), and re-runs the quick scan live
  on-chain. Rationale: someone explains a swap or airdrop tx, sees an
  unfamiliar token in the legs — the moment curiosity peaks — and previously
  had no path into the scanner. The classic scam flow (unfamiliar tokens
  appearing in your tx) now lands one click from a safety report. Safety: the
  URL carries only the hex contract address (the attacker-controlled symbol()
  is rendered as escaped text only, never in the link); zero-address guard
  skips the link for non-token legs; no wallet, no signing, no new data
  sources, no mascot touch. Dumb AI answer + token-scanner knowledge chunk +
  ROADMAP "Token safety scanner" line updated. tsc + eslint + prettier clean,
  build + deploy + live verify (/scan 200 both domains, served scan chunk
  carries the new copy, roadmap line live on /plan).

- **"Share your rank" row on the burn leaderboard's "That's you" banner**
  (2026-09-28, #8 — research found it, not the backlog): a connected wallet
  that ranks on the /burn leaderboard now gets native-share + Post to X +
  Share to Telegram buttons inside the banner, pre-filled with honest copy
  ("I burned X DUMB — rank #N on the Dumb Money burn leaderboard. All burns
  verified on-chain.") and a link to /burn. Closes the share loop the
  "That's you" banner (08:41) and the /brag brag-card link (09:11) opened:
  scan → burn → see your rank lit up → brag it. Only the wallet's OWN
  verified rank/amounts are ever shared (nothing invented, nothing
  auto-posts); reuses the proven NativeShareButton pattern (share_tap
  allowlisted) and intent URLs with the site's own words plus the verified
  numbers. Dumb AI "Sharing DUMB moments" chunk + ROADMAP "Voluntary burns"
  leaderboard line updated.

- **Upgradeability check in the /scan quick scan** (2026-09-28, #13 —
  research found it, not the backlog) — the quick scan had no answer for the
  upgrade-rug shape: a token that launches clean, then the team upgrades the
  implementation behind it into a honeypot. The scan now reads the EIP-1967
  implementation + admin storage slots (read-only, no wallet, no signing): no
  slot → pass ("not an upgradeable proxy, the code can't be swapped out");
  proxy with a renounced/dead admin → pass; proxy with a LIVE upgrade key →
  caution ("can replace the token's code entirely — check who controls it
  before buying", deliberately warn-not-fail since legitimate tokens use
  proxies too); unreadable RPC or custom/stale layouts → unknown ("treat as
  risky", never a pass). Pre-ship validation: DUMB + DAMP verified live on
  the RPC to carry empty slots (pass path real), the address-extraction and
  status-decision matrix unit-tested with fabricated slots (all 11 cases
  green), then the shipped chunk verified byte-present on both domains.
  Roadmap "Token safety scanner" line, Dumb AI "How do I check if a token is
  safe?" answer, and the token-scanner knowledge chunk updated. tsc + eslint
  clean, build + deploy + live verify (/scan 200 both domains, served
  token-scan chunk carries the check + slot constants, roadmap line live on
  /plan). #13 stays open as recurring.

- **Brag-card link on the tx explainer for detected voluntary burns**
  (2026-09-28, backlog #8) — the /scan "Explain a transaction" tab now detects
  a direct DUMB/DAMP transfer() to the dead address and shows "That was a
  voluntary burn — get your shareable brag card" linking to /brag?tx=. Catches
  manual burners (burned outside the /burn BurnBox) at the moment they ask
  "what happened?" and turns the explained burn into share material. The gate
  mirrors /api/brag-image exactly, so a card is never promised the endpoint
  can't render. Live-chain validation caught a real bug pre-ship: the first
  gate required "every leg is a burn leg," but the 4% bucket legs go to the
  token contract — the naive gate would never have fired. Real direct burn
  0xc0a9abf2733fd59f2b847d6cd7b47db6361494edf5ea4555b5381af1bfeac0a6 passes the
  gate and the endpoint returns a real 200 PNG for it.

- **"That's you" highlight on the burn leaderboard** (2026-09-28, #13 —
  research found it, not the backlog) — closes the newcomer feedback loop: a
  connected wallet whose address appears among the board's real on-chain burners
  gets a gold banner ("That's you — rank #N on this board with X DUMB / Y DAMP
  burned in the scanned window") plus a highlighted row with a "That's you"
  chip. Rank is computed across all burners (not just the top 25 shown) and
  respects the All/Voluntary filter; copy is filter-aware. Connected wallets
  with no burns get an honest one-liner, not a prompt to spend. Read-only,
  no signing, no new data sources, numbers straight from the existing
  verified burns.ts scan.
- **Share buttons on the tx-explainer result** (2026-09-28, #8 — research
  found it, not the backlog) — the /scan "Explain a transaction" tab had only
  a copy-link button, while the token scan report card has native share +
  Post-to-X + Share-to-Telegram. The explainer answers the most emotionally
  urgent version of "verify" — someone who just discovered what a scam tx did
  wants to warn their community NOW, not copy a link and compose a warning by
  hand. The result now carries a "Spread the word" row: NativeShareButton
  (phone share sheet), Post to X, Share to Telegram — same proven pattern as
  the scan report card. Safety: pre-filled copy uses only our own words about
  what the tool does (never the tx's attacker-controlled token symbols), and
  the link is /scan?tx= which re-runs the explanation live on-chain for the
  viewer (never a stale story). Copy-link kept as-is for paste-anywhere. Dumb
  AI "How do I share DUMB?" answer, the token-scanner knowledge chunk, the
  share chunk, and the ROADMAP "Token safety scanner" line updated. Zero
  wallet/data/mascot touch, no new data sources. tsc + eslint + prettier
  clean, build + deploy + live verify (/scan 200 both domains, the served
  scan-7HqdyHFa.js chunk on the custom domain carries the new row).

- **Sell-simulation honeypot probe in the /scan quick scan** (2026-09-28,
  #13 — research found it, not the backlog) — the free quick scan can now
  actually catch the classic honeypot shape. New "Sell simulation" check: a
  read-only eth_call probes a small transfer() out of a real holder's balance
  (the token/WPLS pair when one exists, else the token contract itself) — no
  state changes, no wallet, no signing. A revert is the honeypot shape (buys
  go through, sells don't) → red flag; success → pass with the honest caveat
  that DEX-specific sell blocks are what the burn-gated deep scan tests; RPC
  silence or no holder balance → "unknown, treat as untested" (never a pass).
  Rationale: the scanner is the outsider magnet and "verify any token" is a
  NORTH STAR verb, but the old copy admitted sells could be blocked "in ways
  this quick scan can't see" — that gap is now closed at the transfer level
  for free, while the burn economy stays on the deep scan. Pre-ship
  validation against live chain data (DUMB simulated clean; an impossible
  transfer classified "reverted") before the code was written. Safety: error
  classification distinguishes contract reverts from RPC noise (a down RPC
  reports unknown, never a false honeypot flag); copy states what the probe
  can't catch. Roadmap "Token safety scanner" line, Dumb AI "How do I check
  if a token is safe?" answer, and the token-scanner knowledge chunk updated.
  tsc + eslint clean, build + deploy + live verify (/scan 200 both domains,
  served token-scan chunk carries the new check + honeypot copy, roadmap line
  live on /plan).

- **Burn-leaderboard feedback loop on the deep-scan pass panel** (2026-09-28,
  #8 — research found it, not the backlog) — when a 30-day deep-scan pass is
  active, the /scan panel now carries "Watch your burn land on the burn
  leaderboard" linking to /burn. A newcomer who just burned 100,000 DUMB
  (often their first-ever burn) previously got a dead end — no pointer to see
  their own burn arrive in the ticker/leaderboard with the "voluntary burner"
  flame badge. Closes the scan → burn → see-it-celebrated newcomer loop; every
  pass burn is a voluntary burn the leaderboard already verifies. Pure client
  link, zero wallet/data/mascot touch, no new data sources, no prize promises.
  tsc + eslint clean, build + deploy + live verify (/scan 200 custom domain,
  new copy in the served chunk).

- **Homepage "Scan any token" room card** (2026-09-28, #8 — research found it,
  not the backlog) — the homepage's room-by-room grid had 8 stations (story,
  trade, burn, proof, raid, AI, culture, plan) and never mentioned /scan, the
  flagship real-utility outsider magnet: the one site feature built to bring
  people in from other communities ("verify any token" is one of the NORTH
  STAR's five newcomer verbs, and the scanner was reachable only via the nav
  "Scan" link). A newcomer landing on the homepage never learned the hub had a
  safety scanner at all. Now a 9th card sits next to "Receipts" (the verify
  pair together): "Scan any token — paste any PulseChain token address for a
  plain-English safety report … Quick scan is free; the deep scan costs a
  small DUMB burn." Meta description now lists the scanner alongside proof
  feeds, raid missions, and Dumb AI; roadmap line added. Safety: copy states
  only what's true (no safety-certificate claims); zero wallet/data/mascot
  touch; no new data sources. tsc + eslint clean, build + deploy + live verify
  (homepage 200 both domains, card + meta string in served HTML on both).

- **Identity / lookalike check in the /scan quick scan** (2026-09-28, #13 —
  research found it, not the backlog) — the quick scan now verifies the
  scanned token's identity against the site's curated, on-chain-verified
  contract list (DUMB, DAMP, WPLS, HEX, DAI + DAI2, INC, PLSX, PRVX, pTGC,
  WBTC). A match gets an "Identity — pass: this is the REAL {symbol} on
  PulseChain"; a token wearing one of those symbols at a different address
  gets a red-flag "Lookalike warning." Rationale: the scanner is the outsider
  magnet, and name-collision is the scam pattern the site fights everywhere
  else (guardrail, verified addresses, add-to-wallet) — it now fights it
  inside the scanner too. Safety: the check only fires on curated-symbol
  matches (unknown tokens get no check — a "pass" for everything would teach
  "not flagged = safe"); the copy uses only the site's own literals, never
  the attacker-controlled symbol. All 11 curated symbols pre-validated via
  live symbol() reads (DAI2 returns "DAI" — handled as two curated addresses).
  Dumb AI answer + token-scanner knowledge chunk + roadmap line updated. tsc
  + eslint clean, build + deploy + live verify (/scan 200 both domains,
  "Lookalike warning" in the served token-scan chunk on both, roadmap line
  live on /plan).

- **One-tap "Add this token to wallet" on /scan reports** (2026-09-28, #8 —
  research found it, not the backlog) — the scan report now carries a
  chain-checked EIP-747 button that adds the EXACT contract just scanned to
  the user's wallet, no hand-typing a 42-char address (the guardrail's
  one-click buttons stop at DUMB/DAMP; this closes the scan → verify → hold
  loop for every other PulseChain token). Rationale: a newcomer from another
  community scans a token, decides it's worth holding, then hand-transcribes
  the address — exactly the lookalike/name-collision error the site fights
  elsewhere. Safety: the guardrail's AddToWalletButton was extracted to a
  shared component (behavior identical — chain check first, refuses on
  wrong/unknown network, read-only prompt, no gas, no signing), and the
  scanner only renders the button when the scan itself verified standard
  ERC-20 metadata (symbol + decimals exposed on QuickScanResult; non-standard
  tokens get no button). The button label stays neutral ("Add this token to
  wallet") — it never echoes a possibly-spoofed contract symbol. Dumb AI
  answer + token-scanner knowledge chunk + roadmap line updated. tsc + eslint
  clean, build + deploy + live verify: /scan 200 both domains, "Add this
  token to wallet" confirmed in the served scan chunk on the custom domain,
  "Add DUMB to wallet" still live on the homepage (guardrail refactor
  intact), roadmap line live on /plan, all 12 canonical pages 200.

- **/burn PLS fallback** (2026-09-28, backlog #15 — Antonio-approved, closes
  #15, the last pending approved build item) — the voluntary burn box no
  longer strands wallets holding less DUMB than the entered burn amount: a
  "Burn with PLS" card quotes live (entered × 1.1 pre-tax DUMB, ceil, 60s
  refresh) and fires ONE wallet confirmation through the PulseX router with
  `to` = dead, path [WPLS, DUMB] — the bought DUMB goes straight to dead.
  Arrival taxed 6% (that tax IS the burn), ~95% lands destroyed; pre-ship
  chain validation: entered 1000 → ~413.4 PLS → ~1,100 DUMB pre-tax → ~1,045
  estimated dead arrival ≥ 1000. Verified via receipt Transfer logs to dead
  (must land ≥ entered amount); success celebrates the verified arrival with
  an explorer-linked text share — no brag-card image for swap burns (the card
  is generated from verified direct burns only, and we never promise a card
  we can't generate). Guards: PLS-balance gate, gas note, acknowledgment
  checkbox gates the PLS path too, chain pinned to PulseChain, amount input +
  main burn button locked while a swap is pending, 2-min stuck-receipt hatch
  covers both paths, DUMB-only (DAMP keeps its plain burn flow). quotePlsBurn
  / verifyPlsScanBurn generalized to quotePlsBurnFor / verifyPlsBurn with
  per-use thresholds; no custody, no new contract, no new data sources. This
  removes the last DUMB-balance gate between a user and burning.
- **Deep-scan PLS fallback** (2026-09-28, backlog #14b — Antonio-approved,
  closes #14) — the deep-scan gate no longer strands wallets holding < 100k
  DUMB: a "Pay with PLS" card quotes live (~110k DUMB output target, 60s
  refresh) and fires ONE wallet confirmation calling the PulseX router's
  swapExactETHForTokensSupportingFeeOnTransferTokens with `to` = dead and path
  [WPLS, DUMB] — the bought DUMB goes straight to the dead address. Arrival is
  taxed 6% (dead is not fee-excluded — the tax IS the burn), ~95% lands
  destroyed; pre-ship chain validation: ~41.3k PLS → ~110k DUMB pre-tax →
  ~104.5k estimated dead arrival ≥ 100k. Swap-box guards reused (8% slippage,
  20-min deadline); verified via receipt Transfer logs to dead (≥ 100k →
  30-day pass); "pls" path in the pass ledger; shared ?burn= links re-verify
  either path. Honest edges: insufficient-PLS disables the button, an 8%-
  adverse-move miss still burns for real but earns no pass (said out loud),
  gas warned. No custody, no new contract, no new data sources. This is the
  demand-engine completion: nobody is blocked from the scanner by a DUMB
  balance.
- **Deep-scan one-click burn + 30-day pass** (2026-09-27, backlog #14a + #14c —
  Antonio-approved) — the deep-scan gate went from paste-a-hash to a one-click
  "Burn 100,000 DUMB & unlock 30 days" wallet flow: the connected wallet sends
  exactly 100,000 DUMB to the dead address (plain transfer(), no approval —
  safest burn shape possible), and the tx hash is verified on-chain
  automatically with the full checks (receipt status + transfer() selector +
  recipient = dead + amount ≥ 100k + arrival logs). Every verified burn —
  one-click or manual paste — issues a 30-day pass for unlimited deep scans
  (localStorage ledger {txHash, unlockedAt, expiresAt, path}, shape-validated);
  burns stay one-time (used-hash ledger kept — a burn can never mint two
  passes); shared ?burn= links re-verify on-chain but never mint a pass (the
  viewer didn't burn). Insufficient-balance wallets get an honest note (manual
  paste fallback kept); live USD cost estimate next to the price; permanent-
  burn warning before the click. PLS fallback is the next run's build, not
  this one. No custody, no new contract, no new data sources.
- **Shareable scanner report cards** (2026-09-27, backlog #12 phase 3 of 3 —
  closes #12) — every completed scan now offers "Share this report": native
  share sheet on mobile, Post-to-X and Share-to-Telegram intents, and a
  copy-report-link button. The link is `/scan?token=0x…` (plus `&burn=0x…` when
  a deep scan ran). Anti-spoofing by construction: the link carries only an
  address, and the report RE-RUNS live on-chain at view time — quick scan
  auto-runs on load, and a shared burn tx is re-verified on-chain before the
  deep scan runs — so a shared link can never show a fabricated or stale
  result; the viewer always gets a fresh, re-verified report. Caught mid-run:
  validateSearch defaults of "" caused a 307 normalize redirect on every
  /scan visit (`/scan?token=&burn=`); fixed to undefined defaults, verified
  no-redirect 200s on both domains. ROADMAP "Token safety scanner" line
  flipped to report-cards LIVE; Dumb AI "How do I check if a token is safe?"
  answer now mentions sharing. No custody, no new contract, no new data
  sources, no wallet touch.
- **Deep scan — burn-gated simulated buy+sell** (2026-09-27, backlog #12 phase 2
  of 3) — after any quick scan of a token with a PulseX WPLS pair, users can run
  a deep scan: simulated 1-WPLS buy + immediate sell-back (router getAmountsOut,
  claimed tax applied per-leg like fee-supporting swaps settle) plus a 1-vs-10
  WPLS liquidity-depth probe. Costs a verified 100,000 DUMB burn to the dead
  address: the user burns from their own wallet, pastes the tx hash, the scan
  verifies it on-chain (receipt status, transfer() selector, recipient is dead,
  amount >= cost, Transfer log confirms arrival — the /api/brag-image pattern),
  and each burn unlocks exactly one scan (localStorage one-time-use ledger).
  Honest throughout: the simulation applies the tax the contract CLAIMS, the
  page says real trades can cost more, a clean deep scan is "a good sign, not a
  safety certificate." Math validated against live chain data before shipping
  (DUMB: ~12.2% round-trip loss = warn, 0% depth impact = pass — exactly the 6%
  tax each leg + slippage). No custody, no new contract, no new data sources,
  no wallet connection on the site. This is the demand engine of the scanner:
  every deep scan burns DUMB. ROADMAP "Token safety scanner" flipped to deep
  scan LIVE; Dumb AI + /scan card updated. Phase 3 (shareable report cards)
  remains.
- **Token safety scanner — /scan free quick scan** (2026-09-27, backlog #12,
  the APPROVED first REAL-UTILITY build, phase 1 of 3) — a new /scan route
  (desktop nav + mobile More, sitemap, per-page share metadata) with a free
  read-only quick scan of ANY PulseChain token: paste an address, get a
  plain-English report — contract code exists, ERC-20 metadata, transfer tax
  (fees()/taxFee() getters with honest "some taxes are invisible to getters"
  caveat), owner() (renounced vs live owner), paused(), and the token/WPLS
  pair with % of LP burned at the dead address. No wallet, no signing —
  everything is eth_call against the public RPC with bounded retries (the
  documented batch-drop quirk). Results are pass/caution/red-flag/unknown;
  unknown is always framed as risky, never fine, and the page says plainly
  the scan can't prove a token safe. Validated end-to-end against live chain
  data before shipping (DUMB: 6% tax getter, zero-address owner, 100% LP
  burned). Hits the NORTH STAR directly: outsiders come to check tokens,
  eyes on DUMB, zero custody, zero new contracts, zero new data sources.
  Dumb AI learned about it (new "How do I check if a token is safe?"
  suggested answer + token-scanner knowledge chunk); ROADMAP gained a
  "Token safety scanner" group (quick scan shipped, deep scan + report cards
  pending). Deep scan (burn-gated simulated buy/sell) is the next phase —
  deliberately not built in this run (one unit of work).

- **Resilient burn scan — per-call retries with backoff + chunked getLogs**
  (2026-09-27, backlog #8) — the burns.ts scan that feeds the /burn ticker and
  leaderboard was the only loop surface with zero RPC-flake tolerance: two
  unchunked 20k-block getLogs calls and up to 30 parallel receipt/block reads —
  exactly the batch pattern rpc.pulsechain.com is documented to drop. One
  dropped call blanked both components with an error state on an otherwise
  healthy chain. Now: 5k-block getLogs chunks per token (4 chunks), receipts in
  batches of 4, and every RPC call individually retries with 400/800ms backoff
  (3 attempts, then the error state still shows honestly). No user-visible
  change, no wallet/data/mascot touch; roadmap "Voluntary burns" gained the
  line. Hits safer + better (the burn rally surfaces survive a flaky RPC).

- **DAMP framing speaks the net everywhere** (2026-09-27, backlog #8) — three
  pages described DAMP's 3% tax legs-first with no net, violating the
  2026-09-27 rule ("never describe it as '1% burn + buckets' without the net;
  the net is the message") while DUMB always ended with it: the whitepaper FAQ
  "What about DAMP?", the /trade DAMP/WPLS sibling card, and the /story
  flywheel bullet. All three now lead with "2% instant burn, 1% reflected to
  holders", keeping the leg detail (1% to the dead address, 1% into the
  entombed contract bucket) as the explanation. chains.tsx ("net 5% instant
  burn"), Proof.tsx ("Net: 5% ... 1% reflected"), and the /ai knowledge +
  roadmap already led with the net — left untouched, not churned.

- **Homepage schema.org description aligned to the locked net** (2026-09-27,
  backlog #8) — the homepage JSON-LD `WebSite.description` (the schema
  search engines show) still said "a live 1% burn and 1% reflection" —
  the last leg-first remnant after the 17:41 whitepaper and 18:11 /story
  fixes. Now reads "5% instant burn and 1% reflections" — the same net as
  the hero, the whitepaper, and /story. Checked the whole src/ tree for
  other leg-first phrasing: BurnTicker/BurnLeaderboard empty states say
  "every taxed transfer still burns 1%" — kept as-is, since they name the
  exact 1% protocol leg the ticker scans (factual in context, no buckets
  mentioned). Proof.tsx's "(1% burn, 1% reflection) runs on its own" kept —
  the note directly above it already states the 5%/1% net. No churn beyond
  the real violation. Hits better (the canonical schema matches Antonio's
  locked language everywhere). Zero wallet/data/mascot touch.

- **/story "record, corrected" now says the net out loud** (2026-09-27,
  backlog #8) — the section listed the tax legs (1% burn to dead, 1%
  reflection, 4% into the contract's buckets) without ever stating the net,
  violating the locked rule ("never describe it as '1% burn + buckets'
  without the net; the net is the message"). Added the closing line: "Say it
  plainly: every taxed transfer burns 5% and reflects 1% — 1% to the dead
  address plus 4% into the entombed buckets, burned in every way that
  matters." The /ai FAQ already led with the net (verified, untouched);
  Proof.tsx's tax note already ends "Net: 5% ... 1% reflected" (kept as-is —
  no churn). Hits better (Antonio's locked language everywhere) + community
  honesty (no page lets a reader walk away with legs-only math). Zero
  wallet/data/mascot touch.

- **Whitepaper + homepage tax framing aligned to the locked canonical net** (2026-09-27, backlog #8) — the whitepaper said every trade "destroys 1% of its amount and reflects 1%" and led with the 2/2/1/1 leg split in its description, lead paragraph, and page intro; the homepage "Where the 6% goes" card ended "every trade burns and reflects a little." Antonio's locked framing is the net: DUMB 6% = 5% instant burn + 1% reflections ("never describe it as '1% burn + buckets' without the net; the net is the message"). The whitepaper now leads with "5% instantly burned (1% to the dead address, 2% + 2% into the entombed buckets), 1% reflected" everywhere, with the leg detail kept as the explanation of how the 5% works; DAMP's line now states 3% = 2% instant burn + 1% reflections. The /ai FAQ, /roots, /proof, and the tax visualizer already led with the net — the whitepaper was the outlier. Hits better (the canonical document finally speaks Antonio's locked language) + community honesty (consistent framing everywhere). Zero wallet/data/mascot touch.

- **Route aliases return permanent 308s** (2026-09-27, backlog #8) —
  /compare → /chains and /join → /raid were 307 Temporary (TanStack
  Router's `redirect()` default) despite being permanent aliases by design.
  Crawlers treated them as temporary — re-requesting forever and splitting
  link equity instead of consolidating it on the canonical pages. Added
  `statusCode: 308` to both route files; method-preserving, browser-cached,
  so repeat visitors skip the round trip. No user-visible change, no wallet
  touch, no new data sources. Hits better (SEO correctness for the alias
  pages). ROADMAP updated.

- **Dumb AI knows the burn-contest state** (2026-09-27, backlog #8) — the /burn
  card ("Burn contests next") and the roadmap advertised contests, but the /ai
  FAQ and the on-site RAG had no contest knowledge — a user asking about them
  got the "no solid receipt" shrug while the site advertised the topic. Added
  a "Burn contests" knowledge chunk and an "Are there burn contests?" suggested
  answer: nothing live yet, design done, recognition-only milestone drive
  recommended, wash-burning is self-defeating, funded prizes off the table,
  implementation waits on Antonio's format pick. Hits better (the assistant
  stays consistent with the site instead of going silent) + safer (it won't
  imply contests are live). Zero wallet/data/mascot touch, no user-visible
  change.

- **sitemap.xml refreshed — /burn and /wallet added** (2026-09-27, backlog
  #8) — a live check of /sitemap.xml found only 12 of the 14 canonical pages
  listed: /burn and /wallet were missing from the crawler map. The static
  `public/sitemap.xml` is the serving mechanism (verified live: Worker static
  assets shadow server-entry interception, so the static file is the single
  source — an initial server.ts approach was reverted, no dead code). All 14
  canonical pages now listed; robots.txt was already correct (untouched).
  Rationale: the loop has been building share surfaces whose links crawlers
  couldn't discover — search discovery for the two busiest pages completes
  the other half of the share funnel. Zero wallet/data/mascot touch, no
  user-visible change.

- **Dumb AI knowledge refreshed, second pass** (2026-09-27, backlog #8) — four
  features shipped after the 09:11 refresh had made the /ai answers and the
  on-site RAG stale again: the onboarding chunk missed /wallet in the
  guardrail mount list; the burn-page chunk knew nothing of the burn-milestones
  strip, the off-site dead-address copy card, or the "Brag about it" buttons;
  and nothing covered the native share-sheet. Extended the burn-page and
  onboarding chunks, added a new `share` chunk, extended the "How do I trade
  DUMB?" and "How do I burn DUMB?" suggested answers, and added a new
  suggested question "How do I share DUMB?". Rationale: an AI that answers
  stale is worse than one that stays quiet — the same judgment as the first
  refresh. Zero wallet/data/mascot touch.

- **"Which Dumb Money?" guardrail on /wallet** (2026-09-27, backlog #8) — the
  verified-address + one-click add-to-wallet card (already on home, /story,
  /trade) now sits above the holdings on /wallet. A name-collision victim
  whose balance shows nothing previously got no explanation and no verified
  addresses; now the real PulseChain DUMB/DAMP addresses, explorer links,
  copy buttons, and chain-checked EIP-747 add-to-wallet buttons are exactly
  where the confusion surfaces. Reuses the existing verified component —
  no new logic, no new data sources, no wallet changes, no mascot pixels.
  Hits safer (right contract at the moment of doubt) + better
  (accessibility for the confused).

- **Burn milestones strip mounted on /burn** (2026-09-27, backlog #8) — the
  16B/17B/18B milestone strip (the community's rally point for the next burn
  milestone) was already live on /trade and /roots but missing from the one
  page entirely about burning. Mounted the existing verified BurnMilestones
  component between the lifetime TotalBurned card and the ticker. Reuses the
  shared react-query cache — no extra RPC; honest about the 14B launch-day
  share and the live 1% protocol burn that keeps the bar moving. Hits better
  (milestone momentum where burns happen) + fun (rally framing), zero
  wallet/data/mascot touch.

- **Per-page social-share metadata fix** (2026-09-27, backlog #8) — a live
  check found every shared page link previewed as the homepage: `og:url`
  pointed at "/" and `twitter:title` was the home title, because route heads
  only set og:title/og:description and the root's tags filled the rest. New
  shared `src/lib/page-meta.ts` helper (`pageMeta(path, title, description)`)
  emits the full set per page (title, description, og:*, twitter:*,
  canonical), and all 14 routes use it. The share buttons and native share
  sheet the loop has been shipping only matter if the shared links look
  right — this fixes the other half of the funnel. Hits better (share
  previews now say what the link actually is) + fun (shareable moments),
  zero wallet/data/mascot touch.

- **"Burn from another wallet" dead-address copy card** (2026-09-27, backlog #8) — a
  new card at the bottom of the BurnBox on /burn: the dead address with a one-tap
  copy button (reuses the shared `CopyButton` component) for holders burning from
  an exchange, hardware wallet, or any other app — previously those users had to
  hand-transcribe the 42-character address from the screen. Copy-first design
  replaces error-prone typing, with a first/last-4-characters verification
  reminder (`0x00…dEaD`) and the direct-burn arrival math (~95% DUMB / ~98% DAMP
  land in the dead balance; ~5%/2% burned, ~1% reflected). Safety judgment: a
  copy button can't be gated by the ack checkbox like the on-site flow, but
  transcription is strictly worse for an irreversible transfer, and the card
  keeps the "permanent, never promise price" framing. Hits better (accessibility
  for off-site holders) + safer (exact copy instead of typing).

- **"Share anywhere" native share-sheet button** (2026-09-27, backlog #8) — a
  shared `NativeShareButton` component (in `src/lib/share.ts` +
  `src/components/dumb/NativeShareButton.tsx`) added to all three share
  surfaces: burn-success, swap-success, and raid-mission share rows. On phones
  it opens the OS share sheet (Messages, WhatsApp, any installed app) with the
  same honest pre-filled copy + explorer link instead of forcing the
  X/Telegram web intents, which are clunky in mobile browsers. Safety details:
  user dismissal of the sheet is respected (no popup ambush — AbortError
  returns silently), any other failure falls back to the X intent URL, and the
  button only renders where the Web Share API exists (checked after mount to
  avoid SSR/hydration mismatch) so desktop is unchanged. Hits better (mobile
  users can actually spread the word to any app) + fun (viral surface the
  community actually uses on phones), zero wallet touch, no new data sources,
  no mascot pixels.

- **Dumb AI knowledge refreshed** (2026-09-27, backlog #8) — the /ai suggested
  answers and the on-site RAG knowledge base had gone stale as features shipped
  (they still described only the PulseX flagship pair for trading, knew nothing
  of /burn, the walkthrough, the add-to-wallet buttons, or the ratings wall).
  Updated "How do I trade DUMB?", added "How do I burn DUMB?", and added three
  KNOWLEDGE chunks (voluntary-burn page, first-swap onboarding, community
  ratings wall). Rationale: an AI that answers stale is worse than one that
  stays quiet — someone asking how to burn would never learn the one-click
  page exists. Honest framing preserved; no wallet logic, no new data sources.

- **"Add DUMB/DAMP to wallet" one-click buttons** (2026-09-27, backlog #8) —
  EIP-747 `wallet_watchAsset` under each verified address in the "Which Dumb
  Money?" guardrail (auto-mounted in the hero, /trade, and /story). The #1
  name-collision fear ("am I buying the right Dumb Money?") ends at the moment
  the address is added — one tap adds the correct PulseChain contract to the
  wallet instead of a hand-copied paste. Chain-checked (eth_chainId vs 369)
  before firing so nobody adds the address on the wrong network; read-only
  wallet prompt, no gas, no signing, reversible, the user can decline. Honest
  fallback states (no wallet detected / wrong network / user rejected). Hits
  better (onboarding friction), safer (the right address, from the verified
  source), and keeps the guardrail's playful tone intact.

- **Live burns ticker** (2026-09-26, backlog #3) — BurnTicker on /burn scans
  the last 20,000 blocks of Transfer(to=dead) logs on DUMB + DAMP, groups legs
  per tx per sender from full receipts, and classifies each burn as a
  voluntary burn vs the 1% protocol tax-burn leg of an ordinary transfer.
  Header totals real burn arrivals per token; rows link receipts on
  scan.pulsechain.com. Honest loading/error/empty states, 60s refetch.
  Shared scan later extracted into `src/lib/burns.ts` (backlog #4).

- **Burn leaderboard** (2026-09-27, backlog #4) — BurnLeaderboard on /burn
  aggregates the verified per-sender leg primitive (shared `src/lib/burns.ts`)
  into ranked wallets: rank, short address + explorer link, DUMB/DAMP totals,
  "voluntary burner" flame badge, burn-tx count, All-burns / Voluntary-only
  toggle. Ranked by estimated USD from on-chain WPLS pair reserves (raw-unit
  fallback). Only real on-chain burners — never invented; empty until real
  burns exist.

- **Community ratings wall** (2026-09-27, backlog #7) — submission + display
  plumbing on /culture. Reviews live in `src/data/ratings.ts`, curated by
  hand after verification; submission routes members to post in the real
  Telegram group (pre-filled template + copy button). Wall ships EMPTY with
  an honest empty state — never seeded, never invented. Useful now as the
  funnel for real reviews; renders the average only once real reviews exist.

- **"Brag about it" share buttons on the swap success state** (2026-09-27,
  backlog #8) — extends the proven burn-share pattern to every SwapBox trade:
  pre-filled honest X/Telegram share intents (`x.com/intent/post`,
  `t.me/share/url`) with the REAL traded amounts + explorer receipt.
  The trade is snapshotted at send time (input/output symbols, decimals, est.
  after-tax output), so editing the input after confirmation can't make the
  text lie; the snapshot is cleared on any approve or selector change so
  approval confirmations never show trade share buttons. Copy is factual only:
  "No promises — do your own homework." Renders only for a confirmed real
  swap; nothing is ever posted automatically.

- **"Brag about it" share buttons** (2026-09-27, backlog #8) — in the
  BurnBox success state on /burn: pre-filled X/Telegram share intents with the
  REAL burned amount + explorer link (same pattern as the raid-mission share
  buttons). Nothing is ever auto-posted — the user clicks through and posts
  themselves. The burned amount/token is snapshotted at send time so the share
  text can't drift from the real burn. Renders only for a confirmed real burn.
  Honest framing: "supply shrank a little, no promises" / "Burns shrink
  supply, never promise price."

- **"Get gas before you trade" onboarding guide on /trade** (2026-09-27, backlog #8) —
  the first-swap walkthrough told newcomers to "keep a little PLS for gas" but never said how
  to GET PLS — a dead end for anyone arriving with no PulseChain exposure. New section below the
  walkthrough: PLS is the native gas token (no PLS = nothing can be sent), then the three common
  routes — official PulseChain bridge (bridge.pulsechain.com, URL verified 2026-09-27, ETH still
  needed on the Ethereum side), buying PLS on a listing exchange + withdrawing to chain 369, or
  swapping a small slice to PLS on PulseX if you already hold PulseChain assets. Safety: lookalike
  bridge sites warning (type the URL yourself), never enter a seed phrase, "verify everything
  yourself — information, not an endorsement." Walkthrough step 2 now links down to the guide
  ("No PLS yet? Here's how to get some."). Pure static content — no wallet touch, no new data
  sources, no mascot pixels. Accessibility improvement that removes the #1 onboarding blocker for
  real new buyers (demand can only grow if newcomers can complete step 2).

- **"No gas in the tank" inline warning in the SwapBox** (2026-09-27, backlog #8) —
  when the connected wallet holds under 0.05 PLS on PulseChain, a gold banner appears above
  the swap button ("every swap needs PLS for gas — this trade will likely fail. Here's how to
  get some" → #get-pls gas guide). Catches the zero-gas dead end at the decision point instead
  of after a cryptic wallet-step failure; warns without blocking; reuses the already-fetched
  native balance — no new data sources, no wallet-logic changes. Completes the "Get gas before
  you trade" guide work: the guide tells newcomers how to get PLS, the warning points them at
  it exactly when it matters.

- **Transaction explainer tab on /scan** (2026-09-28, #13 — research found it,
  not the backlog) — the #1 question in every crypto community is "what happened
  to my money?": paste any PulseChain tx hash and get a plain-English breakdown
  (what moved where, burn legs flagged, swap summarized with the router function
  decoded, contract-recipient and failed-tx warnings). Rationale: the scanner is
  the outsider magnet; the explainer answers the most emotionally urgent version
  of "verify" — any PulseChain user can check their own tx, no DUMB needed, which
  is exactly how outsiders first touch the hub. Free and read-only like the quick
  scan (the burn economy stays on the deep scan). Safety: reports movements, not
  intent; internal transfers declared invisible; contract-recipient warning scoped
  to legs the sender initiated (router→pair plumbing doesn't warn); unknown tokens
  show short addresses, never invented names; shareable via /scan?tx= which
  re-runs live at view time (hash in, fresh report out — never a stale story).
  Validation note: pre-ship testing against live chain data caught a wrong
  Transfer topic hash hand-written from memory — copied the verified constant
  from brag-image.ts instead; also scoped the contract warning after a real swap
  tx showed it firing on normal router→pair plumbing. Dumb AI FAQ + knowledge
  chunk + roadmap "Token safety scanner" line updated. tsc + eslint clean, build
  + deploy + live verify (/scan 200 both domains, ?tx= 200 no-redirect, served
  scan chunk carries the tab + explainer copy + correct topic hash).

- **Dumb AI + roadmap deep-scan staleness fix (the tripled deep scan)**
  (2026-09-28, #8 — research found it, not the backlog): this morning's
  "deep scan tripled" upgrade (2 checks → 3: true round-trip cost, exit
  liquidity, 1/10/100 WPLS depth curve) shipped without updating the words
  that describe it — Dumb AI's "How do I check if a token is safe?" answer
  still said "a simulated 1 WPLS buy plus an immediate sell-back" and the
  ROADMAP "Token safety scanner" line said "simulated 1-WPLS buy + sell-back
  and liquidity-depth probe." A newcomer asking the AI about the deep scan
  got a description of yesterday's tool, and the roadmap sold the old version
  on /plan. Both now describe the three shipped checks in the component's own
  words (round-trip cost = 1-WPLS buy + sell-back, exit liquidity = what a
  10 WPLS bag nets heading for the door, depth curve = 1 vs 10 vs 100 WPLS
  buys — verified against TokenScanner.tsx:677 and token-scan.ts:674 before
  writing). Rationale: an AI that answers stale is worse than one that stays
  quiet — same judgment as the quote-card/proof-strip/wallet-page refreshes.
  Pure static copy — zero wallet/signing/data/mascot touch, no new data
  sources. tsc + eslint clean, build + deploy + live verify: served dump
  chunk on the custom domain carries both new strings, /ai /plan /scan /burn
  200 on both domains.

- **"Scan my bags" on /scan** — SHIPPED (2026-09-29, backlog #13): the
  airdropped-dust trap is the classic newcomer rekt story — free mystery
  tokens you try to sell and can't (honeypot), or approve and lose. One
  click now runs the free quick scan on every token that sent a transfer to
  the connected wallet in the recent window (100k blocks, chunked
  topic-filtered getLogs via a typed parseAbiItem Transfer event — the
  gentle pattern from the burn ticker; the window is labeled honestly from
  block timestamps, capped at 25 discovered / 12 scanned per run). Rows show
  the verdict chip and open the full report through the existing rescan
  event, where the burn-gated deep scan lives as usual — so the funnel into
  real burns stays intact. Read-only throughout (no signing, no approvals,
  nothing moves); discovery never throws (RPC failure = honest empty
  state). Utility bar holds: real repeated pain, brings outsiders in ("check
  your bags" needs no DUMB), every deep scan still burns. New `bag_scan`
  analytics event added to both client + server allowlists. Dumb AI "How do
  I check if a token is safe?" answer + ROADMAP "Token safety scanner" line
  updated. tsc + eslint clean, built, deployed to dump-money-hub-preview —
  /scan 200 on both domains with the card copy in the served SSR HTML, the
  scan chunk carries the button and the token-scan chunk carries the
  discovery (100000n window verified in the served bundle), / /burn /plan
  200. Considered + REJECTED as overreach: auto-running on wallet connect
  (surprise RPC load + surprise UX — explicit click only) and scanning
  outbound transfers too (tokens sent away aren't the wallet's risk).

## Designed (pending Antonio's format pick)

- **Burn contests** (backlog #5, design done 2026-09-27 — see
  `BURN-CONTESTS-DESIGN.md`) — entry = a verified voluntary burn (reuses the
  `src/lib/burns.ts` `BurnEvent` primitive). Key findings: wash-burning is
  self-defeating (tokens are destroyed, tax paid — no profit path), so gaming
  vectors are procedural (sybil counts, retroactive windows, protocol-leg
  double counting, fake burn addresses) — all mitigated by design (single-wallet
  ranking, announced future start blocks, voluntary-only legs, dead address
  only). Formats ranked: (1) community milestone drive — RECOMMENDED pilot,
  shared target + progress bar, no winner, no gaming issue; (2) recognition
  honor roll; (3) biggest single burn quarterly (plutocratic but honest);
  (4) most-burn-txs DEFERRED (needs enforced minimums); burn-to-holdings tiers
  REJECTED for now (snapshot complexity). Prizes: recognition only — no funded
  prizes (spending + legal questions = Antonio's call, not the loop's). Pilot
  recommendation: announced ~2-day window (fits the existing 20k-block scan),
  longer contests later via a loop-accumulated `contest-ledger.json` in the
  repo. Implementation needs Antonio's format pick first.

- **Interactive tax-flow visualizer** (2026-09-27, backlog #8) — on /burn,
  "Follow the money": DUMB/DAMP toggle + amount input renders the verified
  on-chain tax split as a proportional stacked bar with per-leg amounts
  (recipient 94%/97%, 1% protocol burn, entombed buckets, ~1% reflection) and
  honest footnotes (dead collects recipient leg + burn leg on burns; buckets
  entombed; reflection approximate). Educational + safety-improving; answers
  the #1 burn confusion ("sent 100, only 95 arrived").

- **Total-burned-all-time card on /burn** (2026-09-27, backlog #8) — lifetime
  DUMB + DAMP balances of the dead address with per-token amounts + combined
  est. USD (from the existing on-chain WPLS-pair pricing, indicative only),
  explorer link, and the honest footnote that dead is NOT fee-excluded (only
  ~95% of DUMB / ~98% of DAMP sent to dead actually arrives — the balance is
  what really landed, never naive 1:1). **2026-09-27 extension:** each token
  now also shows its share of total supply ("≈ X% of total supply") computed
  from a live `totalSupply()` read — no pinned constants, null when supply is
  unread. This was REJECTED 2026-09-26 for lack of verified tax accounting;
  backlog #1's on-chain verification unblocked it, so the rejection is lifted
  and the feature shipped. Two read-only balanceOf calls plus two read-only
  totalSupply() calls, no wallet needed, no new data sources.

- **Burn-share-of-supply % with supply from a hardcoded constant** — was
  REJECTED 2026-09-26 as part of the total-burned rejection; LIFTED 2026-09-27
  and shipped — the live `totalSupply()` read removes the drift risk, which
  was the entire reason for the rejection.

## Considered (not yet built)

- **Probing excludeFromFee(address) alongside the fee setters** — SHIPPED
  (2026-09-29, #13): the deferred note from this morning is resolved — now
  the 5f "Owner fee-exclusion setter" check in the quick scan: probes
  `excludeFromFee(address)`/`excludeFromFees(address)` via read-only
  eth_call impersonating the live owner (arg = the owner's own address; the
  simulated self-exemption). Clean return = warn (the owner could give
  themselves the tax skip before selling, even if they pay it today); revert
  = pass with the honest custom-shape caveat; RPC noise = unknown. Runs only
  with a live owner. Validated pre-ship against live chain data (INC →
  present, honest pass; DUMB renounced → correctly absent; impersonated
  eth_call plumbing proven to resolve cleanly, so the warn path is
  reachable). ROADMAP line + both Dumb AI scanner answers updated. Rejected
  as churn: probing (address,bool)/(address[]) setter variants — doubles RPC
  volume on the flaky public RPC for a weak signal; the pass caveat already
  names the gap.
- **Source-code verification status in the quick scan** — CONSIDERED, PARKED
  FOR ANTONIO (2026-09-29, #13): "is the contract's source verified on the
  explorer?" is a genuine trust signal the scan lacks, but answering it
  needs the explorer's API — a new external data source, which needs
  Antonio's explicit approval. Not built by the loop on its own.
- **Rewording the whitepaper's "No utility, no promises" risk line now that the
  hub ships application-layer utility** — CONSIDERED + VERIFIED INTENTIONAL
  (2026-09-28, #8): the line is about the TOKEN (a community culture project —
  nobody owes you a product, a listing, a buyback, or a price outcome), which
  remains true under Antonio's 2026-09-27 utility model (utility lives in the
  application layer with the token as burn fuel / access layer; never forced
  into payments/commerce). Softening it would read as a promise the token
  doesn't make. No change.
- **Adding a scanner mention to the whitepaper's token-economics chapters**
  — CONSIDERED + DEFERRED (2026-09-28, #8): the paper describes the live
  token; the scanner is hub product, already covered in the Dumb AI knowledge
  chunks and the /plan roadmap. Duplicating it here would be churn.
- **Roadmap line for the Sept-28 DAI removal + TEDDY/SOLIDX/PCOCK/HELGO
  addition** — FLAGGED, not built (2026-09-28, #8): the change is documented
  only in the Dumb AI answer, not as a ROADMAP line. Main agent owns this
  per the 19:11 flag; the loop stays out.

- **Per-donation brag cards for Feed-the-Burn donors** — CONSIDERED +
  REJECTED (2026-09-28, backlog #8): a donor-specific brag image would need
  on-chain verification of donation receipts (per-token transfers to the
  vault), but the existing brag-image endpoint verifies only burn
  transactions (direct transfers to dead); extending it is a new server
  surface for what is fundamentally a duplicate of the donor board's own
  data. The new "Share your rank" row (shipped above) gives donors the share
  path with the board's live numbers instead. Reconsider only if donors show
  a need the rank-share row doesn't meet.

- **Per-row "add to wallet" buttons in the tx-explainer movements table** —
  CONSIDERED + REJECTED as churn (2026-09-28, backlog #8): every movement row
  already carries a "scan token" link, and the scanner report card it opens
  already renders the chain-checked add-to-wallet button for the exact
  scanned contract. A second one-click add surface two clicks away would
  duplicate an existing pattern, not add genuine value. Reconsider only if
  the scanner's button ever stops covering it.
- **Dumb AI knowledge + suggested-answers staleness audit** — CONSIDERED +
  VERIFIED CLEAN (2026-09-28, backlog #8): audited the knowledge chunks and
  all suggested answers against today's 04:41–14:11 ships (explainer tab, sell
  simulation, explainer share row, "That's you" banner, brag-card link, /brag
  honest degrade, upgradeability check, share-your-rank, scan-token links,
  swap-cost breakdown) — every ship is covered in both the chunks and the
  answers; nothing stale, nothing missing. No change shipped.

- **No-pair deep-scan note for tokens without a PulseX WPLS pair** — CONSIDERED
  + REJECTED as churn (2026-09-28, backlog #8): audited the quick-scan result
  path — the deep-scan panel only mounts when `result.pair` exists, so
  pair-less tokens show no deep scan. But the quick scan's own Liquidity check
  row already says "No token/WPLS pair on PulseX — it can't be traded through
  the flagship router" (unknown, never a pass). The information is already in
  front of the user; a second note explaining the absent panel would be
  duplicated churn, not genuine value. Reconsider only if the liquidity row
  ever stops covering it.
- **Pass-expiry re-burn reminder** — CONSIDERED + DEFERRED (2026-09-28, backlog
  #8): nudging pass holders to re-burn when their 30-day pass lapses. Deferred
  — the pass only shipped 2026-09-27, so no pass can expire before ~2026-10-27
  and there is no observed user need yet. Reconsider when the first passes
  near expiry.
- **Share buttons on individual burn-leaderboard rows** — CONSIDERED +
  REJECTED as churn (2026-09-28, backlog #8): per-row share surfaces would
  duplicate the existing per-burn brag cards (/brag?tx= images) and the
  row-level explorer links. Not genuine value.

- **Scanner identity/lookalike check security pass** — CONSIDERED + VERIFIED CLEAN
  (2026-09-28, backlog #9): adversarial review of the new /scan identity check
  found no issue — attacker-controlled symbol() is used only for matching, never
  rendered into copy; all check text is React-escaped; AddToWalletButton stays
  chain-gated and read-only. Live chunk verified on both domains (identity check
  ships in the separate lazy token-scan chunk, byte-identical). No change shipped
  — nothing to fix.
- **Evening neon-reversal verification** — CONSIDERED + VERIFIED CLEAN
  (2026-09-27, backlog #8): independently confirmed the neon-pop restore is
  complete and live — the custom domain's served CSS carries
  --primary:oklch(86% .24 135) (= #85F128); zero deep-green remnants
  (#3FAD1E / [63,173,30]) in src/ or public/; brag-card.server.ts LIME back
  to [57,255,20]; public/og-card.png byte-identical to the live file
  (md5 9ebb4a3b5e0aa3d8a9c8de1ae3b51ea0). The rebuilt new-mascot + neon share
  image is what visitors actually get. No change shipped — nothing to fix.
- **Roadmap "gained the line" audit** — CONSIDERED + VERIFIED CLEAN
  (2026-09-27, backlog #10): every recent roadmap addition verified present
  and accurate in src/data/dump.ts (guardrail / walkthrough+gas /
  native-share lines from the 18:41 restore, the 19:11 + 20:11 framing
  lines); done flags honest. No change shipped — nothing to fix.
- **Raid-leaderboard honesty spot check** — CONSIDERED + VERIFIED CLEAN
  (2026-09-27): the XP board is local-only browser storage ("fun scoreboard,
  not a reward promise") — no invented community members. No change shipped.
- **Site-wide framing-consistency audit (leg-first tax copy without the net)**
  — CONSIDERED + VERIFIED CLEAN (2026-09-27, backlog #8): after the DAMP-framing
  fix shipped, every remaining "1% burn"-style mention was grepped —
  Proof.tsx, BurnBox (burnedPct 5/2 = the nets), TaxFlowVisual ("Net effect:"),
  the whitepaper, the knowledge chunks, and the /ai FAQ all lead with the net.
  The one legs-only spot — the homepage "Nobody in charge" card ("the 6% tax
  and its split (2% / 2% / 1% burned / 1% reflected)") — deliberately left
  alone: the card directly above it states the net in full, and that card's
  message is immutability (ownership renounced), not tax mechanics. No change
  shipped — nothing to fix.
- **Full on-chain address-constant safety audit** — CONSIDERED + VERIFIED CLEAN
  (2026-09-27, backlog #9): a wrong contract address in copy is the most
  expensive single-character bug possible, so every 0x literal in src/ +
  public/ (43 unique) was traced. All land in the curated src/lib/pulsechain.ts
  config, zero-address sentinels, /story's historical timeline tx links, the
  DUMB/DAMP pool address, or the ERC-20 Transfer event topic (0xddf252ad…, not
  an address) in the brag-image endpoint. The PLSX lookalike
  0x95B303987A60C71504D99Aa4b13fcA6295C4e928 (no contract on-chain) appears
  only in a warning context. No rogue, unverifiable, or stray address found.
  No change needed.

## Rejected

- **"What's being vetted on PulseChain right now" — per-token trending board
  from scan analytics** — REJECTED (2026-09-29, #13): the honest signal
  doesn't exist yet. The beacon payload is `{path, ts, event}` only
  (src/lib/analytics.ts) and `/api/scan-stats` aggregates counts, so a board
  would need a beacon payload extension plus new KV counters — a real build,
  not a freebie. The naive version (quick-scan counts) is gameable: quick
  scans are free and wallet-less, so anyone could spam-scan their own token
  into "trending" — a promotion vector, not a trust signal, which violates
  community honesty. The Sybil-resistant variant (deep-scan token addresses
  only — each costs a 100k DUMB burn/pass) is honest signal but deep-scan
  volume is near zero today, so the board would render empty and hurt the
  go-to-hub perception more than it helps. The activity strip (shipped
  03:50 #13) already communicates scan momentum honestly. Revisit only behind
  a real volume gate (e.g. deep scans sustaining ~5/day for a week).
- **Read-only token-approval / allowance checker ("approval hygiene")** —
  REJECTED (2026-09-29, #13): real pain (unlimited approvals to random
  routers are a top wallet-drain vector) and the read-only / no-custody /
  no-new-data-source profile fits — but it's a duplicate of incumbent
  chain-wide revoke tooling, not a hub gap. The hub's actual contribution is
  already shipped: exact-amount approvals by default in the swap box plus
  the walkthrough teaching it, so hub-native users barely accumulate the
  risky approvals a checker would find. And arbitrary-token input would
  reopen the paste-any-address vector the site deliberately rejected;
  curated-only keeps it safe but guts the utility (the risky approvals live
  on tokens outside the curated list). If approval-hygiene demand ever shows
  up in feedback, the honest move is a link-out to established tooling, not
  a second build.

- **"Last 7 days" / recent-burners tab on the burn leaderboard** — REJECTED
  (2026-09-29, #8): premature — the epoch is 8 days old, so a 7-day window
  renders a near-duplicate of the all-time board (a second tab for the same
  rows is UI churn), and it re-opens Antonio's locked leaderboard design
  (2026-09-28: epoch block, raw-token ranking, ties-first). The rally logic
  is real (new burners deserve visible recognition before they can crack the
  all-time board) — revisit when the epoch has aged enough that a window
  differs meaningfully. Cheap to build later: the epoch scan already carries
  per-event block timestamps.
- **Embeddable read-only scanner widget for other PulseChain communities**
  — REJECTED for now (2026-09-29, #8): unvalidated distribution channel.
  Would need a dedicated minimal route plus a framing/sizing contract, and
  iframing a page with wallet chrome carries clickjacking-adjacent UX risk.
  Antonio's rule is validate-before-build: the portable unit already exists
  (shareable ?token= links that re-run live on-chain), so measure share_tap
  volume and ?token= landings in the existing analytics first; build the
  embed only if real communities start passing the links around.
- **"Rescan all" bulk button on the Scan-my-bags watchlist** — REJECTED
  (2026-09-29, #8): per-token re-scan is already one tap and re-runs live
  on-chain; a bulk button multiplies RPC load (22+ checks × N tokens) for a
  convenience nobody asked for. The watchlist's job is memory, not batch
  jobs.
- **Top-holder concentration via Transfer-log scans** — REJECTED (2026-09-29,
  #13): "top 10 holders own X%" is real signal, but computing it needs
  heavy log scans on the already-flaky public RPC, and the worst shapes are
  already covered (owner-concentration check + LP-burn %). Cost exceeds
  signal.
- **Buy-path simulation in the quick scan** — REJECTED (2026-09-29, #13): a
  transfer-level "buy" is the same transfer() primitive the sell sim already
  probes — it would add a check without adding information. The real buy path
  (against live liquidity) is covered by the burn-gated deep scan.
- **"Owner fee-change power" quick-scan probe** — REJECTED as a duplicate
  (2026-09-29, #13): started building it (impersonated-owner eth_call
  against setTaxFeePercent/setLiquidityFeePercent/setFees) and killed it
  mid-run — it's a strict duplicate of the shipped 5c `fee-setter` probe
  (token-scan.ts:483), which already covers all three shapes among its
  seven, with the same read-only impersonate-the-owner design, same
  renounced-skip, and same permissive-fallback control. Shipping it would
  have doubled RPC per live-owner scan for zero new signal and put two
  redundant checks on every report. Reverted with zero diff; nothing
  deployed. Standing lesson: the probe family is now deep enough that any
  new probe must be diffed against the existing check ids (fee-setter,
  fee-setter-anyone, owner-fee-exemption, owner-exclusion-setter,
  owner-mint, owner-blacklist) before writing code.
- **Max-tx / max-wallet limit detection** — REJECTED (2026-09-29, #13):
  getter names are non-standard across forks, and any probed threshold would
  be arbitrary. Weak, noisy signal — not worth a check slot.
- **Per-token OG preview images for shared ?token= report links** — REJECTED
  (2026-09-29): tempting for click-through, but a truthful per-report image
  would need a server-side on-chain scan at SSR/crawler time (RPC cost on every
  crawler hit) or would serve a generic image that misrepresents the report.
  The page-level OG title/description/image that already ships (page-meta.ts +
  root og:image) is the honest ceiling without inventing per-token results.
- **"Newcomer welcome" modal on first visit** — REJECTED (2026-09-29):
  modal churn — it blocks exactly the content the visitor came for, and the
  homepage proof strip + per-page Disclaimers already greet newcomers with
  verifiable facts. The skip-link ship in the same run is the friendlier
  welcome: less in the way, more in reach.
- **Full-site i18n (multi-language)** — REJECTED (2026-09-29): a big ongoing
  maintenance surface the loop can't keep current across 18+ routes; no
  evidence of multilingual demand in the Telegram community's organic layer.
  Reconsider only if real non-English traffic shows up in analytics.
- **Auto-posting pledges to X/Telegram (or pre-filling a drafted post that
  fires on signature)** — REJECTED (2026-09-28): nothing on the site posts
  automatically — the share surface is one-tap-by-you by design, and an
  auto-fire path would cross the hard boundary on outbound comms plus risk
  posting a promise as the user that they hadn't decided to broadcast.
- **"Tax simulator" that estimates USD outcomes of trades** — REJECTED
  (2026-09-27): a USD-outcome projection on a taxed transfer reads as an
  implied promise of returns; the visualizer shipped instead shows only the
  verified token-leg math with no price projection, so it can't imply gains.
- **Showing a "total burned" counter as a share-of-supply % with supply from
  a hardcoded constant** — REJECTED (2026-09-27): the dead-balance card ships
  raw token amounts + USD only; a % needs totalSupply, and pinning a
  hardcoded supply figure risks drifting from chain state. If a % is wanted
  later, read totalSupply() live in the same component. (The total-burned
  card itself is now SHIPPED above — the earlier 2026-09-26 rejection was
  specifically about naive 1:1 math before the tax accounting was verified.)
- **Auto-suggesting burn amounts ("top up to the next milestone")** —
  REJECTED (2026-09-27): nudging users toward larger irreversible transfers is
  dark-pattern-adjacent; Antonio's veto applies. The visualizer educates, it
  never prescribes an amount.
- **Burn-streak auto-recognition on the leaderboard** — REJECTED (2026-09-27):
  dormant feature — zero real burns exist yet, so it would ship dead code with
  no one to recognize. Reconsider only after voluntary burns accumulate.
- **Copy-paste pitch cards on /culture** — REJECTED (2026-09-27): the
  RaidArcade mission generator already produces per-mission share copy;
  another card set would be duplicated churn, not genuine value.
- **Staging Smiley renders on a preview-only page for review** — REJECTED
  (2026-09-27): the preview Worker is still a public URL; the mascot rule
  forbids ANY live publishing before Antonio's visual approval, no carve-outs.
- **In-site fiat onramp / "buy PLS with card" widget for the gas guide** —
  REJECTED (2026-09-27): a card onramp is a new external dependency with KYC
  and custodial-touch questions, outside the loop's charter; the guide stays
  informational with the three non-custodial routes plus a "verify everything
  yourself" line. Reconsider only on Antonio's explicit call.
- **Recommending specific exchanges by name in the gas guide** — REJECTED
  (2026-09-27): exchange listings and reputations change fast; naming one
  reads as an endorsement the loop can't keep current. The guide names only
  the verified official bridge URL and keeps exchanges as a generic category
  with a check-the-network-before-withdrawing warning.

- **Showing a "total burned" counter that includes direct-to-dead transfers**
  with naive 1:1 math — REJECTED (2026-09-26): dead is NOT fee-excluded, so
  dead-balance growth is only 95%/98% of amounts sent; naive math would
  overstate burns. The exact accounting is now verified and displayed in the
  burn box — but a site-wide counter waits on the same verified logic.
- **Seeding the burn leaderboard with example/invented burners** —
  REJECTED permanently: community honesty rule. Empty until real burns exist.
- **Any burn feature requiring a new smart contract** — REJECTED: no new
  contract deployments without Antonio's explicit design and approval; a
  plain transfer to the dead address achieves the burn without one.

## 2026-09-27 — Antonio's real-utility directive
- Antonio: build REAL (non-memefied) utility into the site/DApp on a standing basis — every loop run should hunt for utility that brings people to use the DApp (eyes on DUMB), burns more supply, or gives DUMB/DAMP use cases.
- Structural note (agreed): the 6% tax makes DUMB a poor payments token — utility lives in the application layer with the token as burn fuel / access layer. Never force payments/tipping/commerce.
- APPROVED first build: PulseChain token safety scanner — paste an address, get a plain-English safety report (real vs claimed tax, owner powers, liquidity locks, simulated sell); deep scan costs a small DUMB burn to dead, verified on-chain. No custody, no new contract. Added to backlog #12; loop directive updated (REAL UTILITY section, 2026-09-27).
- Vetoed categories (standing): custodial features (tip bots), lotteries/funded prize pools, staking contracts (redundant with reflections), anything promising returns.

## 2026-09-27 — Deep scan burn model (Antonio approved)
- Question: per-scan burn vs one-time vs periodic; paste-hash vs wallet verification.
- Decision: 30-DAY PASS. One 100k DUMB burn (~$0.36 live) unlocks unlimited deep scans for 30 days, then burn again. Rationale: a per-scan toll adds friction to every use → fewer scans → less total burn; one-time-forever never recurs. A pass maximizes actual usage and recurring burn demand.
- UX: one-click burn via the existing wagmi wallet connection — button in the deep scan panel, wallet pops the transfer, hash auto-verified on-chain. Paste-hash kept as fallback. Backlog #14; next loop run builds it.


## 2026-09-29 02:50 — bag-scan share honesty fixes (#9 security pass, shipped)
- **Share row shown mid-scan with partial counts** — SHIPPED fix: the 02:40 #8 run's share row could render while scans were still running; "I scanned my PulseChain bags — 3 tokens checked" understates the full run. The row now waits for `!busy` (results list still renders live).
- **"0 tokens checked, no red flags found" when every scan failed** — SHIPPED fix: asserted a clean bill of health on zero data. Falls back to an honest "scans didn't land — trying again" line.
- Both fixes hit the honesty bar the loop has been holding all night (cf. the 02:00 dust "<0.0001" fix): a share card is a verified-truth surface — counts it names must be the finished run's.

## 2026-09-29 03:30 — "Permissionless fee change" probe (#8 bullish-demand research, shipped)
- **Permissionless fee-setter probe — SHIPPED**: the 03:00 fee-change probe impersonated the live owner, so renounced/absent-owner tokens skipped the check entirely — the exact case where "ownership renounced = tax locked" is the selling point. The same 7 fee-setter shapes are now probed impersonating an arbitrary address (0x…0001), running only when there's no live owner: clean return = hard FAIL ("anyone could rewrite the transfer tax… ownership being renounced doesn't stop this"); all-revert = honest pass; all-RPC-noise = unknown ("treat as risky"). Validated pre-ship against live chain data: quickScan(DUMB) → PASS on the new check, legacy probe correctly absent; plumbing proven (owner() as 0x…0001 → "found", garbage selector → "absent", onlyOwner setFees → "absent"). No UI change (checks render generically); Dumb AI answers + ROADMAP scanner line updated. Zero wallet/signing/data/mascot touch, no new data sources.
- **Considered and REJECTED**: (1) also probing for live owners — pathological case, doubles RPC; (2) impersonating the zero address — some contracts explicitly reject address(0), causing false negatives; 0x…0001 avoids it.

## 2026-09-29 03:10 — "Check any wallet" on /scan (#8 bullish-demand research, shipped)
- **Pasted-address bag scanning — SHIPPED**: the "Scan my bags" dust-trap check previously required a connected wallet — real friction on a site whose own scam-safety lessons say "be careful what you connect to," and a dead end for the curious-but-cautious newcomer (cold wallets, friends' wallets, watch-only). The discovery was already read-only public-RPC logs, so the wallet connection added nothing but a gate. Now: "Check any wallet" input runs the exact same discovery + risk-first quick scans on any 0x address, `isAddress`-gated (same house pattern as the token scanner), with the connected-wallet one-click path kept as-is. Share copy stays honest: pasted-address runs share as "I checked a PulseChain wallet…" instead of "my bags," still counts-only, still finished-runs-only.
- Utility bar: real repeated pain (dust-trap honeypots), brings outsiders in (zero connection friction on the flagship utility, watch-only works), burn-gated deep-scan funnel intact (rows open the full report where deep scan lives). Safer: no wallet connection needed at all — fewer prompts, fewer approvals, fewer ways to get rekt.
- **Considered and REJECTED**: (1) auto-running the bag scan on /scan load for connected wallets — rejected: up to 12 quick scans unprompted would hammer the flaky public RPC and violate the explicit-click contract; the button stays. (2) Deep-linkable ?wallet= URLs for shareable bag scans — rejected: the share surface deliberately carries no address; putting someone else's wallet in a URL would spread it — privacy. (3) Raising the 12-token cap — rejected: the cap bounds RPC volume per user action; deeper runs get slow/unreliable under RPC flakes. (4) Separate analytics event for the pasted path — rejected: the event allowlist already silently drops bag_scan; a second event adds noise without a use.

## 2026-09-29 03:50 — Honest scan-activity strip on /scan (#13 real-utility research, shipped)
- **SHIPPED: public deep-scan activity proof (`GET /api/scan-stats` + `ScanActivity` strip on the /scan deep-scan card)** — the flagship utility had no social proof at the exact decision point (the burn-gated deep scan card). The site already collects anonymous first-party counters (`ev:deep_scan`, `ev:pass_burn_dumb`, `ev:pass_burn_pls` via /api/ping) — the endpoint returns only coarse 30-day aggregates (deep scans completed, scan passes bought, DUMB-destroyed floor), no passphrase, no paths/countries/feedback exposed. The strip renders only when deep_scans > 0 (never a fabricated zero), with the "privacy tools undercount" caveat. The destroyed floor is a true minimum: every pass burn is verified on-chain at >=100,000 DUMB to dead before the pass exists. Live data right now: 3 deep scans, 1 pass burn, >=100,000 DUMB in 30 days. Utility bar: makes the burn-gated funnel convert better (social proof at the price point) = more deep scans = more DUMB destroyed; brings outsiders in (the scanner is the top-of-funnel); zero new data sources, zero wallet touch, zero invented numbers.
- **Considered and REJECTED**: (1) a "safe token directory" of tokens that passed deep scans — rejected: a scan is a point-in-time check (upgradeable proxies, fee setters), and listing reads as an endorsement the loop can't keep current; (2) per-token "scanned N times" badges on share cards — rejected: needs new per-token keyed counters, inflates easily, reads as endorsement; (3) a scan-pass buyer leaderboard — rejected: pass_burn events are counts only by design; linking wallets to scans would need new identifiers = privacy regression; (4) tax-change push alerts for watchlisted tokens — rejected: new backend push infra the loop shouldn't own, plus a monitoring-service commitment.

## 2026-09-29 04:50 — Scanner accessibility pass (#8 bullish-demand research, shipped)
- **SHIPPED: scanner accessibility pass on /scan** — the two text inputs had placeholder-only labeling (invisible to screen readers) and scan errors were silent to assistive tech. Now `aria-label` on the token-address + burn-tx-hash inputs and `role="alert"` on both error blocks, so every scan error is announced. Accessibility is in #8's scope: the free quick scan is the hub's newcomer magnet, and "the safest, simplest hub on PulseChain" includes assistive-tech users. Minimal, zero wallet/signing/data/mascot touch, no new data sources. tsc + eslint clean, built, deployed, live-verified (/ /scan /burn /ai 200; served SSR + scan chunk carry the labels + alerts).
- **Considered and REJECTED as churn**: a Dumb AI answer for the ScanActivity strip (display-only 30-day aggregates; the scanner answer already describes the burn gate — logged as a candidate in the 04:30 #10 run, decided no: it would be a duplicate surface, not genuine value).

## 2026-09-29 04:40 — "Owner fee exemption" probe (#13 real-utility research, shipped)
- **SHIPPED: "Owner fee exemption" check in the /scan quick scan** — the adjacent slow-rug vector to the fee setters (deferred this morning to keep the fee-setter ship tight): a live owner whose own wallet is excluded from the transfer tax dumps tax-free while holders pay it. With a live owner only, the quick scan reads the common fee-exemption getters against the owner's address: exempt = warn ("their sells skip the tax you'd pay"), not-exempt = pass, no getter = pass-with-caveat, RPC noise = unknown. Read-only, no wallet/signing/data/mascot touch, no new data sources. ROADMAP "Token safety scanner" line + both Dumb AI scanner answers (dump.ts + knowledge.ts) updated in the component's own words. Utility bar holds: real repeated pain (dev dumps cheaper than holder sells are a classic slow-rug shape), brings outsiders in (free quick scan, no wallet), burn-gated deep-scan funnel intact. Validated pre-ship against live chain data (INC/WBTC → pass, DUMB/HEX → correctly skipped).
- **Considered and REJECTED**: (1) also probing the exclusion SETTER (`excludeFromFee(address)` — whether the owner can exempt themselves later) — deferred, not rejected: natural follow-up for a future #13 run; this run stays one check. (2) Treating an answered-false as "unknown" instead of pass — rejected: the getter answered cleanly and the value is unambiguous; unknown is for what the scan can't verify, per the honesty contract. (3) Probing from a random address instead of plain eth_call — rejected: `isExcludedFromFee` is a view callable by anyone; impersonation adds nothing.

## 2026-09-29 07:20 — scanner live-smoke + pledge/staleness/DAI audits (#13 real-utility research, no ship)

- **LIVE QUICK-SCAN SMOKE — VERIFIED CLEAN**: shipped token-scan.ts run end-to-end in node (type stripping) against the current public RPC. DUMB: 10 checks, all pass except `pause`→unknown (fail-safe, honest — the standing unknown-degrades-right contract). DAMP: same shape. INC (canonical address, live owner): all 13 checks behave per design — 5e owner-fee-exemption probe pass, 5f owner-exclusion-setter probe pass, fee-setter pass, owner warn (live owner = warn by design), liquidity warn (0% burned, honest caveat), tax unknown (no standard getter). HELGO: owner/tax/pause unknown on RPC noise, liquidity warn — every degrade lands on the safe side. A mistyped no-contract address correctly fails `code` and aborts the scan rather than fabricating results. No defect earned a code change — the flagship utility is healthy on today's RPC.
- **Burn-pledge fulfillment loop — VERIFIED CLEAN**: PledgeCard flips a pledge to redeemed only when that wallet's verified on-chain voluntary burns cover the pledged amount (arrival-leg accounting); pledges are labeled promises everywhere, never counted as burns. No honesty gap.
- **Scan-report staleness — NOT A GAP**: shared ?token= links re-run + re-verify the scan at view time by design; in-session scans are live. No "scanned at" timestamp needed.
- **DAI-removal completeness (post-2026-09-28 change) — VERIFIED CLEAN**: zero DAI/DAI2 references remain in src — swap box, wallet verified list, pricing, scanner identity, and site copy all clean.
- **Deep-scan pair resolution for the four new curated tokens (TEDDY/SOLIDX/PCOCK/HELGO) — VERIFIED CLEAN**: deep scan resolves the WPLS pair dynamically via factory.getPair (token-scan.ts:890,1114), not a hardcoded list — the new tokens deep-scan automatically.
- **Considered and REJECTED**: (1) 30-day deep-scan pass gifting (burn 100k DUMB to unlock deep scans for another wallet) — speculative churn with zero demand evidence; validate-before-build applies; the pass is a personal access layer, not a gift product until someone asks. (2) A "contract source verified" badge on scan reports via an explorer API — new external data source = hard boundary, full stop.

## 2026-09-29 07:00 — demand-funnel health + Dumb AI live-model finding (#8 bullish-demand research, no ship)

- **Demand funnel health check (all green):** /scan 200 on the custom domain with complete OG (title/description/1200x630 image/twitter card — verified in served SSR HTML); /api/scan-stats live returning {window_days:30, deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — the honest activity strip at the burn gate is fed by real data; /burn 200 with the "Burn contests next" card reading exactly per Antonio's "leave it" instruction. No funnel regression since the 06:50 #10 ship.
- **"Designed" burn-visualizer items verified shipped + live:** the interactive tax-flow visualizer ("Follow the money" stacked-bar, TaxFlowVisual.tsx) and the total-burned-all-time card (TotalBurned.tsx, dead-balance + live totalSupply() %, never naive 1:1) both render in the served /burn SSR HTML. Nothing left pending in the Designed section except burn contests, which Antonio holds as idea-only (#5).
- **FINDING — Dumb AI live model path is OFF on the live worker:** the worker `dump-money-hub-preview` carries exactly one secret (`ANALYTICS_PASS` — confirmed via wrangler secret list, names only, no values touched); no `OPENAI_API_KEY` is configured, so the grounded gpt-4o-mini live path in src/lib/ai/rag.ts never engages. The served /ai SSR HTML honestly renders the "Local RAG mode" badge and per-turn "local" labels; curated local answers are current (verified 06:50 #10). Code is healthy — the live path is well-built (same curated chunks as context, price questions routed to local so it never invents prices, honest "served local receipts" fallback). Enabling it needs Antonio: he owns credentials (loop never handles raw keys) and the OpenAI API spend. On-him decision; not a bug, not a loop fix.
- **Considered and REJECTED:** a share row on Dumb AI answers (NativeShareButton on each answer) — rejected as speculative churn: validate-before-build applies (no existing /ai share traffic to measure); share copy would carry freeform generative snapshots, a different honesty risk than the quick-scan ShareReport's counts-only finished-runs pattern; and the 06:20 #8 per-verdict-OG rejection already settled that answer snapshots shouldn't be crawler-cached. Revisit only if Antonio wants AI answers as a distribution channel.

## 2026-09-29 08:43 — "Try DUMB" one-tap demo on the quick scan (#8 bullish-demand research, shipped)

- **SHIPPED: one-tap demo chip on the /scan quick scan** — the flagship free utility (free quick scan, no wallet) still had a blank-address cold start: a newcomer lands with no token address in their pocket, and the empty input gives them nothing to do. A subtle chip ("No address handy? Try DUMB") now renders under the address input whenever it's empty; one tap fills the input with the pinned DUMB address constant (no paste, no phishing-address risk), and the user hits Scan as normal. DUMB is the honest demo: renounced owner so the probe family correctly skips, 10/10 checks pass except the standing fail-safe pause→unknown — a newcomer sees the full 22+ check report run live on-chain on their first visit.
- Demand logic: turns the top-of-funnel from "paste something" into "see it work in one tap" — the scan experience sells itself, and a good first scan brings them back with their own tokens (deep-scan burns follow). Utility bar: brings outsiders in, zero wallet/signing/data/mascot touch, no new data sources, no invented anything (it's a real scan of a real token, results are whatever the chain says).
- Four-lens check: better (kills the cold start), safer (pinned known address — a newcomer can't fat-finger a scammer's address on their first scan), more secure (zero new surface — existing state setter + the existing isAddress-gated scan path), fun (tiny, plain copy, no gimmick).
- No ROADMAP/AI churn (same scale as the 07:50 one-line funnel fix — a funnel affordance, not a feature).
- **Considered and REJECTED**: (1) auto-running the scan on chip tap — rejected: the scan button is the explicit-click contract (03:10 precedent — no unprompted RPC scans); fill-then-tap keeps the gesture identical to a normal paste flow. (2) A demo chip on the bag-scan pre-filling a known wallet — rejected: spotlights someone else's wallet; the bag-scan share surface deliberately carries no address (03:10 privacy precedent). (3) Pre-filling the deep-scan burn-hash field with a real past burn as a demo — rejected: misattributes someone else's burn to the visitor and invites confusion about whose burn unlocks the pass; the ?burn= shared-link viewer path already covers looking at real burns.
- **Demand-signal note (observed, not a defect):** /api/scan-stats still reads {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — no new deep scans or pass burns since the activity strip launched at 03:50. The strip stays honest (never renders fabricated zeros); the funnel isn't regressing, it's just quiet. If the count stays flat, the next conversion question is whether the deep-scan card's copy answers "why pay 100k DUMB" clearly enough — a future #8 unit, not today's.

## 2026-09-29 09:13 — "Owner blacklist power" probe (#13 real-utility research, shipped)

- **SHIPPED: owner-blacklist probe (5h) in the /scan quick scan** — the freeze-and-dump vector: a live owner who can blacklist wallets can stop buyers from selling, then dump first. 4 shapes probed (blacklist(address), isBlacklisted(address), addToBlacklist(address), setBlacklist(address,bool)) with read-only eth_calls impersonating the live owner; the dead address is the probe argument so even an executed call could only "blacklist" the dead address. Clean return = warn, all-revert = pass with the honest custom-names caveat, all-RPC-noise = unknown ("treat as risky"), the permissive-fallback garbage-selector control gates first, renounced/absent owners skip (DUMB/DAMP correctly skip). Design honesty: blacklist(address) may be a setter OR a public mapping getter — either way a clean return proves the machinery EXISTS, so the warn can't false-positive on getter/setter ambiguity.
- Pre-ship live validation: INC (live owner) → pass with caveat (all 4 reverted under owner impersonation; garbage selector reverted too — probe reliable there); DUMB → correctly skipped; HEX → skipped (its owner() reads dead/absent, so it skips like the other owner probes). No live true-positive exists among the 10 curated tokens checked (all reverted); the warn path reuses the code-verified 5f/5g mechanics. Selectors derived via the same viem keccak256 the shipped code uses — never hand-typed.
- ROADMAP "Token safety scanner" line + both Dumb AI scanner answers extended in each surface's own words. Zero wallet/signing/data-source/mascot touch, no new contract.
- **Considered and REJECTED**: a permissionless-blacklist variant for renounced-owner tokens (the 5d pattern applied to blacklist) — rejected as pathological churn: a blacklist anyone can call is a broken token, not a rug vector (it would freeze at random); doubles RPC volume for a shape with zero real-world demand evidence; if one ever surfaces in the wild, it earns its own run.

## 2026-09-29 09:23 — deep-scan card copy conversion audit (#8 bullish-demand research, no ship)

- **Deferred unit from the 08:43 #8 run, CLOSED: does the deep-scan card's copy answer "why pay 100k DUMB" clearly enough? VERIFIED YES — no copy change earned.** Claim-by-claim audit of the live card (TokenScanner.tsx DeepScanPanel, served on /scan, 200 verified live): (1) the free-vs-paid distinction is explicit — "The quick scan reads what the contract *says*. The deep scan watches what it *does*"; (2) the deliverable is named concretely — "simulated buys and sell-backs at multiple sizes against the token's real PulseX liquidity: the true round-trip cost, what a 10 WPLS bag nets on exit, and a full depth curve"; (3) the price is explicit with a live USD figure — "One 100,000 DUMB burn ($X) to the dead address unlocks 30 days of unlimited deep scans"; (4) funnel placement verified tight — the panel renders inline directly below the quick-scan report (after CheckRows + the "Honest limits" note) with the token carried over, so the path from free scan to the burn gate is one screen, no cross-link gap; (5) all three burn paths (one-click wallet burn, PLS fallback for <100k DUMB wallets, manual paste with dead-address copy) are honest, gated, and clearly explained.
- **Funnel context:** /api/scan-stats still reads {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since the activity strip launched 03:50. The flat funnel is a traffic/distribution matter, not a copy defect: with 3 deep scans in 30 days no copy variant could reach significance for months, so rewriting copy now would be unmeasurable churn, not a conversion fix.
- **Considered and REJECTED:** (1) rewriting the deep-scan value-proposition copy — rejected: the copy already answers "why pay" on every claim, and there is no measurable baseline to improve against (see funnel note above); revisit only if deep-scan starts see real volume and stalls at the burn step. (2) A "deep scan unavailable" note when the quick-scanned token has no WPLS pair (the DeepScanPanel silently doesn't render when result.pair is null) — rejected: the "Liquidity lock" check row already states "No token/WPLS pair on PulseX — it can't be traded through the flagship router" in plain English, and the deep scan functionally requires a pair to simulate against (token-scan.ts:1305-1314), so a second note would duplicate an already-explained absence for zero new information.

## 2026-09-29 10:03 — hero CTA refunnel: "Scan any token" (#8 bullish-demand research, shipped)

- **SHIPPED: "Scan any token" in the homepage hero** — first-fold CTAs were Trade DUMB / Join the raid / See the receipts / Explorer·PulseChain: all DUMB-holder actions, no zero-friction first action for a newcomer without DUMB, while the free scanner (flagship utility, brings outsiders in) only surfaced below the fold and in the nav. Hero now reads: Trade DUMB, Scan any token (/scan), Join the raid, See the receipts. The removed external Explorer CTA is not a trust loss: ContractGuardrail (pinned addresses + explorer links + copy) sits directly under the CTAs and /roots keeps every explorer link. Dead code removed (external-link branch, DUMB_TOKEN_URL import).
- Demand logic: the scanner is the free no-wallet top-of-funnel; one hero tap turns "curious newcomer" into "sees a real on-chain scan run" — and a good first scan brings them back with their own tokens (deep-scan burns follow). Utility bar: brings outsiders in; safer first action than "trade" (zero signing, read-only); zero new surface.
- Four-lens check: better (kills the funnel gap), safer (zero-signing first touch), more secure (internal link replaces external, zero new surface), fun (plain brand copy, ScanSearch house icon).
- **Considered and REJECTED**: (1) adding a fifth CTA instead of replacing the explorer one — rejected: 5 hero buttons crowd the first fold on mobile; the explorer CTA was the lowest-value slot (trust already covered by ContractGuardrail + /roots). (2) A ROADMAP line or Dumb AI answer for the CTA change — rejected: a funnel affordance, not a feature; the scanner already has roadmap + AI coverage.
- Live-verified: / 200 (served SSR carries "Scan any token", "Explorer · PulseChain" gone), /scan 200, /api/scan-stats unchanged.

## 2026-09-29 10:33 — "Owner sell-limit power" probe (#13 real-utility research, shipped)

- **SHIPPED: owner-limit-setter probe (5i) in the /scan quick scan** — the soft-rug throttle vector: a live owner who can change max-transaction / max-wallet limits can choke sells to a trickle (crank maxTx to dust) while keeping their own exit open — the tax can be honest while the exit is gated. 5 shapes probed (setMaxTxPercent(uint256), setMaxTxAmount(uint256), setMaxWallet(uint256), setMaxWalletAmount(uint256), updateMaxTxAmount(uint256)) with read-only eth_calls impersonating the live owner. Probe args are fail-safe: 50 (percent-style) or half the already-read supply (amount-style) could only LOOSEN limits in the impossible case a call executed. Selectors via keccak256, never hand-typed. Clean return = warn, all-revert = pass with the honest custom-names-plus-rejected-test-value caveat, all-RPC-noise = unknown ("treat as risky"), the permissive-fallback garbage-selector control gates first, renounced/absent owners skip (DUMB, DAMP, TEDDY, PCOCK correctly skip; HEX skips — no standard owner()).
- Pre-ship live validation: ran the SHIPPED quickScan end-to-end in node (TS source via type stripping, read-only) — DUMB (renounced) → check correctly absent; INC (live owner) → pass with caveat (all 5 shapes reverted under owner impersonation); TEDDY/PCOCK → correctly skipped (renounced); HEX → correctly skipped (no owner()). No live true-positive among curated tokens (all reverted); the warn path reuses the code-verified 5h mechanics (clean impersonated-owner return → found → warn) — the only delta is per-sig uint256 arg encoding, verified independently (5 distinct selectors, 36-byte calldata, arg round-trips). Pre-write diff confirmed no existing max-tx/max-wallet/limit/cooldown probe in the family (per the 09:53 standing lesson).
- ROADMAP "Token safety scanner" line + both Dumb AI scanner answers extended in each surface's own words. Served-bundle verified: scan-logic chunk carries owner-limit-setter, dump/ai chunks + /plan SSR carry the new clauses. Zero wallet/signing/data-source/mascot touch, no new contract. tsc + eslint clean.
- **Considered and DEFERRED (not rejected): a trading-cooldown probe** (owner-settable transfer-delay between sells — setTradingCooldown/setCooldownEnabled shapes) — deferred, not killed: it's a real vector, but the arg semantics differ from the setter family (bool/seconds shapes need their own fail-safe arg design, and "cooldown exists" vs "owner can change it" needs a getter+setter pair to be honest), so it earns its own design pass in a future #13 run rather than being bolted onto this one.

## 2026-09-29 10:43 — "See a real burn" demo chip on the tx explainer (#8 bullish-demand research, shipped)

- **SHIPPED: one-tap demo chip on the /scan "Explain a transaction" tab** — the tab had the exact blank-input cold start the 08:43 "Try DUMB" chip killed on the token scanner: a newcomer opening it with no tx hash in their pocket got nothing to do. A subtle chip ("No hash handy? See a real burn") now fills the input with a pinned, real, verified-on-chain burn tx (PLS → DUMB via PulseX router → dead address, ~104,477 DUMB destroyed, block 27663514); the user still taps Explain (fill-then-tap, no auto-run — the 08:43 explicit-click contract). Pre-ship validated by running the shipped explainTx end-to-end in node against live RPC: "Burn — 104,477.42 DUMB destroyed", 4 clean movements, burn flag, honest subline. The explainer re-runs live at tap time, so the demo is never a canned result.
- **Also shipped in the same pass: the 04:50 accessibility pass's miss** — that run labeled the token-address + burn-tx-hash inputs but missed the tx-explainer input. Now `aria-label` on the tx input + `role="alert"` on its error block; the /scan page is fully labeled.
- Demand logic: the explainer is the "learn without getting rekt" surface — a one-tap real burn explanation is the shortest path from curiosity to "this tool is real," and the burn demo is the most on-brand story the tool can tell. Utility bar: brings outsiders in (zero wallet, read-only), no new data sources, no invented anything.
- Four-lens: better (kills the cold start), safer (pinned known hash — no fat-fingered phishing lookalike on first use), more secure (zero new surface), fun (tiny plain copy).
- **Considered and REJECTED**: (1) demoing a swap tx instead — rejected: the burn is cleaner (4 legs, dedicated burn headline) and teaches the core mechanic; swap-cost education already lives in the tool copy + deep scan. (2) Auto-running on chip tap — rejected: no unprompted RPC reads (08:43 precedent). (3) Demo chip for the deep-scan burn-hash field — already rejected 08:43 (misattributes someone else's burn to the pass unlock).

## 2026-09-29 11:13 — vault autopilot stall + false watcher claim (#8 bullish-demand research, shipped)

- **SHIPPED: honesty fix on the /burn Feed-the-Burn "Pull the trigger" card** — the card promised "A watcher also drips automatically about every 15 minutes." False: the drip-vault-pulse-watcher cron was disabled 2026-09-28 (caller key chat-exposed; re-enable needs Antonio's caller-wallet rotation + gas funding + test). Chain evidence: exactly ONE Drip event in the vault's ~19h life (block 27664149: 75,000 PLSX → ~147,232 DUMB burned), and ~225,000 PLSX sat for 17+ hours with the 15-min cooldown clear — a live watcher would have fired dozens of times. New copy: "Nothing drips on a timer right now — if tokens are sitting in the vault, you're the trigger." The true mechanics kept. Demand bar: the vault is the community's buy-and-burn flywheel; a page promising auto-drips while donations sit unburned is both dishonest and a demand leak (donors see no burn activity for their donations). Zero wallet/signing/data-source/mascot touch; no ROADMAP/AI churn (watcher line existed only in the card).
- **DEMAND FINDING (on Antonio, loop cannot act):** the flywheel is stalled at manual. ~225,000 PLSX is waiting with the cooldown clear; true autopilot (his 2026-09-28 call) needs him to rotate the caller wallet via secure handoff, fund it for gas, and run the end-to-end test. The loop must never sign or hold keys (hard boundary), so this sits with him, not the build queue. The single drip proved the contract works end-to-end (~147k DUMB destroyed from one drip).
- **Considered and REJECTED:** (1) leaving the stale watcher sentence — it directly contradicts on-chain fact; (2) naming the key-rotation internals in the page copy — operational detail that doesn't belong on a user page.

## 2026-09-29 11:23 — "Owner trading-cooldown power" probe (#13 real-utility research, shipped)

- **RESOLVED → SHIPPED: the deferred trading-cooldown probe (5j)** — deferred at 10:33 for its own design pass; this run's #13 unit. The slow-rug tempo trick: an armed transfer cooldown turns an exit into a trickle, and a live owner who can flip or retune the dial controls the tempo. Probes setTradingCooldown/setCooldown/setTransferDelay (uint256) + setCooldownEnabled (bool) with read-only eth_calls impersonating the live owner. Fail-safe arg design (the deferral's requirement): 0 for seconds-style (could only REMOVE a cooldown), false for the bool switch (could only DISABLE one) — neither can tighten in the impossible executed case; selectors via keccak256, never hand-typed. Clean return = warn, all-revert = pass with the honest custom-names-plus-rejected-test-value caveat, all-RPC-noise = unknown, the permissive-fallback garbage-selector control gates first, renounced/absent owners skip (DUMB, HEX correctly skip). The deferral's second requirement — "cooldown exists" vs "owner can change it" via a getter+setter pair — is honored: tradingCooldown()/transferDelay()/cooldownEnabled() getters (added to scanAbi) are read plainly, and the copy names the armed state on BOTH branches (the warn's "slow-rug tempo trick" names it; the pass caveat says an armed-but-unsettable cooldown may be fixed or hidden under another name). No curated token carries cooldown machinery — no live true positive; the warn path reuses the code-verified 5h/5i impersonation mechanics, with per-sig arg encoding verified independently (4 distinct selectors, 36-byte calldata, all-zero fail-safe args). Utility bar: real repeated pain (cooldown-gated exits are a classic soft-rug shape), brings outsiders in (free quick scan, no wallet), burn-gated deep-scan funnel intact.
- Pre-ship live validation: SHIPPED quickScan run end-to-end in node against live RPC (read-only) — DUMB (renounced) → check absent; INC (live owner) → check present, pass with caveat, no spurious armed note; HEX (no live owner per owner()) → absent. Pre-write diff confirmed no existing cooldown coverage (per the 09:53 standing lesson).
- ROADMAP "Token safety scanner" line + both Dumb AI scanner answers extended in each surface's own words. Served-bundle verified on the custom domain: scan-logic chunk carries owner-cooldown-setter, /plan SSR + dump/ai chunks carry the new clauses. Zero wallet/signing/data-source/mascot touch, no new data sources, no new contract. tsc + eslint clean.

## 2026-09-29 11:53 — demand-surface audit, no ship earned (#8 bullish-demand research, research-only)

- **Audited, all sound — no code changes.** (1) Health: / /scan /burn /plan /trade /roots all 200 on the custom domain; /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since 03:50, still honest, still traffic/distribution not copy (09:23 reasoning holds, re-confirmed). (2) Raid mission copy (missions.ts): no price promises anywhere — "No spam, no price talk," "zero price predictions," "nobody posts price promises," "Community tool, not advice" — the honesty rules hold under the share-material audit. (3) Scan share-report copy (TokenScanner.tsx:350-375): honest, verdict-naming, shared links re-verify the scan live at view time so a stale link can never lie. (4) No new blank-input cold start anywhere: /ai has aria-label + placeholder, /feedback is linked in PageShell. (5) Served homepage verified live: the 10:03 CTA refunnel ("Scan any token"), the ContractGuardrail ("Which Dumb Money?"), and the honest 6%-tax hero copy are all in the served SSR.
- **Considered and REJECTED:** (1) dynamic per-token og tags for shared /scan?token= links (verdict in the unfurl) — rejected: the verdict needs a live ~20-check scan inside head() at SSR time — heavy per crawler hit, slow, RPC-failure-prone; the pre-filled share text already names the verdict, so the distribution value is already captured; would be churn for a marginal unfurl gain. (2) A deep-scan copy rewrite — rejected again: still no measurable baseline (3 deep scans in 30 days), flat stats are a traffic problem, not a copy defect; revisiting only if volume arrives and stalls at the burn step. (3) The loop scheduling weekly community rituals or burn-contest pilots — rejected: burn contests stay Antonio's idea-only hold (#5); the loop doesn't schedule community events.

## 2026-09-29 12:23 — "Owner limit-exemption power" probe (#13 real-utility research, shipped)

- **SHIPPED: owner-txlimit-exemption probe (5k) in the /scan quick scan** — the insider-lane vector: the 5i sell-limit probe covers the owner CHANGING maxTx/maxWallet limits, but in Safemoon-fork tokens the limits commonly apply to everyone EXCEPT wallets the owner exempts — the owner throttles everyone's exits to a trickle, then lifts the gate for chosen wallets and dumps through the open lane. 4 shapes probed (setIsTxLimitExempt(address,bool), setTxLimitExempt(address,bool), excludeFromTxLimit(address), isTxLimitExempt(address)) with read-only eth_calls impersonating the live owner. Fail-safe probe arg: the dead address (+ true for the bool shapes) — in the impossible executed case it could only "free" an address that can never move tokens. Selectors via keccak256, never hand-typed. Clean return = warn, all-revert = pass with the honest custom-names caveat, all-RPC-noise = unknown, the permissive-fallback garbage-selector control gates first, renounced/absent owners skip (DUMB/DAMP correctly skip). Design honesty follows the 5h precedent: isTxLimitExempt may be a plain mapping getter rather than a setter — either way a clean return proves the exemption machinery EXISTS, so the warn never false-positives on getter/setter ambiguity.
- Pre-ship live validation: SHIPPED quickScan run end-to-end in node against live RPC (read-only) — DUMB (renounced) → check correctly absent; INC (live owner) → check present, pass with caveat (all 4 shapes reverted under owner impersonation); HEX (no live owner) → correctly skipped. Independent arg-encoding check: 4 distinct selectors, 68-byte calldata for the two (address,bool) shapes, 36-byte for the two (address) shapes, dead-address arg round-trips. Pre-write diff per the 09:53 standing lesson confirmed zero existing coverage (5e is owner self-exemption from FEES, 5f is REWARD exclusion — neither is about limit exemptions for arbitrary wallets).
- ROADMAP "Token safety scanner" line + both Dumb AI scanner answers extended in each surface's own words. Served-bundle verified on the custom domain. Zero wallet/signing/data-source/mascot touch, no new contract, no new data sources. tsc + eslint clean.
- Utility bar: real repeated pain (selectively-lifted exit throttles are a documented soft-rug shape), brings outsiders in (free quick scan, no wallet), burn-gated deep-scan funnel intact.
- **Considered and REJECTED**: a permissionless-exemption variant for renounced-owner tokens (the 5d pattern applied here) — rejected same as the 09:13 blacklist precedent: an exemption anyone can grant is a broken token, not a rug vector; doubles RPC for zero real-world demand evidence. Also considered: probing exemption setters with the OWNER's own address as the arg instead of the dead address (would answer "is the owner already exempt" — no: that duplicates the 5e fee-exemption check's lane; the insider-lane vector is about the owner opening lanes for OTHER wallets, which is exactly what probing a machinery-revealing arg answers).

## 2026-09-29 12:33 — demand-funnel health + vault-flywheel re-verification (#8 bullish-demand research, research-only, no ship)

- **Site health:** / /scan /burn /plan /trade /roots /ai all 200 on the custom domain. /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since 03:50; remains a traffic/distribution matter, not a copy defect (09:23 reasoning holds, fourth confirmation). The 12:23 #13 probe (5k limit-exemption) is live: /plan SSR carries the roadmap clause (verified in served HTML); served scan + dump + ai chunks verified by the 12:23 run.
- **Demand surfaces re-audited, all sound:** the "Try DUMB" chip renders in served /scan SSR (08:43 funnel affordance intact); the "Scan any token" hero CTA live in served homepage SSR (10:03 refunnel intact); the 11:13 watcher-honesty fix ("Nothing drips on a timer right now — if tokens are sitting in the vault, you're the trigger") live in served /burn SSR; the "Top volunteer donors" board heading renders with chain-fed rows (no invented donors — the honesty rule holds); scan share reports already carry NativeShareButton + Post to X + Share to Telegram (TokenScanner.tsx:382, 1060) — no share-surface gap.
- **VAULT FLYWHEEL STILL STALLED (on-chain re-verification, unchanged since the 11:13 finding):** exactly ONE Drip event in the vault's life (block 27664149) and the vault's PLSX balance is still exactly 225,000 — no drips in ~19.5 hours. The 11:13 finding stands: true autopilot (Antonio's 2026-09-28 call) needs his caller-wallet rotation + gas funding + end-to-end test; the loop must never sign or hold keys (hard boundary). The /burn page copy remains honest about the manual state.
- **Considered and REJECTED:** (1) a "days remaining" indicator for 30-day pass holders — rejected: exactly 1 pass burn exists; speculative churn with zero demand evidence (validate-before-build); revisit only if pass volume materializes. (2) Adding Post to X / Share to Telegram buttons on the scan share report — rejected as already shipped: verified in src they exist in both share surfaces. (3) A deep-scan copy rewrite — rejected again (third confirmation): the card already answers "why pay 100k DUMB" on every claim (09:23 audit), and with 3 deep scans in 30 days no variant could reach significance for months.

## 2026-09-29 13:03 — "Owner trading-toggle power" probe design pass (#13 real-utility research, research-only, DEFERRED to its own build run)

- **DESIGN PASS (not shipped this run): the "Owner trading-toggle power" probe (5l)** — the single most common Safemoon-fork honeypot shape the scanner family doesn't name: an owner-controlled trading switch (`tradingActive` / `tradingEnabled` / `tradingStatus`). Two variants: (a) the pre-launch trap — buys open, sells never enabled, owner exits through the one open door; (b) re-halt at will — trading runs fine until the owner freezes exits mid-pump. The existing check #6 "Pause switch" reads ONLY OpenZeppelin's standard `paused()` — a fork-style trading toggle is completely invisible to today's quick scan. That is the gap.
- **Ground truth (read-only recon this run, live RPC):** probed 9 getter shapes (tradingActive, tradingEnabled, _tradingEnabled, trading, swapEnabled, tradingOpen, tradingPaused, tradingStatus, enableTrading) against 9 tokens (DUMB, DAMP, INC, TEDDY, SOLIDX, PCOCK, HELGO, PLSX, PRVX) — all 81 probes reverted honestly (no toggle machinery anywhere in the curated set; RPC path sanity-checked with a clean totalSupply read + chainId 369). No curated token carries the machinery — but the scanner's real job is arbitrary pasted addresses, and the trading toggle is the flagship owner-power rug vector, so the probe earns its place as family coverage, not as curated-token signal.
- **Pre-write diff (the 09:53 standing lesson):** zero existing coverage — family check ids are owner-mint, owner-blacklist, owner-limit-setter, owner-fee-exemption, owner-exclusion-setter, owner-cooldown-setter, owner-txlimit-exemption, fee-setter, fee-setter-anyone, pause (OZ only). None names a fork-style trading toggle.
- **Settled design for the future ship run:** (1) 4 setter shapes, all `(bool)`: setTradingActive, setTradingEnabled, setTradingStatus, setTrading — read-only eth_call impersonating the live owner. Fail-safe probe arg = `true` (ENABLE): in the impossible executed case, enabling trading can only unfreeze — never the harmful direction. Selectors via keccak256, never hand-typed. (2) The 5j getter-honesty pattern: tradingActive()/tradingEnabled()/tradingStatus() read plainly to distinguish "trading halted RIGHT NOW" (severity `fail` — same as the pause check's paused()-TRUE branch) from "the owner can halt it" (`warn`: "The owner can freeze all trading with one call — your exit only works while they allow it"). (3) Family-standard triage: permissive-fallback garbage-selector control gates first, revert→absent / RPC-noise-retried-once→unknown ("treat as risky"), whole probe inside `if (liveOwner)` — renounced/absent owners skip. (4) Pre-ship validation required: SHIPPED code run end-to-end in node read-only against live RPC (DUMB renounced → absent; INC live owner → present, pass; HEX no owner() → skipped), independent arg-encoding check (4 distinct selectors, 36-byte calldata, arg=true encodes), ROADMAP "Token safety scanner" line + both Dumb AI scanner answers extended in each surface's own words, deploy + served-bundle verify. Zero wallet/signing/data-source/mascot touch, no new contract.
- **Utility bar:** real repeated pain (the trading-toggle halt is THE canonical soft-rug shape on fork chains), brings outsiders in (free quick scan, no wallet), burn-gated deep-scan funnel intact.
- **Considered and REJECTED:** (1) probing `disableTrading()` (no-arg) — rejected: NOT fail-safe; the impossible-executed case would freeze all trading, the harmful direction. The (bool) shapes with arg=true carry the full signal. (2) A `swapEnabled`/`setSwapEnabled` toggle probe — rejected: that's the auto-liquidity internal-sell switch, not a user-trading halt; warning on it would false-positive on healthy fork mechanics. (3) no-arg `enableTrading()` as a probe shape — rejected: tokens with trading already enabled commonly revert it (require not-yet-enabled), making "already fine" indistinguishable from "no such function"; the (bool) shapes suffice without the trust-eroding caveat.

## 2026-09-29 13:13 — demand-surface regression audit + deep-scan static block copy review (#8 bullish-demand research, research-only, no ship)

- **Site health:** / /scan /burn /plan /trade /roots /ai all 200 on the custom domain. /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since the activity strip launched 03:50; remains a traffic/distribution matter, not a copy or funnel defect (09:23 reasoning holds, fifth confirmation). ScanActivity stays honest (renders nothing at zero, client-side fetch, "privacy tools undercount" disclaimer intact in src).
- **Funnel-affordance regression audit (served SSR + src, all intact):** hero "Scan any token" CTA in served homepage SSR; "Explorer · PulseChain" external CTA correctly gone (ContractGuardrail + /roots carry the trust); "Try DUMB" chip in served /scan SSR; "No hash handy? See a real burn" chip in TxExplainer (mounts under the tx tab, deep-linkable via /scan?tx= — absent from default-tab SSR by design, not a regression); the /burn watcher-honesty fix ("Nothing drips on a timer right now — if tokens are sitting in the vault, you're the trigger") in served /burn SSR; "Top volunteer donors" board heading in served /burn SSR (span-wrapped, no invented donors); TxExplainer input still aria-labeled + share surfaces present (the 10:43 accessibility fix holds).
- **Deep-scan static block copy audit (claim-by-claim, scan.tsx:93-109, served SSR verified):** SOUND, no change earned. Headline "Deep scan is live — burn-gated"; the paragraph names the deliverable (simulated 1 WPLS buy + immediate sell-back + liquidity-depth probe against real liquidity, "the real round-trip cost in plain English"), the price (100,000 DUMB burn to the dead address), and the verification (verified on-chain before the report renders) plus the supply-shrink rationale — so it answers "why pay" without a quick scan. The "Burn DUMB on the burn page" link goes to /burn, the correct destination (the burn must precede the unlock; the panel can't render until a quick scan completes). Claim "After any quick scan of a token with a PulseX WPLS pair" matches TokenScanner behavior (DeepScanPanel requires result.pair).
- **Considered and REJECTED:** (1) naming the 100k price in the static block's heading — rejected: the price is already in the first sentence; the heading's job is the eyeball-grab, and the full card after a quick scan carries the richer copy. (2) Adding the 30-day pass / PLS-fallback paths to the static block — rejected: the block is the teaser; both paths render in the DeepScanPanel after a quick scan and are documented on /burn; adding them would triple the block's copy for a marginal marginal-return surface with no measurable baseline (3 deep scans / 30 days — 09:23/11:53 precedent: no baseline, no churn). (3) A deep-scan copy rewrite of any surface — rejected again (fourth confirmation): the static block + card already answer "why pay 100k DUMB" on every claim; flat stats remain a traffic problem. (4) Loop-run community ritual scheduling — rejected per 11:53: burn contests stay on Antonio's idea-only hold (#5); the loop doesn't schedule events.

## 2026-09-29 13:23 — adversarial design review of the "Owner trading-toggle power" probe (5l) (#9 security pass, research-only, no code changes)

- **REVIEWED:** the settled 5l design (BULLISH-RESEARCH.md 13:03 entry) — 4 (bool) setter shapes (setTradingActive/setTradingEnabled/setTradingStatus/setTrading) via read-only eth_call impersonating the live owner, fail-safe arg `true`, the 5j getter-honesty pattern (tradingActive/tradingEnabled/tradingStatus read plainly; "halted right now" → `fail`, "owner can halt" → `warn`), permissive-fallback control first, revert→absent / noise→unknown, renounced/absent owners skip, three deliberate rejections (disableTrading, swapEnabled, no-arg enableTrading). Verdict: **APPROVED WITH ONE REQUIRED REVISION** — the design is sound except its strongest claim (the `fail` branch), which is its weakest link. No code written this run; the future ship run picks up the revision below.
- **FINDING A (required revision — corroboration-gated fail):** the design assigns `fail` to "trading halted RIGHT NOW" from a plainly-read getter, citing the pause check's paused()-TRUE branch as precedent. But the precedent doesn't transfer: `paused()` is OpenZeppelin-standardized (fixed semantics), while `tradingActive()`/`tradingEnabled()`/`tradingStatus()` have NO standard — fork semantics vary, and name collisions across contract types are real (vault market-maker bots, game contracts, launchpad presale flags). A false `false` → FAIL is trust-eroding: the scanner would cry "frozen" about a fine token. Worse, if NO setter shape answered, the getter is the ONLY evidence, and a permissive-fallback contract returning zero-ish garbage for the getter would fabricate a FAIL on a contract the control already flagged as un-probeable. Required revision for the ship run — the verdict matrix becomes:
  - setter hit + getter reads halted (`false`) → `fail` (corroborated: machinery proven AND armed — defensible).
  - setter hit + getter reads enabled / no clean getter answer → `warn` (the design's warn copy stands: "The owner can freeze all trading with one call — your exit only works while they allow it").
  - NO setter hit + getter reads halted → `unknown`, with the evidence named ("a trading flag reads as halted, but no owner toggle answered under the common names — custom toggle or an unrelated flag; treat as risky"). Never `fail` — the family's honest bucket for ambiguity is `unknown` (per the 11:33 note on the mixed-noise precedent).
  - no setter hit + getter enabled / absent → `pass` with the custom-names caveat (family pattern).
  - `fallbackBlind` (permissive fallback) → `unknown` AND the getter reads are suppressed entirely. Do NOT copy 5j's pattern of appending the getter note to the unknown branch — that is a pre-existing wart (a garbage-returning fallback could fabricate an "armed" note); 5l must gate getters on the control.
- **FINDING B (documentation, not a blocker):** some forks implement `tradingStatus` as a uint8 state machine, not a bool. A bool decode of a uint return throws → `read()` swallows → null → the getter is silently skipped. Benign (no false signal, just no-signal), but the ship run must document it in the code comment: bool decode only; non-bool returns are no-signal, never evidence either way.
- **FINDING C (documentation):** the recon found `tradingOpen` (true = open) and `tradingPaused` (true = paused — inverted). The design deliberately reads NEITHER — correct scope control. The ship run must document WHY in the code comment (inverted semantics would invert the verdict) so a future run doesn't "helpfully" add them.
- **CONFIRMED SOUND:** fail-safe arg `true` (the impossible-execution case can only enable trading — never the harmful direction); selectors via keccak256; revert→absent / retry-once→unknown triage; liveOwner gating (DUMB/DAMP renounced → correctly skipped, matching the family); all three rejections — disableTrading (not fail-safe), swapEnabled (would false-positive healthy fork auto-liquidity mechanics — the sharpest of the three), no-arg enableTrading (already-enabled tokens revert it, indistinguishable from absent). Warn copy is honest with zero gain promises. RPC budget ≤12 calls per live-owner scan (4 setters × ≤2 attempts + 3 getter reads + 1 control) — bounded like the family.
- **NICE-TO-HAVE (ship run's call, not required):** on the `warn` branch, name the deep scan as the live tiebreaker ("the deep scan's simulated buy+sell shows whether trading is actually live today") — the same honesty bridge the explainer copy already uses.
- **Site health:** / /scan /burn 200 on the custom domain; /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since 03:50, still honest, still traffic/distribution. Zero wallet/signing/data-source/mascot touch. #9 stays open as recurring; #5 on Antonio's idea-only hold, #6 on mascot approval (ON HOLD per Antonio 2026-09-29); #8/#10/#13 stay open as recurring.

## 2026-09-29 13:43 — "Owner trading-toggle power" probe (5l) SHIPPED (#13 real-utility research, recurring)

- **SHIPPED:** the 13:03-deferred 5l probe is now live in the /scan quick scan (token-scan.ts, check id `owner-trading-toggle`, title "Owner trading-toggle power"), carrying the 13:23 adversarial review's required revision exactly as specified: (a) fail is corroboration-gated — setter hit AND a toggle getter reading `false`; (b) setter hit alone → warn; (c) no setter hit + halted flag → unknown with the evidence named, never fail; (d) no setter + enabled/absent → pass with the custom-names caveat; (e) permissive-fallback → unknown with the getter reads SUPPRESSED entirely (the 5j wart of appending the getter note to the unknown branch deliberately not copied — the control runs first here, unlike the other owner probes). Findings B + C documented in the code comment (uint8-tradingStatus silent skip; tradingOpen/tradingPaused deliberately unread). The review's nice-to-have accepted: the warn branch names the deep scan as the live tiebreaker.
- **Pre-ship validation (all passed):** (1) independent arg-encoding check — 4 distinct keccak256 selectors (0x959bd6c2, 0xc2e5ec04, 0x379ba1d9, 0x8f70ccf7), 36-byte calldata each, arg=true round-trips; (2) SHIPPED quickScan run end-to-end in node against live RPC — DUMB (renounced) → check absent; INC (live owner) → present, pass with caveat, no fabricated getter signal; HEX (no live owner) → skipped. ROADMAP + both Dumb AI scanner answers extended in each surface's own words; tsc + eslint clean; built + deployed to dump-money-hub-preview; served bundle verified live (check id ×6, title, fail copy in the new chunk; roadmap clause in /plan SSR; AI clauses in served dump + ai chunks).
- **Utility bar:** real repeated pain (the trading-toggle halt is the flagship owner-power rug shape on fork chains), free quick scan brings outsiders in, burn-gated deep-scan funnel intact. No curated token carries the machinery (recon confirmed) — this is family coverage for arbitrary pasted addresses, not curated-token signal.
- **Considered and REJECTED (unchanged from the 13:03 design):** disableTrading() (not fail-safe — the impossible-executed case freezes trading), swapEnabled shapes (auto-liquidity internal switch, not a user-trading halt — would false-positive), no-arg enableTrading() (already-enabled tokens revert it, indistinguishable from absent). All three rejections re-confirmed sound by the 13:23 review.
- **Deferred 5l design entry (13:03) → RESOLVED → shipped.** No further probe designs deferred at this time.
- **Site health:** / /scan /burn /plan /ai 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, still traffic/distribution, not a funnel defect. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold, #6 on mascot approval (ON HOLD per Antonio 2026-09-29); #8/#9/#10 stay open as recurring.

## 2026-09-29 13:53 — share-link unfurl audit at the crawler level (#8 bullish-demand research, research-only, no ship)

- **Site health:** / /scan /burn /plan /trade /ai all 200 on the custom domain; /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since 03:50, still traffic/distribution, not copy or funnel (09:23 reasoning, sixth confirmation). Zero wallet/signing/data-source/mascot touch.
- **Crawler-level unfurl audit (new this run — what X/Telegram bots actually receive):** curl of served /scan SSR carries full generic OG suite — og:title "Token Safety Scanner — Dumb Money Hub", og:description naming the free read-only scan, og:image og-card.png (1200×630 + alt), twitter:card summary_large_image, og:url. Same curl against a REAL shared report link (/scan?token=0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D&burn=…) returns byte-identical generic tags (25592 bytes — the link carries no personalized unfurl). So a shared report unfurls on X/Telegram as the generic scanner card; the verdict lives in the share TEXT (already names it, TokenScanner.tsx), the card image (og-card.png) is generic, and the token is identified only inside the shared text. The distribution gap is real but SMALL — the text share already does the persuasive work.
- **Considered and REJECTED/DEFERRED:** (1) Verdict-in-unfurl per-token OG tags — REJECTED, unchanged from the 11:53 rejection (live scan inside SSR head() is heavy per crawler hit, RPC-failure-prone, and — the decisive point — a cached verdict card can go STALE and contradict the family's standing honesty rule that a shared link "re-runs live so a stale link can never lie"; the verdict in share text is not cached, so the current design is the more honest one). (2) A narrower variant — symbol-only personalization (og:title "DUMB — live safety report on Dumb Money Hub", no verdict, no scan at crawl time) — DEFERRED to a #13 utility run, not rejected: it names the token (one cheap eth_call or a cached symbol map in the SSR path) without the staleness sin, and is strictly better/friendlier for outsiders. Blockers before any ship: crawl-time query-param personalization in the SSR head, per-token cache to avoid RPC per crawler hit, and the honesty gate (symbol only — never a result). Fits the utility bar as additive scanner polish, not a memefied gimmick.

## 2026-09-29 14:03 — contested-getters honesty fix on the 5l trading-toggle probe (#9 security pass, shipped)

- **REVIEWED:** the 13:43-shipped 5l probe (token-scan.ts) against the 13:23 review's required matrix — all five branches landed exactly as specified: corroboration-gated fail, setter-only warn (with the deep-scan tiebreaker), no-setter+halted unknown with the evidence named, no-setter pass with the custom-names caveat, permissive-fallback unknown with getter reads suppressed entirely (the 5j wart not copied). Also verified: Findings B + C documented in the code comment (uint8-tradingStatus silent skip; tradingOpen/tradingPaused deliberately unread with the inverted-semantics reason), fail-safe arg true (enable-only), keccak256 selectors, revert→absent / noise→unknown triage, liveOwner gating, ≤12-call RPC budget, `tryRead` swallows bool-decode throws (uint8 getters are no-signal, as documented).
- **THE FINDING (shipped fix):** a genuine honesty gap in the shipped fail branch, not in the reviewed design's named cases: when the probe reads TWO toggle getters and they DISAGREE (one reads `false` = halted, another reads `true` = enabled), the shipped code fired the fail branch on the halted flag alone and its copy asserted "trading is frozen right now" as fact — while hiding the contradictory signal the probe had already computed. Under the 13:23 review's own principle (fail needs the freeze *proven*; a false FAIL is trust-eroding), contested evidence isn't proof. Fix: the fail branch now requires `foundSig && haltEvidence && !enabledEvidence`; the contested case degrades to warn with the disagreement named — "The toggle flags disagree — tradingActive() reports false, but tradingEnabled() reports true — so the 'halted' signal is contested; treated as a warning, not a frozen verdict" — plus the deep-scan tiebreaker. The setter hit still earns the warn (the freeze machinery exists and answers the owner); the plain warn and its "open today says nothing about tomorrow" enabled-note are untouched. Pathological rarity (two disagreeing toggle getters on one contract — no curated token hits it), but the fix is 2 lines, zero risk to common cases, and it closes the exact overclaim class the corroboration-gating was built for.
- **Validation:** tsc + eslint clean; decision-tree logic test 9/9 (setter+halted→fail, setter+halted+enabled→warn+contested copy, setter+enabled→warn+enabled note, setter alone→warn, no-setter+halted→unknown, all-noise→unknown, clean→pass). Built + deployed to dump-money-hub-preview; live-verified on the custom domain: / /scan /burn /plan 200, /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); served scan chunk (new hash BurnBragCard-matwn7XW.js) carries the check id ×6, the fail copy, and both new contested strings.
- **No ROADMAP/AI churn** (branch-level reporting fix — the probe's described capability is unchanged; same scale as the 11:33/12:43 #9 fixes). Zero wallet/signing/data-source/mascot touch, no new data sources. #9 stays open as recurring; #5 on Antonio's idea-only hold, #6 on mascot approval (ON HOLD per Antonio 2026-09-29); #8/#10/#13 stay open as recurring.

## 2026-09-29 14:23 — symbol-only unfurl personalization on shared /scan links (#13 real-utility research, shipped)

- **RESOLVED → SHIPPED: the deferred 13:53 #8 item** — shared report links for the site's 13 verified curated tokens now unfurl as e.g. "DUMB — live safety report on Dumb Money Hub". The 13:53 honesty gate holds: symbol ONLY, never a verdict, so a cached preview can never go stale or lie (the 11:53 verdict-in-unfurl rejection stands). Zero RPC at crawl time (synchronous curated map in page-meta.ts, literals only — nothing attacker-controlled in <head>), malformed/non-curated tokens fall back to the generic card, og:url+canonical carry the lowercase token, og:image stays the generic root card. ROADMAP + both Dumb AI scanner answers extended by one clause. tsc + eslint clean, built, deployed to dump-money-hub-preview, live-verified on the custom domain (DUMB/WPLS/TEDDY personalize; plain /scan, non-curated address, garbage token all generic; /plan SSR carries the roadmap clause). Zero wallet/signing/data-source/mascot touch.

## 2026-09-29 15:13 — demand-funnel health + swap-health on-chain verification + unfurl share-card live verification (#8 bullish-demand research, research-only, no ship)

- **Site health:** / /scan /burn /plan /raid /ai /trade all 200 on the custom domain. /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since 03:50; remains a traffic/distribution matter, not a copy or funnel defect (09:23 reasoning holds, seventh confirmation). Zero wallet/signing/data-source/mascot touch.
- **On-chain swap health (read-only, live RPC):** WPLS/DUMB pair 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186 — token0=WPLS, reserves ~186,122 WPLS / ~505.5M DUMB (deep). DAMP/WPLS pair 0xB256769d6B9d53E0E66a395C17135F8855A8633A — token0=DAMP, reserves ~52.1M DAMP / ~104.3M WPLS (deep). Both token0 orderings match the swap box's per-token reserve handling (no quote-side regression); implied prices ~0.000368 WPLS/DUMB and ~2.00 WPLS/DAMP, both sane. Trading is the hub's demand core — the rails are healthy.
- **14:23 unfurl ship verified LIVE at crawler level:** curl of the served DUMB shared report link (/scan?token=0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D) returns og:title + <title> "DUMB — live safety report on Dumb Money Hub" and og:url carrying the lowercased token. A valid-but-non-curated 42-char address and plain /scan both serve the generic card ("Token Safety Scanner — Dumb Money Hub" + full generic description). The 13:53 honesty gate holds in served HTML: symbol only, never a verdict — a cached card can never go stale or lie.
- **/trade gas guide re-audited (src/routes/trade.tsx:127-180):** the three PLS paths are honest (official bridge, exchange withdrawal, on-chain swap), the lookalike-bridge warning and "information, not an endorsement" disclaimer intact — no churn.
- **Hero ProofStrip re-audited (ProofStrip.tsx):** all figures are client-side live reads (dead balances, supply, fees/feesDistribution) with honest loading/error/empty states — nothing invented, no churn.
- **Considered and REJECTED:** (1) lowering the 100k-DUMB deep-scan price — rejected: at the current on-chain ratio the burn is ≈36.8 WPLS; the friction is the burn step and discovery, not the token amount — and with 3 deep scans in 30 days there's no baseline to optimize against (09:23 precedent: no baseline, no churn). Lowering it would also dilute the burn incentive without a demand lever. (2) Bolting share prompts onto the hero ProofStrip — rejected: the strip's job is trust-at-first-glance (verifiable facts before action); scan share surfaces already exist (NativeShareButton + Post to X + Share to Telegram, verified 12:33), so this would be speculative churn with no baseline.
- #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 15:03 — "Owner fee-wallet redirect power" probe design pass (#13 real-utility research, research-only, DEFERRED to its own build run)

- **THE GAP (genuine, not churn):** the owner probe family now covers 5a–5l + #6 (pause), but nothing asks "where does the tax money GO?" A live owner who can redirect the fee/marketing wallet turns the project's stated use-of-funds into fiction: holders believe the 6% tax funds marketing or buybacks while the dev points the wallet at themselves. The adjacent slow-rug vector to 5e/5f (owner fee exemption / exclusion setter) — same family, new question.
- **GROUND TRUTH (read-only recon, live RPC):** INC and WBTC are the only curated tokens with live owners; all 6 candidate setter shapes + all 5 candidate getter shapes reverted honestly on both under owner impersonation with a dead-address arg — zero machinery in the curated set, so zero false-positive risk there, and the recon confirms owner impersonation still answers on INC (owner() = 0xb2ca4a66d3e57a5a9a12043b6bad28249fe302d4). Shape grounding comes from documented Safemoon-fork auditor checklists (setMarketingWallet / setDevWallet / setFeeReceiver-class shapes listed under fee-manipulation checks in the awarexone/agentic-bug-hunter token-auditor.md Class 3). Pre-write diff (09:53 standing lesson): only `setMarketingFee(uint256)` matches in token-scan.ts — a fee AMOUNT setter (5c's job), not a wallet redirect — so the vector is genuinely uncovered.
- **SETTLED DESIGN for the future ship run:**
  - 5 setter shapes: `setMarketingWallet(address)`, `setMarketingWalletAddress(address)`, `updateMarketingWallet(address)`, `setFeeWallet(address)`, `setDevWallet(address)` — the documented marketing/dev/fee-wallet trio plus common spelling variants. `setTeamWallet`/`setFeeReceiver` dropped as rarer (code minimalism).
  - Read-only eth_calls impersonating the live owner (onlyOwner setters revert for strangers); selectors via keccak256, never hand-typed; the whole probe inside `if (liveOwner)` so renounced/absent owners skip.
  - FAIL-SAFE arg: the dead address (`0x000000000000000000000000000000000000dEaD`) — the impossible executed case redirects future tax proceeds to burn, never to a thief. Cannot steal; can only redirect-to-burn.
  - Getters for the honesty pair: `marketingWallet()`/`feeWallet()`/`devWallet()` read plainly — the report names the CURRENT recipient ("today's tax money flows to 0x…").
  - Verdict matrix: permissive-fallback control gates first → unknown (can't tell whether a real setter is hiding); setter hit → warn (machinery exists and answers the owner — names the current wallet when readable); all-revert → pass with the custom-names caveat; all-RPC-noise → unknown ("treat as risky").
  - RPC budget: 5 setters × ≤2 attempts + 3 getter reads + 1 control = 9 typical, 14 worst case (all-noise) — bounded like the family; retries only on non-revert transport errors, reverts settle immediately.
- **CONSIDERED AND REJECTED in the design:** (1) asserting the current fee wallet "belongs to the owner" — rejected: chain state can't prove wallet ownership, so the copy names the recipient only; (2) two-arg setter variants (`setMarketingWallet(address,uint256)` share splits) — rejected: extra args revert here and land in the honest pass-with-caveat, same as the family pattern for non-standard shapes; (3) `setMarketingFee(uint256)`-class amount setters — 5c's job already; the REDIRECT is the uncovered vector. All three documented so a future run doesn't "helpfully" widen the probe into overclaim.
- **UTILITY BAR:** real repeated pain (fee-redirect is a textbook slow-rug shape on fork chains); free quick scan brings outsiders in; burn-gated deep-scan funnel intact. Zero wallet/signing/data-source/mascot touch, no new data sources.
- **PRE-SHIP VALIDATION (required of the future ship run):** (1) pre-write diff re-confirm zero wallet-redirect coverage; (2) independent arg-encoding check — 5 distinct keccak256 selectors, 68-byte calldata, dead-address arg round-trips; (3) shipped quickScan run end-to-end in node against live RPC — DUMB (renounced → check absent), INC (live owner → present, pass-with-caveat), WBTC (live owner → present, pass-with-caveat); (4) ROADMAP "Token safety scanner" line (dump.ts) + both Dumb AI scanner answers (dump.ts AI_QA, knowledge.ts) extended in each surface's own words; (5) tsc + eslint clean, build, deploy to dump-money-hub-preview, served-bundle verification on the custom domain.
- **Site health:** / /scan /burn /plan all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, still honest, still traffic/distribution. No code changes this run, no build/deploy. #13 stays open as recurring; #5 on Antonio's idea-only hold, #6 on mascot approval (ON HOLD per Antonio 2026-09-29); #8/#9/#10 stay open as recurring.

## 2026-09-29 15:23 — Adversarial design review: "Owner fee-wallet redirect power" probe (5m) (#9 security pass, research-only, deferred design)

- **CONTEXT:** #9 adversarial design review of the deferred 15:03 #13 "Owner fee-wallet redirect power" probe design, following the 13:23 precedent (13:03 design → 13:23 review → 13:43 ship with the required revision). No code changes this run, no build/deploy.
- **INDEPENDENTLY VERIFIED in src:** pre-write diff claim holds — zero wallet-redirect coverage in token-scan.ts (no marketingwallet/feewallet/devwallet/teamwallet/feereceiver hits); only `setMarketingFee(uint256)` matches, a fee AMOUNT setter (5c's job). The redirect vector is genuinely uncovered. The family permissive-fallback control (token-scan.ts:581-610, used by every owner probe) exists and the 5l trading-toggle probe's fallbackBlind getter-suppression pattern (lines 1488-1499) is confirmed in shipped code.
- **CONFIRMED SOUND:** (1) fail-safe arg = dead address — the impossible executed case redirects future tax proceeds to burn, never to a thief; the dead address is non-zero so it survives `require(addr != address(0))` zero-checks (5k precedent); (2) read-only eth_call owner impersonation — eth_call never commits state; (3) whole probe inside `if (liveOwner)` — DUMB/DAMP renounced skip; (4) revert→absent / RPC-noise→unknown triage — family standard; (5) keccak256 selectors, never hand-typed; (6) control gates first; (7) all three design rejections — no ownership-assertion of the current wallet (chain state can't prove it), two-arg share-split variants landing in pass-with-caveat, amount setters as 5c's job. RPC budget 9 typical / 14 worst case — bounded.
- **VERDICT: APPROVED WITH FOUR REFINEMENTS for the ship run** (none on the scale of 5l's fail-gating revision — the failure modes here are all warn/unknown, so there is no false-FAIL trust risk; these are honesty hardening):
  - **R1 (closest to required — mirror 5l):** the design reads the getters to "name the current wallet when readable" in the warn branch, but gates only the setter probes on the permissive-fallback control. Under a permissive fallback the address getters return zero-ish garbage too — the exact reason 5l suppresses its getters under fallbackBlind (shipped code, token-scan.ts:1488-1499). The ship run MUST gate the getter reads on `!fallbackBlind` and the unknown branch must name NO wallet — naming a garbage-state recipient would be inventing a data point, a community-honesty violation.
  - **R2 (flow assertion → named-recipient framing):** the design's getter copy says the report names the current recipient ("today's tax money flows to 0x…"). Overclaim: chain state shows the contract NAMES an address as the fee/marketing wallet; it does not prove the tax legs actually flow there (the marketing leg could use a different variable, a hardcoded address, or an auto-process path). Honest copy: "the contract names 0x… as the marketing/fee wallet" — named recipient, never proven flow. Keeps the report at the "redirect power" level the warn is about.
  - **R3 (zero-address getter reads):** if a getter answers cleanly with 0x0, don't silently omit it (reads as "unreadable") — report honestly: "no wallet currently set — the fee leg may be disabled, burned, or pointed elsewhere." A cleared wallet is itself a signal.
  - **R4 (pass caveat widening, family consistency):** the design's pass branch carries only the "custom names" caveat; the 5l ship carries the "custom-names-plus-rejected-test-value" caveat. A real wallet setter could revert on the dead-address arg (a dead-address blacklist require, or an allowlist check) and be silently missed — the pass should name the rejected test value too, exactly as the family does.
  - **R5 (warn copy posture):** keep the warn at capability level — "the owner can redirect where the fee wallet points" — never accusation. A configurable marketing wallet with a multisig owner is normal; the scan can't see timelocks, so the report describes power, not abuse (the 5c/5e/5f machinery-existence precedent).
- **NOTED, NOT CHURN:** the two-arg share-split rejection and the "no ownership assertion" rejection stand untouched — the review found the design's boundaries exactly as strong as stated.
- **Site health:** / /scan /burn /plan all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, still honest, still traffic/distribution. Zero wallet/signing/data-source/mascot touch, no new data sources. #9 stays open as recurring; #5 on Antonio's idea-only hold, #6 on mascot approval (ON HOLD per Antonio 2026-09-29); #8/#10/#13 stay open as recurring.

## 2026-09-29 15:43 — SHIP: "Owner fee-wallet redirect power" probe (5m) on the token safety scanner (build run for the 15:03 #13 design + 15:23 #9 review)

- **WHAT SHIPPED:** the deferred design from 15:03 #13, reviewed 15:23 #9 (APPROVED WITH FOUR REFINEMENTS), now live — following the 10:33/11:23/13:03 precedent (design → review → ship with the required revision). New quick-scan check `owner-fee-wallet` ("Owner fee-wallet redirect power"): 5 setter shapes — `setMarketingWallet(address)`, `setMarketingWalletAddress(address)`, `updateMarketingWallet(address)`, `setFeeWallet(address)`, `setDevWallet(address)` — probed via read-only eth_call impersonating the live owner (eth_call never commits state), selectors via keccak256, fail-safe dead-address arg (the impossible executed case redirects tax proceeds to burn, never to a thief; non-zero so zero-checks pass). Wallet getters `marketingWallet()`/`feeWallet()`/`devWallet()` read plainly for the honesty pair. Whole probe inside `if (liveOwner)` — renounced/absent owners skip.
- **All 15:23 refinements honored:** R1 — getter reads gated on `!fallbackBlind` (mirror 5l), unknown-under-fallback branch names NO wallet (naming garbage-state recipients would invent a data point); R2 — copy says "the contract names 0x… as the marketing/fee wallet" (named recipient, never proven flow — chain state can't prove the tax legs actually flow there); R3 — clean zero-address getter reads reported honestly ("no wallet currently set — the fee leg may be disabled, burned, or pointed elsewhere"), never silently omitted; R4 — pass branch carries the family caveat: custom names, or a setter that rejects the dead-address probe value ("the 5l wording"); R5 — warn at capability level ("the owner can redirect where the fee wallet points"), never accusation.
- **Verdict matrix:** permissive-fallback control first → unknown (no getter note, no wallet named); setter hit → warn (names the current wallet when readable); all-RPC-noise → unknown ("treat as risky"); all-revert → pass with custom-names + rejected-test-value caveat. RPC budget 9 typical / 14 worst case (5 setters × ≤2 attempts + 3 getters + 1 control), bounded like the family.
- **VALIDATION (all five pre-ship requirements met):** (1) pre-write diff re-confirmed zero wallet-redirect coverage (only `setMarketingFee(uint256)` — 5c's fee-AMOUNT job); (2) independent arg-encoding check — 5 distinct keccak256 selectors (0x5d098b38, 0x4cb80fd5, 0xaacebbe3, 0x90d49b9d, 0x1f53ac02), calldata 0x + 72 hex chars (4B selector + 32B arg), dead-address arg round-trips; (3) shipped quickScan run end-to-end in node against live RPC — DUMB (renounced) → check correctly absent; INC + WBTC (live owners) → present, both pass-with-caveat exactly as the 15:03 recon predicted (all shapes revert honestly on both; zero machinery in the curated set); (4) ROADMAP "Token safety scanner" line (dump.ts:231) + both Dumb AI scanner answers (dump.ts AI_QA, knowledge.ts) extended in each surface's own words; (5) tsc + eslint clean, built, deployed to dump-money-hub-preview, served-bundle verified on the custom domain — the served scan chunk carries the owner-fee-wallet id + setter shapes + pass copy, /plan SSR carries the roadmap clause, both served ai + dump chunks carry the new AI clause.
- **UTILITY BAR:** the gap is genuine, not churn — "where does the tax money GO?" was the one owner-probe-family question nobody asked (pre-write diff proved it uncovered). Free quick scan brings outsiders in; burn-gated deep-scan funnel intact. Read-only RPC against the existing public endpoint — zero wallet/signing/data-source/mascot touch, no new data sources, no new contracts.
- **Site health:** / /scan /burn /plan all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution. #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10/#13 stay open as recurring.

## 2026-09-29 15:53 — deep-scan discovery audit + demand-surface re-verification (#8 bullish-demand research, research-only, no ship)

- **Site health:** / /scan /burn /plan /raid /ai /trade all 200 on the custom domain. /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since 03:50, honest, still traffic/distribution (eighth confirmation of the 09:23 reasoning).
- **Deep-scan discovery audit (genuine — the hypothesized gap did not exist):** traced the placement question in src because the in-flow DeepScanPanel mounts only after a quick scan of a token with a WPLS pair (`{result.pair && ...}` inside `{result && ...}` in TokenScanner.tsx). Hypothesized that cold /scan visitors never learn the deep scan exists. FALSE — scan.tsx:118-138 carries an unconditional static teaser in the default view ("Deep scan is live — burn-gated", names the deliverable, the 100,000 DUMB burn price, on-chain verification before the report renders, supply-shrink rationale) with a "Burn DUMB on the burn page" link to /burn, where the 30-day pass + PLS fallback live. The 13:13 deliberate decision stands confirmed again: the teaser stays lean, pass/PLS paths live in the panel + /burn (teaser job is discovery, not the full manual).
- **Demand surfaces re-verified in served SSR:** hero "Scan any token" CTA (1 hit, 10:03 refunnel intact), /scan deep-scan teaser block (1 hit), "No address handy? Try DUMB" chip (1 hit). Share-report copy re-audited in src (TokenScanner.tsx:336-416): counts-only text (red flags/cautions), no enumerated checks — the 5m probe family ships flow through the counts automatically, nothing undersold, nothing to churn.
- **Considered and REJECTED:** (1) quick-scan brag-card image export (static image of a scan result, mirroring /api/brag-image) — REJECTED per the 13:53 staleness precedent: the brag image works for burns because a burn is an immutable on-chain fact; scan results change with contract state, so a static card can lie after re-scans. The share LINK (re-runs live, can never go stale) is the more honest surface. (2) a Telegram scanner bot in t.me/dumbmoneydotwin — REJECTED: new infra surface the loop would have to staff and reply through in Antonio's community space (outbound-comms-adjacent, spam-feel risk), the site scanner already works with no wallet, and with 3 deep scans/30 days there is no demand signal for a second surface. (3) "scan of the day" featured token on /scan — REJECTED: endorsement optics on a neutral safety tool; the curated list exists for swap-box safety, never as buy signals — featuring one token would be read as a recommendation. (4) watchlist push alerts — REJECTED: needs push infrastructure (new external dependency, hard-boundary territory), speculative churn with no demand evidence. (5) curated-token chip row on /scan (13 chips beyond Try DUMB) — REJECTED: 13 tokens crowd the primary input, Try DUMB covers the demo affordance, and each chip is drive-by RPC temptation for no measurable discovery gain (the input already accepts any address). Zero wallet/signing/data-source/mascot touch. #8 stays open as recurring; #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 16:23 — "Owner rescue/withdraw power" probe design pass (#13 real-utility research, research-only → RESOLVED: shipped 16:43)

- **DESIGN PASS (not shipped this run): the "Owner rescue/withdraw power" probe (5n)** — the last classic Safemoon-fork owner vector the scanner family doesn't name. The family now covers 5a–5m + #6 (pause): mint, blacklist, limit-setter, cooldown, txlimit-exemption, trading-toggle, fee-setter, fee-setter-anyone, fee exemption (getter), fee-exclusion setter, fee-wallet redirect. What it never asks: can the live owner pull accumulated VALUE out of the contract? A rescue/withdraw function (withdrawStuckETH, sweepToken, transferForeignToken-class) lets a live owner drain the tax pool the holders funded — the slow-rug "tax jar" drain. DUMB's own buckets are entombed (engine dead, owner renounced), but the scanner's job is arbitrary pasted addresses.
- **THE GAP (genuine, not churn — pre-write diff, the 09:53 standing lesson):** zero rescue/withdraw coverage in token-scan.ts (no withdrawstuck / sweeptoken / rescue / transferforeign / recovererc20 hits). Shapes grounded in documented fork-auditor checklists: withdrawStuckETH() (the Safemoon-canonical no-arg drain), withdrawStuckETH(address), withdrawStuckTokens(address), rescueTokens(address,uint256), transferForeignToken(address,uint256), recoverERC20(address,uint256).
- **GROUND TRUTH (read-only recon, live RPC):** INC (live owner 0xb2ca4a66d3e57a5a9a12043b6bad28249fe302d4) + WBTC (live owner 0xca06411bd7a7296d7dbdd0050dfc846e95febeb7) — all 6 candidate shapes reverted honestly under owner impersonation on both; zero machinery in the curated set, zero false-positive risk there. DUMB (owner 0x0) reverts too but skips anyway (renounced).
- **SETTLED DESIGN for the future ship run:** 6 shapes probed via read-only eth_call impersonating the live owner, selectors via keccak256, inside `if (liveOwner)` — renounced/absent owners skip. FAIL-SAFE args: no-arg withdrawStuckETH() has nothing to choose (eth_call never executes); (address) shapes take the dead address (impossible executed case sends value to burn, never a thief — and if the arg reads as a token address, the contract holds no dead-token balance); (address,uint256) shapes take (dead address, 1 wei) — negligible either way, and 1 wei avoids any future reader mistaking the probe for an executable drain. Matrix: permissive-fallback control gates FIRST → unknown (no getter note to suppress — no getters in this probe, so the 5l-suppression lesson is trivially honored); setter hit → warn; all-revert → pass with the family custom-names-plus-rejected-test-value caveat; all-noise → unknown ("treat as risky"). RPC budget 7 typical / 13 worst case (6 shapes × ≤2 attempts + 1 control) — bounded, the cheapest owner probe in the family.
- **Warn copy posture (the 15:23 R5 precedent, carried forward):** capability level, never accusation — "the owner can pull accumulated PLS or tokens out of the contract." Sweeping airdropped dust is legitimate contract hygiene and the scan can't see whether the contract holds fee value, so the report describes power, not theft. The warn names the hit shape; the unknown branch names NO rescued balance (the scan doesn't read the contract's balance — don't invent a figure).
- **Considered and REJECTED in the design:** (1) probing with a REAL token + meaningful amount — rejected: adds nothing (eth_call never executes) and a large amount in the source could mislead a future reader into thinking execution is possible; dead + 1 wei is the fail-safe reading. (2) Two-arg (token, to, amount) variants — rejected: land in pass-with-caveat like 5m's two-arg share-split rejection; the six single-shape family covers the documented canonical set. (3) Naming which specific balance is at risk in the warn — rejected: the scan doesn't read the contract's PLS/token balances (more RPC, new failure modes); capability-level copy stays honest. (4) A getter pair (e.g., reading the contract's own balance to make the warn concrete) — rejected for now: balance ≠ drainability (a contract can hold value with no rescue function; a rescue function can exist on an empty contract); machinery-existence is the honest warn, same as 5c/5e/5f.
- **PRE-SHIP VALIDATION (required of the future ship run):** (1) pre-write diff re-confirm zero rescue/withdraw coverage; (2) independent arg-encoding check — 6 distinct keccak256 selectors, correct calldata lengths (4B / 36B / 68B), fail-safe args round-trip; (3) shipped quickScan run end-to-end in node against live RPC — DUMB (renounced → check absent), INC + WBTC (live owners → present, pass-with-caveat, matching this run's recon); (4) ROADMAP "Token safety scanner" line (dump.ts) + both Dumb AI scanner answers (dump.ts AI_QA, knowledge.ts) extended in each surface's own words; (5) tsc + eslint clean, build, deploy to dump-money-hub-preview, served-bundle verification on the custom domain.
- **DEFERRED to its own build run** per the 10:33/11:23/13:03 precedent (design → review → ship). Next in the chain: a #9 adversarial review, then the #13 ship.
- **Site health:** / /scan /burn /plan all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution (eleventh confirmation of the 09:23 reasoning). Zero wallet/signing/data-source/mascot touch, no new data sources. #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10/#13 stay open as recurring.

## 2026-09-29 16:53 — scanner depth audit + demand-surface re-verification (#8 bullish-demand research, research-only, no ship)

- **Site health:** / /scan /burn /plan /raid /ai /trade all 200 on the custom domain. /api/scan-stats still {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} — flat since 03:50, honest, still traffic/distribution (twelfth confirmation of the 09:23 reasoning).
- **Post-5n scanner depth audit (genuine — the owner-probe family is now the demand hook):** the 16:43 ship put the 5n rescue/withdraw probe live, so the quick scan now carries the full 5a–5n owner-power family plus the trading-toggle #6-corroboration fix. Audited whether the demand surfaces reflect that depth or silently undersell it: (1) share-report copy (TokenScanner.tsx:352-416) is counts-only (`result.checks.filter(c => c.status === "fail"/"warn")`) — fully dynamic, so 5n flows through the counts with zero churn; nothing enumerated to update, nothing undersold (the 15:53 finding holds). (2) Hero funnels: served / SSR carries 3 /scan links — nav, the "Scan any token" CTA (10:03 refunnel intact), and a feature card — the scanner is the only utility with a hero button; swap/burn keep their own. (3) /scan cold view: "Deep scan is live — burn-gated" teaser live in served SSR with the Try DUMB chip — the deep-scan funnel (teaser → /burn pass + PLS fallback) is intact for visitors who never run a quick scan.
- **No stale copy found:** ROADMAP + both Dumb AI scanner answers were extended for 5n in the 16:43 ship; no roadmap/AI churn needed this run (the 16:13 #10 verified the pre-5n state and the 16:43 ship carried its own extensions — correctly one surface change per ship, no double-churn).
- **Considered and REJECTED:** (1) naming a probe count ("14 owner-power probes") on the hero or teaser — REJECTED: the count shifts every few runs (three owner probes shipped in ~6 hours today); a static number goes stale immediately and earns per-run churn. The counts-only share copy is the correct dynamic surface. (2) A "what's new in the scanner" changelog block on /scan — REJECTED: the ROADMAP line on /plan already documents each probe as it ships (verified in the 16:43 ship); a second list is redundant and would double the per-ship surface updates. (3) Reaching PulseChain community devs/users off-site about the scanner (e.g., posting in external groups) — REJECTED: outbound comms as the project is a hard boundary; discovery runs through the site, share links, and Antonio's own channels. (4) Lowering the 100k-DUMB deep-scan price for demand — stands REJECTED from 15:13 (no baseline to optimize against; the friction is the burn step + discovery, not the amount).
- **Site health recap:** all 7 routes 200, scan-stats flat, zero wallet/signing/data-source/mascot touch. #8 stays open as recurring; #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 17:03 — first real traffic read + DeepScanPanel gating audit (#8 bullish-demand research, research-only, no ship)

- **DeepScanPanel gating audit (genuine — the hypothesized gap did not exist):** the panel mounts only when `result.pair` is truthy (TokenScanner.tsx:305). Hypothesized that a token with no WPLS pair leaves the user with no deep-scan path and no explanation. FALSE on both counts: the quick scan already reports "No token/WPLS pair on PulseX — it can't be traded through the flagship router." as a liquidity warn (token-scan.ts:1975-1986), and deepScan()'s no-pair branch is a defensive fallback the UI path never reaches — correct, because the deep scan's entire value is the simulated round-trip, which can't exist without liquidity. Gating is the honest design; nothing to fix.
- **Copy-freshness audit (genuine):** all three scanner copy surfaces carry the 5n rescue/withdraw probe — ROADMAP line (dump.ts:231), Dumb AI scanner answer (dump.ts:388), knowledge.ts scanner body (:64). No stale enumeration anywhere; no churn.
- **First real traffic read (KV counters, read-only, the established digest-cron pattern):** 2026-09-28: 93 pageviews / 54 events; 2026-09-29 (through ~17:06 ET): 88 pageviews / 37 events. Country spread: 09-28 US 55 + 6 countries (ID 15, PH 10, CA/NL 6, QA 2, MY 1); today US 81 + 6 countries — genuine multi-country human traffic, not just Antonio's own testing. Per-page today: / 29, /burn 16, /scan 9, /wallet 9, /proof 6, /trade 5 — the burn funnel and the scanner get real eyes. Events today: wallet_connect 31 (dominant), swap_quote 4, bag_scan 1, copy_contract 1 — real feature use. (Caveat: two days is no baseline; some of the 31 connects may be Antonio's own live test trading.)
- **Thesis update:** the 09:23 "flat = traffic/distribution" finding gains its first positive reading — small-but-real traffic with real interactions, and no conversion-surface defect in sight. Distribution remains the bottleneck; no surface change is justified by conversion data.
- **API note:** the Workers Observability telemetry query's `"view":"logs"` (as written in the repo AGENTS.md pattern) now returns 400 — valid views are traces/events/calculations/invocations/requests/agents; neither events nor invocations surfaced the console.log lines, consistent with the documented caveat that zero events may mean no ingestion. The KV counters are the reliable traffic source. Correction added to the repo AGENTS.md.
- **Considered and REJECTED:** (1) acting on the 31/day wallet_connect count (e.g., nudging connected wallets toward burns) — REJECTED: can't separate Antonio's testing from community use; two days is no baseline; revisit when the weekly digest gives a baseline. (2) in-site "share the hub" prompts on /burn or /scan — REJECTED: share surfaces already exist per-context (brag cards, report links); a generic prompt would be outbound-feel churn with no evidence it's the bottleneck. (3) lowering the deep-scan price — stands REJECTED from 15:13 (no baseline; today's traffic shows the scanner already gets eyes — the price was never the friction evidence).
- #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring. Zero wallet/signing/data-source/mascot touch.

## 2026-09-29 17:13 — post-ship adversarial review of the 5n "Owner rescue/withdraw power" probe (#9 security pass, audit-only → APPROVED, no revisions)

- **SCOPE:** adversarial review of the 16:43 #13 ship (the 5n probe in token-scan.ts, shipped design → 16:33 review → 16:43 ship), per the 15:43 → 16:03 review-of-ship precedent. All five pre-ship validation claims independently verified, not trusted from the ship log.
- **VERDICT: APPROVED, no required revisions.** The ship is exactly what the 16:33 design and 16:43 log claimed.
- **Independently verified:** (1) the pre-write diff claim — the 5n block (token-scan.ts ~1800-1910) is genuinely new code; zero pre-existing rescue/withdraw coverage; (2) arg encoding computed fresh in node: 6 distinct keccak256 selectors (0xf5648a4f, 0xd201b01e, 0xcb963728, 0x57376198, 0xd28e3ed4, 0x8980f11f) matching the ship log exactly, calldata 4B/36B/36B/68B/68B/68B with the dead-address + 1-wei fail-safe args; (3) all four 16:33 ship-run notes honored — check id `owner-rescue-withdraw`, family pass-caveat wording adapted verbatim, PLS-vs-tokens tailoring in the warn per shape arity (no-arg → "PLS", address-taking → "tokens"), block placed after 5m before #6 pause; (4) ROADMAP line (dump.ts:231) + both Dumb AI scanner answers (dump.ts:388, knowledge.ts) carry the 5n clause in each surface's own words, no drift; (5) served-bundle verification on the custom domain — live scan chunk BurnBragCard-BSdvZfJd.js carries the check id ×4, the title ×4, all 6 sigs, the fail-safe caveat, and the full warn copy; /plan SSR carries the roadmap clause.
- **The 14:03-class hunt (missed defects): none found.** Reviewed for the failure modes that have bitten this family before: (a) fail-safe args hold — the dead address is non-zero (zero-checks pass) and 1 wei can never read as a real drain, so the impossible executed case can only burn, never steal; (b) the permissive-fallback control runs FIRST and breaks the probe loop before any selector call — no wasted RPC, no garbage-state warn possible; (c) revert→absent / noise→unknown triage with one retry, matching the family; (d) warn stays at capability level — names the power and the hit shape, never a rescued balance, never an accusation (the R5 posture holds); (e) the whole block sits inside `if (liveOwner)` — renounced tokens skip; (f) RPC budget matches the 16:23 design's 7 typical / 13 worst. No 12:43-style mislabel (foundSig can only be one of the 6 rescue shapes — no getter/setter confusion is possible in this probe). No 14:03-style hidden contradictory evidence (the pass caveat names the blind spots it has).
- **Family-wide residuals noted (NOT required revisions — a redesign touches all owner probes, not this ship, per the 11:33/12:43 standing):** (R1) selector collision — a real function whose 4-byte selector collides with one of the 6 rescue selectors would read as "found" and earn a warn (not a fail — the honest-ish bucket; the family has this exposure on every probe); (R2) balance-gated rescues (require(balance>0)) on currently-empty contracts revert into the pass caveat, whose "reject the probe's fail-safe test value" half doesn't literally cover the no-arg shape (there is no test value) — honest at scan time (nothing to pull), but worth one sentence in the shared caveat if the family is ever revised together. Filed here, not in code, to avoid per-ship churn.
- **Site health:** / /scan /burn /plan all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution (thirteenth confirmation of the 09:23 reasoning). Zero wallet/signing/data-source/mascot touch, no new data sources. #9 stays open as recurring; #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#10/#13 stay open as recurring.

## 2026-09-29 18:53 — second real traffic read + post-ship live verification of the 5o null-guard (#8 bullish-demand research, research-only, no ship)

- **Post-ship live verification (genuine — closes the 18:33 finding):** the 18:47 #13 ship's one-line null-guard fix for the both-sides 5o pass-branch crash was verified in the SERVED bundle, not trusted from the deploy log: live scan chunk BurnBragCard-CQBYZ6Dj.js (new hash from the 18:47 deploy) carries the check id `measured-tax`, the title "Buy/sell tax, measured", the null-guard copy "exposes no tax getters claiming otherwise", the direction-aware fail copy "cheap to enter, expensive to leave", the sell-side blind-spot caveat "don't emit transfer events", and the thin-history honesty line "thin history is not proof of fairness" — plus the 5n `owner-rescue-withdraw` block intact through the same deploy. The 18:33 → 18:43 → 18:47 chain (found → deferred → fixed) is now fully closed, end to end, at the user-served layer.
- **Second real traffic read (KV counters, read-only, the digest-cron pattern):** 2026-09-28: 93 pageviews / 54 events (unchanged on recount — the 17:03 run's day was final); 2026-09-29 through ~18:55 ET: 224 pageviews, 81 events. Country spread: yesterday US 55 + ID 15 + PH 10 + CA/NL 6 + QA 2 + MY 1; today US 196 + 6 countries (CA/ID/MY/PH/SE 1–2). Per-page today: / 41, /scan 28, /burn 22, /whitepaper 14, /wallet 14, /ai 13, /proof 13, /raid 10, /trade 10, /roots 9, /genesis 8, /story 7, /plan 6, /feedback 5, plus long-tail docs pages (1–2 each — crawlers share the same keys, honest caveat). Events today: wallet_connect 57, scan_started 4, swap_quote 4, quick_scan 3, raid_play 3, copy_contract 3, plus singletons: deep_scan 0-but-`burn_voluntary` 1, bag_scan 1, watchlist_toggle 1. Thesis update: today's numbers are heavily confounded — Antonio's own $20 Pro-payment session(s) plus the two external first-time-user auditors he has running mean most of the 57 connects and the new singletons cannot be read as community behavior. NO demand conclusion drawn; the 09:23 "flat = traffic/distribution" finding stands untouched until the weekly digest gives a baseline. /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest.
- **Demand-surface audit:** all demand surfaces for the shipped scanner probes are current — 18:43 verified ROADMAP + both Dumb AI answers carry the 5o measured-tax clause in each surface's own words; share-report copy is counts-only and fully dynamic (5n/5o flow through with zero churn). No undersell found, no churn.
- **Considered and REJECTED:** (1) a visible "deep scans so far" count badge on /scan — REJECTED: 3 scans in 30 days is honest but reads as low adoption (anti-marketing), and no evidence a badge drives demand — the lever is distribution, per the 09:23 reasoning; revisit only with a real baseline. (2) promoting the measured-tax probe more loudly on /scan cold view — REJECTED: the cold view already carries the "Deep scan is live — burn-gated" teaser + Try DUMB chip (re-verified live by the 16:53 audit); the 5o probe is an in-report check, not a traffic driver. (3) acting on the /ai page's 13 views (highest non-funnel utility page today) — REJECTED: same confound as above (Antonio's Pro testing); the Pro pay/auth work is outside this loop's charter anyway (hard boundary — the loop's AI surfaces were verified intact through the concurrent deploy, zero collision). (4) lowering the deep-scan price — stands REJECTED from 15:13 (no baseline; traffic shows the scanner gets eyes — price was never the friction evidence).
- Site health: / /scan /burn /plan /ai all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 19:03 — #9 security pass: the 5o null-guard ship reviewed clean, one structural residual filed (#9, audit-only, no ship)

- **Review of ship:** the 18:47 #13 one-line fix (both-sides pass branch null-guard, token-scan.ts:2203) is correct in src and verified in the served bundle (live chunk BurnBragCard-CQBYZ6Dj.js carries the guard copy). Exhaustive sweep of the whole 5o block (1906–2248) for the 18:33 defect class (tsc-invisible null crashes): every f1(claimed) call site null-guarded, every buy/sell access narrowed, taxPct division-by-zero impossible (gross > 0n guard), all RPC reads via retrying tryRead (never throw), null log rows skipped. Zero remaining crash instances — mechanically verified.
- **Structural residual FILED for a quiet run (not fixed — concurrent AI-subsystem window was hot):** the 5o block has no enclosing try/catch (verified directly — per-probe tries close before line 1906; the caller's catch in TokenScanner is the only net). A future probe-internal throw degrades to a failed scan with the copy "The scan failed — the RPC didn't answer", which misattributes a code bug as an RPC outage. Recommendation: wrap the block so a throw degrades to an "unknown" measured-tax check (the block's own honest vocabulary) and soften the caller copy. Small, safe, queued for the next quiet run.
- **Considered and REJECTED this run:** (1) fixing the residual immediately despite the hot concurrent window — REJECTED: the last five runs kept the no-collision rule; the concurrent AI-subsystem edits were live minutes before run start; audit-only is the correct posture. (2) Acting on the external first-time-user auditors — nothing to act on; their findings haven't arrived yet. (3) Any scanner-demand conclusion from /api/scan-stats — still flat since 03:50, honest; the 09:23 traffic/distribution reasoning stands.
- Site health: / /burn /plan /ai /trade 200; served scan chunk byte-unchanged from the 18:47 deploy (the concurrent AI process has not redeployed since — scanner surfaces exactly as the 18:53 run verified). Zero wallet/signing/data-source/mascot touch. #9 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#10/#13 stay open as recurring.

## 2026-09-29 19:33 — #13 real-utility research: next-probe restraint + queued 5o residual re-verified (audit-only, no ship)

- **Queued 5o try/catch residual re-verified still real in src:** zero try/catch spans the 5o block (token-scan.ts 1906–2248, directly re-measured this run — 0 catch hits); caller copy "The scan failed — the RPC didn't answer. Try again in a moment." still at TokenScanner.tsx:148. The fix unit (wrap the block so an internal throw degrades to an "unknown" measured-tax check in the block's own honest vocabulary + soften the caller copy) stays queued for the next post-deploy quiet window: the concurrent AI-subsystem process still hasn't deployed (served /scan chunk is still the loop's 18:47 BurnBragCard-CQBYZ6Dj.js, byte-unchanged), so a loop deploy would ship another agent's uncommitted work. No src writes, no deploy.
- **Considered and REJECTED / HELD:** (1) designing the next scanner probe now — HELD: the owner-power family is complete through 5o + measured tax; inventing the next probe without first-timer input risks depth nobody asked for, and Antonio's two external first-time-user auditors are reviewing the hub now — their findings (not arrived yet, checked today's memory log) are the input Antonio wants sifted first. (2) applying the 5o residual fix to src without deploying — REJECTED: creates uncommitted state in a tree another agent is actively working in; zero user benefit until a deploy ships it; the queued unit's own condition was a post-deploy quiet window. (3) any scanner-demand conclusion from /api/scan-stats — still flat since 03:50, honest; the 09:23 traffic/distribution reasoning stands.
- Site health: / /scan /burn /plan /ai 200; scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}). Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-29 19:43 — #8 bullish-demand research: third traffic read + demand-surface re-audit (research-only, no ship)

- **Third real traffic read (KV counters, read-only, digest-cron pattern):** 2026-09-29 through ~19:45 ET: 227 pageviews / 80 events (vs 224/81 at ~18:55 — essentially flat evening). Country spread: US 199 + 6 others (ID 2, CA/MY/PH/SE 1). Per-page: / 41, /scan 30, /burn 22, /ai 14, /whitepaper 14, /wallet 14, /proof 13, /trade 10, /raid 10, /roots 9, /genesis 8, /story 7, /plan 6, /feedback 5, long tail 1–2 each. Events: wallet_connect 60 (dominant), scan_started 4, swap_quote 4, quick_scan 3, raid_play 3, copy_contract 3, singletons: bag_scan 1, burn_voluntary 1, watchlist_toggle 1. Thesis unchanged: evening window is dead quiet; the 09:23 "flat = traffic/distribution" reasoning stands for the third straight read; no demand conclusion drawn — still confounded by Antonio's own Pro testing + the two external auditors' sessions today.
- **Demand-surface re-audit (genuine, non-churn):** the served scan chunk is byte-identical to the 18:47 ship (verified by chunk hash) and src is byte-static outside the concurrent AI-subsystem tree — so every surface claim the 18:53 audit verified current is still current: ROADMAP measured-tax clause, both Dumb AI scanner answers, share-report counts-only copy, /scan cold-view teaser + Try DUMB chip. Nothing undersells the 5n/5o ships; nothing drifted.
- **Considered and REJECTED:** (1) acting on the wallet_connect 60 count or the /ai 14 views — REJECTED: same confound as the 18:53 entry (Antonio's testing + auditor sessions); the AI subsystem is outside this loop's charter anyway. (2) any "evening is quiet — promote now" demand move — REJECTED: outbound comms are a hard boundary; in-site nudges have no baseline behind them and would be churn. (3) designing scanner demand hooks ahead of the auditor findings — REJECTED per the 19:33 hold: the auditors' first-timer input is what Antonio wants sifted first; inventing hooks now risks answering questions nobody asked. (4) any deep-scan badge/price/teaser change — stands REJECTED from 15:13/18:53.
- Site health: / /scan /burn /plan /ai /trade all 200; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest. The concurrent AI-subsystem process still has NOT deployed (served chunk remains the 18:47 BurnBragCard-CQBYZ6Dj.js) — its unshipped edits remain in the tree, so the no-collision rule held again: zero src writes, zero deploys. Zero wallet/signing/data-source/mascot touch. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 20:23 — #13 real-utility research: served-ship integrity + holds re-confirmed (audit-only, no ship)

- **Post-deploy served integrity re-verified independently:** the live scan chunk BurnBragCard-CQBYZ6Dj.js (the loop's 18:47 deploy, byte-stable — the concurrent AI-subsystem process edited src at 19:47–20:00 ET but has NOT deployed) carries measured-tax ×4, "Buy/sell tax, measured" ×5, the 5o null-guard copy "exposes no tax getters claiming otherwise" ×1, the direction-aware fail copy "cheap to enter, expensive to leave" ×1, "thin history is not proof of fairness" ×3, and the 5n owner-rescue-withdraw block ×4 — occurrence counts match the 20:13 verification exactly. The 18:47 ship is intact at the user-served layer through the whole evening's concurrent activity.
- **Queued 5o try/catch residual re-verified still real in src:** 0 catch hits in token-scan.ts 1906–2248 (directly re-measured); misattributing caller copy "The scan failed — the RPC didn't answer" still at TokenScanner.tsx:148; the 5o null-guard fix intact (:2206) and the 5n block present. The wrap-to-unknown + copy-softening fix stays queued for the post-deploy quiet window.
- **Considered and REJECTED / HELD:** (1) designing the next scanner probe — HELD per the 19:33 decision: the owner-power family is complete through 5o + measured tax; the two external first-time-user auditors' findings STILL not arrived (today's memory log checked) — inventing the next probe without their input risks depth nobody asked for. (2) fixing the 5o residual now despite the hot concurrent window — REJECTED: rag.ts/AiPreview.tsx/ChatMarkdown.tsx/knowledge.ts all touched within 36 min of run start; the no-collision rule held all evening and held again. (3) any scanner-demand conclusion from /api/scan-stats — flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}), honest; the 09:23 traffic/distribution reasoning stands.
- Site health: / /scan /burn /plan /ai /trade all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-29 20:33 — #8 bullish-demand research: fourth traffic read + demand-surface re-audit (research-only, no ship)

- **Fourth real traffic read (KV counters, read-only, digest-cron pattern):** 2026-09-29 through ~20:45 ET: 230 pageviews / 83 events (vs 227/80 at ~19:45 — +3/+3 in an hour; dead-quiet evening continues). Country spread: US 202 + ID 2, CA/MY/PH/SE 1 each. Per-page: / 41, /scan 32, /burn 22, /ai 15, /wallet 14, /whitepaper 14, /proof 13, /raid 10, /trade 10, /roots 9, /genesis 8, /story 7, /culture 6, /plan 6, /feedback 5, long tail 1–2 each. Events: wallet_connect 63 (dominant), scan_started 4, swap_quote 4, copy_contract 3, quick_scan 3, raid_play 3, singletons: bag_scan 1, burn_voluntary 1, watchlist_toggle 1. Thesis unchanged for the fourth straight read: the 09:23 "flat = traffic/distribution" reasoning stands; no demand conclusion drawn — still confounded by Antonio's own Pro testing + the two external auditors' sessions today.
- **Demand-surface re-audit (genuine, non-churn):** the served scan chunk is byte-identical to the 18:47 ship (chunk hash BurnBragCard-CQBYZ6Dj.js, re-fetched and hash-matched this run) and src is byte-static outside the concurrent AI-subsystem tree — so every surface claim verified current since 18:53 is still current: ROADMAP measured-tax clause, both Dumb AI scanner answers, share-report counts-only copy, /scan cold-view teaser + Try DUMB chip. Nothing undersells the 5n/5o ships; nothing drifted.
- **Queued 5o try/catch residual re-verified still real:** 0 catch hits in token-scan.ts 1906–2248 (directly re-measured); misattributing caller copy still at TokenScanner.tsx:148; 5o null-guard fix intact; the wrap-to-unknown + copy-softening fix stays queued for the post-deploy quiet window — the concurrent AI-subsystem process STILL has not deployed (its unshipped src edits from 19:47–20:00 ET remain in the tree), so the no-collision rule held: zero src writes, zero deploys.
- **Considered and REJECTED:** (1) drawing a demand conclusion from the +3/hour drift — REJECTED: statistically meaningless and confounded; (2) any outbound or in-site demand move — REJECTED per 19:43 (hard boundary on outbound comms; no baseline for nudges); (3) scanner demand hooks ahead of auditor findings — REJECTED per the 19:33 hold (findings STILL not arrived — today's memory log checked); (4) fixing the 5o residual during the hot window — REJECTED: last eight runs kept the no-collision rule.
- Site health: / /scan /burn /plan /ai /trade all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 21:03 — #13 real-utility research: served-ship integrity + holds re-confirmed (audit-only, no ship)
- **No-collision rule held:** the concurrent AI-subsystem process's unshipped src edits (AiPreview.tsx, TokenScanner.tsx, knowledge.ts, dump.ts, rag.ts, ai-pro.ts, pro.ts — touched 17:03–20:00 ET) are still in the tree; served /scan still references the loop's 18:47 chunk BurnBragCard-CQBYZ6Dj.js (hash-matched this run) → zero src writes, zero deploys this run.
- **Queued 5o try/catch residual re-verified STILL REAL in src:** 0 `catch` hits in token-scan.ts 1906–2248; misattributing caller copy "The scan failed — the RPC didn't answer. Try again in a moment." still at TokenScanner.tsx:148; 5o null-guard fix intact ("exposes no tax getters" ×1); 5n owner-rescue-withdraw block present (×4). Fix (wrap 5o → "unknown" measured-tax check + soften caller copy) stays queued for the post-deploy quiet window.
- **No claim drift through the concurrent edits:** ROADMAP "Token safety scanner" line (dump.ts:231), Dumb AI scanner answer (dump.ts:388), and knowledge.ts scanner chunk (:64) all still carry the 5o measured-tax clause in each surface's own words — the concurrent knowledge.ts 19:47 ET edit did not strip it.
- **Next-probe design hold STANDS:** the external first-time-user auditors' findings still have not arrived (today's memory log checked) — designing beyond the complete 5a–5o owner-power family + measured tax would be depth nobody asked for.
- Site health: / /scan /burn /plan /ai /trade 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-29 21:13 — #8 bullish-demand research: fifth traffic read + deep-scan funnel friction found (research-only, no ship)

- **Fifth real traffic read (KV counters, read-only, digest-cron pattern):** 2026-09-29 (UTC key day) through ~21:15 ET: 230 pageviews / 83 events — byte-identical to the 20:33 read (~20:45 ET), i.e. ~zero activity in 30 minutes; the dead-quiet evening continues. / 41, /scan 32, /burn 22, /ai 15, /wallet 14, /whitepaper 14, /proof 13; events wallet_connect 63, scan_started 4, swap_quote 4, quick_scan 3; US 202 + 5 countries. Thesis unchanged for the fifth straight read: the 09:23 "flat = traffic/distribution" reasoning stands; no demand conclusion — still confounded by Antonio's Pro testing + auditor sessions.
- **GENUINE FUNNEL FRICTION FOUND (filed as a queued fix, not shipped):** the /scan cold-view teaser (`src/routes/scan.tsx` ~117–136) reads "…It costs a 100,000 DUMB burn to the dead address (verified on-chain before the report renders)…" and its CTA is "Burn DUMB on the burn page" → /burn. But the purpose-built deep-scan burn flows — one-click wallet burn, PLS fallback, manual tx-hash paste — live INSIDE the DeepScanPanel, which only renders after a quick scan of a token with a WPLS pair. The /burn page's BurnBox has zero deep-scan references (verified: no "deep scan" string in BurnBox.tsx or burn.tsx), burns any amount, and `verifyScanBurn` (token-scan.ts:2671+) hard-requires ≥ 100,000 DUMB arrival. So the teaser's CTA misdirects the funnel: a cold visitor who follows it can (a) burn an arbitrary amount on /burn and learn the hard way it unlocks nothing, or (b) burn 100k+ there and discover — with no on-page guidance — that they must come back and paste the tx hash into the panel's manual box. The honest fix: repoint the teaser's CTA at the in-panel flow ("run any quick scan above — the deep-scan panel then walks you through the one-click 100,000 DUMB burn") and drop the /burn link (or demote it to a secondary "burn any amount" link for pure burns). NOT SHIPPED THIS RUN: the concurrent AI-subsystem process's unshipped edits (TokenScanner.tsx among them, touched 17:03–20:00 ET) remain in the tree — a loop deploy now would push another agent's uncommitted work to the preview worker. Fix stays queued with the 5o try/catch residual for the post-deploy quiet window.
- **Demand-surface freshness re-confirmed:** served /scan still references the loop's 18:47 chunk BurnBragCard-CQBYZ6Dj.js (hash-matched this run) — the concurrent process still has NOT deployed; src quiet 40+ min. Nothing drifted since the 18:53 claim-verifications; the queued 5o try/catch residual re-verified STILL REAL (0 catch hits in token-scan.ts 1906–2248; misattributing caller copy at TokenScanner.tsx:148).
- **External first-time-user auditor findings STILL not arrived** (today's memory log checked) — the 19:33 next-probe design hold stands.
- **Considered and REJECTED:** (1) any demand move on the flat 230/83 numbers — statistically meaningless, confounded; (2) outbound/in-site demand nudges — hard boundary + no baseline (per 19:43); (3) a deep-scan price or teaser-copy change — stands rejected from 15:13/19:43 (the funnel defect above is a misdirected CTA, a defect fix, not a persuasion tweak); (4) touching scan.tsx or shipping anything this run — the unshipped concurrent tree makes any loop deploy a clobber risk; (5) scanner demand hooks ahead of the auditor findings — per the 19:33 hold.
- Site health: / /scan /burn /plan /ai /trade all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 21:53 — #8 bullish-demand research: sixth traffic read + share-funnel verification (research-only, no ship)

- **No-collision rule held:** the concurrent AI-subsystem process is HOT (rag.ts 21:24 ET, ai-chat.ts 21:23 ET, AiPreview.tsx 21:22 ET — all within ~30 min of run start) and its unshipped edits remain in the tree (served /scan still references the loop's 18:47 chunk BurnBragCard-CQBYZ6Dj.js, hash-matched this run) → zero src writes, zero deploys.
- **Sixth real traffic read (KV counters, read-only, digest-cron pattern):** 2026-09-29 through ~21:55 ET: 230 pageviews / 83 events — byte-identical to the 21:13 read, i.e. ~zero activity in 40 minutes; the dead-quiet evening continues. / 41, /scan 32, /burn 22, /ai 15, /wallet 14, /whitepaper 14, /proof 13; events wallet_connect 63 (dominant), scan_started 4, swap_quote 4, copy_contract 3, quick_scan 3, raid_play 3, singletons bag_scan 1 / burn_voluntary 1 / watchlist_toggle 1; US 202 + 5 countries. Thesis unchanged for the sixth straight read: the 09:23 "flat = traffic/distribution" reasoning stands; no demand conclusion — still confounded by Antonio's own Pro testing + the two external auditors' sessions.
- **Share-funnel verification (genuine, non-churn — read-only):** the quick-scan share path is fully wired and needs no fix: a "Share this report" section renders after every quick scan (NativeShareButton + Post to X + Share to Telegram, TokenScanner.tsx:352–400), and shared `?token=` links auto-run the scan for the viewer (lines 115–183) with honest counts-only copy. Deep-scan `&burn=` links re-verify the burn on-chain before rendering — no fabricated-report vector. No share gap filed.
- **Queued fixes still waiting for the post-deploy quiet window:** (1) the 21:13 /scan cold-teaser CTA repoint (misdirected deep-scan funnel — one-click burn flows live inside DeepScanPanel, not on /burn); (2) the 5o try/catch residual (0 catch hits in token-scan.ts 1906–2248; misattributing caller copy at TokenScanner.tsx:148 — stays #9's unit, noted here for completeness).
- **External first-time-user auditor findings STILL not arrived** (today's memory log checked — latest entry is the 21:43 loop run) — the 19:33 next-probe design hold stands.
- **Considered and REJECTED:** (1) a public "most-scanned tokens" wall on /scan — REJECTED: scanner counts are confounded by Antonio's testing + the auditor sessions (would present fabricated enthusiasm), today's real counts are tiny (quick_scan 3), so it would read as low adoption; same rejection class as the deep-scan count badge. (2) any outbound or in-site demand nudge on the flat 230/83 numbers — REJECTED: hard boundary on outbound comms; no baseline for nudges (per 19:43). (3) scanner demand hooks ahead of the auditor findings — REJECTED per the 19:33 hold. (4) touching src or shipping this run — REJECTED: the hot concurrent tree makes any loop deploy a clobber risk.
- Site health: / /scan /burn /plan /ai all 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 22:13 — #13 real-utility research: queued-residual re-verification + no claim drift (research-only, no ship)

- **No-collision rule held:** the concurrent AI-subsystem process is HOT (rag.ts 21:24 ET, ai-chat.ts 21:23 ET, AiPreview.tsx 21:22 ET — ~49 min before run start) and its unshipped edits remain in the tree (served /scan still references the loop's 18:47 chunk BurnBragCard-CQBYZ6Dj.js, hash-matched this run — the concurrent process has NOT deployed). Zero src writes, zero deploys.
- **Queued residuals re-verified STILL REAL (all four stay queued for the post-deploy quiet window):** (1) 5o try/catch — 0 catch hits in token-scan.ts 1906–2248 (measured directly); (2) the misattributing "RPC didn't answer" copy at FOUR sites (TokenScanner.tsx:148, 564, 608, 701) — the copy-softening fix must cover all four; (3) the 22:03 verifyScanBurn tx.from residual — independently confirmed still real: `verifyScanBurn` (token-scan.ts:2671) computes `fromTopic` from `tx.from` for log-matching but never binds it to the connected wallet, and the caller `runWithHash(burnHash, "wallet", verifyScanBurn)` (TokenScanner.tsx:618) passes no address either — a stranger's ≥100k DUMB burn hash in the manual paste box claims a 30-day pass. Low severity (dilutes the burn flywheel, extracts nothing), fix stays queued with the #17 authz overhaul; (4) the 21:13 /scan cold-teaser CTA repoint ("Burn DUMB on the burn page" misdirects — the purpose-built deep-scan burn flows live inside the DeepScanPanel post-quick-scan).
- **No claim drift through the concurrent AI edits:** the 5o measured-tax clause ("not enough trades") verified in src — dump.ts ×2, knowledge.ts ×1; rag.ts carries 0 local hits because it imports the corpus from `@/data/knowledge` (verified the import — the clause survives in the single source of truth). The 5n rescue/withdraw clause (dump.ts ×2, knowledge.ts ×1) likewise intact.
- **BULLISH-RESEARCH.md revisit scan:** no ripened items — every prior rejection carries an explicit revisit condition (baseline traffic, volume at the burn step, aged leaderboard epoch, pass volume) and none is met; flat scan-stats ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000} since 03:50) still confounded by Antonio's Pro testing + auditor sessions.
- **Next-probe design hold STANDS:** the scanner carries the complete 5a–5o owner-power family + measured tax; the two external first-time-user auditors' findings still have not arrived (today's memory log checked — latest entry is the 22:03 loop run). Designing the next probe without their input would be depth nobody asked for.
- Site health: / /scan /burn /plan /ai /trade 200 on the custom domain; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold, #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-29 22:33 — #8 bullish-demand research: seventh traffic read + demand-surface re-audit (research-only, no ship)

- **No-collision rule held:** the concurrent AI-subsystem process's unshipped src edits (rag.ts 21:24 ET last write, ai-chat.ts 21:23 ET, AiPreview.tsx 21:22 ET, ai-pro.ts 18:37 ET — tree touched across the evening) remain in the tree; served /scan still references the loop's 18:47 chunk BurnBragCard-CQBYZ6Dj.js (hash-matched this run) → zero src writes, zero deploys.
- **Seventh real traffic read (KV counters, read-only, digest-cron pattern):** 2026-09-29 (UTC key day) through ~22:35 ET: 230 pageviews / 83 events — byte-identical to the 21:13 and 21:53 reads (~40 min of zero activity); the dead-quiet evening continues into the night. / 41, /scan 32, /burn 22, /ai 15, /wallet 14, /whitepaper 14, /proof 13; events wallet_connect 63 (dominant), scan_started 4, swap_quote 4, copy_contract 3, quick_scan 3, raid_play 3, singletons bag_scan 1 / burn_voluntary 1 / watchlist_toggle 1; US 202 + ID 2, CA/MY/PH/SE 1. Thesis unchanged for the seventh straight read: the 09:23 "flat = traffic/distribution" reasoning stands; no demand conclusion — still confounded by Antonio's own Pro testing + the two external auditors' sessions today.
- **Demand-surface re-audit (genuine, non-churn, read-only):** the measured-tax 5o clause verified intact through the concurrent AI-subsystem evening — "not enough trades" present in dump.ts ×2 + knowledge.ts ×1; rag.ts carries 0 local copies because it imports the corpus from `@/data/knowledge` (verified the import line this run — single source of truth intact). The full probe-family chunk (knowledge.ts:64) still names the burn-gated deep scan with correct mechanics (100k DUMB → dead, 30-day pass, PLS fallback ~110k, share links re-verify on-chain). The 5n rescue/withdraw clause intact; no claim drift.
- **Rejected-ideas revisit scan:** every prior rejection carries an explicit revisit condition (baseline traffic, burn-step volume, aged leaderboard epoch, pass volume) — none met. Scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); nothing ripened.
- **Queued fixes still waiting for the post-deploy quiet window:** (1) the 21:13 /scan cold-teaser CTA repoint (misdirected deep-scan funnel — one-click burn flows live inside DeepScanPanel, not on /burn); (2) the 5o try/catch residual — 0 catch hits in token-scan.ts 1906–2248 re-verified; misattributing "RPC didn't answer" copy at FOUR sites (TokenScanner.tsx:148, 564, 608, 701).
- **Next-probe design hold STANDS:** the external first-time-user auditors' findings still have not arrived (today's memory log checked) — the 19:33 hold continues.
- **Considered and REJECTED:** (1) acting on the /ai 13→15 view drift — REJECTED: confounded (Antonio's Pro testing) and the AI subsystem is outside this loop's charter; (2) any demand move on the flat 230/83 numbers — statistically meaningless, confounded; (3) outbound or in-site demand nudges — hard boundary + no baseline (per 19:43); (4) scanner demand hooks ahead of the auditor findings — per the 19:33 hold; (5) touching src or shipping this run — REJECTED: the concurrent tree's unshipped edits make any loop deploy a clobber risk.
- Site health: / /scan /burn /plan /ai /trade all 200 on the custom domain; /api/scan-stats unchanged — flat since 03:50, honest. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-29 23:33 — Dumb AI Pro knowledge gap shipped; rejected-ideas revisit (#13 real-utility research)

- **SHIPPED (research-found, not the backlog):** Dumb AI had zero answers for Dumb AI Pro and /terms + /privacy — a newcomer asking about either got "I don't have a solid receipt for that yet" despite /terms, /privacy, ROADMAP, and pro.ts all being live since ~23:05. Added two AI_QA entries (dump.ts): "What is Dumb AI Pro?" ($20 30-day pass, ~$20 in any of 12 verified tokens, ~$16 DUMB burn + ~$4 model wallet, burn leg always ends as DUMB at dead, server-verified on-chain before the pass exists, wallet-tied, 100/day + 1,000/mo caps + 1,000/day hub-wide breaker, scan-explainer flagship, general-purpose with guardrails, free tier 10/day unchanged, irreversible = no refunds) and "What are the terms and privacy policy?" (plain-language /terms + /privacy summary). Claim-by-claim mirrored to live /terms + /privacy (read this run) and the 23:23 ROADMAP wording; no Robinhood references; no price promises. Both auto-become faq-N RAG chunks + server-validated canned answers. tsc + eslint clean, build passed, deployed preview 5199d2f6; served-layer verified: /ai 200, dump-NznGIYIS.js carries both new Qs ×1.
- **Utility-depth state:** the scanner's owner-probe family (5a–5o) + measured tax + burn-gated deep scan is complete; the audit follow-through (burn-term pass, /terms + /privacy, /roots dashboard) is live and re-verified intact this run at the served layer. Deep scans remain flat at 3/30 days with 1 pass burn — no demand signal to build against. The remaining audit queue (proof/genesis/roots IA merge, mobile acceptance testing, preview/prod worker split) is Antonio's call, not the loop's; the #17 authz overhaul (signed Pro sessions) needs a design + Antonio's go-ahead.
- **Rejected-ideas revisit scan:** every prior rejection's condition (baseline traffic, burn-step volume, aged epoch, pass volume) unmet — scan-stats flat since 03:50. Nothing ripened.
- **Considered and REJECTED:** (1) a "What is Dumb AI Pro?" starter chip on /ai (AI_QA.slice(0,4) drives the chips) — REJECTED: the four starters are Antonio-approved; bumping one for a paid-tier chip on the free cold view is a taste call, and a typed question already reaches the new canned/RAG answer; (2) a dedicated knowledge.ts "dumb-ai-pro" chunk — REJECTED: the AI_QA entries auto-become faq-N chunks with question-word tags, a second chunk would be verbatim duplication; (3) Pro upsell nudges on /scan cold view — REJECTED: the deep-scan teaser + panel already carry the paid paths; more nudges edge toward outbound-feel demand tactics on confounded traffic; (4) scanner demand hooks / next probe design — the family is complete and the audit queue is Antonio's call; designing beyond 5a–5o with no user input would be depth nobody asked for.
- Site health: / /scan /burn /ai /plan /roots /terms /privacy all 200 on the custom domain; /api/market 200 with real DexScreener data; /api/scan-stats unchanged ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}) — flat since 03:50, honest, still traffic/distribution. Zero wallet/signing/data-source/mascot touch, no new data sources. #8/#9/#10/#13 stay open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29.

## 2026-09-29 23:43 — #8 bullish-demand research: eighth traffic read + served-layer canned-path verification (research-only, no ship)

- **Eighth real traffic read (KV counters, read-only):** 2026-09-29 through ~23:50 ET: 230 pageviews / 83 events — byte-identical to the 22:35 read, ~zero activity in 75 minutes; US 202 + 5 countries; wallet_connect 63 dominant. The 09:23 "flat = traffic/distribution" thesis stands for the eighth straight read; no demand conclusion — still confounded by Antonio's Pro testing + auditor sessions.
- **Served-layer verification of the 23:33 ship (genuine, non-churn):** the two new AI_QA canned answers verified at the live layer, not just in the bundle — POST /api/ai-chat with exact question + suggested:true returns the canned answer at mode=local, sources=["hub knowledge"], $0, no model call. "What is Dumb AI Pro?" → 1,070 chars; "What are the terms and privacy policy?" → 921 chars. The freemium boundary (suggested questions always answered free, server-validated) is live, not just claimed. Demand surfaces show no claim drift; zero Robinhood references in the Pro answers.
- **Considered and REJECTED:** (1) a homepage "Fresh this week" strip — REJECTED: on flat confounded traffic it would serve mostly Antonio; /plan is already the public changelog; doesn't earn its place. (2) any demand move on the flat 230/83 numbers — statistically meaningless, confounded; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) scanner demand hooks / next probe design — family complete, audit queue is Antonio's call.
- Revisit scan: no ripened items — all revisit conditions (baseline traffic, burn-step volume, aged epoch, pass volume) unmet; scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).

## 2026-09-30 00:03 — #8 bullish-demand research: ninth traffic read + queued-fix queue CLOSED + market-502 explained (research-only, no ship)

- **Ninth real traffic read (KV counters, read-only, digest-cron pattern):** 2026-09-29 final 230 pageviews / 83 events — byte-identical to the 23:43 read (zero activity 23:50→00:03 ET); 2026-09-30 keys since midnight: 6 pv, 1 wallet_connect event. / 41, /scan 32, /burn 22, /ai 15, /wallet 14, /whitepaper 14; wallet_connect 63 dominant; US 202 + 5 countries. The 09:23 "flat = traffic/distribution" thesis stands for the ninth straight read; no demand conclusion — still confounded by Antonio's Pro testing + auditor sessions.
- **The evening's queued-fix queue is now CLOSED (all shipped by the 23:33/23:53 deploys):** (1) the 21:13 /scan cold-teaser CTA repoint — VERIFIED LIVE at the SSR layer ("Quick-scan a token above — the deep-scan burn step appears with your report", anchors to #token-scanner, no /burn link); (2) the 5o try/catch residual — FIXED in tree AND in the served bundle (token-scan.ts:353 try/catch renders measured-tax as "unknown" with "The measurement hit an error before it finished — trade history couldn't be fully read. Treat as unknown, not fine."); (3) the 4-site "RPC didn't answer" copy — GONE from TokenScanner.tsx (the one remaining "RPC is being flaky" at line 972 is the PLS-quote card, a different honest site). (4) the 22:03 verifyScanBurn tx.from residual — still queued with the #17 authz overhaul (needs a design, not a one-liner). The concurrent AI-subsystem evening edits (TokenScanner.tsx 22:46 ET, AiPreview.tsx 21:22 ET, rag.ts 21:24 ET) went live via the loop's 23:33/23:53 builds — clean builds, live-verified, no clobber; the evening's no-collision discipline is moot. The 21:13/22:13 "post-deploy quiet window" framing is resolved.
- **The one /api/market 502 this run is the designed honest path, NOT a regression:** a cold isolate + a DexScreener hiccup + no cache → 502 {"ok":false,"reason":"Market data unavailable."} instead of an invented price. Retried 20s later: 200 with real DexScreener data and BOTH of the 23:53 run's new guards passing (pair addresses match the requested flagships, chartUrls https://). fetch-market.ts throws on non-OK and the dashboard shows its honest "unavailable" state (verified 23:53). Dumb 0.00000406 / Damp 0.00002153 — the price leg is live and trusted again.
- **Revisit scan:** no ripened items — all revisit conditions (baseline traffic, burn-step volume, aged epoch, pass volume) unmet; /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Considered and REJECTED:** (1) any demand move on the flat 230/83 numbers — statistically meaningless, confounded; (2) outbound or in-site demand nudges — hard boundary + no baseline; (3) touching src or shipping this run — nothing earned it; the two live deploys' health is confirmed, the tree is quiet, nothing new from the research pass.
- Site health: / /scan /burn /ai /plan /roots /terms /privacy /wallet /trade all 200 on the custom domain; /api/market 200 (after the one honest 502). Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 00:43 — #8 bullish-demand research: tenth traffic read, flat (research-only, no ship)

- **Tenth real traffic read (KV counters, read-only, digest-cron pattern):** 2026-09-29 final 230 pageviews / 83 events — byte-identical to the 00:03 read (zero activity 00:03→00:43 ET); 2026-09-30 keys since midnight: 6 pv (/ 2, /ai 1, /burn 2, /story 1), 1 wallet_connect — also byte-identical to the 00:03 read. The 09:23 "flat = traffic/distribution" thesis stands for the tenth straight read; no demand conclusion — still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox check (first one for a #8 run):** single entry only — the known 2026-09-28 {c:"bug", m:"Test", p:"/scan"} submission, already logged and dismissed in daily memory as a form test. Nothing new, nothing actionable.
- **Revisit scan:** no ripened items — all revisit conditions (baseline traffic, burn-step volume, aged epoch, pass volume) unmet; /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Considered and REJECTED:** (1) any demand move on the flat numbers — statistically meaningless, confounded; (2) outbound or in-site demand nudges — hard boundary + no baseline; (3) touching src or shipping this run — nothing earned it; tree quiet since the 00:23 ship, no queued fixes left, no deferred item claimed. (4) Note for future runs: at the tenth straight identical read, the marginal value of 40-minute-interval reads is ~zero; the cadence stays because the loop charter says so, not because the data moved.
- Site health: / /scan /burn /ai /plan /roots all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.
## 2026-09-30 01:23 — Bullish-demand research pass (#8, audit-only, no ship)
- **ELEVENTH traffic read (KV, read-only):** 2026-09-29 final 230 pageviews / 83 events — byte-identical to the 00:43 read (zero activity 00:43→01:23 ET); 2026-09-30 since midnight: 6 pv (/ 2, /ai 1, /burn 2, /story 1), 1 wallet_connect — byte-identical to the 00:03 read. The 09:23 "flat = traffic/distribution" thesis stands for the eleventh straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** single entry only — the known 2026-09-28 {c:"bug",m:"Test",p:"/scan"} form test, already logged and dismissed. Nothing new, nothing actionable.
- **Revisit scan:** no ripened items — every prior rejection's revisit condition (baseline traffic, burn-step volume, aged epoch, pass volume) unmet; /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Demand-surface drift check (grep-level):** honest burn framing intact ("never promise price" ×19 in src), scan-pass copy intact ("100,000 you send … ~95,000 lands at dead after the 5% burn tax"), "5% instant burn" headline ×9 with decomposition adjacent; the two src "Robinhood" hits are the standing blackout guardrail itself (knowledge.ts:130,147 — "do not discuss" instruction), not drift.
- **Considered and REJECTED:** (1) any demand move on the flat 230/83 numbers — statistically meaningless, confounded; (2) outbound or in-site demand nudges — hard boundary + no baseline; (3) touching src or shipping this run — nothing earned it; tree quiet since 01:05 ET, no deferred item claimed.
- Live health: / /scan /burn /ai /plan /roots all 200 on the custom domain.
## 2026-09-30 01:43 — Bullish-demand research pass (#8, audit-only, no ship)
- **TWELFTH traffic read (KV, read-only):** 2026-09-29 final 230 pageviews / 83 events — byte-identical to the 01:23 read (zero activity 01:23→01:43 ET); 2026-09-30 since midnight: 6 pv (/ 2, /ai 1, /burn 2, /story 1), 1 wallet_connect — byte-identical to the 00:03 read. The 09:23 "flat = traffic/distribution" thesis stands for the twelfth straight read; still confounded by Antonio's Pro testing + auditor sessions. Marginal value of each read is ~zero at this point; the cadence stays because the charter says so.
- **Feedback inbox:** single entry only — the known 2026-09-28 {c:"bug",m:"Test",p:"/scan"} form test, already dismissed. Nothing new, nothing actionable.
- **Revisit scan:** no ripened items — every prior rejection's revisit condition (baseline traffic, burn-step volume, aged epoch, pass volume) unmet; /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Demand-surface drift check (grep-level):** honest burn framing intact ("never promise price" ×19 in src — the earlier ×23 read in this run was the broader "never promise" pattern, including honest never-promise-a-card comments in tx-explain.ts, not price-framing drift); scan-pass copy intact (TokenScanner.tsx:932 "The pass counts the 100,000 you send (the 5% burn tax means ~95,000 lands at dead…", :1019 "you send (~95,000 lands at dead after the 5% burn tax — that's expected)"); "5% instant burn" headline ×9 with decomposition adjacent; the two src "Robinhood" hits are the standing blackout guardrail itself (knowledge.ts:130,147), not drift.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — twelfth straight identical read, statistically meaningless, confounded; (2) outbound or in-site demand nudges — hard boundary + no baseline; (3) touching src or shipping this run — nothing earned it; tree quiet (only the loop's own 01:33 rag.ts ship, already deployed + live-verified).
- Live health: / /scan /burn /ai /plan /roots all 200 on the custom domain; /api/scan-stats flat.

## 2026-09-30 02:03 — #13 real-utility research: pledge-board security read + first real pledge observed (research-only, no ship)
- **Burn-pledge board end-to-end security read:** the newest on-chain-adjacent surface the loop hadn't re-audited tonight — HELD UP: viem verifyMessage binds address + message (message itself binds token+amount+address+timestamp, single shared module src/lib/pledges.ts), 401 on expired/mismatched signature, 2048-byte body cap, 10/day IP-hash rate limit, server-lowercased KV keys, GET prunes expired/corrupt rows; pledgeRedeemed flips only on verified on-chain voluntary burns (arrival-leg accounting, verified #1 math). Live-probed: GET → 200 with ONE REAL pledge (0x3d5a…9c67 "too_dumb", DUMB 1000, ~13.5h old) — genuine opted-in participation, not seeded; malformed POST → designed 400.
- **First real pledge on the board:** observed at the served layer, signature-verified, honest single record. Noted as a real demand/utility signal, not a baseline — still confounded traffic overall.
- **AI freemium boundary re-verified** at the served layer through the 01:33 rag.ts deploy (canned Pro answer, mode=local, $0); /api/market 200 through both 23:53 guards; claim canary ×19 exact (case-insensitive) byte-identical to 01:23/01:43 — no drift.
- **Revisit scan:** no ripened items (all conditions unmet; scan-stats flat since 03:50).
- **Considered and REJECTED:** (1) pledge-board extensions (redeem nudges, leaderboard pledge fetch) — 1 real pledge, no demand base, building on it now is churn; (2) next scanner probe (trading-cooldown) — still DEFERRED (family complete through 5n + measured tax; auditors asked for copy/IA, not scanner depth); (3) any demand move on flat confounded numbers; (4) outbound/in-site nudges — hard boundary; (5) touching src/shipping — nothing earned it.
- Site health: / /scan /burn /ai /plan /roots all 200; /api/scan-stats flat. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 idea-only; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 02:13 — Bullish-demand research pass (#8 recurring, research-only)

- **Traffic:** 2026-09-29 final 230 pv / 83 ev — byte-identical to the prior five reads (sixth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 8 pv (/ 2, /ai 1, /burn 3, /scan 1, /story 1 — /burn +1 vs the 01:23 read), 1 wallet_connect. Still confounded by Antonio's Pro testing + auditor sessions; the 09:23 "flat = traffic/distribution" thesis stands.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items (all conditions unmet; scan-stats flat since 03:50 — {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Demand-surface drift check:** "never promise price" ×19, "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact — all byte-consistent with prior runs; the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts).
- **Considered and REJECTED:** (1) any demand move on the flat numbers — sixth straight identical read, statistically meaningless, confounded; (2) outbound/in-site demand nudges — hard boundary + no baseline; (3) touching src or shipping — nothing earned it; tree quiet (last src write 01:34 ET = the loop's own 01:33 rag.ts ship, zero concurrent process).
- Site health: / /scan /burn /ai /plan /roots all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 02:43 — #13 real-utility research: scan share-link surface read + copycat-idea evaluation (research-only, no ship)

- **Shared scan-report link surface read (code + served layer, HELD UP):** the outreach mechanism (?token= auto-runs the quick scan; ?burn= re-verifies the burn then runs the deep scan) — no trust in the link anywhere. ?burn= is regex-gated client-side, then verifyDeepScanBurn does a FRESH RPC read of tx + receipt: direct path requires tx.to == DUMB contract, transfer() selector to the dead address, amount >= 100k DUMB, and a matching Transfer(from→dead) log; PLS-fallback path decodes the router call via the shared ABI (exact function + [WPLS, DUMB] path + to==dead) and sums actual dead-arrival >= 100k. Either path fails clean with reasons on fake/reverted/unverified hashes; NO 30-day pass is issued from a shared link (the viewer didn't do the burn). Paste box binds tx.from to the connected wallet (the narrower #17-adjacent fix already covers the scan pass). Served layer: /scan?token=<valid>, ?token=garbage, and ?token=<valid>&burn=<zeroed hash> all 200 — SSR doesn't choke on garbage params.
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); traffic still confounded by Antonio's Pro testing + auditor sessions.
- **Considered and REJECTED:** (1) fuzzy/Levenshtein copycat-name detection in the quick scan — REJECTED: exact-symbol identity check (token-scan.ts VERIFIED_IDENTITIES) already covers DUMB/DAMP + all 12 curated tokens with a hard lookalike fail; fuzzy matching would generate false positives on legitimate similar names, and the site must not accuse specific contracts of scamming on a heuristic; (2) voluntary-burn CSV/tax export — REJECTED: real repeated tax pain, but fails the utility bar (no burn or holding mechanism, read-only); (3) pledge-board extensions — REJECTED: still 1 real pledge, no demand base, building on it is churn; (4) any demand move on flat confounded numbers; (5) outbound or in-site demand nudges — hard boundary; (6) touching src/shipping — nothing earned it; tree quiet (last src write the loop's own 02:33 roadmap fix, zero node/npm processes).
- Site health: / /scan /burn /ai /plan /roots /wallet /trade all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 02:53 — #8 bullish-demand research: thirteenth traffic read, flat + one JP blip (research-only, no ship)

- **THIRTEENTH traffic read (KV, read-only):** 2026-09-29 final 230 pageviews / 83 events — byte-identical to the last seven reads (eighth straight; zero activity since ~01:23 ET); per-path split unchanged (/ 41, /scan 32, /burn 22, /ai 15, /wallet 14, /whitepaper 14); events wallet_connect 63 dominant; US 202 + 5 countries. 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — +1 on / vs the 02:13 read), events quick_scan 1 / wallet_connect 1, countries US 9 + JP 1 (one single anonymous pv from JP, no events attached — logged as noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the thirteenth straight read; still confounded by Antonio's Pro testing + auditor sessions. Marginal value of the 40-minute cadence is ~zero; it stays because the charter says so.
- **Feedback inbox:** no new entries — no fb keys on 09-29 or 09-30; the single known 2026-09-28 form test remains dismissed.
- **Revisit scan:** no ripened items — every prior rejection's revisit condition (baseline traffic, burn-step volume, aged epoch, pass volume) unmet; /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Demand-surface drift check (grep-level):** "never promise price" ×19, "5% instant burn" headline ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact; the only src "Robinhood" hits are the standing blackout guardrail itself (knowledge.ts), not drift. Byte-consistent with every prior run.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — thirteenth straight identical 09-29 read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: one anonymous hit, no events, indistinguishable from a stray crawler; building a signal out of it would be the exact data-invention the honesty rules forbid; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) touching src or shipping — nothing earned it; tree quiet (last src write = the loop's own 02:33 roadmap-copy fix, already deployed + live-verified), zero node/npm processes.
- Site health: / /scan /burn /ai /plan /roots /wallet /trade all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 03:13 — #8 bullish-demand research: fourteenth flat traffic read (research-only, no ship)

- **Traffic:** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last eight reads (ninth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to the 02:53 read), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the fourteenth straight read; still confounded by Antonio's Pro testing + auditor sessions. Marginal value of the 10-minute cadence is ~zero; it stays because the charter says so.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items (all conditions unmet; scan-stats flat since 03:50 — {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Demand-surface drift check:** "never promise" ×23 (byte-identical to the 02:03 read), "5% instant burn" headline ×3 in dump.ts with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact (TokenScanner.tsx:932 + :1019), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts:130,147) — no drift anywhere.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — fourteenth straight identical 09-29 read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: one anonymous hit, no events, indistinguishable from a stray crawler; building a signal out of it would be the exact data-invention the honesty rules forbid; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) touching src or shipping — nothing earned it; tree quiet (last src write = the loop's own 03:03 ai-chat.ts quota fix, already deployed + live-verified that run; zero node/npm processes).
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 03:43 — #13 real-utility research: token integrity monitor DESIGNED + BUILT (shipped as loop tooling, no site deploy)

- **The idea (genuinely new, additive):** the hub publishes LOCKED canonical claims on many surfaces (hero, swap box, /story, /roots ProofStrip, whitepaper, Dumb AI knowledge): DUMB 6% / DAMP 3% transfer tax, the feesDistribution splits, owner renounced. Every claim was verified on-chain once (2026-09-26/27) — but nothing re-verifies them, so if the chain truth ever diverged (or our own constants drifted in a future edit), the hub would silently publish false claims. A read-only loop-side integrity monitor closes that gap: it is the institutional version of the standing honesty rule ("verified on-chain, never invented").
- **Utility-bar evaluation:** real repeated pain = YES (the community's core wound is false claims about these tokens — the /story page exists to correct the official X account; newcomers' first question is "is what's on this site still true?"). Brings outsiders in = weakly (trust surface, not a draw). Burns supply = NO — it is maintenance-of-honesty, closer to #9 than #13, but it deepens holding confidence and protects every other utility's credibility. Vetoes: none touched (read-only, no custody, no new data source — public RPC already in the trust boundary, no spending, no signing, no new contract).
- **Evidence (live, read-only, this run):** DUMB fees()=600, feesDistribution()=(3333,3333,1667,1667), owner()=0x0; DAMP fees()=300, feesDistribution()=(3333,0,3333,3334), owner()=0x0 — ALL match the locked canonical values. Informational: DUMB supply 28B, dead 15.84B (56.6% burned); DAMP supply 1B, dead 364M (36.4% burned).
- **Shipped:** `~/workspace/goals/pulsechain-dumb-damp-build-loop/hidden_files/token-integrity-check.py` — ~100 lines, exit 0 when every asserted claim matches, exit 1 + DEVIATION line otherwise. Retries/backoff per the documented rpc.pulsechain.com flakiness (batches die; 1s between calls, 5 attempts, 5-25s backoff across both RPCs). Runs from the loop on #9 security passes — no site code touched, no deploy needed.
- **Considered and REJECTED:** (1) a user-facing "contract watch" freshness strip — REJECTED: the #16 ProofStrip already gives every visitor live figures with block number + age at 60s refetch; a second strip would duplicate it = churn. The durable value is the loop-side alert, not another UI widget. (2) asserting on dead-balance totals — REJECTED: balances legitimately grow with every burn; only the tax/owner claims are assertable. (3) on-chain monitoring via events/subscriptions — REJECTED: the loop itself is the scheduler; a push-based watcher adds infra for zero marginal value at 10-minute loop cadence.
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed) — still no demand base for pledge extensions.
- Site health: / /scan /burn /ai /plan /roots /wallet /trade all 200 on the custom domain. Tree quiet (all src mtimes = the loop's own prior ships; no stray processes). Zero wallet/signing/mascot touch, no new data sources. #13 stays open as recurring; #5 idea-only; #6 ON HOLD; #8/#9/#10 stay open as recurring.

## 2026-09-30 03:53 — #8 bullish-demand research: fifteenth flat traffic read (research-only, no ship)

- **Traffic (KV, read-only):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last nine reads (tenth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to the 02:53 and 03:13 reads), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the fifteenth straight read; still confounded by Antonio's Pro testing + auditor sessions. Also corrected a scripting slip mid-run: the first KV pass aggregated path totals across the whole 7-day window (read the weekly fetcher wrong) — the rerun read the day-scoped keys directly; numbers above are the correct day-scoped ones.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items (all conditions unmet; scan-stats flat since 03:50 — {deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}).
- **Demand-surface drift check:** "5% instant burn" ×9 (dump.ts ×3 with decomposition adjacent), "never promise" ×23, scan-pass 100k-SENT/~95k-lands copy intact (TokenScanner.tsx:931-932), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts:130,147) — no drift anywhere.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — fifteenth straight identical 09-29 read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: one anonymous hit, no events, indistinguishable from a stray crawler; building a signal out of it would be the exact data-invention the honesty rules forbid; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) touching src or shipping — nothing earned it; tree quiet (all src mtimes = the loop's own prior ships; zero node/npm processes).
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 04:23 — #13 real-utility research: Dumb AI knowledge-staleness fix (shipped, site deploy)

- **The research unit (knowledge hygiene):** the #13 standing step includes keeping Dumb AI's knowledge current (23:33 precedent). This run's staleness check found a genuine gap: the 03:33 ROADMAP ship names the 2026-09-30 deep-scan paste-box wallet gate ("pasted burn tx must come from the connected wallet, no one else's hash accepted"), and the rule is real in TokenScanner.tsx (:587/:593/:1026) — but the AI_QA scanner answer (dump.ts:403) said only "paste a manual burn tx", so a user asking whether a stranger's burn hash works would get an answer missing the rule. FIX: "paste a manual burn tx from your connected wallet — someone else's burn hash won't count" (dump.ts, one clause). Deployed 6e29e4f3, live-verified in the served corpus chunk ×1.
- **Utility-bar evaluation:** maintenance of the #12 scanner utility (keeps the burn-gated deep scan's docs honest), not a new utility. Bar-fail items all still unmet; nothing else new earned a build.
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards.
- **Considered and REJECTED:** any demand/utility move on the flat confounded numbers; outbound or in-site demand nudges (hard boundary + no baseline); pledge-board extensions (1 real pledge, no demand base = churn); touching anything beyond the one-clause knowledge fix.
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 04:33 — #8 bullish-demand research: sixteenth flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last ten reads (eleventh straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to the 03:53 and 04:13 reads), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the sixteenth straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed).
- **Demand-surface drift check (grep-level):** "never promise price" ×19, "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact (TokenScanner.tsx:932 + :1019), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts:130,147) — no drift anywhere.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — sixteenth straight identical read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: indistinguishable from a stray crawler; building a signal out of it would violate the honesty rules; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) touching src or shipping — nothing earned it; tree quiet (only the loop's own 04:23 dump.ts ship since 03:33; zero node/npm processes).
- Site health: / /scan /burn /ai /plan /roots all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 04:53 — #8 bullish-demand research: seventeenth flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last eleven reads (twelfth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to the 03:53, 04:13 and 04:43 reads), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the seventeenth straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards (dumb $0.000003976, correct pairAddress, https chartUrl).
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (×17 lowercase + 2 capitalized — reconciled, byte-identical to the 01:23/01:43 reads), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact (TokenScanner.tsx:932 + :1019), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts) — no drift anywhere.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — seventeenth straight identical read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: indistinguishable from a stray crawler; building a signal out of it would violate the honesty rules; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) touching src or shipping — nothing earned it; tree quiet (all src mtimes = the loop's own prior ships: last write = the 04:43 run's FeedTheBurn.tsx fix; zero node/npm processes).
- **Process note:** the 04:33 #8 run updated this file but its entry never made it into BUILD_LOOP.md's run log (log jumps 04:43 → 04:23) — noted, not reconstructed; its numbers are preserved here.
- Site health: / /scan /burn /ai /plan /roots all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 05:13 — #13 real-utility research: roadmap donor-leaderboard claim-precision fix (shipped, site deploy)

- **The research unit (knowledge hygiene, 04:23 precedent):** this run's staleness check found a genuine gap: the 04:43 #9 run fixed the Feed-the-Burn donor board's intro ("Every donation of the five vault tokens since launch" — the board only indexes Transfer logs for the five curated vault tokens WPLS/HEX/INC/PRVX/PLSX, so a manual 6th-token transfer would be invisible), but the ROADMAP "Feed the Burn" done-item (dump.ts:223) still said "every donation since the vault launched" — the public /plan page carried the imprecise claim. FIX: one clause aligned the roadmap line with the page (dump.ts, zero other files). Grep-sweep confirmed no other stale sites (the AI_QA donor-board mention is share-button copy with no coverage claim; the share copy in FeedTheBurn.tsx makes no coverage claim).
- **Utility-bar evaluation:** maintenance of the #14/#15 Feed-the-Burn utility (keeps the vault utility's docs honest), not a new utility. No new idea earned a build this pass.
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards.
- **Considered and REJECTED:** the #17 signed-session authz overhaul — still a design, not a one-liner; stays queued (unchanged this run); any demand/utility move on flat confounded numbers; outbound or in-site demand nudges (hard boundary + no baseline); pledge-board extensions (1 real pledge, no demand base = churn).
- Site health: /plan 200 with the new clause ×1 in the served HTML (old wording ×0); / /scan /burn /ai /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 idea-only; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 05:23 — #8 bullish-demand research: eighteenth flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last twelve reads (thirteenth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to the 03:53, 04:13, 04:43 and 04:53 reads), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the eighteenth straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards.
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical to the 01:23/01:43 reads), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts) — no drift anywhere.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — eighteenth straight identical read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: indistinguishable from a stray crawler; building a signal out of it would violate the honesty rules; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) deep-scan pass promo experiments — blocked by the #17 authz residual (no real-money Pro test until signed short-lived Pro sessions per request); inventing promo activity would violate the honesty rules anyway; (5) burn leaderboard/contest push — 1 real pledge, no demand base, and #5 is on Antonio's idea-only hold; (6) touching src or shipping — nothing earned it; tree quiet (all src mtimes = the loop's own prior ships: last write = the 05:13 run's dump.ts fix; zero node/npm processes).
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 05:53 — #8 bullish-demand research: nineteenth flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last thirteen reads (fourteenth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to the 03:53–04:53 reads), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the nineteenth straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board re-verified live: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards (dumb $0.000003976, correct pairAddress, https chartUrl — unchanged since 04:53).
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical), "5% instant burn" ×9 with decomposition adjacent (dump.ts ×3, SwapBox/whitepaper/index/__root), scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts ×2) — no drift anywhere.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — nineteenth straight identical read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: indistinguishable from a stray crawler; building a signal out of it would violate the honesty rules; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) deep-scan pass promo experiments — the 05:33 #9 run CLOSED the #17 session-authz blocker, so the old precondition is met, BUT: zero demand base means no measurable cohort, any promo touches pricing/revenue, and that is Antonio's call, not a per-run loop decision — PARKED for him, not REJECTED outright; (5) burn leaderboard/contest push — 1 real pledge, no demand base, and #5 is on Antonio's idea-only hold; (6) touching src or shipping — nothing earned it; tree quiet (only the loop's own ships: last write = the 05:33 #9 session run at 05:37 ET; the one pgrep'd node process was transient, gone).
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 06:03 — #13 real-utility research: revisit scan + three fresh utility evaluations (research-only, no ship)

- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed); trading-cooldown probe stays DEFERRED (scanner family complete through 5n + measured tax; no new evidence to ripen it).
- **AI knowledge staleness check (04:23 precedent):** clean — the 05:33 signed-session ship is invisible security internals; AI_QA's "What is Dumb AI Pro?" answer ("tied to the wallet that paid") stays accurate because sessions are signed BY the paid wallet; the deep-scan answer already names the paste-box wallet gate.
- **/api/market incident noted, NOT a regression:** first two reads returned the designed honest {"ok":false} (worker-edge transient); direct DexScreener probe 200 in 0.64s with the exact 23:53-guard payload (dumb $0.000003976, correct pairAddress 0x221f63Fb…); third read ~2 min later → 200 with real data through both guards. Self-recovered, zero code touched (01:13 precedent). The honest fallback did its job — no invented prices.
- **Considered and REJECTED:** (1) DAMP-denominated deep-scan pass — REJECTED as churn: the PLS fallback already covers low-DUMB holders, DAMP's thinner market makes quotes less reliable, same cohort + more machinery = ~zero marginal utility; (2) newcomer /start safety-checklist page — REJECTED as churn: real newcomer pain exists, but /trade already carries the 5-step first-swap walkthrough + gas guide and /story + /whitepaper cover the education; thin marginal value, and it burns/deepens nothing (fails the utility bar); (3) canonically indexed /scan report pages for SEO — REJECTED: the 02:43 shared-link design deliberately avoids cached verdicts (preview card names the symbol only, never the verdict, so cached cards can't go stale); indexed report pages reintroduce exactly that staleness.
- **Considered and PARKED for Antonio (not rejected):** gift-a-deep-scan-pass — burn 100k DUMB to grant a 30-day pass to another wallet: burns DUMB, brings outsiders in (the recipient visits the hub), no custody (plain burn to dead + KV grant like the existing pass), no funded prizes, no promised returns. But zero demand base (nobody's buying passes yet) and it's promo/pricing-adjacent → Antonio's call, per the 05:53 #8 precedent.
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 06:13 — #8 bullish-demand research: twentieth flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last fourteen reads (twentieth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (byte-identical to every read since 03:53), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the twentieth straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board re-verified live: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards (dumb $0.000003976, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl — unchanged).
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (same file distribution as prior reads), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts) — no drift anywhere.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — twentieth straight identical read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: indistinguishable from a stray crawler; building a signal out of it would violate the honesty rules; (3) outbound or in-site demand nudges — hard boundary + no baseline; (4) burn leaderboard/contest push — 1 real pledge, no demand base, and #5 is on Antonio's idea-only hold; (5) touching src or shipping — nothing earned it; tree quiet (zero src writes since the loop's own 05:33 session ship; zero node/npm processes).
- **NOTED, not rejected:** gift-a-deep-scan-pass stays parked for Antonio (promo/pricing-adjacent, zero demand base); deep-scan pass promo experiments stay parked per the 05:53 precedent (Antonio's call, not a per-run loop decision).
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 06:43 — #13 real-utility research: revisit scan + knowledge check + four fresh evaluations (research-only, no ship)

- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board RE-VERIFIED LIVE via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards (dumb $0.000003976, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl — unchanged).
- **AI knowledge staleness check (04:23 precedent):** clean — the scanner answer (dump.ts:403) still names the paste-box wallet gate ("someone else's burn hash won't count"); the Pro answer (dump.ts:419, "tied to the wallet that paid") stays accurate post-05:33 signed sessions (sessions are signed BY the paid wallet — invisible internals, no copy change earned). Deep-scan pass irreversibility disclosure VERIFIED present in TokenScanner.tsx copy ("permanent and can never be recovered" ×2, "burned forever" ×1) — no /burn-style checkbox gap; the manual-paste path needs none (burn already happened).
- **Stale-note correction:** the 06:03 run log's "trading-cooldown probe stays DEFERRED" is wrong — the cooldown probe (5j) is LIVE in token-scan.ts:1252-1277 (setter impersonation + tradingCooldown/cooldownEnabled getters, armed-vs-power distinction) and in the AI knowledge answer. Future runs: stop calling it deferred.
- **Considered and REJECTED:** (1) embeddable quick-scan widget for other PulseChain communities — REJECTED as speculative: zero demand evidence from any community, the scanner itself is at 3 deep scans / 1 pass burn, and Antonio's stated gap is distribution/buyer attention, not product — building distribution plumbing before the first distribution conversation is exactly the build-first pattern the loop charter rejects; (2) owner-LP-holder-concentration probe on the scanner — REJECTED as marginal machinery: the owner-holds-LP rug vector is real, but the existing LP check already handles it honestly ("the rest isn't [burned] — it may sit in a locker this scan can't see, or with liquidity providers. Check the pair's token holders on the explorer before buying"); a probe covering what honest copy already covers adds calls, not insight — noted, not built.
- **Considered and PARKED for Antonio (not rejected):** direct DUMB↔DAMP pair routing in the SwapBox (0xf046e04ff986dcae96315046888d85ac27500618 is liquid, ~1.094B/196M) — one hop instead of two via WPLS, genuinely better quotes, but AGENTS.md explicitly flags it as needing his approval; not a per-run loop decision.
- Tree quiet (all src mtimes = the loop's own prior ships: last write = the 05:33 #9 signed-session ship, already deployed + live-verified; zero node/npm processes). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 06:53 — #8 bullish-demand research: twenty-first flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last fifteen reads (twenty-first straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to every read since 03:53), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the twenty-first straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board RE-VERIFIED LIVE via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards (dumb $0.000003976, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl — unchanged).
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical to prior reads), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx), the only src "Robinhood" hits are the standing blackout guardrail (knowledge.ts ×2) — no drift anywhere.
- **Cooldown-probe correction re-verified in code:** token-scan.ts:1252-1277 carries the LIVE 5j owner-cooldown probe (setter impersonation via owner eth_call + tradingCooldown/cooldownEnabled getters, armed-vs-power distinction) — the 06:43 correction holds; stop calling it deferred.
- **Considered and REJECTED:** (1) any demand move on the flat numbers — twenty-first straight identical read, statistically meaningless, confounded; (2) acting on the single JP pageview — REJECTED: indistinguishable from a stray crawler; building a signal out of it would violate the honesty rules; (3) a verdict-less "recently scanned tokens" public feed on /scan (addresses + symbols only, no verdicts, sidestepping the 06:03 indexed-report staleness rejection) — REJECTED on three counts: it leaks what visitors are researching (privacy surface the hub deliberately avoids), it burns/deepens nothing (fails the utility bar), and a public "what's being checked" list doubles as social-proof advertising for whatever tokens land on it — a honeypot maker would WANT their token there; (4) outbound or in-site demand nudges — hard boundary + no baseline; (5) burn leaderboard/contest push — 1 real pledge, no demand base, and #5 is on Antonio's idea-only hold; (6) touching src or shipping — nothing earned it.
- **NOTED, not rejected:** gift-a-deep-scan-pass stays parked for Antonio (promo/pricing-adjacent, zero demand base); deep-scan pass promo experiments stay parked per the 05:53 precedent; direct DUMB↔DAMP pair routing stays parked (Antonio's approval, per AGENTS.md).
- Tree quiet (all src mtimes = the loop's own prior ships: last write = the 05:33 #9 signed-session ship, already deployed + live-verified that run; zero node/npm processes). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 07:23 — #13 real-utility research: revisit scan + knowledge check + three fresh evaluations (research-only, no ship)

- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board still the single real pledge (too_dumb, 1000 DUMB, unredeemed); /api/market 200 with real DexScreener data through the 23:53 guards (dumb $0.000003976, correct pairAddress, https chartUrl — unchanged).
- **AI knowledge staleness check (04:23 precedent):** clean — scanner answer (dump.ts:403) still names the paste-box wallet gate ("someone else's burn hash won't count"); Pro answer (dump.ts:419, "tied to the wallet that paid") stays accurate post-05:33 signed sessions (invisible internals, no copy change earned).
- **Considered and REJECTED:** (1) letting a Pro user share an AI scan-explainer session with a non-Pro friend (e.g. a share link that spends the payer's quota) — REJECTED: it punches a hole in the $20 Pro pricing wall and gives away paid value before any demand base exists; pricing/revenue-adjacent with no buyer evidence, Antonio's call if he ever wants a referral mechanic; (2) verdict-change alerts for the /scan browser-local watchlist (push or email when a watched token's verdict flips) — REJECTED: needs a notification identity plus a subscription/push pipeline (new dependency, new identity surface), directly violates the deliberate browser-local privacy design of the watchlist, and burns/deepens nothing on its own.
- **Considered and PARKED for Antonio (not rejected):** gift-a-Pro-pass — burn the DUMB equivalent to grant a 30-day Pro pass to another wallet (plain burn to dead + KV grant, same shape as the existing deep-scan gift-a-pass idea): burns DUMB, brings outsiders in, no custody, no funded prizes, no promised returns. But pricing/revenue-adjacent with zero demand base — Antonio's call, same bucket as gift-a-deep-scan-pass.
- Tree quiet (all src mtimes = the loop's own prior ships: last write = the 05:33 #9 signed-session ship at 05:37 ET, already deployed + live-verified that run; zero node/npm processes). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 07:33 — #8 bullish-demand research: twenty-second flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last sixteen reads (twenty-second straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to every read since 03:53), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the twenty-second straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board re-verified live via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed); /api/market recovered on retry (first hit 502 at 07:33 — transient upstream/cold-start flake, NOT a site fault) with real DexScreener data through the 23:53 guards (dumb $0.000003976, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl; DAMP $0.00002133 also fresh — unchanged guards).
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx:932,1019 — "The pass counts the 100,000 you send (the 5% burn tax means ~95,000 lands at dead…)"), zero Robinhood refs in dump.ts (blackout holds) — no drift anywhere.
- **Self-check on the one ship candidate this run:** a scan-activity social-proof strip on /scan ("N deep scans · ≥M DUMB destroyed") was ALREADY SHIPPED (src/components/dumb/ScanActivity.tsx — renders only when deep_scans>0, anti-abuse-hardened per-visitor caps in analytics.ts:130-217). Considered and REJECTED as already-built; the honest-check saved a duplicate ship.
- **Considered and REJECTED:** (1) "Dumbest contract on PulseChain" public-shaming board (worst-verdict tokens, ranked) — REJECTED on three counts: reputational/legal exposure (publicly branding third-party tokens scams), the hub's safety-first brand turns into a fear-mongering brand, and it burns/deepens nothing — fails the utility bar; (2) batch tax-watch / tax-change alerts for scanned tokens — REJECTED: covered by the 07:23 verdict-change-alerts rejection (notification identity + pipeline = new dependency, violates the deliberate browser-local privacy design, burns nothing on its own); (3) acting on the flat numbers or the JP pageview — REJECTED as before (statistically meaningless, confounded, single stray crawler); (4) demand moves needing outbound comms — hard boundary; (5) touching src or shipping — nothing earned it; tree quiet (all src mtimes = the loop's own 05:33 #9 signed-session ship at 05:37 ET, already deployed + live-verified that run; zero node/npm processes).
- **NOTED, not rejected:** gift-a-deep-scan-pass and gift-a-Pro-pass stay parked for Antonio (promo/pricing-adjacent, zero demand base); direct DUMB↔DAMP pair routing stays parked (needs his approval, per AGENTS.md); /api/market transient-502 noted as upstream/cold-start flake — if it recurs across runs it becomes a site-side caching opportunity, but one flake in 16+ days of reads is not a signal.
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 07:53 — #8 bullish-demand research: twenty-third flat traffic read + /api/market flake episode (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last seventeen reads (twenty-third straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to every read since 03:53), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the twenty-third straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board re-verified live via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, unredeemed). /api/market: FLAKY EPISODE — 5 consecutive honest 502s ({"ok":false,"reason":"Market data unavailable."}) over ~5 minutes; direct sandbox probe of api.dexscreener.com/pulsechain flagship pair returned healthy in 0.6s, so the upstream is up and the failure sits between the worker edge and DexScreener (likely shared-egress-IP rate limiting, matching the 06:03 and 07:33 flake shape — but a longer episode than either). The user-facing state stays honest by design: /roots renders "Market data unavailable right now — the feed might be rate-limiting. Nothing is guessed in…" (Roots.tsx:102). Verdict: amber, not red — no funds at risk, no claim broken, prior episodes self-recovered; NOT a pause condition. Watch item for the next runs: if the 502s persist across 2+ more runs it graduates from flake to incident and a KV-backed stale-cache mitigation (TTL ~15 min, stale:true marker, honest by construction) becomes an earned #9 unit.
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx), zero Robinhood refs in dump.ts (blackout holds) — no drift anywhere.
- **Considered and REJECTED:** (1) acting on the flat numbers or the single JP pageview — REJECTED as before (statistically meaningless, confounded, stray-crawler noise); (2) outbound or in-site demand nudges — hard boundary + no baseline; (3) burn-to-unlock gated premium content (burn DUMB to unlock members-only content) — REJECTED: pricing/revenue-adjacent with zero demand base, and gating content behind an irreversible burn is a bizarre paywall model nobody asked for; (4) a Telegram community activity feed on the hub (latest posts from t.me/dumbmoneydotwin) — REJECTED: Telegram API is a new external data source (hard boundary) and a raw feed re-introduces unmoderated third-party content onto a safety-first site; (5) referral/affiliate links with burn kickbacks — REJECTED: promised-returns-adjacent (vetoed category), plus a referral identity surface nobody asked for; (6) "Dumb of the week" community spotlight — REJECTED: zero opted-in members; spotlighting anyone without opt-in violates the honesty rules; (7) touching src or shipping — nothing earned it.
- **NOTED, not rejected:** gift-a-deep-scan-pass and gift-a-Pro-pass stay parked for Antonio (promo/pricing-adjacent, zero demand base); direct DUMB↔DAMP pair routing stays parked (needs his approval, per AGENTS.md); the /api/market KV stale-cache mitigation stays parked pending persistence evidence (see above).
- Tree quiet (all src mtimes = the loop's own 05:33 #9 signed-session ship at 05:37 ET, already deployed + live-verified that run; one transient node process, gone — zero node/npm processes). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 08:03 — #13 real-utility research: revisit scan + knowledge check + five fresh evaluations (research-only, no ship)

- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board RE-VERIFIED LIVE via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed). /api/market: 2 of 3 probes 200 with real DexScreener data through the 23:53 guards (dumb $0.000003854, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl, volume $31.66 h24 with 1 buy/9 sells), third probe the designed honest 502. The 07:53 amber watch item does NOT graduate: this is not "502s persist across 2+ more runs" — it's the known intermittent flake shape (06:03, 07:33, 07:53 episodes all self-recovered); the honest unavailable state renders correctly on /roots (Roots.tsx:102), no claim broken, no funds at risk. The KV-backed stale-cache mitigation stays parked pending real persistence evidence.
- **AI knowledge staleness check (04:23 precedent):** clean — scanner answer still names the paste-box wallet gate ("someone else's burn hash won't count" ×1); Pro answer ("tied to the wallet that paid" ×1) stays accurate post-05:33 signed sessions (invisible internals, no copy change earned).
- **Considered and REJECTED:** (1) escalating /api/market to incident and shipping the KV stale-cache mitigation now — REJECTED: 2/3 probes succeeded this run, so the 07:53 graduation condition is unmet; shipping incident plumbing on one flake inside a mostly-working hour is churn, and the current honest-unavailable state is the designed behavior; (2) client-side auto-retry on /api/market !ok before showing the unavailable state — REJECTED: the transient self-recovers, and a retry storm from clients would add pressure to the exact shared-egress-IP rate-limiting suspected of causing the flakes (making the flake worse, not better); (3) a second price API as client-side fallback — REJECTED: new external data source is a hard boundary; (4) batch/multi-address scan queue (paste several addresses, scan them all) — REJECTED: zero demand base (3 deep scans in 30 days total); machinery for a cohort that doesn't exist is churn; (5) Pro free-question rollover ("unused free questions carry to tomorrow") — REJECTED: freemium boundary locked by Antonio ("free is free and free is limited"); loosening caps with no demand evidence and no owner call is overreach; (6) touching src or shipping — nothing earned it.
- **NOTED, not rejected:** gift-a-deep-scan-pass and gift-a-Pro-pass stay parked for Antonio (promo/pricing-adjacent, zero demand base); direct DUMB↔DAMP pair routing stays parked (his approval, per AGENTS.md); the /api/market KV stale-cache mitigation stays parked pending persistence evidence.
- Tree quiet (all src mtimes = the loop's own prior ships: last write = the 05:33 #9 signed-session ship at 05:37 ET, already deployed + live-verified that run; one transient node process). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 08:13 — #8 bullish-demand research: twenty-fourth flat traffic read + /api/market flake GRADUATION (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final ~229 pv / 83 ev — byte-identical to the last eighteen reads (twenty-fourth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to every read since 03:53), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands for the twenty-fourth straight read; still confounded by Antonio's Pro testing + auditor sessions.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board re-verified live via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, unredeemed).
- **/api/market GRADUATES to incident-track:** 4 probes this run — probe 1 returned 200 with real DexScreener data through the 23:53 guards (dumb $0.000003909, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl; DAMP $0.00002116), then THREE consecutive honest 502s ({"ok":false,"reason":"Market data unavailable."}). That is 502s occurring across both runs since the 07:53 graduation condition was set ("if 502s persist across 2+ more runs it graduates") — 08:03 showed one, 08:13 shows three of four. Episode count is now four in ~2 hours (06:03, 07:33, 07:53, 08:13) with worsening density. The user-facing state stays honest by design: /roots renders the unavailable copy (Roots.tsx:102) and the stale branch (Roots.tsx:349 "stale — feed unreachable, last good snapshot") when a warm isolate has one. No funds at risk, no claim broken — incident-track, NOT a pause condition. **The KV-backed stale-cache mitigation is now an EARNED #9 unit** (per the 07:53 pre-authorization). Design, verified against the tree this run: market.ts:125-151 already serves a stale isolate-cache snapshot (60s) — the gap is cross-isolate churn, which a KV cache closes. Shape: on success, best-effort KV put `market:cache` (TTL ~15 min) into ANALYTICS_KV via the getEnv(request) pattern (src/server/analytics.ts:66-73); server.ts:110 currently calls handleMarket() without the request — pass it through so KV is reachable. On double-fetch failure: read KV, if the payload is <15 min old return it with stale:true (Roots.tsx:349 already renders this branch), else the honest 502. Honest by construction, no new data source (DexScreener is the existing approved one), no wallet/secrets/mascot touch. Owned by the next #9 run.
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical), "5% instant burn" ×9 with decomposition adjacent, scan-pass copy intact ("95,000 lands" ×2 in TokenScanner.tsx), zero Robinhood refs in dump.ts (blackout holds) — no drift anywhere.
- **Considered and REJECTED:** (1) acting on the flat numbers or the JP pageview — REJECTED as before (statistically meaningless, confounded, stray-crawler noise); (2) outbound or in-site demand nudges — hard boundary + no baseline; (3) burn streaks/badges on the leaderboard — REJECTED as premature: recognition mechanics for a zero-opted-in base are hollow; the utility bar (burns or deepens) is met in theory but the demand base doesn't exist; (4) a "why burns can't save a dead token" explainer section on /burn — REJECTED as churn: the honest framing is already on-site (×19 case-insensitive); restating it adds words, not safety; (5) an embeddable /roots widget for other communities — REJECTED per the 06:43 embeddable-scan-widget precedent: zero demand evidence; building distribution plumbing before the first distribution conversation is the build-first pattern the charter rejects; (6) touching src or shipping — nothing earned it this run.
- **NOTED, not rejected:** (a) accepting a DexScreener/pulsechain URL in the /scan address box (not just a raw address) — genuinely lowers the front-door friction for outsiders arriving with links, tiny read-only change, no new data source; but with 3 deep scans in 30 days the bottleneck is discovery, not the paste box — revisit when scanner usage exists; (b) gift-a-deep-scan-pass and gift-a-Pro-pass stay parked for Antonio (promo/pricing-adjacent, zero demand base); (c) direct DUMB↔DAMP pair routing stays parked (needs his approval, per AGENTS.md).
- Tree quiet (all src mtimes = the loop's own 05:33 #9 signed-session ship at 05:37 ET, already deployed + live-verified that run; one transient node process, gone — zero node/npm processes). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring — next #9 run owns the KV market-cache unit.

## 2026-09-30 08:43 — #13 real-utility research: revisit scan + knowledge check (research-only, no ship)

- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board RE-VERIFIED LIVE via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed).
- **/api/market:** 3/3 probes 200 with real DexScreener data through the 23:53 guards (dumb $0.000003909, damp $0.00002116, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl). The 08:23 #9 KV stale-cache mitigation holds; the 06:03–08:13 flake episodes have self-recovered; no stale:true needed this run. No funds at risk, no claim broken — amber watch item closes for now.
- **AI knowledge staleness check (04:23 precedent):** clean — scanner answer still names the paste-box wallet gate ("someone else's burn hash" ×1 in dump.ts); Pro answer ("tied to the wallet that paid" ×1) stays accurate post-05:33 signed sessions (invisible internals — sessions are signed BY the paid wallet); the 08:33 roadmap line for signed sessions (dump.ts:252) is accurate and live. Zero Robinhood refs in dump.ts (blackout holds); "never promise price" ×19 case-insensitive across src, byte-identical to prior reads.
- **Considered and REJECTED:** (1) accepting DexScreener/pulsechain URLs in the /scan address box — REJECTED as still un-earned: genuinely small and read-only, but with 3 deep scans in 30 days the bottleneck is discovery, not the paste box; stays NOTED for revisit when scanner usage exists (08:13 precedent); (2) mobile acceptance testing of the hub (queued from the 2026-09-29 UX audit) — REJECTED as a loop decision: it's Antonio's call on when, and the loop has no mobile device farm beyond Chromium QA; (3) any Pro free-question rollover or gift-pass experiment — REJECTED as before: freemium boundary locked by Antonio ("free is free and free is limited"), gift passes stay parked for him; (4) batch/multi-address scan queue — REJECTED as before: zero demand base; machinery for a cohort that doesn't exist is churn; (5) touching src or shipping — nothing earned it.
- **NOTED, not rejected:** gift-a-deep-scan-pass and gift-a-Pro-pass stay parked for Antonio (promo/pricing-adjacent, zero demand base); direct DUMB↔DAMP pair routing stays parked (needs his approval, per AGENTS.md).
- Tree quiet (only the loop's own 05:33 #9 session ship + 08:23 #9 market-cache ship in-tree, both deployed + live-verified that night/that morning; zero node/npm processes). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #13 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #8/#9/#10 stay open as recurring.

## 2026-09-30 08:53 — #8 bullish-demand research: 25th flat traffic read + on-chain verification of the 09-29 event surface (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last nineteen reads (twenty-fifth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to every read since 03:53), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). New visibility this run: the day-scoped read exposed the full 09-29 event composition for the first time — {bag_scan:1, burn_voluntary:1, copy_contract:3, quick_scan:3, raid_play:3, scan_started:4, swap_quote:4, wallet_connect:63, watchlist_toggle:1}. The 09:23 "flat = traffic/distribution" thesis stands; 09-29's activity remains confounded by Antonio's Pro testing + auditor sessions, but the 63 wallet_connects (once per connected address) and 4 swap_quotes are real session activity, not noise.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board RE-VERIFIED LIVE via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, 0x3d5a3eab832bdf9659d0882daf1a146d228a9c67, unredeemed). /api/market: 1/1 probe 200 fresh (non-stale) with real DexScreener data through the 23:53 guards (dumb $0.000003909, damp $0.00002116, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl) — the 08:23 KV stale-cache mitigation holds, flake episodes remain self-recovered; amber watch stays closed.
- **On-chain verification of the 09-29 event surface (new this run):** scanned all Transfer(to=dead) logs for DUMB (37 txs) and DAMP (34 txs) across the full 09-29 ET window (~13k blocks, no chunk failures) and grouped legs per tx per sender. Real trading activity CONFIRMED: sells/swaps through the pairs including hub-SwapBox-shaped multihop trades (multi-leg txs with pair + wallet burn legs in 94:1-era proportions) and one third-party contract (0x0e723e98 — has code, routes DUMB through the PulseX router; receipt-classified on tx 0xfc21cb4ea1a6 as taxed legs of its own operations, NOT a hub path). BUT: no tx on either token matches the voluntary-burn signature (two to-dead legs, same sender, ~94:1 / ~98:1 ratio), so the 09-29 burn_voluntary:1 event has NO on-chain counterpart I can find — single-leg EOA transfers in the window are all protocol burn legs of ordinary taxed transfers. Per the community-honesty rules the event stays UNVERIFIED: it is not counted as a real community burn, and nothing about it is published or celebrated. Possible explanations: an event-path gap in BurnBox worth a future look if it recurs — logged as a data-quality watch item, not a claim.
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx), zero Robinhood refs in dump.ts (blackout holds) — no drift anywhere.
- **Considered and REJECTED:** (1) claiming the 09-29 burn_voluntary event as a real community burn — REJECTED: no on-chain counterpart; the honesty rules forbid counting unverified events as burns (this is exactly the kind of invented enthusiasm the rules exist to stop); (2) a "whale watch" or large-transfer alert built on to-dead legs — REJECTED: the eye-catching legs (e.g. 3.75M DAMP from the DAMP/WPLS pair, 17,433 DUMB single legs) are protocol burn legs of ordinary taxed transfers, not whale signals — a watcher on them would mislead; (3) listing or linking the third-party vault contract 0x0e723e98 on the hub — REJECTED: unverified third-party contract the hub did not build; the safety-first brand doesn't endorse external contracts; (4) acting on the flat 09-30 numbers or the JP pageview — REJECTED as before (statistically meaningless, confounded, stray-crawler noise); (5) outbound or in-site demand nudges — hard boundary + no baseline; (6) touching src or shipping — nothing earned it.
- **NOTED, not rejected:** the burn_voluntary event↔chain mismatch as a data-quality watch item (if a burn_voluntary event recurs without an on-chain voluntary burn, audit the BurnBox event path); gift-a-deep-scan-pass and gift-a-Pro-pass stay parked for Antonio (promo/pricing-adjacent, zero demand base); direct DUMB↔DAMP pair routing stays parked (his approval, per AGENTS.md).
- Tree quiet (all src mtimes = the loop's own prior ships: 04:43 FeedTheBurn claim-precision fix + 05:33 #9 signed-session ship + 08:23 #9 KV market-cache ship + 08:33 #10 ROADMAP ship, all deployed + live-verified their runs; the two node processes are transient). Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.

## 2026-09-30 09:13 — #8 bullish-demand research: 26th flat traffic read (research-only, no ship)

- **Traffic (KV, read-only, day-scoped keys):** 2026-09-29 final 230 pv / 83 ev — byte-identical to the last twenty reads (twenty-sixth straight; zero activity since ~01:23 ET). 2026-09-30 since midnight: 9 pv (/ 3, /burn 3, /ai 1, /scan 1, /story 1 — byte-identical to every read since 03:53), events quick_scan 1 + wallet_connect 1, countries US 9 + JP 1 (the same single anonymous JP pv, no events — noise, not signal). The 09:23 "flat = traffic/distribution" thesis stands; 09-29's composition (63 wallet_connects, 4 swap_quotes, 3 raid_play, 3 copy_contract) remains confounded by Antonio's Pro testing + auditor sessions, so no honest read beyond it is available yet.
- **Feedback inbox:** no new entries (no fb keys on 09-29 or 09-30; the single known 2026-09-28 test submission remains dismissed).
- **Revisit scan:** no ripened items — /api/scan-stats flat since 03:50 09-29 ({deep_scans:3, pass_burns:1, dumb_destroyed_min:100000}); pledge board RE-VERIFIED LIVE via /api/pledges: still the single real pledge (too_dumb, 1000 DUMB, unredeemed). /api/market 200 fresh (non-stale) with real DexScreener data through the 23:53 guards (dumb $0.000003909, damp $0.00002116, correct pairAddress 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186, https chartUrl) — the 08:23 KV stale-cache mitigation holds; amber watch stays closed.
- **Demand-surface drift check (grep-level):** "never promise price" ×19 case-insensitive (byte-identical to every prior read), "5% instant burn" ×9 with decomposition adjacent, scan-pass 100k-SENT/~95k-lands copy intact ("95,000 lands" ×2 in TokenScanner.tsx), zero Robinhood refs in dump.ts (blackout holds) — no drift anywhere. All src mtimes map exactly to known loop-owned ships (08:33 #10 roadmap, 08:23 #9 market-cache, 05:33 #9 signed sessions, 04:46 FeedTheBurn fix); zero node/npm processes; no foreign writes.
- **Considered and REJECTED:** (1) a first-visit guided tour/onboarding overlay — REJECTED as churn for now: /trade already carries the 5-step first-swap walkthrough + gas guide, /story + /whitepaper cover the education, and the UX audit's real IA gap (proof/genesis/roots merge) is Antonio's call, not an overlay fix; (2) an embeddable ContractGuardrail "verified-contract kit" for other PulseChain communities — REJECTED per the 06:43/07:33 embeddable-widget precedent: zero demand evidence; building distribution plumbing before the first distribution conversation is the build-first pattern the charter rejects; (3) a burn quote-card generator for user-shared burns — REJECTED as already-built: BurnBox success panel ships explorer-linked share text and the leaderboard share row already covers post-X/Telegram; a second generator would be a duplicate; (4) daily burn recaps posted on X — hard boundary: outbound comms as Antonio; never without his word; (5) acting on 09-29's event composition (63 wallet_connects, 4 swap_quotes, 3 raid_play) — REJECTED: still confounded by Antonio's Pro testing + auditor sessions; treating it as organic demand would be invented enthusiasm; (6) touching src or shipping — nothing earned it.
- **NOTED, not rejected:** the burn_voluntary event↔chain mismatch (09-29) stays a data-quality watch item — if a burn_voluntary event recurs without an on-chain voluntary burn, audit the BurnBox event path; DexScreener-URL acceptance in the /scan box stays NOTED for revisit when scanner usage exists; gift-a-deep-scan-pass and gift-a-Pro-pass stay parked for Antonio (promo/pricing-adjacent, zero demand base); direct DUMB↔DAMP pair routing stays parked (his approval, per AGENTS.md).
- Site health: / /scan /burn /ai /plan /roots /trade /wallet all 200 on the custom domain. Zero wallet/signing/data-source/mascot touch, no new data sources. #8 stays open as recurring; #5 on Antonio's idea-only hold; #6 ON HOLD per Antonio 2026-09-29; #9/#10/#13 stay open as recurring.
