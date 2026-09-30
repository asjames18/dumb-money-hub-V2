# Vetted Token Directory — Plan v0.2 (DRAFT for Antonio's reaction)

**Status:** draft — nothing is approved to build. Antonio reacts first.
**Date:** 2026-09-28
**Thread:** started in main chat ("deck screener" cost question → DEX Screener is the
existing site; what we're planning is OUR OWN vetted screener/directory), moved to the
DUMB on PulseChain chat per Antonio. v0.2 adds the full planning Antonio asked for:
site architecture, real-time data + costs, display/UX, and every moving part.

## 1. What this is (one paragraph)

A curated, vetted-token directory on the DUMB Money hub — our answer to DEX Screener,
but instead of listing every token on the chain, we list only tokens that pass our
public vetting. Each listing shows live market data plus the full checklist results
and the date it was vetted. New projects pay an application fee for the vetting work;
most of the fee market-buys and burns DUMB. It serves the hub's north star directly:
the safest, simplest place for PulseChain users — now with a place to find tokens
that survived a real review.

## 2. Antonio's locked framings (his words, do not soften)

- **Not "safe" as in guaranteed returns.** There is no 100% safe; we never promise
  anyone they will make money.
- **Listing means: this token went through our vetting before it was listed.**
  A process claim, not a safety promise.
- **Seed the directory** with currently-trusted tokens at launch.
- **Going forward, new tokens pay a fee to apply.** Fee split: a portion buys and
  burns DUMB, a portion funds protocol development ("dev fee").
- **Keep costs minimal** — Antonio funds this out of pocket.
- **Design is never set in stone.** V1 ships clean and extensible; we upgrade and
  add over time.

## 3. Architecture decision (recommendation — Antonio decides)

**Recommendation: build it as a section of the existing hub (`/vetted`), NOT a
separate site.**

Why the hub wins:

- **Cost:** $0 new infrastructure. Same Worker, same KV namespace, same deploy
  pipeline, same analytics, same cron. A second site means a second deploy
  pipeline, second analytics surface, second thing to maintain — real ongoing
  cost with zero validated demand.
- **Traffic:** the hub's north star is being the go-to place for PulseChain users.
  A directory on another domain splits that traffic and splits SEO. On the hub,
  every listing page links straight into the swap box, the scanner, and the burn
  tools — the funnel stays in one place.
- **Distribution loop:** each listed project shares its listing → their community
  lands on the DUMB hub, not on some side domain. That's the whole point.
- **Upgrade path stays open:** clean URLs (`/vetted/0x…`) mean that IF the
  directory ever outgrows the hub, it can move to a subdomain later with simple
  redirects — not a rebuild. We don't pay the split cost until it's earned.

The subdomain idea (dumbcharts.melanatedintech.com or similar) is shelved, not
killed. Revisit only if: the directory drives a large share of hub traffic, or a
neutral (non-DUMB) brand becomes strategically valuable.

## 4. Real-time data — what it actually needs and what it costs

**What "real-time" means here:** for a directory, 60-second cached quotes are
plenty. Nobody makes listing decisions on tick data, and DEX Screener itself
caches aggressively. True tick-level streaming is unnecessary and expensive —
we don't need it.

**Per listed token, v1 needs:** price, 24h price change, 24h volume, liquidity,
market cap / FDV. Charts are a link-out (DEX Screener / GeckoTerminal), not a
build — $0.

**Sources (all free at our scale):**

| Source | Free tier | What we take |
|---|---|---|
| DEX Screener API | 300 req/min | pairs: price, volume, liquidity, txns (covers PulseChain) |
| GeckoTerminal API | 30 req/min | backup / cross-check (covers PulseChain) |
| Our own RPC reads | free (public RPC) | reserve-based prices via existing `token-prices.ts` pattern, fallback only |

**Scale math (why it costs $0):** this is a *curated* directory, not an index of
every token on the chain. V1 = on the order of 10–50 listed tokens. One poll per
minute for 50 tokens = 50 req/min worst case — a fraction of the 300/min free
tier. A scheduled job refreshes the cache; the Worker serves KV-cached data
(60s TTL). No paid data plan needed.

**Scaling tripwires (documented now, dealt with only if hit):**

- >300 tokens tracked, or sustained >300 req/min → revisit: paid API tier or
  our own lightweight indexer.
- Until then, free tiers hold. The curated model is what keeps it cheap — the
  moment it becomes "every token," the cost model changes, and that's a
  deliberate v2+ decision, not an accident.

## 5. Display / UX (v1)

New section, three pages + hub integration:

- **`/vetted` — the directory index.** Table/cards, mobile-first: token (logo,
  name, symbol), price, 24h %, liquidity, mcap, a "Vetted {date}" badge, and
  links (project site, explorer, chart, "swap on the hub"). Sortable by mcap /
  volume / recently vetted. Never sortable by anything that looks like a
  recommendation ("top picks" language is banned — it's a directory, not advice).
- **`/vetted/apply` — the application page.** How vetting works, the fee, the
  non-refundable-for-work rule (paying buys the review, never the listing), the
  checklist preview, the form (project name, token address, website, socials,
  description, contact, fee-payment tx hash).
- **`/vetted/[address]` — the listing detail page.** Checklist results item by
  item with evidence links, description, live market stats, chart link-out,
  "listed {date} · last re-vetted {date}", the no-promises disclaimer, share
  buttons (X / Telegram / native).
- **Hub integration:** promo strip on the homepage + a `/plan` roadmap entry
  (done — see §11); the existing scanner page links "want a full vetting?
  apply here" (Tier 0 → Tier 1 funnel).

**Design language:** like a screener, but more modern and cleaner than DEX
Screener — dense where traders want density, plain-English where newcomers need
it. Dark, fast, mobile-first, consistent with the hub. Built to accept new
columns, alerts, and analytics later without rewrites.

## 6. The moving parts (how it all fits together)

```
Applicant                Hub (Worker + KV)                 Antonio
   │                           │                              │
   ├─ fills form + pays fee ──►│ verifies fee tx on-chain     │
   │  (tx hash submitted)      │ (≥ fee amount → fee wallet,  │
   │                           │  tx hash unused → mark paid)  │
   │                           ├─ automated pre-screen ──►    │
   │                           │  (existing scanner: verified │
   │                           │   source? taxes? mint? LP?   │
   │                           │   honeypot sim? ownership?)  │
   │                           │  ~90% of junk dies here,     │
   │                           │  zero human time             │
   │                           │                              │
   │                           │         pass ──► review queue │
   │                           │                (pre-screen    │
   │                           │                 report +     │
   │                           │                 project page)│
   │                           │                              ├─ list / reject
   │                           │◄── decision ─────────────────┤  (with reasons)
   │                           │                              │
   ├─ shares its listing ◄──── listing page published        │
   │  (distribution loop)      (checklist + dates + data)     │
   │                                                          │
   │                           re-vet every ~90d: auto re-scan│
   │                           changed/failed ──► Antonio ──► │
   │                                            delist w/    │
   │                                            published    │
   │                                            reason        │
```

**Data storage:** KV, all small JSON. `vetted:<address>` → listing record
(checklist results, dates, metadata, status). `vetted:apps:<id>` → application
+ fee tx hash (used-hash set prevents one payment funding two applications).
No redeploy needed to list or delist — it's data, not code.

**Fee verification (no new contract):** the form requires the fee-payment tx
hash. The Worker checks on-chain that the tx sent ≥ the fee amount to the fee
wallet and that the hash hasn't been used before. Forged or reused hashes are
rejected automatically.

**Fee execution (v1 = manual, deliberate):** fees accumulate in the
Antonio-controlled fee wallet. Periodically (suggest: weekly), Antonio swaps the
burn share into DUMB through the normal router and burns it — an ordinary wallet
action, no keeper keys, no automation trust. Every burn lands on the live burns
ticker automatically (it's just an on-chain burn). The dev share stays in the
wallet. Automate only if volume ever justifies it.

## 7. Vetting checklist (DRAFT — Antonio to react)

Public, same for every token, published alongside each listing:

1. Contract source verified on-chain (PulseChain explorer).
2. Ownership renounced, or timelocked with the timelock visible.
3. No live mint function (or mint permanently disabled).
4. Buy/sell/transfer taxes disclosed and within sane bounds.
5. LP locked or burned (verified, not claimed).
6. Honeypot simulation passes (simulated buy AND sell succeed).
7. No proxy-upgrade backdoor (or upgrade path disclosed + timelocked).
8. Real project surface: website + public socials/contact.

Fail any item = no listing. Reasons are specific and factual. (Items 1–7 are
largely automatable with the existing scanner; item 8 + judgment calls are the
human part.)

## 8. Re-vetting & delisting

- Every listing carries its **last-vetted date** (Antonio: "put the date on it").
- Stale listings (suggest: >90 days) get flagged for re-check; automated re-scan
  first, then Antonio's call; fail or no response → delisted with the reason
  published on the directory.
- A token vetted in January can change by June — the directory must reflect that.
  A stale badge is worse than no badge.

## 9. Fee design (recommendation — Antonio decides)

- The fee buys **the vetting work, not the listing**. Non-refundable. Paying does
  NOT guarantee a pass — otherwise it is pay-to-play and the trust story dies.
- Failed applications: fee kept (it paid for the work), criteria applied evenly,
  pass/fail counts publishable.
- Suggested split: **70% market-buy-and-burn DUMB / 30% dev** (burn is the
  marketing story; dev needs funding since Antonio is out of pocket).
- Fee amount: **OPEN** — placeholder $100 equivalent for discussion. Payable in
  PLS (simplest) or DUMB. Receiving wallet is Antonio-controlled revenue, not
  custody of anyone's funds.
- Never charge for *placement* or *ranking* within the directory.

## 10. Costs (honest, all-in)

| Item | Cost |
|---|---|
| Build (v1) | $0 out of pocket — existing hub stack + build-loop labor, no new contracts |
| Market data at v1 scale | $0 — free API tiers (see §4 scale math) |
| Infra (Worker, KV, cron) | $0 incremental — all already exist |
| Periodic buy-and-burn gas | Fractions of a cent per execution (PulseChain) |
| Logo hosting | $0 — hotlink the project's own logo or IPFS |
| **Real cost #1** | **Antonio's review time per application** — the funnel (§6) is designed so the automated pre-screen kills ~90% of junk before a human looks |
| **Real cost #2** | Ongoing re-vetting cadence — same funnel, lighter touch |
| Scaling tripwires | Only if >300 tokens or >300 req/min sustained (§4) |

## 11. Roadmap

Added to `src/data/dump.ts` ROADMAP as a **Planned** entry (no timeframe, per
Antonio): "Vetted Token Directory" — worded around what it does, not "deck
screener."

## 12. Phased rollout

- **V1:** directory UI (`/vetted` index + detail pages) + application flow with
  on-chain fee verification + checklist display + manual periodic burns to the
  ticker. Seeded with Antonio's trusted list.
- **V2+:** re-vetting automation + change alerts, deeper analytics, design
  iterations, possible subdomain split if traffic earns it. Antonio approves
  each phase.

## 13. No-promises language (draft disclaimer, goes on every listing)

> "Listing means this token passed our public vetting checklist on [date]. It is
> not an endorsement, not financial advice, and not a guarantee of safety.
> Crypto is risky — do your own research."

Never "safe", never "trusted" as a guarantee. "Vetted on [date]" is the vocabulary.

## 14. Open questions for Antonio

1. Architecture: agree with hub section (`/vetted`) over a separate site?
2. Fee amount (placeholder: $100 equiv)?
3. Confirm 70% burn / 30% dev split?
4. Seed list: which tokens count as "currently trusted"?
5. Checklist: add/remove/adjust items in §7?
6. Who besides Antonio reviews? (Community signals? A second reviewer?)
7. Directory name — it needs one eventually ("Vetted on Pulse"? "Dumb Money
   Vetted"? something else?)
8. Re-vetting cadence: is ~90 days right?
