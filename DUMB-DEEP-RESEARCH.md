# Dumb Money (DUMB) & Dumb Amplifier (DAMP) — Deep Research

Research date: 2026-09-26. Read-only: PulseChain explorer APIs, GeckoTerminal, DEXScreener, web/social search. No contract interaction, no posting, no contact.

Companion: `DUMB-DAMP-RESEARCH.md` (pairs inventory + contract mechanics). This file is the *story* — origin, people, money flows, and what's true vs what's marketing.

**Nothing here is financial advice.**

---

## Timeline of the token's life (UTC)

- **2023-04-24** — Wallet `0xe90c5c1d36ab80ffcccca40c4989633026ef45fa` is born (funded 0.2635 PLS by `0x077d360f11…`). It becomes a serial memecoin launcher: 10+ contract deployments in its first 50 transactions alone.
- **2025-02-15 02:19:45Z** — **DUMB launched** (block 22713220, tx `0x05799690…`). 28B minted to the deployer.
- **2025-02-15 02:20:05Z** — Deployer burns **14B DUMB (50% of supply)** to the dead address, 20 seconds after deploy (tx `0xa4993f52…`).
- **2025-02-15 02:20:15Z** — **DAMP launched** (block 22713223, tx `0x6e7abe19…`), 30 seconds after DUMB, same deployer. 1B minted.
- **2025-02-15 02:20:25Z** — Deployer burns **300M DAMP (30% of supply)** (tx `0x4429869f…`).
- **2025-02-15 02:20:35Z** — Deployer registers DAMP as a fee pair on DUMB (`addPairToken`, tx `0x5d8546b3…`).
- **2025-02-15 02:27:35Z / 02:27:55Z** — Liquidity seeded: ~84.7M PLS total across both tokens' pools (txs `0x2bbfbc13…`, `0x919a222f…`). The DUMB/DAMP pair `0xf046e04ff986dcae96315046888d85ac27500618` is born here.
- **2025-02-15 02:28–04:24Z** — Launch-day frenzy: early buyers pile in within minutes and dump just as fast. Classic snipe-and-dump on top of the launch template.
- **2025-02-16 16:17:25Z / 16:17:35Z** — **Both ownerships renounced**, ~38 hours after launch, 10 seconds apart (txs `0x81c223c6…`, `0x488c64e4…`). `owner() = 0x0` on both to this day.
- **2025-02-18 → 2025-07-30** — Wallet `0x0e10dd174e8906d13ec2e96afd6667503842f197` accumulates 597.5M DUMB + 59.2M DAMP across 195 inbound transfers. **Zero sells. Ever.**
- **2026-01-07/08 + 01-24** — DUMB's most active trading days in the observable window ($366 + $695 + $706 volume vs a ~$2.70 median day). Buy-up then distribution; DAMP mirrors the Jan 24 move.
- **2026-02-23** — DUMB window-ATL: $0.0000013528.
- **2026-03-04** — Coordinated recovery rally: DUMB +31%, DAMP +18.2% — one of only two genuinely volume-backed rallies in the window.
- **2026-06-08** — DAMP window-ATL: $0.0000103963.
- **2026-06-09** — Wayback snapshot of dumbmoney.win (status 200): the website was alive ~3 months ago.
- **2026-08-25** — Synchronized window-ATHs on near-zero volume: DUMB $0.0000052143 ($23 vol), DAMP $0.0000316883 ($6 vol). Coordinated, not organic.
- **2026-09-26 (today)** — DUMB ~$0.00000422 (FDV ~$52K on circulating), DAMP ~$0.0000231 (FDV ~$14.9K). Median daily volume $2–3. The @DumbMoneydotwin X account (~188 followers) still posts memes.

---

## 1. Origin story

Launched 2025-02-15 by a single anonymous serial-launcher wallet that deployed both tokens 30 seconds apart. The playbook was a template, executed mechanically: mint 100% to self → instantly burn 50% (DUMB) / 30% (DAMP) → seed liquidity with ~84.7M PLS → renounce both contracts 38 hours later. **No presale.** But not a fair launch either — launch-day wallets sniped and dumped within minutes, and the deployer controlled every parameter of the birth. The deployer kept nothing (0 DUMB / 714K DAMP dust today) and has no on-chain link to Antonio or his team — DUMB/DAMP are two of dozens of tokens this wallet launched. Team: anonymous then, anonymous now; the entire brand is "no team, no keys, no rugs — just code."

## 2. The "mystery whale" — resolved

`0xf046e04ff986dcae96315046888d85ac27500618` (1.09B DUMB + 196M DAMP, top-3 of both) is **not a whale at all — it is the DUMB/DAMP liquidity pair contract** on PulseX (verified: `getReserves` = 196.1M DAMP / 1.09B DUMB, `skim()` in bytecode, factory = PulseXFactory). Its "accumulation" is LP reserves; its apparent "sells" were users buying. **Site implication:** an earlier holder table framed it as a top holder — that framing is wrong and must be corrected to "liquidity pool."

The real #2 dual-holder is `0x0e10dd174e8906d13ec2e96afd6667503842f197`: an EOA that bought 597.5M DUMB + 59.2M DAMP across 195 transfers (Feb–Jul 2025), mostly from launch-day sellers, and has **never sold once**. Best-evidenced guess: an early investor (possibly team-adjacent) accumulating OTC. A genuine diamond-hands story the site can tell honestly.

## 3. The big burn — resolved

- **DUMB:** one 14B transaction 20 seconds after deploy (the deployer's 50% burn) + ~1.8B more reaching the dead address over time = **15.83B dead (56.5%)**.
- **DAMP:** one 300M transaction 10 seconds after deploy (30%) + ~64M more = **364M dead (36.4%)**.
- **Mechanism, corrected 2026-09-26:** the per-transfer tax split is **live**. `fees()` returns only the total tax (600 bps DUMB / 300 bps DAMP); the real split comes from `feesDistribution()`: DUMB (3333, 3333, 1667, 1667) → of every taxed transfer, 2% to the contract's buy-and-burn bucket, 2% to its liquidity bucket, **1% burned to the dead address, 1% reflected to holders**; DAMP (3333, 0, 3333, 3334) → 1% to the contract, 1% burned, 1% reflected. An earlier version of this file (and the site) misread `fees()`'s single-word return as the 4-word split and wrongly claimed `[600,0,0,0]` — that claim is retracted. What IS dead is only the `_processFees` auto-processing engine: the accumulated buckets in the contract can never be processed (executeSwapsActive=false, owner renounced). Post-launch dead-address growth is the 1% protocol burn on every taxed transfer plus manual holder burns.

## 4. DAMP's intended design

DAMP ("Dumb Amplifier") was designed so its 3% tax engine would market-buy DUMB and burn it — a buy-and-burn flywheel amplifying DUMB's scarcity, with DAMP's own volume feeding the loop (`MAIN_TOKEN` = the DUMB address, confirmed on-chain). **No docs, posts, or dashboards describing the flywheel were found**, and it is **unknown whether the engine ever operated** before the fee switch died. The engine is inert today. The site must describe it in past tense only, as the original design — never as a live mechanism.

## 5. Official presence

| Surface | Status |
|---|---|
| X @DumbMoneydotwin (~188 followers) | **Alive** — meme posts ("Dumbo", "join the cult"), retweets community member @Moneybags733. Only confirmed-living official surface. |
| dumbmoney.win | Referenced as the website; Wayback snapshot 2026-06-09 (200). **Live status today unconfirmed** (direct fetch timed out). |
| Docs (DEXScreener "Docs" links) | **Unreachable** — destination unknown. |
| Telegram (short link in X bio) | **Unverified** — existence and size unknown. |
| Medium / GitBook / whitepaper | **None found.** |

## 6. Price history

From GeckoTerminal daily candles (observable window only — free tier caps history, so **true lifetime ATH/ATL may be older**):

| Token | Window ATH | Window ATL | Now (2026-09-26) | FDV (circ.) | 24h vol |
|---|---|---|---|---|---|
| DUMB | $0.0000052143 (2026-08-25) | $0.0000013528 (2026-02-23) | ~$0.00000422 (−19% off ATH) | ~$52K | ~$0.13 |
| DAMP | $0.0000316883 (2026-08-25) | $0.0000103963 (2026-06-08) | ~$0.0000231 (−27% off ATH) | ~$14.9K | ~$0.03 |

Chart character: **dead-flat microcap punctuated by micro-pumps**. DUMB/DAMP daily returns correlate at 0.86 and prices at 0.99 — neither has independent price discovery; they share WPLS-quote mechanics and a holder base. Median daily volume is $2–3; zero-volume days are routine; the "ATHs" printed on <$25 of volume. DUMB's one genuinely active month was January 2026. There is no evidence of a real bid — just holder-driven liquidity.

## 7. Registered pairs rationale

No story found — no partnerships, no votes, no docs. The set (WPLS, DAI, ATROPA, HEX, INC, WBTC, PLSX, DAMP) is simply the obvious liquid PulseChain-ecosystem tokens plus ATROPA. **Do not claim any partnership narrative.**

## 8. Roadmap: promises vs delivered

**No roadmap was ever published.** Delivered (verifiable): immutable renounced contracts, live DEX pairs, a small surviving X community. Unfulfilled: nothing was promised on the record, so nothing is "unfulfilled" — but the site must invent nothing: no future burns, no CEX listings, no partnerships, no utility claims. The honest story is "the code does what the code does."

## 9. Community sentiment now

Tiny, X-centric meme community ("Dumbo", "join the cult", burn memes), ~188 followers, one visibly engaged holder. **No raid culture exists** — no raid groups, no hashtag campaigns found; Instagram/Facebook/Threads have zero PulseChain-DUMB presence (every "Dumb Money" result there is the unrelated Solana token). The site's /raid would be *founding* a raid culture, not joining one — frame it that way.

## 10. Risks & red flags — brutal honesty

1. **The official X account's pinned post was accurate — we misread the contract.** Pinned post: "burns every trade, reflections to holders" — verified on-chain 2026-09-26: the 1% burn and 1% reflection shares are live on every taxed transfer (see §3). An earlier version of this file claimed both shares were 0; that was our selector error (`fees()` misread as `feesDistribution()`), now retracted — the site carries a plain retraction. What the account gets wrong: a later post claims "I still hold most of the supply. And I lost the key." — on-chain, the deployer holds **0 DUMB**; that is LARP or a joke, and it contradicts the "no team" story. Likewise "18B+ incinerated" (marketing tweet) vs 15.83B on-chain — don't repeat the 18B.
2. **Name collision is the #1 newcomer danger.** At least four unrelated "Dumb Money" tokens exist — notably a loud Solana pump.fun token (Apr 2026, aggressive influencer marketing), an Ethereum DumbMoneyERC, plus BSC/Base copies. Anyone googling "Dumb Money" most likely finds the *wrong* token.
3. **No audit, no team, no recourse, micro-liquidity.** Renounced = nobody can fix, upgrade, or respond to anything. ~$4.2K DUMB/WPLS and ~$2.4K DAMP/WPLS liquidity; a single $100 trade moves the price. "No rugs" is true only because there's nothing left to maintain.
4. **DEXScreener flags "4 issues" on Quick Intel** for both pairs (automated; specifics unreadable via text fetch) — worth a manual look before the site leans on those links.
5. **Unknowns (trail goes cold):** PLS price at launch (so the 84.7M PLS seed's USD value), docs contents, Telegram existence/size, dumbmoney.win live status, whether the DAMP engine ever ran.

---

## Top 5 additions/changes the site needs

1. **"Which Dumb Money?" guardrail (highest priority).** Pin both PulseChain contract addresses where no visitor can miss them (hero or trade page top) with a plain warning: *several unrelated tokens share this name — check the contract address before you buy.* This is the single most protective thing the site can do.
2. **"The true story" timeline.** Launch 2025-02-15 → 50%/30% burns in the first 60 seconds (with tx links) → liquidity seeded → renounced 38 hours later → deployer kept nothing. Every claim verifiable on-chain. It builds trust and preempts every FUD question.
3. **"What the code actually does today" — with our own retraction.** A short, fearless section stating the live split (DUMB: 2% buy-back bucket / 2% liquidity bucket / 1% burned / 1% reflected per taxed transfer; DAMP: 1% / 0% / 1% / 1%), the dead auto-processing engine, and — because an earlier version of this page wrongly dunked on the project's pinned X post — a plain retraction: the pinned post ("burns every trade, reflections to holders") was accurate; we misread the contract. Honesty as differentiation, including honesty about our own error.
4. **Holder reality.** 69% of DUMB immobilized (56.5% burned + 12.5% entombed); the "top whale" is actually the liquidity pool (say so — it demonstrates the site's homework); the diamond-hands accumulator with 195 buys and zero sells. No invented distribution claims.
5. **Found-the-raid framing + pre-trade checklist.** There is no existing raid culture to plug into — position /raid as *founding* the DUMB raid culture for a token that outlived its team. Pair it with a brutally honest pre-trade checklist: 6% tax on every transfer (already on /trade), micro-liquidity slippage warning (a $100 trade moves price), and a note to check DEXScreener's risk flags themselves.

---

## Source notes

- Explorer: `https://api.scan.pulsechain.com/api` (Blockscout-compatible; flaky — retries required)
- Key txs: DUMB deploy `0x05799690b51e7171fa4f643885cb7cfe8421cf1e827b84c128efa1a96c983a67`, 14B burn `0xa4993f522d1d205cf7db0282ff3751ad8adabc1dfcbb2033ab66a4edd29f578d`, DAMP deploy `0x6e7abe198a8a1a677b395265b1a8e940a43060d7fb9841125d8e1786804c5cf0`, 300M burn `0x4429869ff8b7a4f1473d90db1b81bf168db4bd0415745abaf8d4bfd3b8574d10`, DUMB renounce `0x488c64e489a9bb597d025183b1afdbccf2d186348cb937d9eedfb0aa0e83ee5a`, DAMP renounce `0x81c223c6262cce0ade5d7412ed505c5ba6a274d9abf7cdd71e0f2641ea7fafbb`
- Market: GeckoTerminal `networks/pulsechain` (pools `0x221f…0d186`, `0xB256…8633A`); DEXScreener token API cross-check
- Social/web: twstalker.com/DumbMoneydotwin (X mirror), dexscreener.com pair pages, geckoterminal.com pool pages, archive.org availability API for dumbmoney.win
- Scratch files: `/tmp/deep-onchain.md`, `/tmp/deep-market.md`, `/tmp/deep-web.md`
