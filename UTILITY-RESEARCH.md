# Utility Research — 20+ new utilities around DUMB/DAMP on PulseChain

Written 2026-10-04. Product research, not a build order — nothing here is approved to build. (Update 2026-10-13: idea #1, the Scam-DM Decoder, WAS approved and shipped on Antonio's word — the "Decode a scam DM" tab on /scan, commit d192130. The remaining 21 ideas stay unapproved research.)

## Standing context (read before scoring)

- **The constraint is arrivals, not missing product.** The build loop's research file (BULLISH-RESEARCH.md) has confirmed ~150× that traffic/distribution is the bottleneck: ~13 pageviews/day, 3 deep scans in 30 days, empty feedback inbox. Every idea below is therefore scored partly on whether it can pull outsiders in — a utility nobody discovers is decoration.
- **Structural truth:** DUMB's 6% transfer tax makes it a poor payments token. Utility lives in the application layer with DUMB as burn fuel / access layer. None of these ideas put DUMB into payments, tipping, or commerce.
- **Vetoes honored:** no custody, no lotteries/prize pools, no staking contracts, no promised returns, no invented data, no new smart contracts. Anything needing a new external data source or a new monetization shape is flagged "needs Antonio's approval."
- **Checked against BULLISH-RESEARCH.md** (all parked/rejected ideas) and the shipped list (scanner, swap box, BurnBox, ticker, leaderboard, Canvas, pledges, brag cards, DripVault, Dumb AI +Pro, /portfolio, Wallet Watch, missions, raid leaderboard, approval checker, glossary). Adjacent parks are named per idea with the differentiation.

---

## The 22 ideas

### 1. Scam-DM Decoder
- **Pitch:** Paste the suspicious DM; get a red-flag breakdown in plain English.
- **Who feels the pain:** Every PulseChain newcomer. The modal attack isn't a bad contract — it's a DM: fake support, "send 1 PLS to double it," airdrop-claim links, lookalike admin accounts. Nobody has a tool for the message itself.
- **Burn/hold mechanic:** Free to use; any contract address found in the message gets a one-tap deep-link into the free quick scan, and the deep scan stays burn-gated. Converts fear into scanner usage.
- **North-star fit:** "Safest hub on PulseChain" currently covers contracts. This covers the human attack surface. Genuine SEO asset ("is this crypto DM a scam").
- **Effort:** S (curated scam-template patterns, client-side matching, zero new data sources).
- **Risks/open questions:** Template list needs curation and updating (Antonio's lane to seed); must never say "this is safe" — only "these are the red flags we found / none matched." Pattern-matching can't catch novel scams; the honest copy must say so.
- **Status (2026-10-13): SHIPPED with Antonio's approval — commit d192130, "Decode a scam DM" tab on /scan.** DM pattern-matching, 0x deep-links into the free quick scan, URLs rendered as non-clickable text, honest "never says safe" copy. Roadmap bullet added to the done:true "Token safety scanner" section (src/data/dump.ts). Antonio's 14:58 UTC utility push ("whatever we can" to add utility) names this lane directly — the remaining 21 ideas are now scored as candidates, not speculation.

### 2. Lookalike Token Detector
- **Pitch:** "Someone sent you an address claiming to be DUMB (or HEX, PLSX…) — is it the real one?"
- **Who feels the pain:** Newcomers receiving pasted addresses in DMs/groups; the existing ContractGuardrail only covers DUMB/DAMP on the hub's own surfaces.
- **Burn/hold mechanic:** Read-only safety check; funnels into swaps of the real token on the hub (every real trade burns via the tax).
- **North-star fit:** Direct extension of the shipped "Which Dumb Money?" guardrail to every curated token.
- **Effort:** S (name/symbol/decimals collision check against the curated list + code-exists check).
- **Risks/open questions:** Must handle legit same-symbol tokens without defaming them — output is "this does not match the curated <symbol>" not "this is a scam."

### 3. LP Position Risk Scan
- **Pitch:** Paste a PulseX pair address; get an LP-safety report: who holds the LP tokens, any recent large removals, is liquidity unlocked and dumpable.
- **Who feels the pain:** PulseChain LPs and anyone aping a token whose "liquidity is locked" claim they've never verified. The token scanner speaks ERC-20; nothing speaks pairs.
- **Burn/hold mechanic:** Quick version free; deep version (full removal-history analysis) reuses the burn-gated pass machinery — every deep scan burns DUMB.
- **North-star fit:** Extends "safest hub" from tokens into the liquidity layer, where the actual rug mechanics live.
- **Effort:** M (getLogs over Mint/Burn/Transfer on the pair, LP holder enumeration — read-only, existing RPC).
- **Risks/open questions:** RPC cost on the batch-flaky public RPC (same caution as every log-heavy park); "unlocked LP" is a risk factor, not a verdict — copy must stay informational.

### 4. Proxy Watch
- **Pitch:** Watch a token's code: if the contract behind a proxy ever changes, you hear about it.
- **Who feels the pain:** Holders of upgradeable-proxy tokens — the "renounced, safe" token whose implementation can be swapped overnight. Nobody monitors this for them.
- **Burn/hold mechanic:** Creating a watch burns a small DUMB amount (anti-spam + sink); reads are free.
- **North-star fit:** Safety monitoring, not just safety snapshots — the hub watches while you sleep.
- **Effort:** M (KV-cached codehash polling on a cron; needs Antonio's approval for the cron/KV write pattern).
- **Risks/open questions:** Polling cadence vs RPC budget; proxy-detection false positives (some proxies are benign); alert delivery is in-app only until the alerts engine exists.

### 5. Known Wallets Directory
- **Pitch:** A hub-curated, plain-English directory of the addresses that matter: the DUMB/DAMP pool (labeled correctly — not a whale), the dead address, the entombed contract buckets, the router.
- **Who feels the pain:** Everyone who has ever pasted 0xf046…0618 into a chat and asked "whale?" The /story page already corrects this myth once; a directory answers it permanently and ranks in search.
- **Burn/hold mechanic:** None directly — it's a trust/SEO asset that routes readers into burns, scans, and swaps.
- **North-star fit:** Proof-over-claims made browsable. Every label is sourced to an on-chain read.
- **Effort:** S (static curated data + live balance reads).
- **Risks/open questions:** Labels must be 100% sourced and conservative; curation is Antonio's lane (only he adds entries). Never "whale," never speculation about owners.

### 6. Burn Badges
- **Pitch:** Burn tiers become a persistent identity: 100k+ burned = Bronze Burner, 1M+ = Silver, and so on — verified on-chain, displayed on your profile strip, shareable.
- **Who feels the pain:** The burn community (248 Telegram members) has no persistent status layer; brag cards are one-off images that evaporate.
- **Burn/hold mechanic:** The badge IS the burn — every badge requires a real, verified burn. This is the most direct burn-per-use mechanic in the list.
- **North-star fit:** Turns burning from an event into an identity. Real participation only, never seeded.
- **Effort:** S (reuse the pledge/brag-card verification path; badge = f(burn total)).
- **Risks/open questions:** Tier thresholds need Antonio's call; must handle DAMP burns with separate or combined tiers; badge display must degrade honestly when the RPC can't verify.

### 7. DUMB Access Pass
- **Pitch:** Burn X DUMB → 30 days of advanced wallet-intelligence features (portfolio history, P&L estimates, multi-wallet) instead of paying a USD subscription.
- **Who feels the pain:** Serious users who want the Phase-2 wallet features; the vision doc (WALLET-INTELLIGENCE.md §30) prices them in USD subscriptions, which leaks value off-token.
- **Burn/hold mechanic:** Access itself is the sink — a recurring, predictable DUMB burn tied to real utility. This is the "token as access layer" thesis made concrete.
- **North-star fit:** Keeps the hub's economy inside the token instead of exporting it to Stripe.
- **Effort:** M (extends the Pro signed-session pattern; needs Antonio's approval — new monetization shape).
- **Risks/open questions:** Pricing the burn amount (too high = nobody; too low = trivial sink); must coexist with the existing $20 Dumb AI Pro without confusing the two passes; free tier must stay legitimately useful per the vision.

### 8. Scan Credits
- **Pitch:** Burn once, scan many: a DUMB burn buys a wallet-bound credit balance for deep scans instead of one 100k burn per scan.
- **Who feels the pain:** Anyone who wants to scan 3–4 tokens before buying — the current pass is priced per-scan, which punishes diligence.
- **Burn/hold mechanic:** Direct burn-to-credit; the vision doc §21 literally proposes this ("Burn DUMB → receive additional scan credits").
- **North-star fit:** Rewards the exact behavior the hub wants (verify before you buy) instead of taxing it per use.
- **Effort:** S–M (credit ledger in KV, decrement on deep scan; reuses the pass-burn verifier).
- **Risks/open questions:** Credit pricing vs the 100k single-pass (don't undercut the existing sink without Antonio's word); credits must be non-transferable (transferable credits = a shadow currency).

### 9. DAMP Scan Pass
- **Pitch:** Pay the deep-scan pass in DAMP instead of DUMB — a real, recurring sink for the secondary token.
- **Who feels the pain:** DAMP holders, for whom the hub currently offers no native utility; DAMP sits on /roots as a spectator.
- **Burn/hold mechanic:** Gives DAMP a demand source; every pass burns DAMP to dead.
- **North-star fit:** Completes the "every token has a job" picture without inventing DAMP utility from thin air.
- **Effort:** S (parameterize the pass verifier's accepted token + amount; DAMP's 3% tax math already handled).
- **Risks/open questions:** DAMP's lower liquidity means the USD-equivalent pass price needs a sane oracle (reuse the on-chain DAMP/USD price); needs Antonio's approval on the amount.

### 10. Personal Tax Receipt
- **Pitch:** Connect your wallet; get a lifetime statement: total tax your transfers paid, how much went to dead, how much was entombed, how much reflected to holders.
- **Who feels the pain:** Longtime holders who've paid the 6% hundreds of times and have never seen the cumulative receipt. It's their money's story, and nobody tells it.
- **Burn/hold mechanic:** Deepens holding — the receipt makes the tax feel like contribution, not friction. Shareable ("I've burned X DUMB just by holding and moving").
- **North-star fit:** Proof-over-claims, personalized. Every figure is a Transfer-log sum, never inferred.
- **Effort:** M (Transfer getLogs for the wallet, leg classification per the verified #1 accounting).
- **Risks/open questions:** Adjacent to the parked 16:33 "my trade burned X" per-trade card — this is cumulative identity, not a per-trade share card, but the differentiation must hold in the copy. RPC cost for old, active wallets (cap the lookback window honestly).

### 11. Portfolio History Charts
- **Pitch:** Your portfolio's value over time — 7d/30d/90d — from persisted snapshots.
- **Who feels the pain:** Anyone who watched their portfolio move and can't answer "am I up since last month." From the vision doc §25, not built.
- **Burn/hold mechanic:** Advanced history is the natural reward behind the DUMB Access Pass (#7) — history deepens holding by making it legible.
- **North-star fit:** Wallet intelligence Phase 2, straight from Antonio's blueprint.
- **Effort:** M (snapshot persistence + charting; needs Antonio's approval for the storage layer).
- **Risks/open questions:** Never label deposits as gains (vision's own warning); sparse early data must render honestly, not interpolated.

### 12. Cost Basis & P&L Estimates
- **Pitch:** Your realized/unrealized P&L per token, labeled everywhere as estimates.
- **Who feels the pain:** Tax season and "should I" moments — every holder eventually needs this; from the vision doc §26, not built.
- **Burn/hold mechanic:** Same as #11 — premium-tier feature behind the access pass.
- **North-star fit:** Wallet intelligence Phase 2 from the blueprint.
- **Effort:** L (event normalization: BUY/SELL/TRANSFER/SWAP from raw logs is genuinely hard to get right).
- **Risks/open questions:** The vision says it: label as estimates unless full history is known. Incomplete history (wallet funded off-chain) must produce "insufficient data," not a confident wrong number. This is the highest false-precision risk in the wallet family.

### 13. DeFi Position Detection
- **Pitch:** The hub notices the LP tokens in your wallet and shows the actual position: pool, share, underlying value.
- **Who feels the pain:** LPs who can't see their PulseX positions without digging through the DEX UI. From the vision doc §27, not built.
- **Burn/hold mechanic:** Premium-tier feature; also surfaces "your LP is earning" moments that keep users on the hub.
- **North-star fit:** Wallet intelligence Phase 2; read-only, no position management (never custodial).
- **Effort:** M (LP token → pair → reserves math; PulseX V2 only at first).
- **Risks/open questions:** Impermanent-loss display must be honest estimates; only V2 pairs initially — say so.

### 14. Multi-Wallet Combined View
- **Pitch:** Add your main, trading, and cold wallets; see one combined portfolio, drill down per wallet.
- **Who feels the pain:** Anyone past the beginner stage — which is everyone the hub wants to graduate. From the vision doc §24, not built.
- **Burn/hold mechanic:** Premium-tier feature; watch-only addresses need no keys, ever.
- **North-star fit:** Straight from Antonio's blueprint; local-first until signed sync ships.
- **Effort:** M (extends Wallet Watch's multi-entry model to a combined rollup).
- **Risks/open questions:** Combined P&L across wallets multiplies the false-precision risk of #12 — ship allocation/history first, P&L later.

### 15. In-App Alerts Engine (Phase 1)
- **Pitch:** Watched wallets and tokens notify you in-app: big transfer, new approval, price threshold, LP change.
- **Who feels the pain:** Wallet Watch users who currently have to remember to come back. From the vision doc §22; Telegram-bot delivery was parked — this is in-app only.
- **Burn/hold mechanic:** Alert slots are the upsell: N free, more via the DUMB Access Pass. Every alert is a return visit.
- **North-star fit:** Closes the Wallet Watch loop — "what changed" becomes "we'll tell you."
- **Effort:** L (polling infra on cron, event matching, inbox UI; needs Antonio's approval for the cron/KV pattern).
- **Risks/open questions:** The parked 22:43 burn-streaks park rejected procedural gaming surfaces — alerts must never become engagement bait; quiet-by-default, user-configured only. Delivery stays in-app until a later phase.

### 16. Year-in-Review Generator
- **Pitch:** "Your 2026 on PulseChain" — first tx, tx count, total DUMB burned via tax, tokens touched — as a shareable recap card built from real chain data.
- **Who feels the pain:** Nobody has a pain here; it's pure fun + distribution. Spotify Wrapped proved the mechanic; nobody has done it for a chain.
- **Burn/hold mechanic:** Shareable cards are arrivals machines; each share links back to the hub.
- **North-star fit:** Fun lens, real-data-only (every stat cites its source query).
- **Effort:** M (log aggregation per wallet + card renderer, reusing the brag-card pipeline).
- **Risks/open questions:** Seasonal (ships value once a year); wallets with thin history get thin recaps — must be charming about it, not empty.

### 17. Wallet Migration Planner
- **Pitch:** Moving to a new wallet? The hub plans the move: exact per-token transfer list, tax preview per leg, ordered queue — you sign each transfer yourself, nothing custodial.
- **Who feels the pain:** Anyone rotating wallets (security hygiene, fresh start) — today it's a manual, error-prone, tax-blind scramble.
- **Burn/hold mechanic:** Every migration leg pays the transfer tax — migration literally burns DUMB/DAMP. The planner shows the total burn up front as a feature, not a surprise.
- **North-star fit:** Safety-first tooling for a genuinely risky operation; the tax preview is the honesty the ecosystem lacks.
- **Effort:** M (transfer queue UI + per-leg tax math; no batching contract — user signs N times by design).
- **Risks/open questions:** Must never suggest the hub can move funds for you; ordering matters (PLS for gas must move with enough left for subsequent legs); Dust legs below gas cost must be flagged, not silently dropped.

### 18. Anatomy of a Rug
- **Pitch:** Interactive autopsies of real PulseChain rugs: the contract, the timeline, and which scanner check would have caught it — annotated, on-chain, no names beyond the contract.
- **Who feels the pain:** Learners who won't read docs but will click through a disaster. Education that actually sticks.
- **Burn/hold mechanic:** Each case study ends at the scanner — "run this check yourself, free."
- **North-star fit:** The hub's safety credibility, taught through real history. SEO asset.
- **Effort:** M (case research + interactive timeline UI; case selection is Antonio's lane).
- **Risks/open questions:** Reputational risk is real — stick to on-chain facts (tx hashes, code), never allege intent, never name humans. One badly-chosen case undoes the trust. Antonio picks the cases.

### 19. Gas Window Indicator
- **Pitch:** Live PulseChain gas price with a 24h range and an honest "transact now / quiet hours are cheaper" read.
- **Who feels the pain:** Newcomers who burn (the other kind) half their swap on gas because they transacted at the worst hour.
- **Burn/hold mechanic:** None directly — it's a supporting utility that makes every burn, swap, and scan cheaper to execute.
- **North-star fit:** Simplest-hub thinking: remove a tiny repeated friction for everyone.
- **Effort:** S (eth_gasPrice + KV-cached history; existing RPC).
- **Risks/open questions:** Must never promise future gas prices — "last 24h ranged X–Y" only. Small, honest, done.

### 20. Approval Change Watch
- **Pitch:** The approval checker runs again on every visit to a watched wallet — new or changed approvals since your last visit get flagged.
- **Who feels the pain:** Anyone who signed a sketchy approval months ago and forgot. The built checker is a snapshot; approvals are a movie.
- **Burn/hold mechanic:** Makes Wallet Watch stickier (security reason to return); premium alert slots (#15) cover push.
- **North-star fit:** Safety monitoring as a habit, not an event.
- **Effort:** S (diff current approvals against the stored Wallet Watch snapshot).
- **Risks/open questions:** The 10-02 "approval audit + revoker" park predates the shipped checker — this is monitoring, not a new audit surface, but keep the differentiation explicit. Revocation stays one-tap manual (user signs).

### 21. Token Watchlists with Price/Volume Alerts
- **Pitch:** Watch tokens, not just wallets: price thresholds, volume spikes, liquidity changes — in-app to start.
- **Who feels the pain:** Degen researchers tracking a token pre-buy; from the vision doc §23 (token side of watchlists), not built.
- **Burn/hold mechanic:** Alert slots behind the access pass; volume-spike alerts route into the scanner ("spiking — verify before you ape").
- **North-star fit:** Watch-anything intelligence, scanner-adjacent.
- **Effort:** M (price/volume polling on the curated + scanned tokens; needs Antonio's approval for polling infra).
- **Risks/open questions:** Alert fatigue — thresholds must be user-set, never default-on. "Volume spike" needs a baseline definition to avoid noise.

### 22. Recipient Wallet-Age Check (scanner enhancement)
- **Pitch:** A new scanner check: how old is the deployer/first-funder wallet? Fresh wallets behind "established" tokens are a classic scam tell.
- **Who feels the pain:** Scanner users who get a clean tax report on a token whose deployer wallet is 6 days old.
- **Burn/hold mechanic:** Strengthens the burn-gated deep scan's value without a new page.
- **North-star fit:** More signal in the existing safety surface — smallest possible increment.
- **Effort:** S (first-tx lookup via the Blockscout API — the vision doc §35 already sanctions it as Source B; flag as new-data-source use needing Antonio's nod).
- **Risks/open questions:** Informational only — legit devs use fresh wallets too. Copy: "deployer wallet first seen <date>" with explicit "not a verdict" framing, or it becomes the false-precision problem that killed the deployer-provenance park.

---

## Ranking: top 5 by impact ÷ effort

1. **Scam-DM Decoder (#1).** Small build, zero new infrastructure, attacks the human layer nobody else on PulseChain tools — and it has the two things every parked idea lacked: a genuinely new audience (DM-targeted newcomers) and a discovery path (search). It converts fear into scanner usage, which converts into burns. This is the highest-leverage S-effort build on the list. **SHIPPED 2026-10-13 (Antonio's word, commit d192130).**

2. **DUMB Access Pass (#7).** The only idea that structurally changes the token's demand: recurring, predictable burns tied to the wallet-intelligence Phase 2 that Antonio already blueprinted. It needs his approval (new monetization shape), but it's the application-layer-utility thesis in one feature. Build the wallet features first; the pass monetizes them in DUMB instead of dollars.

3. **Known Wallets Directory (#5).** Small, permanent, and compounds: it kills the pool-as-whale myth at scale, ranks in search for every "what is 0x…" query, and every entry routes readers into the hub's burn/scan/swap surfaces. Trust infrastructure with SEO legs.

4. **LP Position Risk Scan (#3).** A new audience (LPs), a new surface (pairs), reusing the proven burn-gated pass machinery — so every deep scan burns. It's the scanner's natural second act once scanner volume justifies it (the revisit gate the NFT-scan park was waiting for, but cheaper and closer to the existing code).

5. **Burn Badges (#6).** The cheapest burn-per-use mechanic available: identity for the burn community where every badge is a verified on-chain burn. It turns the 248-member Telegram group from an audience into participants with status, and status is what keeps communities burning after the novelty fades.

**Honorable mention: DAMP Scan Pass (#9).** Nearly free to build and finally gives DAMP a job. Do it the same week as Scan Credits (#8) since they touch the same verifier.

---

## Antonio's utility push — 2026-10-13 14:58 UTC (this lane's standing gate change)

Antonio directed the main agent: "We need to do whatever we can to bring more utility to Dom money, um I just feel like there's just not enough utility," plus an audit of which site parts people actually use vs. what should be cut.

**Audit verdict (same day, main agent):** Oct 6–12 had only 36 pageviews, declining (11, 8, 8, 0, 6, 3, 0); homepage took 23, then /burn (4), /directory (4), /portfolio (3), /scan (2); a few wallet connects and contract-address copies, but zero scans, burns, swaps, or shares all week. Verdict: usage is thin and NOT consistent; nothing should be cut on usage yet — at this sample size trimming is guessing, and it is a traffic problem, not a features problem.

**What this means for the research lanes:** the volume-gated ideas (#3 LP Position Risk Scan, #8 Scan Credits, #9 DAMP Scan Pass, #22 Recipient Wallet-Age Check) carried the gate "needs scanner volume OR Antonio asks." Antonio has now asked — the asks-prong is met for genuinely small, non-custodial builds in the scanner surface. The recommendation for the next lane run: ask Antonio which of #3 / #8 / #9 / #22 he wants first rather than the loop picking unilaterally — he is deciding with one-line directives and it keeps the pick his. Everything above still obeys the vetoes (no custody, no lotteries, no staking, no promised returns, no new contracts, no payments/tipping/commerce) and the utility bar (real repeated pain, outsiders in, every use burns or deepens holding). No page cuts — the audit stands.
