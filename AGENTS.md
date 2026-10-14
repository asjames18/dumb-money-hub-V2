# AGENTS.md — dump-money-hub

> [!IMPORTANT]
> This project is standalone. It was cloned from dumb-money-hub on 2026-09-26
> as the home of Dumb Money on PulseChain — the live DUMB token. It is a
> completely separate token from Dumb Money on Robinhood Chain (the new
> Up-Only bonding-curve token, in development). Do not merge changes between
> the two hubs casually; they are separate products with separate contracts,
> chains, and communities.
>
> Deploys go to Cloudflare Workers (`dump-money-hub-preview`) via the deploy
> script — never to a Lovable-published URL. The `@lovable.dev/vite-tanstack-config`
> npm package is still the build pipeline (TanStack Start + Cloudflare target);
> it is infrastructure, not the editor sync, so leave it in place.

## Working with other agents

More than one agent works this repo (a build loop on Antonio's main setup plus
agents Antonio talks to from his own machine). Read [COLLAB.md](./COLLAB.md)
before editing or pushing — it covers the push/pull discipline, which files the
build loop owns (BUILD_LOOP.md, BULLISH-RESEARCH.md), and the production traps.

**GitHub pushes are owned by the Mosheh sync turn, not by loop runs.**
The build loop commits locally only and never pushes — the sync turn runs the
five-step verification (loop idle check, fetch + reconcile, remote-only file
inspection, no-history-rewrite push, file-by-file tree verify). A loop run that
pushes on its own risks clobbering another session's work mid-flight; on
2026-10-01 a run did exactly that and then "restored" the wrong baseline,
dropping six parked BULLISH-RESEARCH.md entries from the worktree (recovered
from local history, no data lost).

**BUILD_LOOP.md run-log appends (lesson 2026-10-05):** the live run log is the
newest-first list at the very top of the file — new entries are PREPENDED at
line 1. The `## Run log` headers deeper in the file are legacy sections; never
target them with a text-edit anchor — a 06:03 run matched one inside old
narrative text and embedded its entry mid-file (same misfire class the 09:33
2026-10-04 run repaired). Always use an assertion-guarded line-based insert and
verify with `git diff` that the change is exactly the intended addition before
committing. Sharpener (2026-10-08 23:56 run — caught and reverted pre-commit):
GNU sed `1r file` inserts the file AFTER line 1, not before it — using it splits
the previous entry (header stays at line 1, its continuation drops below the
new entry). For a line-1 prepend, `cat entryfile BUILD_LOOP.md > tmp && mv tmp BUILD_LOOP.md`
instead, then assert line 1 is the new entry AND the previous entry's header line is intact.

## Project notes

- PulseChain-only. This site IS the live Dumb Money (DUMB) token on PulseChain:
  `0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D` (verified 2026-09-26). It is a
  completely separate token from Dumb Money on Robinhood Chain (the new Up-Only
  bonding-curve token, in development on testnet) — different chain, different
  contracts, different tokenomics. Holding one gives you nothing of the other.
- DumpCurve / "new token" track SHELVED 2026-09-26 — there is no new token.
  The site revolves around the already-launched DUMB. Never reference a bonding
  curve, "not yet deployed" state, penny floor, or PLS floor for the PulseChain
  token. (`~/workspace/dump-curve-contracts/` stays on disk, untouched, unreferenced.)
- Project/brand "Dumb Money", ticker DUMB — both DECIDED 2026-09-26.
- Real DUMB tokenomics (verified on-chain 2026-09-26, re-verified 2026-09-27, see
  DUMB-DAMP-RESEARCH.md + /roots reads): Safemoon fork, 6% transfer tax on
  buys/sells/wallet-transfers. `fees()` = total tax only (600 bps); the live split
  is `feesDistribution()`: DUMB (3333,3333,1667,1667), DAMP (3333,0,3333,3334).
  Canonical framing (locked 2026-09-27, Antonio's words — use everywhere): DUMB 6%
  = 5% instant burn + 1% reflections; DAMP 3% = 2% instant burn + 1% reflections.
  "Instant": every leg executes atomically inside the transfer tx. The burn side =
  1% protocol burn to the dead address + bucket legs entombed forever.
  The _processFees AUTO-PROCESSING engine is permanently dead (owner renounced,
  executeSwapsActive=false) — the 4% in the buckets is entombed — but the
  per-transfer tax is LIVE. 28B fixed supply — ~56.5% burned
  + ~12.5% entombed in the contract (~69% immobilized). NEVER claim "nothing burns
  on trades" (retracted 2026-09-26: that came from misreading fees() as the split).
- DAMP is secondary ("Dumb Amplifier", 3% tax) — keep it on /roots,
  not the hero. Its auto-processing flywheel is dormant, but its 1% burn + 1%
  reflection per taxed transfer are live, same mechanics as DUMB.
- Copy + UI fix run (2026-09-26, from independent audit): homepage ticker badge
  "Burns on trades" value None → "1% live" (hero body already correct); /whitepaper lead
  rewritten — the "redemption floor that never decreases" Robinhood-curve language is gone,
  replaced with the immutable-taxed-AMM description. /roots pool inventory replaced: the
  GeckoTerminal client feed failed too often (CORS/rate-limit), so the section now pins the two
  verified flagship pairs (WPLS/DUMB, DAMP/WPLS) with explorer + DEXScreener links and an honest
  no-liquidity-figures note instead of a sometimes-empty table. Route aliases /compare → /chains,
  /join → /raid (server-side redirects). Mobile header no longer overflows at 390px (brand title
  truncates, subtitle hidden on xs, Trade CTA shortens to "Trade"). "PulseChain · mainnet · 369"
  badge added above the swap box and the wallet holdings. Swap box net-of-tax quotes (0.94/0.97)
  verified present — no change needed. No external "Trade on PulseX" deep link exists in the
  codebase (only DEXScreener pair links, which are correct) — audit P1 already moot.
- Transfer-log topic0 on PulseChain is the TEXTBOOK keccak256("Transfer(address,address,uint256)")
  = `...523b3ef` (verified computationally 2026-10-10 with test-vector-validated keccak across two
  independent implementations, and against live receipts on DUMB, DAMP, HEX, INC, PRVX, PLSX).
  The old `...288b6e9` value was a MISRECORDED hash that never appears on-chain — filtering on it
  silently matched ZERO rows, which is how the burn leaderboard went empty (fixed 2026-10-05; only
  the "non-textbook" framing was wrong, the fix itself was real). `src/lib/burns.ts` exports the
  verified `TRANSFER_TOPIC0`, `addrTopic()`, `decodeTransferLog()` and `rpcGetLogs()`;
  `src/routes/api/brag-image.ts` computes the topic at runtime via keccak256 (never hand-typed).
  Any new Transfer-log reader must use these — never hand-type a topic0 constant.
- Custom domain LIVE: dumbmoneypulse.melanatedintech.com (attached 2026-09-26).
- /trade points at the LIVE pairs (DEXScreener links), never an in-hub market
  maker. After-tax warning: DEX quotes show pre-tax prices.
- On-site swap LIVE (2026-09-26, Phase 1 retention): wagmi v3 + viem, injected
  connector, PulseChain 369 auto-switch, non-custodial. Swap box on /trade quotes
  the WPLS/DUMB PulseX v2 pair and shows after-tax receive amounts (6% tax).
  DAMP trading added 2026-09-26: DUMB/DAMP token selector in the swap box
  (DAMP/WPLS pair, 3% tax, 0.97 after-tax factor; pair is token0=DAMP/token1=WPLS —
  reversed vs WPLS/DUMB, handled per-token in the impact math). Verified on-chain:
  DAMP.ROUTER() = the PulseX V2 router, DAMP.fees() = 300, getAmountsOut sane.
- Curated multi-token inputs added 2026-09-26 (buy AND sell — the DUMB→PLS sell
  direction was briefly removed by the multi-token build and restored the same day):
  buy DUMB/DAMP paying with PLS, HEX, or DAI; sell DUMB/DAMP back to PLS through the
  same live pairs (swapExactTokensForETHSupportingFeeOnTransferTokens, single-hop
  impact on the token's own pair reserve). Token
  inputs multi-hop TOKEN→WPLS→DUMB/DAMP via
  swapExactTokensForTokensSupportingFeeOnTransferTokens (covers taxed inputs and the
  taxed output leg); per-token exact-amount approvals; price impact combines both
  legs as 1-(1-l1)(1-l2) in bigint bps. HEX = pHEX (8 decimals, HEX/WPLS pair
  token0=HEX); DAI = bridged DAI (18 decimals, DAI/WPLS pair token0=WPLS). PLSX
  rejected (remembered address has no contract — superseded, real PLSX found, see below); eWBTC/bridged-WETH unsourced —
  not listed. Paste-any-address deliberately rejected (honeypot vector). Verified
  input addresses shown with explorer links + copy buttons in the swap box.
- Swap box expanded 2026-09-26 (second pass): 8 direct DUMB/DAMP pairs + 3 new buy inputs.
  Direct pairs now covered: WPLS/DUMB, DAMP/WPLS, HEX/DUMB, INC/DUMB, DAMP/PLSX, HEX/DAMP,
  DAI/DAMP (DAI2 contract), INC/DAMP, WBTC/DUMB — all verified on-chain (token0/token1,
  nonzero reserves, factory.getPair match). Buy inputs: PLS, HEX (direct pair + legacy
  HEX→WPLS route both selectable via a Route toggle), DAI via WPLS, DAI direct (DAMP only;
  the two DAIs are different contracts, disambiguated in the selector), INC, PLSX (DAMP only),
  PRVX →WPLS→, pTGC →WPLS→, WBTC (direct to DUMB, via WPLS to DAMP). PRVX
  0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11, pTGC 0x94534EeEe131840b1c0F61847c572228bdfDDE93,
  WBTC 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 — all verified: code exists, sane
  symbol/decimals, WPLS pairs with nonzero reserves, router sanity quotes sane.
  WBTC/DUMB pair 0x8ff3b2e30a8e9aa2903944d39a7383f6ee112d5e (token0=WBTC). PLSX
  0x95B303987A60C71504D99Aa1b13B4DA07b0790ab confirmed as the real PulseX (the lookalike
  0x95B303987A60C71504D99Aa4b13fcA6295C4e928 has no contract, unused). Sell side unchanged
  (DUMB/DAMP → PLS/HEX/INC/DAI2/PLSX). Safety bar kept: exact-amount approvals, fee-supporting
  router variants, 0.94/0.97 after-tax display, pre-tax warning on unknown-tax inputs,
  8% default slippage, 5% warn / 25% block impact, 20-min deadline. Verified list in the
  box shows every token + pair with explorer links and copy buttons.
- /wallet page (added 2026-09-26): read-only holdings — PLS, DUMB, DAMP balances
  via balanceOf, address with copy button + explorer link, USD estimate for PLS
  only (existing CoinGecko/CryptoCompare infra; no price feed invented for the
  tokens). Not-connected / wrong-network / loading / RPC-error states handled.
  Verified on-chain: router `0x165C3410fC91EF562C50559f7d2289fEbed552d9`
  (DUMB.ROUTER()/DAMP.ROUTER(); its factory()/WPLS() match the pair), WPLS
  `0xA1077a294dDE1B09bB078844df40758a5D0f9a27`, factory
  `0x29eA7545DEf87022BAdc76323F373EA1e707C523` (verified "PulseXFactory").
  ABIs + chain config: `src/lib/pulsechain.ts`. WalletConnect placeholder:
  `WALLETCONNECT_PROJECT_ID` in `src/lib/wagmi.ts` (null = disabled, no ID invented).
  Burn milestones strip (16B/17B/18B) reuses the /roots dead-balance read.
- /story (added 2026-09-26): the verified on-chain timeline, "what the code actually
  does today" (corrects the official X account's false claims), and holder reality —
  0xf046…0618 is the DUMB/DAMP liquidity pool, NOT a whale. ContractGuardrail
  component pins both token addresses (DUMB + DAMP) with explorer links + copy buttons
  and the name-collision warning — mounted in the hero and at the top of /trade.
  DEXScreener Quick Intel flags on the flagship pairs could not be read via text
  fetch (403); /trade nudges users to check them directly.
- Socials LIVE (2026-09-26): `src/data/dump.ts` SOCIALS → x.com/dumbmoneydotwin, t.me/dumbmoneydotwin.
- PulseChain mainnet chain id 369, testnet (v4) 943 — both verified 2026-09-26
  via eth_chainId on the public RPCs.
- Standing build loop `pulse-dumb-build-loop` (every 30 min, Antonio 2026-09-26)
  owns routine improvements; tracked separately from the Robinhood project
  (tracked item `pulsechain-dumb-damp-build-loop`). Never deploy to mainnet
  contracts, never sign, never touch the other hub repo or either contract repo.
- USD estimates for DUMB/DAMP (added 2026-09-26, Antonio's request): `src/lib/token-prices.ts`
  exports `useTokenPrices()` → `{ dumbUsd, dampUsd } | nulls`. Formula, on-chain only, no new
  data sources: token/USD = (WPLS reserve ÷ token reserve) from the flagship pair × PLS/USD
  (existing `src/lib/pls-price.ts`). DUMB via WPLS/DUMB `0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186`
  (token0=WPLS), DAMP via DAMP/WPLS `0xB256769d6B9d53E0E66a395C17135F8855A8633A`
  (token0=DAMP — reversed, handled per-ordering, verified live 2026-09-26: 0.3738 WPLS/DUMB,
  2.0456 WPLS/DAMP). Resolves null per token (never throws) on any failure. Display: /wallet
  shows "~$X.XX est." under DUMB/DAMP balances (nothing when null); /trade shows a subtle USD
  line on the DUMB/DAMP side of the quote (input on sells, output on buys, both on DUMB↔DAMP)
  plus the honest footnote "Estimated from WPLS pair reserves × PLS/USD. Indicative only —
  execution price varies." Never presented as exact.
- USD pricing FIXED + EXPANDED (2026-09-26): root cause of the null values — `client.multicall()`
  silently fails on PulseChain because multicall3 is NOT deployed there (verified via eth_getCode);
  the footnote rendered but every price resolved null. Replaced with single `readContract`
  `getReserves()` calls (same primitive as the swap box's working `useReadContract` quotes).
  Expanded from DUMB/DAMP-only to every curated token: `useTokenPrices()` now returns
  `Record<PriceTokenKey, number | null>` for PLS/DUMB/DAMP/HEX/DAI/INC/PLSX/PRVX/pTGC/WBTC
  (DAI2 → null, no WPLS pair — honest state). Newly discovered via factory.getPair + verified
  on-chain (token0/token1, nonzero reserves, decimals via `decimals()`): INC/WPLS
  `0x5b9661276708202dd1a0dd2346a3856b00d3c251` (token0=INC), PLSX/WPLS
  `0x149b2c629e652f2e89e11cd57e5d4d77ee166f9f` (token0=PLSX); both added to MARKETS.
  Decimals: HEX/WBTC 8, rest 18. /trade now shows `~$X.XX est.` under BOTH you-pay and
  you-receive for every priced token; /wallet unchanged (PLS/DUMB/DAMP rows). 60s refetch.
- NATIVE MARKET CAP (2026-09-26, Antonio: no outbound PLSFolio links — keep people on-site;
  the two PLSFolio links briefly added to Proof.tsx + the SwapBox DAMP row were fully reverted,
  zero plsfolio.com refs in src/). `useMarketCaps()` in `src/lib/token-prices.ts` →
  `{ dumbMcapUsd, dampMcapUsd }`: totalSupply() via single `readContract` on each token
  (`totalSupply` added to `erc20Abi`; both 18-decimal) × the on-chain USD price. Null when
  either leg is unavailable — never invented. `fmtUsdCompact` ($1.23B/$4.56M/$789K).
  Display: "Market cap ~$X est." row on the Proof DUMB receipts card (note: counts immobilized
  supply, ~69% burned/entombed) + "mcap ~$X est." on the SwapBox verified-tokens DAMP row.
  60s refetch, same null-guards as prices.

## Analytics (first-party, anonymous — extended 2026-09-28 with private /stats)

- Client beacon: `src/routes/__root.tsx` RootComponent fires `navigator.sendBeacon("POST /api/ping", {path, referrer, ts})` on initial load and every route change (via `router.history.subscribe`). Payload is path/referrer/ts ONLY — no cookies, no fingerprinting, no wallet address, no PII. Silent on any failure; never breaks the app. The private `/stats` route is excluded from the beacon.
- Event beacons: `src/lib/analytics.ts` `trackEvent()` posts `{path, referrer, ts, event}` for an allowlisted set only: quick_scan, deep_scan, pass_burn_dumb, pass_burn_pls, burn_voluntary, burn_voluntary_pls, wallet_connect, share_tap. Wired in TokenScanner (scan completions + verified pass burns), BurnBox (CONFIRMED burns only — receipt status success — once per tx hash), ConnectButton (once per connected address), NativeShareButton.
- Server: `/api/ping` and `/api/analytics` are served from the custom worker entry `src/server.ts` (NOT file routes) into `src/server/analytics.ts`. **Why: nitro's lazyService wrapper calls the SSR module's `fetch(request)` with the request ONLY — the worker's `(request, env, ctx)` args never arrive** (debugged live 2026-09-28: env was undefined, KV/secret reads threw). The handlers read env via `request.runtime.cloudflare.env` (set by nitro's augmentReq) with `globalThis.__env__` fallback (set by nitro's cloudflare preset on every fetch). Env is identical per request so this is safe. KV writes are awaited inline (no waitUntil reaches the module) — always in try/catch, always 204.
- `POST /api/ping`: validates shape + event allowlist (bad input → silent 204), keeps the structured log line (`{"src":"pageview"|"event",...}` — the telemetry-query fallback below still works), and increments KV daily counters: `pv:{YYYY-MM-DD}:{path}`, `ev:{YYYY-MM-DD}:{event}`, `cc:{YYYY-MM-DD}:{country}` (country from `cf-ipcountry` header; never the IP). 90-day TTL. Namespace `dump-money-analytics` (`c7ef15cbf41d45f5825fcc05bd02e070`), binding `ANALYTICS_KV`.
- KV binding wiring: the nitro pipeline regenerates `.output/server/wrangler.json` on every build with no knob for extra bindings — `scripts/patch-wrangler.mjs` merges `wrangler.patch.json` (repo root) into the generated config post-build. `npm run build` = `vite build && node scripts/patch-wrangler.mjs` (durable across loop runs). Verified live: deploy output lists `env.ANALYTICS_KV`.
- `GET /api/analytics`: returns 30-day aggregates `{days, byDay, byPath, byEvent, byCountry}`. Passphrase checked server-side with constant-time compare against the `ANALYTICS_PASS` Worker secret (set 2026-09-28 — never in code, never ask Antonio for it again, never write it to any file). Wrong/missing → 401. The gate was verified live with a wrong passphrase (401) without needing the real one.
- Private page `/stats` (`src/routes/stats.tsx`): unlisted (no nav link, not in sitemap.xml), `<meta name="robots" content="noindex, nofollow, noarchive">`, `Disallow: /stats` in robots.txt, passphrase prompt → `Authorization: Bearer` → sessionStorage only (tab lifetime). Renders visits/day SVG bars, KPIs, top pages, actions, countries + the honest "directional data" disclaimer. Live-verified 200 + gate UI.
- Footer disclosure (PageShell): "Anonymous visit counts only — no cookies, no tracking, no wallet data."
- Pulling usage for Antonio — two paths: (1) the weekly digest cron `analytics-weekly-digest` reads KV via the Cloudflare API (below) and reports to the DUMB-on-PulseChain side chat; (2) ad-hoc via the telemetry query API (credential pattern in root ~/AGENTS.md: `custom.cloudflare` vault entry + `add_surrogate_to_request`, allowed_hosts `api.cloudflare.com`):
  POST `https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/observability/telemetry/query`
  body:
  {"queryId":"dumb-pageviews","view":"logs","timeframe":{"from":<epoch ms>,"to":<epoch ms>},"parameters":{"datasets":["cloudflare-workers"],"filters":[{"key":"$workers.scriptName","operation":"eq","type":"string","value":"dump-money-hub-preview"}],"limit":1000}}
  Then keep only messages containing `"src":"pageview"` or `"src":"event"` and aggregate client-side. A window with zero events may mean no telemetry ingestion, not no traffic — sanity-check with a live curl POST to /api/ping first. (2026-09-29 correction: `"view":"logs"` now 400s — valid views are traces/events/calculations/invocations/requests/agents; neither events nor invocations surfaced the console.log lines on 2026-09-29. The KV counters — read directly via the API, same pattern the weekly digest cron uses — are the reliable traffic source; first real read 2026-09-29: ~90 pv/day, multi-country.)
