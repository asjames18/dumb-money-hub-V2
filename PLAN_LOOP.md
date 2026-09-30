# PulseChain Dumb Money — Plan Loop State

Roadmap source of truth: `src/data/dump.ts` (ROADMAP array). Work in roadmap
order, one item per run. Statuses: pending / done / skipped / blocked.

## Items

1. **Live on PulseChain** (Now) — done. Shipped before the loop started
   (roadmap `done: true` in dump.ts).
2. **Analytics home** (Week 1) — audited 2026-09-26: /roots already has the
   verified flagship pair cards (WPLS/DUMB, DAMP/WPLS, explorer + DEXScreener
   links), live on-chain tax/engine reads, and the immobilized breakdown
   (burned forever + entombed, % of supply, both tokens); /trade points at the
   live pairs; /story covers holder reality (pool-not-whale). Flipped
   `done: true` in dump.ts 2026-09-26. No new external data source needed.
3. **Community ignition** (Week 2) — done. Audited 2026-09-26: /raid already
   ships daily missions (Mission of the Day panel, `generateDailyMission` seeded per-day),
   vibe packs (Proof Week / Meme Week / Retail School + Meme Contest + Raid Content Kit),
   and share-ready outputs (X post, Telegram hype line, meme caption, image prompt, CTA
   with copy buttons + Post-to-X / Share-to-Telegram intent links). Flipped `done: true`
   in dump.ts, built, linted, deployed to dump-money-hub-preview; /plan badge verified live.
   NOTE: community-promotion actions stay skipped until Antonio completes his tiny live
   test trades; never post as Antonio; never invent community members.
4. **Proof culture** (Week 3) — done. Shipped 2026-09-26: mounted the
   `BurnMilestones` strip (16B/17B/18B, live dead-balance read, reuses the
   /roots react-query cache) on /proof — milestone celebrations now live on the
   proof page. Audited the other two sub-items as already shipped:
   - "Scam-safety and verify-address lessons": ContractGuardrail ("Which Dumb
     Money?" name-collision warning + pinned DUMB/DAMP addresses + copy
     buttons) ships in the hero, /trade, and /story; /proof's contract receipt
     already says "Verify the address character by character — fakes exist."
   - "Raid leaderboard fills with real names": NOT buildable — no real
     community member names exist and none may be invented; promotion/leaderboard
     seeding stays blocked until Antonio completes his tiny live test trades and
     real community members opt in. Built, tsc/eslint clean, deployed to
     dump-money-hub-preview; /proof "Burn milestones" + /plan "Shipped" badge
     verified live.
5. **Community engine** (60 days) — skipped (recorded 2026-09-26). Audited
   2026-09-26; every sub-item hits a skip rule — none built:
   - "Shared XP leaderboard": the loop cannot invent community member names,
     and no real members exist yet (promotion on hold until Antonio completes
     his tiny live test trades). The local-only XP board on /raid already says
     "no fake rows, no other raiders — a shared community board ships later";
     a shared board also needs server-side state + moderation, which is an
     unauthenticated spam vector without real users.
   - "Meme contest seasons": needs real community participation that does not
     exist yet; contest infrastructure for a nonexistent community is
     speculative building. Revisit after ignition is real.
   - "Telegram growth pushes": promotion action — skipped until Antonio
     completes his tiny live test trades.
   - "Weekly community spaces": hosting spaces means posting/hosting as
     Antonio — the loop never does that.
   Reopen when: real community members opt in and Antonio's test trades are
   done.
6. **Products and rails** (90 days) — done. Audited 2026-09-26: the
   "Revenue rails" section is already live on /plan (component
   `src/components/dumb/Revenue.tsx`, mounted in `Plan.tsx`): six planned
   rails — Merch, Premium AI tools, Content kits for projects, Sponsor spots,
   Education products, Transparent burn events — framed honestly as "How the
   project plans to fund itself. None of these are statements about token
   price." Free education content already ships elsewhere (AI_QA beginner
   lessons + scam-safety answers, /story). Flipped `done: true` in dump.ts.
   Implementation-side sub-items skipped with reasons — the loop never builds
   these: "Smiley merch drop" (spending money — storefront/inventory); "Sponsor
   spots" (no real sponsors exist; an empty placeholder slot is speculative
   building; signing sponsors is business outreach Antonio must do); "Premium
   AI and content kits" as paid tiers (payments/money); "Education products"
   as paid products (payments/money — the free form already ships). If Antonio
   wants any of these as real products, that's his call with money/partners.
7. **DUMB Burn Engine** (Planned) — skipped (recorded 2026-09-26). Explicitly
   "design in progress, not built yet" — needs Antonio's mechanism design and a
   new contract deployment, which this loop never does. No build attempted.

## Run log

- 2026-09-26 run 1: created state file; audited "Analytics home" (item 2) —
  genuinely shipped on /roots, /trade, /story; flipped `done: true` in
  dump.ts; built, linted, deployed to dump-money-hub-preview; verified live.
- 2026-09-26 run 2: audited "Community ignition" (item 3) — already shipped on
  /raid (Mission of the Day, vibe packs, share-ready X/Telegram outputs); flipped
  `done: true` in dump.ts; built, tsc/eslint clean, deployed to
  dump-money-hub-preview; /plan "Shipped" badge verified live. Next item: #4
  "Proof culture".
- 2026-09-26 run 3: built "Proof culture" (item 4) — mounted the BurnMilestones
  strip (16B/17B/18B, live on-chain dead-balance read, reuses the /roots
  react-query cache) on /proof; flipped `done: true` in dump.ts; tsc/eslint/
  build clean; deployed to dump-money-hub-preview; /proof milestone content +
  /plan "Shipped" badge verified live. Sub-items audited: scam-safety lessons
  already ship (ContractGuardrail in hero, /trade, /story; /proof contract
  receipt carries the verify-character-by-character warning); real-names raid
  leaderboard skipped — no real member names exist and none may be invented.
  Next item: #5 "Community engine" (60 days).

  7 is the last item and already skipped: all seven items are now terminal
  (1–4 done, 5 skipped, 6 done, 7 skipped). FINAL SUMMARY:
  - Shipped by the loop (done: true in dump.ts): Live on PulseChain (1, pre-loop);
    Analytics home (2, audited — live pair/tax/immobilized reads on /roots);
    Community ignition (3, audited — daily missions, vibe packs, share-ready
    outputs on /raid); Proof culture (4 — BurnMilestones strip mounted on /proof;
    scam-safety already shipped via ContractGuardrail; real-names leaderboard
    skipped); Products and rails (6, audited — Revenue rails live on /plan).
  - Skipped with recorded reasons: Community engine (5 — shared XP leaderboard
    needs real names; meme contests need a real community; Telegram pushes are
    promotion on hold; spaces = posting as Antonio); Products and rails
    implementations (6 — merch = money; sponsors = real partners/outreach;
    paid kits/products = payments/money; free education already ships);
    DUMB Burn Engine (7 — design in progress, needs Antonio's mechanism design
    + a new contract deployment, which this loop never does).
  - Needs Antonio: his tiny live test trades (promotion stays on hold until
    then); real community members opting in (unblocks leaderboard/contests);
    any money/partner-backed product (merch, sponsors, paid tiers); the Burn
    Engine mechanism design + any contract work.
  Loop stopped 2026-09-26 via cron.remove(id pulse-plan-loop).

- 2026-09-26 run 5: audited "Products and rails" (item 6) — the Revenue rails
  section (Merch / Premium AI tools / Content kits / Sponsor spots / Education
  products / burn events) is already live on /plan and honest about being
  plans ("None of these are statements about token price"); free education
  content already ships (AI_QA lessons). Implementations skipped: merch =
  spending money, sponsors = real partners/outreach, paid kits/products =
  payments/money. Flipped `done: true` in dump.ts; built, tsc/eslint clean,
  deployed to dump-money-hub-preview; /plan "Shipped" badge + Revenue rails
  section verified live. All seven items now terminal → wrote final summary
  and called cron.remove(id pulse-plan-loop). Next item: none — loop stopped.
