# DUMB & DAMP on PulseChain — Research Report

**Date:** 2026-09-26
**Tokens researched:**
- DUMB ("DumbMoney"): `0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D`
- DAMP ("Dumb Amplifier"): `0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3`

**Sources:** PulseChain explorer (scan.pulsechain.com, Blockscout API), verified contract source for both tokens, live `eth_call` state via public RPC, DEXScreener API, GeckoTerminal API. All figures below are observed, not estimated.

---

## PART 1 — Pair inventory

### Cross-source check
- **DEXScreener** (`/tokens/v1/pulsechain/...`): only surfaces the top 1–2 pairs per token (DUMB/HEX, DAMP/PLSX). The `/latest/dex/search` endpoint finds 3 DUMB + 5 DAMP pairs. **All on PulseX — no other DEX venue lists either token.**
- **GeckoTerminal** (`/api/v2/networks/pulsechain/tokens/{address}/pools`): the complete picture — **17 pools for DUMB, 8 for DAMP**, all `pulsex-v2`.
- Discrepancy explained: DEXScreener indexes a subset of pools (skips dust/low-activity ones). **GeckoTerminal is the source of truth for the full inventory.**

### DUMB pairs (GeckoTerminal, 2026-09-26)

| # | Pool | Pair address | Liquidity (USD) | 24h vol (USD) | Status |
|---|------|--------------|----------------|---------------|--------|
| 1 | DAMP / DUMB | `0xf046e04ff986dcae96315046888d85ac27500618` | $9,634.72 | $0.00 | Biggest pool — shared with DAMP |
| 2 | ATROPA / DUMB | `0x498ca08f1e5022eb02d92b76f913858ed821821e` | $7,531.57 | $0.00 | Idle |
| 3 | WBTC / DUMB | `0x8ff3b2e30a8e9aa2903944d39a7383f6ee112d5e` | $5,025.56 | $0.00 | Idle |
| 4 | DUMB / DAI | `0x85f6c49c5c0507204120ed894872f31f9197026f` | $4,259.07 | $0.00 | Idle |
| 5 | DUMB / WPLS | `0x221f63fb54f3fbc6c60b3d22bc9bcb5fd1d0d186` | $4,228.95 | $0.13 | ~Dormant |
| 6 | DUMB / HEX | `0x2ccd79c8bc9f2fd84782e9abd2f2eecc56042106` | $4,138.60 | $14.42 | **Active** (DEXScreener: 5 buys/24h, +1.29%) |
| 7 | DUMB / PLSX | `0xce7dbd7fa7cb61ebe002dba028e3993a28099fd6` | $4,032.02 | $0.00 | Idle |
| 8 | INC / DUMB | `0x2d10d66f753b8bcc2cbce4793fd8661fc620aa13` | $3,733.11 | $14.52 | **Active** (only other pool with volume) |
| 9 | CODA / DUMB | `0x74461ffe9f39c2ee6fedac3029f07a3d7a79faa6` | $136.29 | $0.00 | Thin |
| 10 | JIT / DUMB | `0xfc8be8fd3328c8b63be100690176ae2370b95ec4` | $54.41 | $0.00 | Dust |
| 11–17 | XUSD, Srey0x (×2), MCAT, pCoin, TEDDY, PTF | various | <$1 combined | $0.00 | Dust — ignore |

**DUMB totals:** ~$47.8k liquidity across 17 pools, but only **2 pools have any 24h volume** (~$29 combined). Price (DEXScreener): **$0.000004144**.

### DAMP pairs (GeckoTerminal, 2026-09-26)

| # | Pool | Pair address | Liquidity (USD) | 24h vol (USD) | Status |
|---|------|--------------|----------------|---------------|--------|
| 1 | DAMP / DUMB | `0xf046e04ff986dcae96315046888d85ac27500618` | $9,634.72 | $0.00 | Biggest pool — shared with DUMB |
| 2 | DAMP / PLSX | `0xf93fe23fcd5a822fe40fcfeaa3d848b5bed3bf4c` | $2,399.79 | $10.49 | **Active** (DEXScreener: 5 sells/24h) |
| 3 | DAI / DAMP | `0x9126d62fe533974a87ba16248b3254c9d329b3c7` | $2,398.47 | $2.19 | Low activity |
| 4 | DAMP / WPLS | `0xb256769d6b9d53e0e66a395c17135f8855a8633a` | $2,376.76 | $0.03 | ~Dormant |
| 5 | DAMP / HEX | `0x032f40fd0e48fb7811cf29b8585d88a5c118d48b` | $2,272.14 | $8.51 | **Active** |
| 6 | INC / DAMP | `0x594d5ae93a3985bc3cd0fe7dca00ecbd344fe0b` | $1,996.85 | $4.06 | Low activity |
| 7 | DAMP / XUSD | `0xaca52556a20ac6c7854a027336ca9cc2d1c758d5` | $0.52 | $0.00 | Dust — ignore |
| 8 | DAMP / PTF | `0xb69601cf69bc08d4b5dafed78d77648f6502e2b3` | ~$0.00 | $0.00 | Dust — ignore |

**DAMP totals:** ~$21.1k liquidity across 8 pools, 5 pools with 24h volume (~$25 combined). Price (DEXScreener): **$0.00002347**.

### Honest read
Both tokens are **very low-activity** — roughly $25–30/day in combined volume each. The DAMP/DUMB pool is the deepest single pool for both tokens ($9.6k) but has **zero** 24h volume. Any analytics UI must present this plainly; there is no active market to dress up.

---

## PART 2 — Contract mechanics (from verified source + live state)

Both are the same Safemoon-fork codebase (`Token` for DUMB, `TokenAmp` for DAMP, solc v0.8.17). The diff between them is 63 lines.

### What happens on a buy or sell, step by step
1. **Tax is taken on EVERY transfer** — buys, sells, and wallet-to-wallet. **DUMB: 6%, DAMP: 3%.** (Live `fees()` values: 600 / 300 bps. Neither side of a PulseX trade is fee-excluded, so both buys and sells pay full tax.)
2. The tax is split four ways per `feesDistribution`:
   - **Reflection** → distributed to all holders immediately (raises everyone's balance slightly).
   - **Burn** → sent to the dead address immediately (supply shrinks on every trade).
   - **Auto-liquidity share** → kept inside the token contract.
   - **Buy-and-burn share** → kept inside the token contract.
3. Steps 3–4's *processing* (the contract selling its accumulated tokens to add liquidity / market-buy-and-burn) **never runs** — see below.

### Where the splits go — and Antonio's mental model
Antonio's recollection ("buys split the liquidity in the different pools") matches the **design intent**: `_processFees()` was built to take the accumulated liquidity share and split it **evenly across every registered pair** (`amountPerPair = liquidityAmount / pairTokens.length`), adding liquidity to each pool with LP tokens sent to the dead address (permanently locked).

**But the engine is permanently dead.** Live state:
- `executeSwapsActive()` = **false** on both tokens — the auto-processing switch was never turned on.
- `owner()` = `0x0000…0000` on both — **ownership is renounced**, so the switch can *never* be turned on, fees can never change, and no new pairs can ever be registered.
- Consequence: the auto-liquidity and buy-and-burn shares pile up **inside the token contracts forever**. There is no withdraw function. Measured dormant piles:
  - **DUMB: ~3.505B tokens = 12.5% of the 28B supply**, locked forever.
  - **DAMP: ~49.4M tokens = 4.9% of the 1B supply**, locked forever.

**Corrected mental model:** buys do *not* split liquidity across pools. Every trade pays 6%/3% tax; roughly a third of it reaches holders as reflection, a sixth is burned live, and the remaining half is entombed in the contract. No liquidity has been auto-added since the switch was left off.

### The frozen registered pair sets (confirmed on-chain 2026-09-26)
`pairTokens` is immutable now (owner renounced; DUMB's `addPairToken` can never run again). These are the exact pools the dead engine was built to feed — and they map 1:1 onto the largest pools in the GeckoTerminal inventory:
- **DUMB (8):** WPLS, DAI, ATROPA, HEX, INC, WBTC, PLSX, DAMP
- **DAMP (5):** WPLS, DAI, HEX, INC, PLSX
(DAMP has no `addPairToken` at all — its set was fixed at deploy.) Any other DUMB/DAMP pools on the explorer (XUSD, CODA, JIT, dust pairs) were created by third parties and were never part of the fee engine's split.

### Live per-trade breakdown
- **DUMB (6% tax):** 2% → contract (dead pile), 2% → contract (dead pile), 1% → burn (live), 1% → holder reflections (live).
- **DAMP (3% tax):** 1% → contract (dead pile), 0% → liquidity, 1% → burn (live), 1% → holder reflections (live).

### DUMB ↔ DAMP relationship
DAMP is a satellite whose fee engine was designed to **buy DUMB and burn it**: its `MAIN_TOKEN` is the DUMB address (`0xe651…b7fF8D`, confirmed on-chain), and its "buyAndBurn" share was meant to market-buy DUMB and send it to the dead address — hence "Amplifier": DAMP trading volume was supposed to amplify DUMB's burn. **This is also dormant** (same disabled switch). The two tokens share their deepest pool (DAMP/DUMB, $9.6k), which is the on-chain link between them. DAMP has no `addPairToken` — its pair set is frozen smaller than DUMB's.

### Owner privileges / centralization risks
- **Ownership renounced on both** — the strongest de-risking fact here. No one can: change taxes, change fee splits, pause trading, blacklist wallets, mint tokens, enable/disable the fee engine, or add pairs. The contracts are effectively immutable.
- No buy/sell limits, no transfer cooldowns in the code.
- The one centralization smell: the **relayer contract** (`0x52957c71f8b873f62ca939aceb75e86bfbb77fee`) used in the (dormant) fee-processing path is **unverified** — no source on the explorer. Moot in practice since the path can never execute, but it means the original design had an unaudited dependency.
- The 12.5%/4.9% dormant piles are **not** a rug vector (nobody can move them), but they are a permanent supply distortion the site must not misrepresent as "locked liquidity."

### Risk notes for Antonio
1. **The fee engine being dead is arguably good for DUMP's story** — but the DUMP site must never claim DUMB/DAMP "auto-add liquidity" or "buy back and burn." Those mechanisms do not run.
2. **6%/3% transfer taxes** mean any DEX-quoted price overstates what a buyer receives and what a seller gets. Any trade UI must show after-tax amounts.
3. **Reflection tokenomics** (Safemoon-style) mean balances drift upward for holders — analytics showing "holder balances" must use `balanceOf`, not cached values.
4. **Volume is ~$25–30/day per token.** Thin enough that a single trade moves the displayed price a lot; any chart needs a "low liquidity" warning.

---

## PART 3 — Site integration recommendation

### Data sources (all free, no keys)
| Source | Endpoint | Rate limit | Use for | Reliability |
|--------|----------|-----------|---------|-------------|
| **GeckoTerminal** (primary) | `GET /api/v2/networks/pulsechain/tokens/{address}/pools` | 30 req/min | Full pair inventory: liquidity, volume, price | High — complete pool list |
| **GeckoTerminal** | `GET /api/v2/networks/pulsechain/pools/{pool}/ohlcv/{tf}` | 30 req/min | Price charts per pool | High |
| **DEXScreener** (secondary) | `GET /tokens/v1/pulsechain/{addrs}` | 300 req/min | Quick price + txn counts (buys/sells) | Medium — incomplete pool coverage; use only for price/txns, never as the pair list |
| **On-chain RPC** (pulsechain.com) | `fees()`, `feesDistribution()`, `balanceOf(contract)`, dead-address balances | n/a | Tax readout, dormant pile, burn totals | High — cache hourly, values rarely change |

### Recommended refresh cadence
- Pair table (liquidity/volume/price): **every 5 minutes** — 2 tokens × 1 call each = trivial vs. the 30/min budget.
- Tax + fee-engine status: **hourly** (immutable values; cache aggressively).
- Burn totals (dead balances): **hourly**.
- Price charts: **on page view + 5-min poll** while visible.

### Gotchas
- **Never use DEXScreener as the pair list** — it silently omits most pools. It's fine for price and buy/sell txn counts on the two top pairs.
- **Exclude dust pools** (<$100 liquidity) from the main table; list them collapsed or not at all. Their `reserve_in_usd` figures are noise.
- **Always display after-tax amounts** near any price/quote: "Price $0.000004144 · you receive ~6% less after the DUMB transfer tax."
- **Do not invent activity**: with ~$25/day volume, most pools show $0 volume — show the zero, don't hide the pool, and add a plain "low activity" label rather than omitting data.
- GeckoTerminal pool `name` fields occasionally include odd unicode token names (dust pools) — sanitize display strings.

---

## Appendix — live on-chain state (2026-09-26, verified via `eth_call`)

| Field | DUMB | DAMP |
|-------|------|------|
| Owner | `0x0` (renounced) | `0x0` (renounced) |
| Transfer tax | 6% (600 bps) | 3% (300 bps) |
| Distribution (buy&Burn / liquidity / burn / reflection) | 33.33% / 33.33% / 16.67% / 16.67% | 33.33% / 0% / 33.33% / 33.34% |
| Fee engine (`executeSwapsActive`) | **false (permanently)** | **false (permanently)** |
| Total supply | 28,000,000,000 | 1,000,000,000 |
| Dormant in contract | ~3,505,377,855 (12.5%) | ~49,336,388 (4.9%) |
| `swapThreshold` | 875,000,000 | 5,833,333 |
| Relayer | `0x5295…fee77` (unverified, dormant path) | same |
| DAMP `MAIN_TOKEN` | — | `0xe651…b7fF8D` (= DUMB ✓) |
