import { SITE_URL } from "@/lib/page-meta";

// DUMB Money — PulseChain mainnet (369). The live, already-launched Dumb Money
// (DUMB) token on PulseChain. Safemoon-fork: 6% transfer tax, immutable/
// renounced, 28B fixed supply — 69% of it immobilized. Real and trading.
//
// Real, verified on-chain (2026-09-26, see DUMB-DAMP-RESEARCH.md +
// /roots reads):
//   DUMB token: 0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D (PulseChain mainnet)
//   DAMP stays secondary (see /roots); no address listed here.
//
// ⛔ DumpCurve track SHELVED 2026-09-26 — there is no new token. The site
// revolves around the live DUMB token. Do not reference a bonding curve,
// "not yet deployed" state, penny floor, or PLS floor anywhere user-facing.
const DUMB_TOKEN_ADDRESS = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D"; // live DUMB, PulseChain mainnet
const DAMP_TOKEN_ADDRESS = "0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3"; // live DAMP, PulseChain mainnet

const PULSECHAIN_MAINNET_EXPLORER = "https://scan.pulsechain.com";

/** Canonical link to the DUMB token on the PulseChain explorer. */
export const DUMB_TOKEN_URL = `${PULSECHAIN_MAINNET_EXPLORER}/address/${DUMB_TOKEN_ADDRESS}`;

/** Canonical link to the DAMP token on the PulseChain explorer. */
export const DAMP_TOKEN_URL = `${PULSECHAIN_MAINNET_EXPLORER}/address/${DAMP_TOKEN_ADDRESS}`;

/** DAMP address — exported for the "Which Dumb Money?" guardrail (still secondary elsewhere). */
export { DUMB_TOKEN_ADDRESS, DAMP_TOKEN_ADDRESS };

export const TOKENS = [
  {
    symbol: "DUMB",
    name: "Dumb Money",
    address: DUMB_TOKEN_ADDRESS,
    blurb:
      "Dumb Money on PulseChain: the live, already-launched DUMB token. 6% transfer tax, immutable/renounced, 28B fixed supply — 69% immobilized. Trading on PulseX.",
    explorerLink: `${PULSECHAIN_MAINNET_EXPLORER}/address/${DUMB_TOKEN_ADDRESS}`,
    sourceLink: `${PULSECHAIN_MAINNET_EXPLORER}/address/${DUMB_TOKEN_ADDRESS}?tab=contract`,
    chain: "pulsechain",
    kind: "live",
  },
] as const;

export const RECEIPT_BADGES = ["Explorer Live", "Source Code", "Proof Hub Live"] as const;

// Hub identity — "Dumb Money" (decided 2026-09-26), ticker DUMB (decided
// 2026-09-26 — this is the live PulseChain token). Custom domain live:
// dumbmoneypulse.melanatedintech.com. Share intents use the live origin.
export const SITE = {
  name: "Dumb Money Hub",
  tagline: "The Home of Retail Crypto",
  // Share intents (X, Telegram, iMessage) must post the CANONICAL domain, not
  // whatever origin the visitor happens to be on — otherwise anyone loading the
  // `dump-money-hub-preview` worker shares preview URLs to the public. Was left
  // empty "until a production URL is chosen"; the custom domain is live, so it
  // is chosen. Single source of truth with page-meta's SITE_URL.
  url: SITE_URL,
} as const;

// Official community links. Chart and buy live on PulseX: the hub links out
// to the live WPLS/DUMB pair on DEXScreener and to /trade — DUMB trades on
// real DEX pairs, so there is no in-hub market maker to link.
// ⛔ Social handles unknown — "#" renders as "soon" in the UI. Antonio: provide
// the real X handle and Telegram link.
export type SocialKey = "x" | "telegram";

export type SocialLink = {
  label: string;
  key: SocialKey;
  href: string;
};

export const SOCIALS: readonly SocialLink[] = [
  { label: "X / Twitter", key: "x", href: "https://x.com/dumbmoneydotwin" },
  { label: "Telegram", key: "telegram", href: "https://t.me/dumbmoneydotwin" },
];

export const SOCIAL_BY_KEY = Object.fromEntries(SOCIALS.map((s) => [s.key, s])) as Record<
  SocialKey,
  SocialLink
>;

// Read-only public sources used by Proof Hub.
export const PROOF_SOURCES = ["PulseChain mainnet RPC", "PulseChain BlockScout API"] as const;

export const BRAND_RULES = [
  {
    title: "Green coin head",
    desc: "Round neon coin face, simple black eyes, big confident grin.",
    icon: "coins",
  },
  {
    title: "Black hoodie",
    desc: "Street-clean charcoal-black hoodie. No busy patterns.",
    icon: "shirt",
  },
  {
    title: "Gold $DUMB chain",
    desc: "Gold pendant chain reading $DUMB. One highlight, not glitter overload.",
    icon: "gem",
  },
  {
    title: "White gloves",
    desc: "Clean white cartoon gloves for readable, friendly gestures.",
    icon: "hand",
  },
  {
    title: "Hot-pink sneakers",
    desc: "Black sneakers with hot-pink accents. Pink is official brand energy.",
    icon: "footprints",
  },
  {
    title: "No tribal language",
    desc: "No exclusionary or worship wording. We are a community, an audience, a crew.",
    icon: "ban",
  },
  {
    title: "Community-first",
    desc: "Retail voice, plain words, receipts over promises.",
    icon: "users",
  },
  {
    title: "Brand palette",
    desc: "Deep charcoal, coin green, gold, hot pink, white text. No purple SaaS gradients.",
    icon: "palette",
  },
] as const;

export const MISSION_TYPES = [
  "Raid Sprint",
  "Meme Drop",
  "Proof Post",
  "Recruit Holder",
  "Retail Lesson",
  "Burn Hype",
  "Smiley Reaction",
] as const;

export const VIBES = ["Funny", "Bold", "Proof-first", "Clean Street", "Educational"] as const;

export type MissionType = (typeof MISSION_TYPES)[number];
export type Vibe = (typeof VIBES)[number];

export const ROADMAP = [
  {
    when: "Now",
    done: true,
    title: "Live on PulseChain",
    items: [
      "DUMB + DAMP live and trading on PulseX, contracts verified on the explorer",
      "DUMB: 6% on every transfer — 5% instant burn, 1% reflections",
      "DAMP: 3% on every transfer — 2% instant burn, 1% reflections",
      "Immutable and renounced — no owner, no upgrades, no rescue",
      '"Which Dumb Money?" guardrail verifies the contract address before you interact, with one-tap add-to-wallet',
      "Swap box: curated verified tokens only (PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX, PRVX, pTGC, WBTC) — every pair verified on-chain, paste-any-address rejected, every buy has a sell path back",
      "After-tax quotes up front — you see exactly what you'll receive before you sign",
      '"Scan this contract" links beside the verified addresses in the swap box — one tap re-runs the live safety report on the exact contract before you sign',
      '"Trade on the hub" link when you scan DUMB or DAMP itself — a clean report on the hub\'s own token goes straight to the after-tax swap quote',
      "First-swap walkthrough, get-gas guide, and low-gas warning on /trade",
      "Token approvals dashboard — see what the router can still move and revoke it in one click",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Proof-first homepage",
    items: [
      "Live proof strip under the hero — total DUMB gone for good (burned plus locked in the contract), fixed supply, and the live tax split read straight from the contracts, each figure with block number, age, and explorer link",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Market dashboard",
    items: [
      "Live dashboard on /roots — USD price, 24h change, liquidity, volume, and transactions for the flagship PulseX pairs, refreshed every minute",
      "If the feed drops, the last good snapshot is served with a clear 'stale' label — never a blank page, never a guess",
      "Burn history, holder concentration, and the live on-chain tax split below the market data",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Community ignition",
    items: [
      "Daily missions + vibe packs",
      "Share-ready X and Telegram outputs",
      "Native share sheet on phones + per-page share previews",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Proof culture",
    items: [
      "Raid leaderboard — real participants only, never seeded",
      "Milestone celebrations on /proof",
      "Scam-safety and verify-address lessons",
      "Community ratings wall — real opt-in reviews only",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Voluntary burns",
    items: [
      "Burn DUMB/DAMP to the dead address — verified tax math, strong irreversible-action warnings",
      "Live burns ticker + leaderboard — real on-chain burners only, your row highlights when your wallet is connected",
      "Burn brag cards — generated share images with your verified burned amount",
      "Milestone rally strip (16B → 17B → 18B) with one-tap sharing of the exact live number",
      "Burn pledges — wallet-signed public promises that flip to 'burned ✓' only when the chain confirms it",
      "Burn with PLS — short on DUMB? one confirmation buys and burns straight to the dead address",
      "Interactive tax-flow visualizer — see the 6%/3% split before you burn",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Feed the Burn",
    items: [
      "Community DripVault on /burn — anyone can trigger a permissionless drip that sells donated tokens, buys DUMB, and sends it to dead; immutable, no owner, no withdrawals",
      "One-signature donations of curated tokens straight from the page",
      "All-time donor leaderboard, read from chain logs — bragging rights only",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Token safety scanner",
    items: [
      "Free quick scan of any PulseChain token — real vs claimed tax, owner powers (mint, blacklist, fee changes, sell limits, cooldowns, trading toggles, fee-wallet redirects), upgradeability, and a sell simulation that catches honeypots",
      "Deep scan — true round-trip cost, exit liquidity, and depth curve against real PulseX liquidity; unlocked by a verified 100,000 DUMB burn (30 days of unlimited deep scans)",
      "Transaction explainer — paste any tx hash for a plain-English breakdown, with the exact transfer-tax cost on DUMB/DAMP swaps",
      '"Scan my bags" — scan every token that touched your wallet and catch airdropped-dust traps',
      "Shareable report cards — links re-run the scan live on-chain at view time, never a stale screenshot",
      "Scan watchlist — keep verdicts on this device and re-scan live so nothing pretends to be current",
      "One-tap add-to-wallet on every report — no hand-typing contract addresses",
    ],
  },
  {
    when: "Now",
    done: true,
    title: "Dumb AI Pro",
    items: [
      "$20 flat for a 30-day pass (not a subscription) — paid on-chain in any verified curated token; ~80% of it burns DUMB to dead, the rest funds the model wallet; no verified burn, no pass",
      "Paid-model chain with a plain-English scan explainer — /scan 'Explain with AI' walks through your report on /ai",
      "Wallet-signed sessions — every paid request re-authorizes with a fresh signature that expires in 30 minutes",
      "General-purpose with standing guardrails — no price predictions, no buy/sell recommendations, no invented facts",
      "Free tier unchanged — 10 questions/day on free models",
    ],
  },
  {
    when: "Soon",
    done: false,
    title: "Community engine",
    items: [
      "Shared XP leaderboard",
      "Meme contest seasons",
      "Telegram growth pushes",
      "Weekly community spaces",
    ],
  },
  {
    when: "Planned",
    done: false,
    title: "DUMB Burn Engine",
    items: [
      "A buy-and-burn mechanism that market-buys DUMB and burns it, shrinking supply with every run",
      "Picks up what the original DAMP \u201cAmplifier\u201d was meant to do",
      "Separate from the token — the auto-processing engine stays dead; design in progress, not built yet",
    ],
  },
  {
    when: "Planned",
    done: false,
    title: "Vetted Token Directory",
    items: [
      "A curated directory of PulseChain tokens that pass our public vetting checklist",
      "Every listing shows its checklist results and last-vetted date; failures get delisted with published reasons",
      "Application fee for the vetting work — paying never guarantees a listing; most of the fee market-buys and burns DUMB",
      "Live prices, volume, and liquidity per listing, each listing shareable so projects bring their communities",
      "Listing means vetted on a date — never a safety promise, never financial advice",
    ],
  },
] as const;

export const REVENUE_RAILS = [
  {
    title: "Merch",
    icon: "shirt",
    desc: "Smiley streetwear and retail-pride drops. Sales fund the culture, not promises.",
  },
  {
    title: "Premium AI tools",
    icon: "bot",
    desc: "Paid tiers for advanced mission packs, bulk content and project workspaces.",
  },
  {
    title: "Content kits for projects",
    icon: "package",
    desc: "Done-for-you meme, thread and launch kits sold to other crypto teams.",
  },
  {
    title: "Sponsor spots",
    icon: "megaphone",
    desc: "Clearly labelled sponsor slots inside the hub. Labelled, never disguised.",
  },
  {
    title: "Education products",
    icon: "graduation-cap",
    desc: "Beginner retail crypto courses and safety guides. Education, not advice.",
  },
  {
    title: "Transparent burn events",
    icon: "flame",
    desc: "Optional business-revenue burns, published with receipts. No price outcome implied.",
  },
] as const;

export const AI_QA = [
  {
    q: "What is DUMB?",
    a: "Dumb Money is the culture project — Wall Street called everyday investors 'dumb money', so the community turned the insult into a brand: memes on the front, receipts on the back. On PulseChain the token is DUMB, and it is already launched and trading on PulseX: a Safemoon-fork with a 6% transfer tax, immutable and renounced, 28B fixed supply with 69% of it immobilized. It is a community project, not a financial product.",
  },
  {
    q: "How do I trade DUMB?",
    a: "Two ways. The on-site swap on /trade trades DUMB and DAMP both ways with the tax already factored into the quote (6% DUMB, 3% DAMP) — buy with PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX, PRVX, pTGC, or WBTC, sell back into any of them, or swap DUMB <-> DAMP; curated verified tokens and pairs only. Before you sign anything, the swap box shows a 'Before you sign' card: 'You pay X → Y% tax (A burned forever · B shared with holders) → you receive ≈Z' — the exact tax math from the live quote, plus the honest line that price can move either way and the tax applies to every transfer, not just swaps. New? /trade has a 5-step first-swap walkthrough plus a 'Get gas before you trade' guide — you need PLS for gas, and the swap box warns you if your wallet is under 0.05 PLS. After a confirmed swap, 'Brag about it' buttons share the real trade with an explorer link — and 'Explain this swap' opens the /scan transaction explainer on the confirmed receipt (what moved, what burned, exactly what the transfer tax cost). Nothing ever posts automatically. Or trade on PulseX directly — the WPLS/DUMB pair is the flagship. DEX quotes show pre-tax prices. This is information, not advice, and you are responsible for your own risk.",
  },
  {
    q: "How do I burn DUMB?",
    a: "On /burn: the 'Burn it' box sends DUMB or DAMP to the dead address in one wallet transaction — a voluntary burn, no approval needed, no new contract. The transfer is taxed like any other, so about 95% of DUMB or 98% of DAMP sent arrives (the 1% protocol burn stacks on top). Short on DUMB? The box offers 'Burn with PLS': one wallet confirmation buys your entered amount (× ~1.1 for the arrival tax) through the PulseX router straight to the dead address, and the burn is verified from the swap's Transfer logs — you sign it yourself, the site never touches your funds. An acknowledgment checkbox plus a final-check dialog guards the irreversible send, and every burn gets an explorer link. Burning from an exchange or another wallet? The dead address sits at the bottom of the box with a one-tap copy button — copy beats typing a 42-char address from memory. Below it: a tax-flow visualizer, a total-burned-all-time card with share of supply, the 16B/17B/18B milestone strip, a live burns ticker, and a leaderboard of real on-chain burners only. After a confirmed burn, 'Brag about it' shares the real amount — nothing ever posts automatically. Burns shrink supply; they never promise price.",
  },
  {
    q: "Are there burn contests?",
    a: "Not live — a full design exists, but it's parked as an idea only: no format is being picked and nothing is being built. If a contest ever runs, entry is a verified on-chain voluntary burn against the /burn leaderboard — if the chain didn't see it, it didn't happen. Funded prizes are off the table; recognition only. Burns shrink supply; they never promise price.",
  },
  {
    q: "What are burn pledges?",
    a: "On /burn, below the leaderboard: a public promise board. Connect your wallet, pick DUMB or DAMP and an amount, and sign one message — no gas, nothing moves — publishing a pledge to burn that amount within 30 days. Your row flips to 'burned ✓' only when your verified on-chain voluntary burns cover the pledged amount (arrival-leg accounting: ~95% of DUMB / ~98% of DAMP sent reaches the dead address, per the verified tax math). Pledges are labeled as promises, never as burns; they expire after 30 days; one pledge per wallet, and pledging again replaces the old one. If your wallet has a claimed display name it shows instead of your address. Burns shrink supply; they never promise price.",
  },
  {
    q: "How do I share DUMB?",
    a: "Nothing on the site posts for you — every share is one tap by you with the real amount and an explorer link pre-filled. After a confirmed burn or swap, 'Brag about it' buttons share the real event; each raid mission has its own share row; a completed tx explanation has X/Telegram/native-share buttons (the link re-runs the explanation live on-chain for the viewer); if your wallet ranks on the /burn leaderboard, the 'That's you' banner has X/Telegram/native-share buttons for your verified rank; the Feed-the-Burn donor board has the same share row for your donor rank; if your wallet has an active burn pledge, the pledge card shows the same share buttons for your promise (or your verified follow-through); a finished 'Scan my bags' run gets a share row too — counts of tokens checked and red flags only, never your address; and the burn-milestones strip has share buttons with the exact live burned number and the next milestone pre-filled. On phones a native share-sheet button opens your OS sheet (Messages, WhatsApp, anything installed) instead of the X/Telegram web intents. Shared links carry proper per-page previews. Copy stays factual and honest — no promises, do your own homework.",
  },
  {
    q: "What is the 6% tax?",
    a: "Every DUMB transfer — buy, sell, or wallet-to-wallet — pays 6%. Net effect: 5% of every transfer is permanently burned and 1% is reflected to holders. (The 5%: 1% protocol burn to the dead address, plus 2% into the contract's buy-back bucket and 2% into its liquidity bucket — both entombed, about 12.5% of supply already sitting there, because the auto-processing engine is permanently dead and ownership is renounced.) Say it plainly: every trade burns 5% and reflects 1%.",
  },
  {
    q: "Explain burns and reflections.",
    a: "A burn sends tokens to an address nobody can spend from, reducing circulating supply. Reflections redistribute a slice of transfers to holders. Neither one guarantees anything about price. DUMB's story: 56.6% of supply was burned (gone, verifiable on-chain — most of it the 14B launch-day burn), and on every taxed transfer 5% is burned (1% protocol burn to the dead address + 4% entombed in the contract's dead buckets) and 1% reflected to holders. Full breakdown on /roots.",
  },
  {
    q: "What are the numbers at the top of the homepage?",
    a: "That is the proof strip — the first thing on the homepage is verifiable fact, not the pitch. 'Live from the chain' shows total DUMB gone for good — burned to the dead address plus the balance locked inside the token contract, with its share of supply — the fixed 28B DUMB supply, and the transfer-tax legs — 6% DUMB (5% instant burn + 1% reflections) and 3% DAMP (2% instant burn + 1% reflections). The tax numbers are read live from the token contracts' own fees() and feesDistribution() calls, not pinned copy. Every figure carries the block number it was read at, how old the read is, and an explorer link, and they refresh every minute. Nothing is estimated or invented.",
  },
  {
    q: "Where can I see the live price?",
    a: "The /roots dashboard (labeled 'Dashboard' in the nav) shows live market numbers for both tokens — USD price, 24h change, liquidity, 24h volume, and transaction counts for the flagship PulseX V2 pairs, sourced from DexScreener and refreshed every minute. Below that: the pair contracts, the live tax split read from the chain, and the burn history. Be warned: these are thin markets, so a single trade can move the price — and the feed doesn't index every pool.",
  },
  {
    q: "Can I put a name on my wallet?",
    a: "Yes — the /wallet page has an optional Username card. You sign one message with your wallet (no gas, nothing moves) and the name shows on the leaderboards instead of your raw address. Names are 3–20 characters (letters, numbers, _ or -), unique first-come-first-served, one per wallet, and you can rename or clear it any time with another signature. It lives in the hub's own signed registry — claiming a name never posts anything and gives the site no control over your funds.",
  },
  {
    q: "What's on the /wallet page?",
    a: "Three things, all read-only — the site never moves your funds. (1) Holdings: your PLS, DUMB, and DAMP balances plus every curated verified token the connected wallet holds, with USD estimates where an on-chain price exists and an explorer link per token. (2) Token approvals: a hygiene section showing what the PulseX router can still move from your wallet across the 13 curated tokens, with one-click revoke — you sign approve(router, 0) yourself, it costs a little gas, and it never moves tokens. Only contracts this site has ever asked you to approve are scanned; approvals you granted anywhere else won't show. (3) An optional Username card: sign one message (no gas) to claim a display name for the leaderboards. The verified-address guardrail sits above it all, so the real DUMB/DAMP contracts are always one tap away.",
  },
  {
    q: "Give me a meme post.",
    a: '"They called us dumb money, then copied our timeline." Retail does not need permission. The key is gone, the code is in charge, and the smiley keeps grinning. Post it with the smiley, tag a friend who is still asking their bank for advice.',
  },
  {
    q: "Give me a beginner retail crypto lesson.",
    a: "Lesson one: never trust a link, trust an address. Copy the contract from a source you verified, keep your seed phrase offline, size positions so a total loss would not change your life, and learn to read a block explorer before you read a hype thread. Boring habits beat lucky trades.",
  },
  {
    q: "How do I stay safe and spot scams?",
    a: "Assume every DM is a scam until proven otherwise. Nobody legit needs your seed phrase, ever. Bookmark official links yourself instead of clicking ones people send you, double-check contract addresses character by character, and revoke old token approvals now and then — the /wallet page has a Token approvals section that shows what the PulseX router can still move from your wallet and revokes it in one click. If something rushes you to act fast, that urgency is the trap.",
  },
  {
    q: "How do I verify a contract?",
    a: "Open the DUMB address 0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D on the PulseChain explorer, confirm the token name and symbol match, then check the verified source code and holder list. The /roots page already surfaces the live tax, ownership, burn totals, and pair data. Until you have checked it yourself, trust nothing.",
  },
  {
    q: "How do I check if a token is safe?",
    a: "Use the /scan page: paste any PulseChain token address and it reads the contract live — transfer tax, whether ownership is renounced, whether transfers are paused, how much of the supply the live owner address holds (the owner-concentration check — flagged at 50%+, warned at 15%+: holding isn't dumping, but the power sits in one place; skipped when ownership is renounced), whether the live owner can change the transfer tax (the fee-setter probe — read-only calls impersonating the owner against the common fee-setter shapes; a hit means the tax you see today isn't locked and could be raised before you sell; skipped when ownership is renounced) and whether anyone can change it (a permissionless-fee-change probe impersonates a random address against the same shapes — a hit is a hard fail, and it runs exactly when there's no live owner), whether the live owner's wallet skips the transfer tax (the fee-exemption probe reads the common fee-exemption getters against the owner's address — a hit means their sells skip the tax you'd pay; skipped when ownership is renounced) and whether the owner could exempt their wallet later (the fee-exclusion-setter probe reads the common fee-exclusion setter shapes impersonating the owner — the exemption check tells you what IS, this one tells you what COULD BE; a hit means they could give themselves the tax skip before selling; skipped when ownership is renounced), and whether the live owner can print new tokens (the owner-mint probe — read-only calls impersonating the owner against the common mint shapes; a hit is the classic inflation vector: mint, then dump the new supply on buyers; skipped when ownership is renounced), and whether the live owner can freeze wallets (the blacklist probe — read-only calls impersonating the owner against the common blacklist shapes; a hit means the owner can block sells or trap tokens; skipped when ownership is renounced), and whether the live owner can throttle sells (the sell-limit probe — read-only calls impersonating the owner against the common max-transaction/max-wallet setter shapes, with fail-safe probe values that could only loosen limits; a hit is the classic soft-rug throttle: the tax can be honest while the exit is gated; skipped when ownership is renounced), and whether the live owner can throttle trade cadence with a transfer cooldown (the cooldown probe — read-only calls impersonating the owner against the common cooldown-setter shapes, with fail-safe probe values that could only remove or disable a cooldown, plus the common cooldown getters so the report honestly distinguishes an armed cooldown from the owner's power to change it; a hit is the slow-rug tempo trick: buys look free while sells are gated by the clock; skipped when ownership is renounced), and whether the live owner can exempt chosen wallets from the buy/sell limits (the exemption probe — read-only calls impersonating the owner against the common tx-limit exemption shapes, with the fail-safe dead-address probe argument; a hit is the insider lane: the throttle applies to everyone except whoever the owner lets through; skipped when ownership is renounced), and whether the live owner can flip a fork-style trading switch (the trading-toggle probe — read-only calls impersonating the owner against the common (bool) toggle-setter shapes, with the fail-safe enable-only probe value, plus the common toggle getters read plainly so the report honestly distinguishes a live freeze from the owner's power to flip it; a freeze verdict requires BOTH the setter and a halted flag to corroborate each other — a lone halted flag lands on unknown, never fail; skipped when ownership is renounced), and whether the live owner can repoint where the tax money goes (the fee-wallet redirect probe — read-only calls impersonating the owner against the common marketing/fee/dev wallet-setter shapes, with the fail-safe dead-address probe value, plus the common wallet getters read plainly so the report names the current recipient as the named recipient rather than proven flow; a hit means the owner can move the fee wallet with one call — the slow-rug use-of-funds fiction: holders believe the tax funds marketing or buybacks while the owner quietly points the wallet at themselves; skipped when ownership is renounced), and whether the live owner can pull accumulated value out of the contract (the rescue/withdraw probe — read-only calls impersonating the owner against the common rescue/withdraw shapes, with fail-safe dead-address and 1-wei probe values; a hit is the slow-rug tax-jar drain: the owner can drain the fee pool the holders funded; skipped when ownership is renounced), whether it's an upgradeable proxy (the quick scan reads the EIP-1967 proxy slots: a live upgrade key that can swap the token's code is flagged as a real rug vector — the classic upgrade-rug shape; DUMB and DAMP pass, they're not proxies), what % of the LP is burned, the token's identity (it verifies the address against the site's curated contracts — the real DUMB/DAMP get a verified pass, name-copying lookalikes get a red flag), and a sell simulation (a read-only probe that transfers from a real holder's balance — catches the classic honeypot shape where buys work and sells revert), and a measured-tax check (it reads ~100k blocks of real PulseX swap history on the token's WPLS pair — the buy tax and sell tax traders actually paid, direction-aware so an asymmetric tax can't hide; the sell side reads a touch low because reflections don't emit transfer events, and thin history gets an honest 'not enough trades' instead of a guess) — all in plain English, no wallet needed. It flags red flags but can't prove a token is safe; always double-check on the explorer yourself. Every report carries a one-tap add-to-wallet button that puts the exact contract you just scanned into your wallet (chain-checked, no hand-typing — safer than transcribing an address). After the quick scan you can also run a deep scan: three simulated checks against the token's real PulseX liquidity — the true round-trip cost (a 1 WPLS buy plus an immediate sell-back), exit liquidity (what a 10 WPLS bag nets heading for the door), and a 1-vs-10-vs-100-WPLS depth curve. It costs a verified 100,000 DUMB burn to the dead address — one burn unlocks 30 days of unlimited deep scans (one-click wallet burn, paste a manual burn tx from your connected wallet — someone else's burn hash won't count — or pay with PLS when the wallet holds < 100k DUMB: one confirmation buys ~110k DUMB through the PulseX router straight to the dead address) — and every scan shrinks the supply. Every report is shareable: the share link re-runs the scan live on-chain when your friend opens it, so they always see a fresh, re-verified report — and when the token is one of the site\u2019s verified curated tokens, the shared link\u2019s preview card names the token\u2019s symbol (symbol only, never the verdict, so a cached card can never go stale) — and when a burn-backed deep scan ran — a fresh 100,000 DUMB burn this session, or a run on your 30-day pass — the pre-filled share copy names the deep scan, its verdict, and the burn behind it (the pass copy says it ran on the pass, never implying a fresh burn). After a verified deep-scan burn, the panel also shows a shareable burn brag card for the burn itself — the verified dead-arrival amount, postable to X or Telegram. You can also tap Watch on any report to keep its verdict in a browser-local watchlist on the /scan page (this device only) — Re-scan re-runs it live on-chain, so a watched verdict never pretends to be current. On /scan, \u2018Scan my bags\u2019 runs the free quick scan on every token that sent a wallet a transfer recently — connect your wallet, or paste any wallet address with no connection needed (read-only) — the airdropped-dust trap check (free mystery tokens you try to sell and can\u2019t, or approve and lose); each row opens the full report, where the burn-gated deep scan still lives as usual.",
  },
  {
    q: "What did my transaction actually do?",
    a: "Paste the transaction hash into the Transaction tab on /scan — it reads the receipt live on-chain and explains in plain English: what moved where, which legs went to the dead address (burned), and a swap summary when that's what it was, plus warnings for contract recipients and failed transactions. On DUMB/DAMP swaps it also names the exact transfer-tax cost of the swap (computed from the on-chain 1% protocol burn leg — the tax is priced into the swap, and the note says slippage can't be measured from the receipt alone). Read-only, no wallet needed, shareable via /scan?tx=. If it detects a voluntary burn to the dead address — a direct DUMB/DAMP transfer, or the PLS path that buys DUMB and sends it straight to dead — it says so in the headline and links that burn's shareable brag card (/brag?tx=). Every token in the movements table also carries a 'scan token' link — one click runs the /scan safety check on the exact contract the tx moved, handy when an unfamiliar token shows up in your transaction. It shows on-chain movements, not intent — and it can't see internal transfers.",
  },
  {
    q: "What is PulseChain?",
    a: "PulseChain is an EVM-compatible network, so it works with the same wallets and tooling as Ethereum. DUMB lives there as a live token trading on PulseX. This is a plain description of the network, not a recommendation to buy anything.",
  },
  {
    q: "Give me a Telegram hype line.",
    a: '"Retail just clocked in. 🟢" Smiley is at the front desk, receipts are on the wall, and the missions refresh daily. No price talk, no promises — just show up, post once, and bring one friend who still asks their bank for permission.',
  },
  {
    q: "What is Dumb AI Pro?",
    a: "Dumb AI Pro is a $20 30-day pass on /ai — not a subscription, it does not renew. It is unlocked by an on-chain payment of roughly $20 in any of the 12 verified curated tokens: about $16 of DUMB burns to the dead address and about $4 goes to the model wallet that funds the AI. The burn leg always ends as DUMB at dead, and the server verifies both legs on-chain before the pass exists — no pass without a real burn. The pass is tied to the wallet that paid, lasts 30 days from activation, and caps at 100 questions a day (1,000 a month) per wallet, with a hub-wide daily circuit breaker. The flagship Pro feature is the plain-English scan explainer: /scan 'Explain with AI' stores your report, /ai walks through it in plain English. Pro is general-purpose — ask anything, in depth — with the standing guardrails (no price predictions, no buy/sell recommendations, no invented facts). The free tier stays free: 10 questions a day per visitor. On-chain payments are irreversible — no refunds, since the burn leg destroys tokens permanently by design. Full terms on /terms.",
  },
  {
    q: "What are the terms and privacy policy?",
    a: "/terms is plain language: the hub is an educational interface for two immutable, renounced tokens — the maintainers did not deploy them and cannot change them. Nothing here is financial advice, a recommendation, or a price promise; the scanner catches red flags but cannot prove a token is safe. Burns are permanent, you sign everything yourself, and the site never moves your funds — never share a seed phrase with anyone, we will never ask. /privacy: anonymous visit counts only (page and country, aggregated) — no cookies, no cross-site tracking, no ad pixels, and no wallet addresses tied to your visits. Feedback is anonymous; things on your device (scan watchlist, raid XP, display name, chat history) live in your browser's local storage only. Pro payments are the exception: the wallet address, transaction hashes, and pass expiry are recorded to enforce the 30-day term — they are public on-chain records anyway.",
  },
] as const;

export const RANKS = [
  { min: 0, label: "Fresh Retail" },
  { min: 100, label: "Smiley Recruit" },
  { min: 250, label: "Raid Runner" },
  { min: 500, label: "Proof Hunter" },
  { min: 1000, label: "Amplifier" },
  { min: 2000, label: "Dumb Money Legend" },
] as const;

export function rankFor(points: number) {
  return [...RANKS].reverse().find((r) => points >= r.min)?.label ?? "Fresh Retail";
}
