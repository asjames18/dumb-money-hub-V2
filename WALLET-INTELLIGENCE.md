# Dumb Money Wallet Intelligence

Product Design, Feature Architecture & Technical Blueprint

Product: Dumb Money Hub
Working product name: Dumb Money Wallet Intelligence
Positioning: Retail crypto, explained.
Primary network: PulseChain
Architecture model: Non-custodial, privacy-first, intelligence layer over existing wallets
Version: Product Architecture v1.0 — October 2, 2026

---

## 1. Executive Summary

Dumb Money should not attempt to become another MetaMask-style wallet in its first evolution.

Instead, Dumb Money should become the intelligence layer that sits on top of a user's existing wallet.

Users connect MetaMask, Rabby, WalletConnect-compatible wallets, or another supported EVM wallet. Dumb Money reads public blockchain information, organizes it, analyzes it, explains it, monitors it, and eventually helps users safely interact with DeFi.

Dumb Money itself does not:

* Generate seed phrases.
* Store private keys.
* Custody assets.
* Take control of user funds.
* Require users to deposit crypto.
* Sign transactions on users' behalf.

The user's existing wallet remains the security and signing layer.

Dumb Money becomes the:

Portfolio + Risk + Intelligence + AI + Alerts + DeFi + Education layer.

The experience should move a user through this progression:

Connect → Understand → Monitor → Protect → Discover → Act

The existing Dumb Money Hub is already positioned as "The home of retail crypto," includes PulseChain on-chain data, a token scanner, Ask Dumb, trading links, proof/receipts, and a Wallet area. The current scanner also already establishes a useful monetization mechanic: a free quick scan with deeper analysis tied to DUMB utility. (dumbmoneypulse.melanatedintech.com)

This architecture expands those existing pieces into a coherent SaaS platform rather than replacing them.

---

## 2. Product Vision

The problem

Crypto wallets are technically powerful but poor at explaining themselves.

A typical wallet tells the user:

* What tokens they have.
* How many tokens they have.
* Recent transactions.
* Maybe a dollar value.

It generally does not answer:

* Why did my portfolio change?
* What happened in this transaction?
* Is this token suspicious?
* What contracts still have permission to spend my tokens?
* What percentage of my portfolio is concentrated in one asset?
* Which transactions cost me the most?
* What DeFi positions do I currently have?
* What rewards are unclaimed?
* What changed while I was away?
* Which assets have no meaningful liquidity?
* Which wallet activity deserves my attention?
* What does all this blockchain jargon actually mean?

That is Dumb Money's opportunity.

---

## 3. Core Product Promise

Dumb Money should answer one simple question:

"What is happening with my crypto, and what should I understand about it?"

Not:

"What should I buy?"

That distinction matters.

The platform should provide information, context, analytics, warnings, explanations, and discovery tools without presenting speculative investment recommendations as guaranteed outcomes.

---

## 4. Product Principles

Every feature should follow seven principles.

### 4.1 Non-custodial by default

The platform never asks for seed phrases or private keys.

### 4.2 Read before write

The first product versions primarily analyze blockchain information. Transaction execution should come later.

### 4.3 Plain English before crypto jargon

A normal user should understand the dashboard without needing to know terms like ABI, calldata, LP token, allowance, or RPC.

### 4.4 Proof over claims

Any important blockchain claim should provide:

* Transaction hash.
* Contract address.
* Block number where relevant.
* Explorer link.
* Source of price/liquidity data.
* Timestamp.

This fits the existing Dumb Money "proof second" philosophy. (dumbmoneypulse.melanatedintech.com)

### 4.5 Privacy by design

A connected wallet should not automatically become a tracked user profile.

### 4.6 Progressive complexity

Beginners should not be buried in DeFi information. Power users should still have advanced controls.

### 4.7 Never build critical infrastructure unnecessarily

Use existing wallet standards, public RPCs, Blockscout, audited libraries, and established protocols wherever possible.

---

## 5. Target Users

### User Type A — Crypto Beginner

Needs: understand wallet balance, understand transactions, detect spam tokens, learn terminology, avoid obvious mistakes.
Primary experience: Portfolio + Ask Dumb + Safety

### User Type B — Active Retail Trader

Needs: multiple tokens, P&L, watchlists, wallet alerts, liquidity information, token scanners, transaction history.
Primary experience: Portfolio + Scanner + Alerts + Intelligence

### User Type C — DeFi User

Needs: LP positions, staking, lending, borrowing, claimable rewards, yield comparison, protocol exposure.
Primary experience: DeFi Dashboard + Risk + Opportunity Discovery

### User Type D — Whale / Multi-Wallet User

Needs: multiple wallets, unified portfolio, wallet labeling, historical performance, alert automation, export, advanced analytics.
Primary experience: Pro Portfolio + Automation

### User Type E — Researcher / Wallet Watcher

May not own the wallet. Needs: paste public address, inspect activity, follow wallet, track movements, analyze holdings.
Primary experience: Wallet Intelligence

---

## 6. Product Information Architecture

The Hub navigation should eventually become:

Home / Portfolio / Wallet / Scan / Transactions / DeFi / Watch / Alerts / Ask Dumb / DUMB / Learn

Then under "More": Proof / Receipts, Story, Burn, Raid HQ, Roadmap, Safety, Settings, Account, Pro.

The existing culture/story/token material remains part of Dumb Money. The wallet intelligence product becomes its utility engine.

---

## 7. The User Experience

### Stage 0 — Anonymous visitor

No account. No wallet connected. User can browse DUMB information, scan public tokens, paste public wallet addresses, ask general crypto questions, view market information, learn, use basic tools. No personal wallet information should be stored.

---

## 8. Wallet Connection Experience

Primary button: Connect Wallet

Supported initial connection methods: browser wallets, MetaMask, Rabby, WalletConnect-compatible wallets, mobile wallet deep links where supported.

PulseChain mainnet uses chain ID 369, native currency PLS, and the official RPC https://rpc.pulsechain.com.

The user connects their wallet. Dumb Money receives the public address. It never receives the private key.

---

## 9. Privacy Modes

This should become a real product differentiator.

### Mode 1 — Local Mode (default)

Wallet data exists only within the active browser/app session or approved local storage. Dumb Money servers do not permanently associate the wallet with an identity.

Available: Portfolio, Balances, Token scanner, Current transactions, Ask Dumb, Current wallet health.

Unavailable: Cross-device sync, Persistent alerting, Long historical portfolio charts, Scheduled monitoring.

### Mode 2 — Synced Account

User explicitly chooses: "Save this wallet to my Dumb Money account."

Possible authentication: Sign-In With Ethereum-style wallet signature, email/password or magic link, social authentication later.

This enables: Portfolio history, Alerts, Multi-wallet, Saved scans, Watchlists, AI history, Cross-device access.

The user should be clearly told what data is saved.

---

## 10. Main Portfolio Dashboard

After connecting, the user sees:

**Portfolio Summary** — Total Wallet Value, 24-hour change, 7-day change, 30-day change, Realized P&L, Unrealized P&L, PLS balance, Token holdings, DeFi value, Claimable rewards.

**Allocation Chart** — e.g. PLS 34%, DUMB 21%, HEX 17%, Stablecoins 14%, Other 14%.

**Wallet Health** — e.g. 78/100. Important: this should not imply investment quality. It should strictly represent measurable security/portfolio conditions such as contract approvals, spam tokens, unknown contracts, concentration, failed transactions, liquidity concerns, unverified contracts. Break down exactly why the score exists.

---

## 11. Holdings Page

Each holding displays: Token, Symbol, Balance, Current value, Portfolio percentage, Estimated price, Price source, 24h change, Cost basis when known, Unrealized P&L, Liquidity, Contract, Scanner status.

Actions: View, Scan, Explorer, Trade, Ask Dumb, Add Alert.

---

## 12. Token Detail Screen

Opening a token should provide four layers.

**Overview** — Price, Market data, Wallet balance, Value, Supply, Contract, Network.

**Safety** — Ownership, Upgradeability, Mint capabilities, Pause capabilities, Transfer restrictions, Fees/taxes, Holder concentration, Contract verification, Liquidity.

**Activity** — User's buys, User's sells, Transfers, Realized P&L, Fees paid.

**Explain** — Button: "Ask Dumb About This Token".

---

## 13. Transaction Intelligence

This could become one of Dumb Money's strongest features.

Blockchain explorers often show something like: 0xa9059cbb...

Dumb Money should say: "You sent 4,250 DUMB to wallet 0xA4...D82." Or: "You swapped approximately 1,000,000 PLS for 253,000 DUMB through PulseX." Or: "You granted this contract permission to spend an unlimited amount of TOKEN."

Each transaction receives: What happened? (plain-English description), Money in (assets received), Money out (assets spent), Fees (gas paid), Contracts involved (names and addresses), Risk events (approvals or unfamiliar contracts), Proof (explorer link).

PulseChain's explorer exposes Blockscout-compatible account, token, contract, log, block, and transaction APIs, which makes it a practical low-cost source for this layer.

---

## 14. Ask Dumb — AI Wallet Assistant

This becomes much larger than the current general assistant. Ask Dumb should have context modes: General Mode ("What is impermanent loss?"), Wallet Mode ("What changed in my wallet today?"), Token Mode ("Explain DUMB."), Transaction Mode ("What happened in this transaction?"), Portfolio Mode ("What are my largest positions?"), Safety Mode ("Do I have any risky approvals?"), DeFi Mode ("What positions do I have open?").

---

## 15. Ask Dumb Example Queries

* What did I buy this week?
* How much PLS did I spend?
* What are my largest holdings?
* What changed today?
* Which token caused most of today's portfolio movement?
* Explain my last transaction.
* Which contracts have approvals?
* Did I receive spam tokens?
* Show my staking positions.
* What rewards can I claim?
* What percentage of my portfolio is DUMB?
* What fees did I pay this month?
* How much did I spend buying TOKEN?
* Which wallets sent me tokens recently?
* Explain this contract.
* Compare these two tokens.
* What transactions failed this week?

The AI should never invent blockchain facts. Every blockchain-specific answer should come from deterministic tool/data calls.

---

## 16. AI Architecture

The AI should not directly query raw blockchains by hallucinating answers.

Architecture: User Question → Intent Classifier → Tool Router → Approved Data Functions → Structured JSON Result → AI Explanation Layer → Plain-English Answer.

Example: "How much DUMB did I buy last month?" → Intent: portfolio transaction query → calls getTokenPurchases(wallet, token, startDate, endDate) → backend calculates → AI explains.

---

## 17. AI Guardrails

Ask Dumb must distinguish: Known fact ("Your wallet received 20,000 DUMB yesterday."), Derived calculation ("Based on these transactions, your average acquisition price was approximately X."), External market data ("Current estimated price from Source X is…"), Interpretation ("Your portfolio is heavily concentrated in DUMB."), Unknown ("Cost basis cannot be determined from the available transaction history.").

Never fill missing data with guesses.

---

## 18. Wallet Health Center

Sections: Suspicious Assets (possible spam or fake tokens), Contract Approvals (contracts authorized to spend tokens), Unlimited Approvals (highlight especially broad permissions), Contract Exposure (contracts interacted with), Concentration (portfolio distribution), Unknown Tokens (assets without trusted metadata), Failed Transactions (repeated failed activity), Liquidity Risk (tokens with very shallow liquidity).

---

## 19. Approval Manager

Later phase. Users can see Token / Spender / Allowance / Last Used / Status. For revocation: Dumb Money prepares the transaction. The user's wallet signs it. Dumb Money never signs it.

---

## 20. Token Scanner 2.0

The existing scanner becomes integrated into the entire platform.

Quick Scan: Token metadata, Ownership, Supply, Taxes, Contract verification, Holder data, Basic liquidity, Important permissions.

Deep Scan: Holder concentration, Liquidity structure, Contract behavior, Linked contracts, Approval behavior, Tax comparison, Historical anomalies, Contract function analysis, AI explanation.

The current Dumb Money Hub already describes quick scanning as free and deeper scanning as requiring a small DUMB burn, so this can become an established token-utility mechanism rather than a completely new monetization model.

---

## 21. DUMB Token Utility

DUMB should provide utility without blocking mainstream adoption. Do not require someone to own DUMB simply to use Dumb Money.

DUMB can unlock: Deep scans, Additional AI queries, Cosmetic profile features, Raid features, Premium scanner credits, Community features, Special analytics, Advanced research reports, Promotional ecosystem utilities.

Possible system: Free user gets 5 Deep Scan Credits/month. Burn DUMB → receive additional scan credits. Pro subscriber → larger or unlimited quota.

---

## 22. Alerts Engine

One of the strongest paid features. Users configure events.

Wallet alerts: Incoming/outgoing transaction, Large transfer, New token received.
Security alerts: New approval, Suspicious approval, Unknown contract interaction.
Token alerts: Price threshold, Liquidity changes, Large holder movements, Contract changes where technically detectable.
Portfolio alerts: Portfolio moves ±X%, Concentration crosses threshold.
DeFi alerts: Reward available, Position health changes, Lending position changes, LP position changes.

Delivery channels: Phase 1 in-app; Phase 2 email/push; Phase 3 Telegram/Discord/SMS optional.

---

## 23. Watchlists

Users can watch tokens, wallets, contracts, liquidity pools. Example: Wallet Watch 0x123...789 labeled "Whale Wallet" — notify on transfers > $10,000, DUMB buys/sells, PulseX interactions.

---

## 24. Multi-Wallet Portfolio

Pro feature. Users add main/trading/cold/business/watch-only wallets. Dashboard shows combined net portfolio, then drill down by wallet. Labels. No private keys required.

---

## 25. Historical Portfolio

Persist snapshots: hourly for Pro, daily for free registered users. Charts: 24h, 7d, 30d, 90d, 1y, all time. Track portfolio value, token value, allocation, deposits, withdrawals. Avoid incorrectly labeling deposits as investment gains.

---

## 26. Cost Basis & P&L Engine

Transaction history transformed into normalized financial events: BUY, SELL, TRANSFER_IN, TRANSFER_OUT, SWAP, LP_DEPOSIT, LP_WITHDRAW, STAKE, UNSTAKE, REWARD, AIRDROP, BURN, FEE, UNKNOWN.

Calculate Realized and Unrealized P&L using selectable accounting methods eventually (FIFO, LIFO, Average cost). For the first version, label calculations as estimates unless the full history is known.

---

## 27. DeFi Dashboard

Comes after core wallet intelligence works. Detect: LP tokens, staking contracts, farm positions, lending deposits, borrowed assets, rewards, pool exposure. Show: Deposited, Current value, Rewards, APY, Protocol, Underlying assets, Risk notes.

---

## 28. DeFi Discovery

Separate existing positions from opportunity discovery. Tabs: My Positions / Discover. Discover filters: Network, Protocol, Asset, Stablecoin, TVL, APY, Lockup, Impermanent-loss exposure, Audited status, Reward composition. Do not simply sort by highest APY — high APY frequently corresponds to higher uncertainty.

---

## 29. DeFi Data Provider Strategy

Create an abstraction layer: DeFiProvider → PulseChainNativeProvider / ProtocolAdapters / DefiLlamaProvider / FutureProviders. Never make the business dependent on one free external API. (DefiLlama legacy yield endpoints scheduled to stop working November 13, 2026; new yield APIs require an API plan.)

---

## 30. Product Tiers

### Dumb Money Free ($0)

Connect one wallet, Local-first mode, Current portfolio, Token balances, Current portfolio allocation, Transaction history, Plain-English transaction explanations, Basic P&L, Quick token scans, Limited deep scans, Limited Ask Dumb wallet queries, Basic wallet health, Basic DeFi position detection, One watchlist, Limited alerts. This tier needs to be legitimately useful.

### Dumb Money Pro ($12.99/month or $99/year; possible intro $9.99/month)

Multiple wallets, Portfolio history, Advanced P&L, Unlimited or substantially larger AI quota, Deep token scans, Advanced wallet health, Alerts, Wallet watchlists, DeFi intelligence, Claimable reward tracking, Export, Advanced transaction decoding, Wallet comparison, Saved AI conversations, Multi-device sync.

### Future Power Tier ($29–$49/month)

For serious crypto users: 25–100 wallets, professional alerting, advanced wallet monitoring, API access, custom dashboards, advanced exports, automated reports, Telegram bots, whale intelligence, team access, treasury dashboards. Do not launch until customers demand it.

---

## 31. Dumb Money Treasury (future B2B)

For businesses, DAOs, communities, Web3 teams, family offices, organizations accepting crypto. Features: multiple wallets, treasury overview, transaction categorization, multi-user access, accounting export, spending analytics, approval workflows, Safe integration. (Safe's SDK supports smart accounts, multisig flows, batching, account abstraction.) Potential price: $99–$499+/month.

---

## 32. Recommended Technical Architecture

Dumb Money UI (Web / PWA / Future Mobile) → Wallet Connection → Application API Layer (Auth / Portfolio / AI) → Blockchain Layer (PulseChain RPC, Blockscout API, Contract Calls, Protocol Adapters) + Intelligence Layer (Risk Engine, P&L Engine, Event Parser, AI Tools) + User Data (PostgreSQL: Preferences, Alerts, History) → Cache / Job Queue → Alerts.

---

## 33. Frontend

React, Next.js, TypeScript, Tailwind, viem, wagmi or equivalent wallet state layer, WalletConnect/Reown-compatible connection system.

## 34. Blockchain Provider Layer

Provider interface: getNativeBalance(), getTokenBalances(), getTransactions(), getTokenTransfers(), getContract(), getLogs(), getBlock(), callContract(), estimateGas(), getReceipt(). Implement PulseChainProvider first; EthereumProvider, BaseProvider, PolygonProvider, ArbitrumProvider later. Initially only PulseChainProvider.

## 35. PulseChain Data Architecture

Source A — Official PulseChain RPC (chain ID 369, https://rpc.pulsechain.com): eth_call, block state, balances, contract reads, logs, gas estimation, receipts.
Source B — PulseChain Blockscout API: wallet transaction history, token transfers, contract metadata, explorer info, indexed queries.
Source C — Dumb Money Indexer: build later when external APIs become limiting.

Do not depend on Alchemy for PulseChain (not on its supported-network list); Alchemy's Transaction Simulation API was deprecated September 30, 2026.

---

## 36. Database Architecture

PostgreSQL (managed, e.g. Supabase, to keep operating costs low).

Core tables: users, wallets, wallet_labels, wallet_snapshots, token_metadata, token_balances, transactions, transaction_events, contracts, contract_risk, token_scans, watchlists, watchlist_items, alerts, alert_events, defi_positions, portfolio_snapshots, ai_threads, ai_messages, subscriptions, usage_events, scan_credits, dumb_burn_proofs, admin_events.

**users**: id, email, wallet_auth_address, subscription_tier, created_at, last_login_at, settings_json.
**wallets**: id, user_id, address, chain_id, label, wallet_type, tracking_enabled, alerts_enabled, created_at. No seed phrases. No private keys. Ever.
**portfolio_snapshots**: id, wallet_id, timestamp, native_value_usd, token_value_usd, defi_value_usd, total_value_usd.
**token_metadata** (cache, 24h): chain_id, contract_address, name, symbol, decimals, logo, verified, source, updated_at.

## 37. Job Queue & Caching

Background jobs: portfolio snapshots, wallet sync, price updates, alert checks, DeFi updates, contract metadata, scanner refreshes. Early: scheduled server functions / Supabase cron / lightweight queue. Later: Redis, BullMQ, dedicated workers.

Cache aggressively: token metadata 24h; token prices 30–120s; wallet balances 15–60s; contract analysis hours or until code changes; historical transactions essentially permanent after finalization.

---

## 38. Data Normalization Layer

Normalize into Dumb Money objects: NormalizedToken, NormalizedTransaction, NormalizedTransfer, NormalizedApproval, NormalizedSwap, NormalizedDeFiPosition, NormalizedWallet, NormalizedPrice, NormalizedContract. Makes later multichain expansion an adapter problem.

## 39. Event Decoder

Analyze transaction logs. Initially support: Transfer, Approval, Swap, Mint, Burn, Deposit, Withdraw, Stake, Unstake, Claim. Known protocol adapters improve explanations.

## 40. Protocol Adapter Architecture

ProtocolAdapter: detectPosition(wallet), decodeTransaction(tx), getPositions(wallet), getRewards(wallet), getMetadata(). Examples later: PulseXAdapter, 9inchAdapter, PhuxAdapter, LiquidLoansAdapter. Each protocol lives independently.

## 41. Price Engine

Do not depend on one source. PriceEngine → PriceSource[]: DEX pair pricing, trusted external provider, liquidity-weighted calculation, fallback oracle. Store price, timestamp, source, confidence, liquidity.

## 42. Risk Engine

Risk should never be one mysterious AI score. Use explainable components: Ownership Risk, Liquidity Risk, Holder Concentration, Contract Permissions, Trading Restrictions, Approval Risk, Verification Status, Token Age, Known Protocol Status. Output: LOW CONCERN / REVIEW / HIGH CONCERN / UNKNOWN — every label includes reasons. Never say "This token is safe." Say: "No issues detected in the checks Dumb Money performed."

---

## 43. Admin Console

Modules: Users (count, subscription, usage), Wallet jobs (sync failures, RPC errors, queue health), Scanner (volume, failed scans, cache), AI (query counts, token cost, failed tool calls, flagged outputs), Providers (API health, latency, rate limits), Alerts (delivered, failed, retried), Revenue (subscribers, MRR, churn, upgrade rate), DUMB Utility (burns, scan credits, proof transactions).

## 44. Analytics

Track product usage without surveillance: wallet connections, portfolio loads, scanner use, AI queries, alert creation, Pro conversions, retention, most-used features, failed data calls. Preserve the Hub's anonymous standard for anonymous users.

## 45. Security Architecture

Never store or request private keys / seed phrases / recovery phrases. Every transaction must clearly show what the wallet is signing. Implement HSTS, CSP, secure cookies, CSRF protection, rate limiting, bot protection, dependency scanning, secret management, security headers. Separate read and write functionality — most services should only read public blockchain data.

## 46. Transaction Execution Architecture (later)

Do not introduce execution until users trust the analytics product. Later: user chooses action → Dumb Money constructs transaction → explains it → user reviews → wallet receives unsigned request → user signs → wallet broadcasts → Dumb Money monitors receipt → receipt shown. Dumb Money never signs. Pre-signing preview: what you're swapping, estimated gas, token tax, minimum received, contract address — then "Continue to wallet".

---

## 47. Mobile Strategy

Do not immediately build native iOS and Android apps. First: excellent responsive web + Progressive Web App. Native mobile after product-market validation.

## 48. Home Dashboard / Daily Brief

Personalized after connection. "Good afternoon. Here's what happened." Cards: Portfolio, Wallet Health, Today, DeFi. Then "What changed" — AI-generated deterministic summary. Potential Pro feature: Daily Wallet Brief (portfolio, 24h, activity, largest movement, security, rewards, alerts) via email/push/Telegram later.

## 49. Onboarding

Screen 1: "Understand your crypto without becoming a blockchain detective." Connect Wallet / Explore without connecting. Screen 2: Choose privacy level (Use locally / Save my portfolio). Screen 3: What matters to you? (track portfolio, spot risky tokens, understand transactions, watch wallets, follow DeFi, learn crypto).

## 50. Search & Share

One global search bar: token, wallet, contract, transaction hash — Dumb Money identifies the type and routes accordingly. Public share pages (scan/0xABC, wallet summaries, transaction explanations, proof cards) as a growth engine. Later social layer: optional publishing of watchlists/research/scan reports — never expose private wallet info without explicit action.

## 51. Education Layer

Every technical term gets: one sentence, plain-English version, technical version, risk note. (Allowance, liquidity, slippage, LP token, smart contract, reflection, burn, gas, bridge, staking…)

---

## 52. Monetization Architecture

Four revenue engines: (1) Subscriptions — Dumb Money Pro, primary recurring revenue. (2) DUMB Utility — deep scan credits and ecosystem features. (3) B2B / Treasury — higher-priced business accounts. (4) Partner Revenue — future fiat on-ramps, hardware wallets, approved integrations (disclose affiliates).

## 53. What We Should NOT Build Yet

Custom seed phrase wallet, custody, native mobile apps, our own blockchain, our own exchange, cross-chain bridge, leverage, automated trading, copy trading, smart-contract account system, tax filing platform, proprietary indexer, dozens of chains.

---

## 54. Phased Roadmap

**Phase 1 — MVP.** Goal: make connecting a wallet immediately useful. Build: Portfolio (connect wallet, PulseChain balance, token balances, values, allocation), Transactions (recent history, transfers, plain-English descriptions), Scanner (integrate existing), Ask Dumb (wallet/token/transaction-aware AI), Wallet Health (spam tokens, basic approvals, unknown contracts), Privacy (local mode, clear permissions). First launchable product.

**Phase 2 — Retention.** Accounts, saved wallets, historical portfolio, alerts, watchlists, saved scans, portfolio summary, daily brief, better P&L, Pro subscription. SaaS revenue begins.

**Phase 3 — DeFi Intelligence.** Position detection, protocol adapters, LP positions, staking, rewards, lending, yield discovery, DeFi Ask Dumb tools.

**Phase 4 — Action Layer.** Approval revocation, swap routing, claim rewards, staking actions, transaction previews. Always wallet-signed.

**Phase 5 — Multichain.** Only after PulseChain product-market fit: Ethereum, Base, Arbitrum, Polygon, BNB Chain.

**Phase 6 — Treasury.** Organization, roles, multiple wallets, Safe accounts, approval flows, reports, accounting exports, treasury AI.

---

## 55. Repository & API Structure

/apps/web, /apps/admin; /packages/ui, wallet, blockchain, pulsechain, portfolio, prices, transactions, scanner, risk, defi, ai, alerts, auth, database, shared; /workers/portfolio-sync, alerts, prices, scanner.

API: /api/wallet/:address/summary, /tokens, /transactions, /approvals, /defi; /api/token/:address, /scan; /api/portfolio/history; /api/watchlists; /api/alerts; /api/ask. Never expose third-party API keys to the browser.

AI tool registry: getWalletSummary, getWalletBalances, getWalletTransactions, getTokenDetails, getTokenScan, getTransactionDetails, getApprovals, getPortfolioHistory, getPortfolioAllocation, getDeFiPositions, getRewards, getWatchlist, getPriceHistory. The AI only interacts with these controlled functions.

---

## 56. Reliability & Observability

Every external source gets timeout, retry, health monitoring, cache, fallback, error state. Users see "PulseChain explorer data is temporarily delayed" — never "Your wallet has zero tokens." Monitor RPC uptime/latency, Blockscout availability, AI latency, failed transactions, price-provider health, worker queue, alerts, database, auth.

## 57. Estimated MVP Operating Cost

Lean first version: ~$25–$150/month before meaningful scale (hosting $0–25, database $0–25, public RPC/Blockscout free initially, AI usage-based, email/monitoring free tiers). Cost scales with user growth, AI usage, historical indexing, notification volume, paid DeFi data, RPC requirements.

Key cost-control principle: do not call AI every time deterministic code can answer. Backend calculates; AI explains.

## 58. Product Metrics

North-star metric: Weekly Active Connected Wallets. Supporting: wallets connected, returning connected wallets, scans/user, Ask Dumb queries/user, alerts configured, alert engagement, free→Pro conversion, 30-day retention, multi-wallet adoption, DeFi feature usage, MRR.

Success milestones: 100 connected wallets (prove people connect) → 50 weekly returning wallets (prove usefulness) → 10 paying users (prove willingness to pay) → 100 paying users (~$1,299 MRR at $12.99) → 1,000 paying users (~$12,990 MRR).

## 59. Competitive Positioning

Not "another crypto portfolio tracker." Position: Crypto Intelligence for Normal People. Messaging options: "Your wallet knows what happened. Dumb Money tells you what it means." / "Stop reading blockchain hieroglyphics." / "Your crypto. Explained." / "Dumb name. Smart wallet intelligence."

Moat: plain-English transaction intelligence + token risk scanning + wallet-aware AI + PulseChain specialization + community + DUMB utility + historical wallet intelligence + protocol adapters + retail-focused UX.

## 60. Recommended Product Identity

Keep Dumb Money Hub. The major product: Dumb Money Intelligence. Inside: Portfolio, Scanner, Ask Dumb, Wallet Health, Watch, DeFi.

Long-term map: DUMB MONEY → Dumb Money Hub → Dumb Portfolio, Dumb Scanner, Ask Dumb AI, Dumb Wallet Health, Dumb Watch, Dumb Alerts, Dumb DeFi, Dumb Treasury, DUMB Ecosystem. All share the same intelligence infrastructure.

## 61. Recommended First Build

The first development sprint should not attempt this entire document. The first new experience should be: **Connect Wallet → Instant Wallet Intelligence**.

Upon connection, Dumb Money immediately returns: (1) current portfolio value, (2) token holdings, (3) portfolio allocation, (4) recent transactions, (5) transaction explanations, (6) three wallet-health observations, (7) "Ask Dumb about my wallet."

That single flow validates most of the larger product thesis. If users repeatedly connect their wallets to see that information, we have the behavioral signal to continue building.

## 62. Recommended Direction

Build Dumb Money as a non-custodial crypto intelligence platform, beginning deeply with PulseChain instead of superficially supporting every chain. Make the free product useful enough that someone wants to connect their wallet every week. Charge for memory, history, automation, monitoring, advanced intelligence, multi-wallet, advanced AI, professional features. Use DUMB for ecosystem utility rather than forcing token ownership on every user. Do not compete with MetaMask at key custody. Compete at the layer where wallets are weak: understanding.

---

## Build Log

### 2026-10-02 — Phase 1 first flow SHIPPED: /portfolio (Connect Wallet → Instant Wallet Intelligence)

Built inside the existing Dumb Money Hub (TanStack Start, no new app, no new vendors, no new subscription tier), per Antonio's scope decision.

**What shipped:**
- New `/portfolio` route: connect wallet → instant dashboard; or paste any public PulseChain address for a read-only watch view (address kept in tab state only, never persisted).
- Data layer `src/lib/wallet-intel.ts`: public Blockscout v1 API reads (token holdings, PLS balance, recent txs) + plain-English tx descriptions from 4-byte selectors + deterministic health observations. Verified working host is `https://api.scan.pulsechain.com/api` (`scan.pulsechain.com/api` 404s — `src/lib/proof/chains.ts` still lists the dead base; nothing reads it).
- Dashboard `src/components/dumb/PortfolioDashboard.tsx`: portfolio summary (valued holdings, PLS, token count), allocation bars, holdings with per-token Scan links, recent activity with one-line explanations + Explain links into the full /scan tx explainer, three health observations (unrecognized tokens, concentration, recent failures), ApprovalChecker reuse for own wallet, Ask Dumb card with suggested questions.
- Wallet-aware Ask Dumb: `/ai?q=` prefills the question box (never auto-sends); plus a copyable wallet summary the user can paste into chat.
- Nav: Portfolio added to desktop primary nav and mobile More sheet.

**Deliberately deferred to next phase:**
1. P&L (realized/unrealized, cost basis, FIFO/LIFO) — excluded until the calculation can be supported reliably.
2. True wallet-context injection into Ask Dumb — the AI does not auto-receive portfolio context; currently prefilled questions + user-pasted summary.
3. Accounts / synced mode, portfolio history snapshots, alerts engine, saved watchlists.
4. Approval revocation UI for watched (non-connected) addresses.
5. DeFi position detection and protocol adapters.
6. USD pricing for non-curated tokens (shown without dollar figures, never guessed).
7. Multi-wallet portfolio.
8. `/ai?q=` prefill applies on fresh navigation to /ai only (same-route clicks don't re-prefill).
9. `src/lib/proof/chains.ts` scanApi base still points at the dead `scan.pulsechain.com/api` — correct to `api.scan.pulsechain.com` when touched.

**Known infrastructure behavior:** the explorer API is flaky (occasional 502s, txlist can take 30s+). The UI isolates failures per section with honest retry states — a failed read never renders as "zero balance."
