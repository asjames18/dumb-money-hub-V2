# Burn contests — design (2026-09-27, design only, NOT implemented)

Backlog item #5. Entry = a voluntary burn, verified on-chain. The primitives
(#2 burn button, #3 ticker, #4 leaderboard) are all live, so this design
reuses them — no new contracts, no new data sources, no invented data.

## Verified primitives available

- `src/lib/burns.ts` `fetchRecentBurns()` returns `BurnEvent[]` with
  `kind: "voluntary" | "protocol"` per sender per tx (verified 2026-09-26:
  a voluntary burn = sender's legs go to dead with no non-dead recipient leg).
  `BurnLeaderboard` already aggregates this into per-wallet totals.
- A voluntary burn destroys real tokens, irreversibly. This is the central
  anti-gaming fact (see below).

## Anti-gaming analysis (Mosheh's safety lens)

1. **Wash-burning is self-defeating.** Unlike volume contests, you cannot
   recycle burned tokens — they are gone, plus the 6%/3% transfer tax on the
   way in. There is no way to game a burn contest into profit. A whale who
   burns big genuinely shrinks supply; the burn itself is the pro-social act.
2. **Real gaming vectors are procedural, not economic:**
   - *Sybil wallets* — splitting one burn across 50 wallets to win a
     "most participants" or "most burners" count. Mitigation: rank single
     wallets only, never raw wallet counts, or require a minimum entry size.
   - *Retroactive windows* — announcing a window after the fact lets anyone
     who happened to burn in-window win by luck, and insiders could pre-burn.
     Mitigation: announce first, use a fixed FUTURE start block, publish the
     window up front.
   - *Protocol-leg double counting* — the 1% tax burn of ordinary trades is
     NOT a voluntary burn. Only `kind === "voluntary"` counts. Every row
     links its receipt on scan.pulsechain.com.
   - *"Burn" framing fraud* — transfers to a fake "burn address" or to
     own wallets. Mitigation: the dead address
     (`0x000000000000000000000000000000000000dEaD`) is the only accepted
     destination — enforced by the query itself (Transfer logs to dead).
3. **Wealth asymmetry is real but honest.** "Biggest burn wins" is
   plutocratic. Don't hide that — offer formats where small holders matter
   (milestones, frequency tiers with minimums).

## Formats evaluated

| Format | Entry | Fair? | Gaming risk | Verdict |
|---|---|---|---|---|
| **Community milestone drive** (RECOMMENDED pilot) | Any voluntary burn in window counts toward a shared target (e.g. 1B DUMB voluntarily burned in 30 days). Everyone who burns is a participant; progress bar; no winner. | Yes — a dust-burner's 100 DUMB counts the same as 1% of a milestone | None meaningful — burning more only helps the goal | **Pilot with this.** Zero-sum-free, celebrates everyone, honest. |
| Honor roll of voluntary burners | Burns ≥ threshold shown on an honor roll (recognition only, no prizes) | Yes | Low — threshold kills dust spam | Good companion to the milestone drive. |
| Biggest single burn (quarterly) | Largest single voluntary burn tx in window | Plutocratic but transparent | Low — the act is the cost | Acceptable as recognition-only ("whale of the quarter"), never as the only format. |
| Most burn txs (frequency) | Most voluntary-burn transactions in window | Favors activity over size | Medium — encourages dust spam unless a per-entry minimum is enforced | Defer; enforceable only with a minimum per counted entry (e.g. ≥ $5 est. value), and minimums need reliable per-entry pricing. |
| Burn-to-holdings ratio tiers | (Burned ÷ holdings at start block) by tier | Favors small holders most | Needs start-block balance snapshots per participant; snapshot trust + complexity | REJECTED for now — too much machinery, snapshot honesty is hard to audit client-side. Revisit only with a proper backend. |

## Prizes — recognition only (no funded prizes)

No token prizes, no monetary prizes, no raffle. Reasons: funded prizes are
spending (Antonio's approval required) and introduce legal questions
(sweepstakes law, tax). The pilot runs on recognition: honor roll, progress
bar, Telegram shout-outs (written by Antonio or the community — never
auto-posted as him). If the community later wants funded prizes, that's a
separate decision for Antonio with legal review — not this loop's call.

## Honest framing (mandatory copy rules)

- "Burns shrink supply. Price needs real demand — burning is participation,
  not an investment strategy." (same honest framing as the /burn page)
- No promises of price appreciation, new highs, or "the burn will pump it."
- Participants displayed as addresses with explorer links (verified on-chain);
  no invented names. Optional nicknames only via genuine opt-in — deferred.
- Empty/zero states: show them honestly ("No voluntary burns in this window
  yet — be the first" with the burn button link), never seeded rows.

## Implementation sketch (smallest viable — pending Antonio's pick)

1. Contest window as `{ startBlock, endBlock, targetWei? }` constants in
   `src/lib/burns.ts` (start block announced in advance, published on /burn).
2. `ContestStandings` component on /burn: filters `fetchRecentBurns()` output
   to `blockNumber ∈ window` and `kind === "voluntary"`, aggregates per
   sender, shows progress bar (milestone) or honor roll, with receipt links.
3. **Scan-window limitation:** `fetchRecentBurns()` scans the last 20,000
   blocks (~2.3 days) — a 30-day contest can't read history client-side.
   Options, simplest first:
   - (a) Short windows only (≤ 2 days) — fits the existing scan, zero new code.
   - (b) Loop-accumulated ledger: the 30-min build loop appends verified
     voluntary burns into a `contest-ledger.json` committed to the repo and
     shipped with the build during a contest (no new data source, no backend,
     no contract — the loop itself is the ledger writer). Needs careful
     dedupe by tx hash; ledger is public-auditable against the chain.
   Recommend (a) for the pilot, (b) only if Antonio wants longer contests.
4. Flip the /burn "Burn contests next" card to the contest UI when a window
   is announced; update `src/data/dump.ts` ROADMAP statuses.

## Recommendation to Antonio

Run a **recognition-only community burn drive as the pilot**: announced in
advance, future start block, ~2-day window (fits the existing scan),
shared voluntary-burn target with a progress bar + honor roll. No prizes, no
new contracts, no new infrastructure. If the pilot gets real burns, graduate
to longer windows via the loop-ledger (option b) and revisit formats.
