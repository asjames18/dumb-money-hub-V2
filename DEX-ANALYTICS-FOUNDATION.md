# DEX Analytics / Vetted Directory — Foundation & Plan

> **Status: PLAN ONLY. Nothing here is approved to build.** Antonio decides.
> Companion to `VETTED-TOKEN-DIRECTORY-SPEC.md` (draft v0.2, 2026-09-28) — that
> document covers the *directory* product. This one covers the **data layer**
> underneath it: what live market data we can actually get, what it costs, and
> how the money works so revenue funds the infrastructure and burns more DUMB.
>
> Live API figures below were measured 2026-10-01, not recalled. Anything
> unverified is marked **UNVERIFIED** — do not treat it as fact.

---

## 1. What Antonio wants (his framing, 2026-10-01)

1. Build something like **DexScreener / DexTools / GeckoTerminal / Birdeye / DeFiLlama**.
2. Bill it as a **Melanated In Tech** utility.
3. Pull in the **majority of tokens on PulseChain** — not just DUMB.
4. Differentiate by **safety**: only tokens that pass a public vetting checklist
   go live. Everything else stays out.
5. Existing live tokens get vetted retroactively; going forward, listing requires
   applying, and applying costs a fee.
6. **Free and paid tiers — paid gets vetted and listed much faster.**
7. Revenue must (a) pay for the analytics and (b) burn more DUMB.
8. Constraint: **little to no recurring monthly spend.**

Items 1–5 and 7 are coherent and buildable. **Item 6 is the one that needs a
decision before anything ships** — see §6.

---

## 2. Measured market reality (2026-10-01)

This is the constraint that shapes everything, so it goes first.

**DUMB/WPLS flagship pair (DexScreener, live):**

```
priceUsd = 0.000003637
liquidity = $3,720.13
volume24h = $14.01
txns24h   = { buys: 0, sells: 4 }
```

**Full DUMB pool inventory (GeckoTerminal, 17 pools):**

| Pool | Liquidity | 24h Volume |
|---|---|---|
| DUMB / HEX | $3,326.59 | $26.70 |
| DUMB / WPLS | $3,672.92 | $14.05 |
| WBTC / DUMB | $4,386.39 | $9.18 |
| INC / DUMB | $3,117.61 | $3.82 |
| DAMP / DUMB | $9,634.72 | **$0.00** |
| ATROPA / DUMB | $6,423.97 | **$0.00** |
| DUMB / PLSX | $3,780.16 | **$0.00** |
| DUMB / DAI | $3,835.06 | **$0.00** |

Visible totals ≈ **$38k liquidity, ~$54/24h volume**, and 4 of 8 shown pools at
exactly zero volume.

`DUMB-DAMP-RESEARCH.md:53` already warned: *"there is no active market to dress
up."* The live numbers are **worse than that note assumed** — the flagship pair
itself is ~$3.7k / $14/day, with zero buys in 24h.

**Consequences, stated plainly:**

- A DUMB-scoped DexScreener clone is not a product. It is a mirror of deadness.
- **Chain-wide scope is not optional** — it is what makes the applicant pool and
  the fee revenue real. Antonio already decided this; the data confirms it.
- Every analytics surface must show real zeros and a low-activity label. Never
  hide an empty pool to make the page look better. (`DUMB-DAMP-RESEARCH.md:125-130`)
- Note `ATROPA` appears in the pool set but not in the 12-token curated list —
  PulseChain has tokens beyond what we've mapped. A directory needs real
  chain-wide enumeration, which is itself unsolved (see §4).

---

## 3. Data sources — measured, not assumed

| Source | Status (2026-10-01) | Verdict |
|---|---|---|
| **GeckoTerminal** | PulseChain endpoints **work server-side**. 17-pool inventory returned, live USD prices | **PRIMARY for pair list.** Already approved & present in `src/lib/proof/fetch-roots.ts` (orphaned, 0 callers) |
| **DexScreener** | Works, no key, 200 OK | **Keep as-is** for `/api/market`. Not a pair list — silently omits pools |
| **DeFiLlama** | `coins.llama.fi/prices/current/pulsechain:369` → `{"coins":{}}` | **NO PULSECHAIN COVERAGE. Ruled out** |
| **GeckoTerminal OHLCV** | HTTP 200 but **0 candles** returned for the PulseChain pool | **Charts not available** via this endpoint |
| CryptoCompare | Dead — now requires an API key (`src/server/ai-pro.ts:531`) | Dead |
| **DexTools / Birdeye** | Never evaluated — no doc, no code, no measurement | **Unexplored** |

Two findings that change the spec:

1. **Charts are not merely "link-out, $0" — they're not available at all** via
   GeckoTerminal for PulseChain (0 candles). Any charting would have to be built
   from raw pool reserves/trade events ourselves. That is real engineering and
   real cost. Recommend: **no charts in v1.**
2. **DeFiLlama is out.** It has no PulseChain data, so the most "free forever"
   option doesn't apply to us.

**GeckoTerminal free tier: 30 calls/min.** Sufficient for v1 (see §5).

---

## 4. The unsolved problem: chain-wide enumeration

A directory needs *every* PulseChain token. There is no verified way to get that
list:

- DexScreener and GeckoTerminal are both **keyed by token address** — you must
  already know the address to ask. Neither offers "list all tokens on chain."
- Enumerating from chain state needs an **indexer**, which `BUILD_LOOP.md:5245-5247`
  records as a hard boundary: *"needs token enumeration via a new indexer/data
  source = hard boundary."*

**This is the real v1 blocker, not cost.** Options, none free:

| Option | Cost | Note |
|---|---|---|
| PulseChain explorer API | unknown | Not evaluated. **UNVERIFIED** |
| Log-scan of Transfer events from genesis | RPC cost only | ~30M blocks; would blow the RPC budget the loop protects |
| Brute-force `eth_getCode` sweep | infeasible | Address space is unbounded |
| Curated seed list + applications only | $0 | **Recommended for v1** |

v1 therefore cannot honestly claim "all tokens on PulseChain." It can honestly
claim **"every token that has applied and passed."** Say exactly that. Building
the enumeration is a genuine v2+ project with a real bill attached.

---

## 5. Cost model

### v1 (curated + application-driven)

| Item | Cost | Basis |
|---|---|---|
| Market data | **$0** | DexScreener free + GeckoTerminal 30/min, both server-side |
| Infra | **$0 incremental** | Existing Worker, existing `ANALYTICS_KV` |
| Storage | **$0** | KV, small JSON per listing |
| Scheduled refresh | **$0** | ⚠️ *new infra — see below* |
| **Recurring total** | **$0** | |

At 10–50 listed tokens, a refresh sweep is well inside 30 calls/min. This is
the same conclusion `VETTED-TOKEN-DIRECTORY-SPEC.md:77-81` reached.

⚠️ **Spec/reality gap:** that spec says *"same Worker, same KV, same deploy, same
analytics, **same cron**."* **There is no cron trigger on this Worker today.**
`wrangler.patch.json` carries only the KV binding; the generated
`.output/server/wrangler.json` has no `triggers`. A scheduled refresher is *new*
infrastructure. Cloudflare Cron Triggers on the Workers free plan are free at
low frequency, but this is still a change to the deploy artifact.

### When it stops being free (tripwires)

| Trigger | Action |
|---|---|
| >300 tokens tracked | Revisit paid tier or self-host an indexer |
| Sustained >30 req/min to GeckoTerminal | CoinGecko Analyst, **$129/mo** |

**CoinGecko Analyst is $129/mo** (500k calls, 500/min, unlocks `/onchain` DEX
endpoints; Lite is $499/mo). Free Demo tier: 10k calls/mo at 100/min.
**We should not need this at v1 scale** — but it is the number to know, and it is
the reason the curated model is what keeps this cheap.

**UNVERIFIED:** DexScreener paid-tier pricing (no paid tier was found; it appears
to be free and ad-supported), DexTools and Birdeye pricing, and PulseChain
explorer API pricing. Web research failed on this pass and must be re-run before
any of these go in a budget.

---

## 6. Monetization — the decision that needs Antonio

### The money already works once

The Dumb AI Pro tier ($20, 80/20) is fully built and verified on-chain. **The
only sale on record is Antonio's own launch-day test** (`BULLISH-RESEARCH.md:271`).
And it is **revenue-neutral by design**: 80% burns, 20% funds OpenRouter compute.
There is no profit line anywhere in the project today.

So the directory fee is the **first genuinely profitable rail** — which is
exactly why `VETTED-TOKEN-DIRECTORY-SPEC.md` exists.

### The "paid = faster" problem

Antonio's proposal: free tier exists, paid tier gets vetted and listed much
faster. The existing spec explicitly forbids this — `§9`: *"paying does NOT
guarantee a pass — otherwise it is pay-to-play and the trust story dies"* and
*"**Never charge for placement or ranking**."*

Three concrete risks:

1. **Adverse selection runs backwards.** Urgency is the strongest correlate of
   the token profiles a safety directory exists to filter out. A pay-for-speed
   queue fills fastest with the worst applicants, and the honest applicants
   (who will wait) never pay.
2. **Rushed review erodes the bar without anyone lowering it.** Identical
   checklist + less time per token = less scrutiny. The failure mode is
   asymmetric: a fast-tracked rug falsifies the whole product premise.
3. **It moves us onto the wrong axis.** Every incumbent is neutral-and-free
   because neutrality *is* their product. We are the opposite — curated and
   trust-bearing. Selling queue position makes us race them on speed and scale,
   where we have none of their distribution, while eroding the axis where we
   actually win.

### Recommendation: sell review *depth*, not the *verdict*

- Free tier: standard review, published median wait.
- Paid tier: **priority queue + a genuinely deeper human review** — more
  evidence, a fuller written report — at the **same pass/fail bar**.
- Fee non-refundable either way. Paid applicants **fail and get published with
  reasons**, same as free.
- Publish median wait for both tiers. Transparency is what makes it defensible.

**The tripwire that makes this self-checking:** track pass rate by tier.
If paid tokens pass at meaningfully higher rates than free, we have sold the
badge and the paid tier gets killed. If the rates match, the claim *"paying buys
attention, never a pass"* is backed by receipts. This follows the project's
existing style of documented tripwires rather than honour-system trust.

---

## 7. Architecture (unchanged in principle from the existing spec)

Build as `/vetted` **on the existing hub** — not a separate site. $0 new infra,
traffic stays consolidated, and `/vetted/0x…` leaves a clean path to a
`dumbcharts.melanatedintech.com` subdomain later if it ever earns one.

**Data flow:**

```
applicant pays fee (any curated token → fee wallet; burn leg → dead)
   ↓
Worker verifies arrival on-chain from receipt logs; hash single-use
   ↓
automated pre-screen — reuse the EXISTING scanner (~90% of junk dies here, $0 human time)
   ↓
human review queue (FREE tier / PAID tier — depth differs, bar does not)
   ↓
list or reject WITH PUBLISHED REASON
   ↓
30-day re-vet → delist if stale
```

**Storage:** KV only, `vetted:<address>` → listing record;
`vetted:apps:<id>` → application + fee hash, with a used-hash set so one payment
cannot fund two applications. Listing/delisting is data, never a redeploy.

**Fee execution:** manual and periodic, by Antonio, from a wallet he controls —
no keeper keys, no automation trust. The burn share is swapped to DUMB through
the normal router and burned to dead; every burn lands on the live burns ticker
automatically. **This is already built and works** (the `/burn` PLS fallback).

---

## 8. Phasing

| Phase | Scope | Cost | Gate |
|---|---|---|---|
| **0** | Antonio resolves the paid-tier question (§6). Decide fee amount + split | $0 | **Blocking** |
| **1** | `/vetted` index + detail pages, seeded with currently-trusted tokens | $0 | Retroactive vetting results published, failures included |
| **2** | `/vetted/apply` + on-chain fee verification + human review queue | $0 | First real applicant |
| **3** | Scheduled refresh + 30-day re-vet | $0 (new cron infra) | Cron trigger shipped |
| **v2+** | Chain-wide token enumeration (§4), charts (§3), re-vetting automation | **Real money** | Requires a budget decision |

**Phase 1 is the credibility play.** "We audited everything already trading and
here is what failed" is a far stronger trust statement than "everything listed
passed." It needs a dated landing page and published failure reasons.

---

## 9. Standing constraints this plan must respect

From `BUILD_LOOP.md:12712` — binding, unchanged:

> **no spending**; NO new PulseChain contract deployments; **no new external data
> sources without approval**; never post as Antonio; never invent community
> members, names, ratings, burns, transactions, or enthusiasm; mascot art ships
> ONLY after Antonio visually approves it.

- GeckoTerminal is **already approved and present** (`fetch-roots.ts`), so
  reviving it server-side is arguably not a *new* source. **Confirm with Antonio.**
- Any **paid** tier ($129/mo CoinGecko Analyst and up) requires explicit approval
  under "no spending."
- Never present a listing as *"safe"* or *"trusted"* as a guarantee.
  **"Vetted on [date]"** is the vocabulary.
- The freemium boundary is locked: **"free is free and free is limited."**

---

## 10. Open decisions for Antonio

1. **The paid-tier model** (§6) — priority queue, review depth, or neither?
   *Blocking Phase 0.*
2. Fee amount, and the burn/dev split (spec proposes 70/30; Pro uses 80/20).
3. Approve GeckoTerminal server-side as an existing (not new) data source?
4. Seed list for Phase 1 — which currently-live tokens get vetted first.
5. Is a paid listing fee counted as **"spending"** under the standing rule, or as
   revenue? Needs a ruling — it decides whether the model is viable at all.
6. Subdomain now, or `/vetted` on the hub first? (Spec says hub-first.)
7. Directory name.
8. Who reviews, and is a second reviewer needed?
