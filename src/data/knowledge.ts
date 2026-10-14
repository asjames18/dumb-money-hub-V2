import { AI_QA, TOKENS } from "@/data/dump";

export type KnowledgeChunk = {
  id: string;
  title: string;
  tags: string[];
  body: string;
};

export const KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: "brand",
    title: "Dumb Money brand",
    tags: ["brand", "smiley", "dumb", "retail", "tagline"],
    body: "Dumb Money is a meme/crypto culture project on PulseChain. Positioning: The Home of Retail Crypto. Story: Wall Street called everyday investors dumb money, so the community built something they cannot control. Taglines: The key is gone. The code is in charge. Meme first. Proof second. Community always. Tone is bold, funny, retail-first — never scammy promises or investment advice.",
  },
  {
    id: "tokens",
    title: "DUMB token",
    tags: ["dumb", "token", "contract", "address", "pulsechain", "live"],
    body: `DUMB (${TOKENS[0].address}) is the live, already-launched Dumb Money token on PulseChain mainnet — trading on PulseX. Safemoon-fork: 6% transfer tax, immutable/renounced, 28B fixed supply, ~69% immobilized (~56.6% historically burned, ~12.5% entombed in the contract). Per taxed transfer: 5% burned (1% protocol burn to the dead address + 2% buy-back bucket + 2% liquidity bucket, both entombed forever) and 1% reflected to holders. The per-transfer split is live; the auto-processing engine is permanently dead (buckets entombed). Always verify the address yourself on a block explorer before interacting. Listing an address is not a recommendation to buy.`,
  },
  {
    id: "buy",
    title: "How people trade DUMB",
    tags: [
      "buy",
      "sell",
      "pulsex",
      "wallet",
      "how",
      "tax",
      "damp",
      "dai",
      "hex",
      "inc",
      "plsx",
      "wbtc",
    ],
    body: "DUMB trades on live DEX pairs on PulseChain — the WPLS/DUMB pair on PulseX v2 is the flagship; see /trade for the DEXScreener links. The on-site swap on /trade trades DUMB and DAMP both ways (6% tax on DUMB, 3% on DAMP — the 1% burn fires on every taxed transfer in either direction): buy with PLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX, PRVX, pTGC, or WBTC; sell back into any of them; or swap DUMB <-> DAMP — direct pairs where they exist, otherwise routed through WPLS. Curated verified tokens and pairs only (no paste-an-address box, so no honeypot roulette). Your /wallet page shows your PLS, DUMB, and DAMP holdings. DEX quotes show the pre-tax price: the 6% transfer tax means you receive about 6% less. Double-check every character of the address. This is information, not advice. You can lose everything.",
  },
  {
    id: "safety",
    title: "Scam safety",
    tags: ["scam", "safety", "seed", "phishing", "secure"],
    body: "Never share a seed phrase. Assume DMs are hostile. Bookmark official links yourself. Verify contract addresses character by character. Revoke stale token approvals — the /wallet page has a Token approvals section that shows what the PulseX router can still move from your wallet and lets you revoke it in one click. Urgency is usually the trap. Nobody legitimate needs your seed.",
  },
  {
    id: "burns",
    title: "Burns and reflections",
    tags: ["burn", "reflection", "supply", "mechanics"],
    body: "On DUMB, every taxed transfer burns 5% (1% protocol burn to the dead address + 4% entombed in the contract's dead buckets, which can never be processed) and reflects 1% to holders — live on-chain mechanics, verified 2026-09-27. On DAMP: 2% burned, 1% reflected. A burn sends tokens to an unspendable address, reducing circulating supply; reflections redistribute a slice of transfers to holders. Neither guarantees price. Check Proof Hub and explorers for live balances — do not invent numbers.",
  },
  {
    id: "burn-page",
    title: "Voluntary burns on /burn",
    tags: ["burn", "voluntary", "dead", "burnbox", "ticker", "leaderboard", "tax"],
    body: "/burn is the voluntary-burn hub. The 'Burn it' box burns DUMB or DAMP with a plain wallet transfer to the dead address — no approval needed, no new contract. The transfer is taxed like any other (6% DUMB / 3% DAMP), so about 95% of DUMB or 98% of DAMP sent arrives at dead; the 1% protocol burn stacks on top. An acknowledgment checkbox plus a final-check dialog guards the irreversible send, and every burn gets an explorer link. Below it: an interactive tax-flow visualizer (where the 6%/3% actually goes), a total-burned-all-time card (the gone-for-good total — live dead-address balances plus the tax buckets locked in the token contracts — with share of total supply read live from totalSupply()), the 20B/21B/22B burn-milestones strip tracking that same gone-for-good total (the community rally point), a live burns ticker (last 20,000 blocks, voluntary burns vs 1% protocol-burn legs), and a leaderboard ranking only real on-chain burners — never seeded. Burning from another wallet or an exchange: the bottom of the BurnBox has the dead address with a one-tap copy button plus a first/last-4 verification reminder (0x00…dEaD) — copy beats hand-typing an irreversible address. After a confirmed burn, 'Brag about it' share buttons post the real amount with an explorer link (nothing auto-posts). Burns shrink supply; they never promise price.",
  },
  {
    id: "token-scanner",
    title: "Token safety scanner on /scan",
    tags: ["scan", "scanner", "safety", "rug", "honeypot", "token", "check", "verify"],
    body: "/scan is a free read-only token safety scanner for any PulseChain token — no wallet, no signing. Paste a contract address and it reads the chain live: contract code exists (or it's a plain wallet), ERC-20 metadata, the transfer tax (via standard getters like fees()/taxFee(); tokens can tax transfers in ways no getter reveals), owner() (renounced = pass, live owner = caution), an owner-concentration check (the % of supply sitting in the live owner address — a big share is a slow-rug dump risk), a fee-setter probe (whether the live owner can rewrite the transfer tax — read-only calls impersonating the owner against the common fee-setter shapes; a hit means the tax you see today isn't locked; skipped when ownership is renounced) plus a permissionless-fee-change probe (the same shapes impersonating a random address — a hit means anyone could rewrite the tax, a hard fail; runs only when there is no live owner), a fee-exemption probe (whether the live owner's wallet skips the transfer tax — the common fee-exemption getters are read against the owner's address; a hit means their sells skip the tax you'd pay; skipped when ownership is renounced) and a fee-exclusion-setter probe (whether the owner could exempt their wallet from the transfer tax later — the common fee-exclusion setter shapes are read impersonating the owner; the exemption check tells you what IS, this one tells you what COULD BE; a hit means they could give themselves the tax skip before selling; skipped when ownership is renounced), an owner-mint probe (whether the live owner can print new tokens — the common mint shapes are read impersonating the owner; a hit is the classic inflation vector: mint, then dump the new supply on buyers; skipped when ownership is renounced), a blacklist probe (whether the live owner can freeze wallets — the common blacklist shapes are read impersonating the owner; a hit means the owner can block sells or trap tokens; skipped when ownership is renounced), a sell-limit probe (whether the live owner can throttle sells by changing max-transaction or max-wallet limits — the common limit-setter shapes are read impersonating the owner, with fail-safe probe values that could only loosen limits; a hit is the classic soft-rug throttle: the tax can be honest while the exit is gated; skipped when ownership is renounced), a cooldown probe (whether the live owner can throttle trade cadence with a transfer cooldown — the common cooldown-setter shapes are read impersonating the owner, with fail-safe probe values that could only remove or disable a cooldown, plus the common cooldown getters so the report honestly distinguishes an armed cooldown from the owner's power to change it; a hit is the slow-rug tempo trick: buys look free while sells are gated by the clock; skipped when ownership is renounced), an exemption probe (whether the live owner can lift the buy/sell limits for chosen wallets — the common tx-limit exemption shapes are read impersonating the owner, with the fail-safe dead-address probe argument; a hit is the insider lane: the throttle applies to everyone except whoever the owner lets through; skipped when ownership is renounced), a trading-toggle probe (whether the live owner can flip a fork-style trading switch — the common (bool) toggle-setter shapes are read impersonating the owner, with the fail-safe enable-only probe value, plus the common toggle getters read plainly so the report honestly distinguishes a live freeze from the owner's power to flip it; a freeze verdict requires BOTH the setter and a halted flag to corroborate each other — a lone halted flag lands on unknown, never fail; skipped when ownership is renounced), a fee-wallet redirect probe (whether the live owner can repoint where the tax money goes — the common marketing/fee/dev wallet-setter shapes are read impersonating the owner, with the fail-safe dead-address probe value, plus the common wallet getters read plainly so the report names the current recipient as the named recipient rather than proven flow; a hit is the slow-rug use-of-funds fiction — holders believe the tax funds marketing or buybacks while the owner quietly points the wallet at themselves; skipped when ownership is renounced), a rescue/withdraw probe (whether the live owner can pull accumulated value out of the contract — the common rescue/withdraw shapes are read impersonating the owner, with fail-safe dead-address and 1-wei probe values; a hit is the slow-rug tax-jar drain: the owner can drain the fee pool the holders funded; skipped when ownership is renounced), paused() (frozen right now = red flag), an upgradeability check — it reads the EIP-1967 proxy slots to catch the upgrade-rug shape (a live upgrade key that can swap the token's code = real rug vector, caution; renounced or absent = pass), a contract-age line: it binary-searches the chain (read-only eth_getCode) for the block the contract was first deployed in and reports the deployment month plus how long ago that was (coarse, about-months precision; for an upgradeable proxy it names the proxy contract's age explicitly). The copy says age is context, not a verdict: a fresh contract isn't automatically a scam and an old one isn't automatically safe — the tax, owner-power, and sell checks matter more. Then the token/WPLS pair on PulseX with the % of LP tokens burned at the dead address, and a sell simulation — a read-only eth_call that probes a transfer out of a real holder's balance, catching the classic honeypot shape where buys work and sells revert (a revert is a red flag; a token can still block DEX sells specifically, which is what the burn-gated deep scan tests). It also measures the real buy/sell tax from ~100k blocks of PulseX swap history on the token's WPLS pair — measured buy and sell tax against the claimed one, direction-aware so an asymmetric tax can't hide; the sell side reads a touch low because reflections emit no transfer events; thin history reports 'not enough trades', never a guess. It also checks the token's identity against the site's curated contracts (DUMB, DAMP, WPLS, HEX, TEDDY, SOLIDX, PCOCK, HELGO, INC, PLSX, PRVX, pTGC, WBTC): a match is an 'identity verified' pass, while a token wearing one of those symbols at a different address gets a 'lookalike warning' red flag. Results are pass/caution/red-flag/unknown — unknown means 'treat as risky', never 'fine'. Every report carries a one-tap add-to-wallet button for the exact scanned contract (chain-checked EIP-747, no hand-typing). The scanner can't prove a token is safe; always verify on the explorer. A burn-gated deep scan (simulated buy+sell round-trips against real liquidity) is live: a verified 100,000 DUMB burn to the dead address unlocks 30 days of unlimited deep scans — one-click from a connected wallet, paste a manual burn tx, or (when the wallet holds < 100k DUMB) pay with PLS: one confirmation buys ~110k DUMB through the PulseX router straight to the dead address — and every scan shrinks the supply. Reports are shareable: the link re-runs the scan live on-chain at view time. Shared links name the token\u2019s symbol in the link preview when it\u2019s one of the site\u2019s verified curated tokens \u2014 symbol only, never the verdict, so a cached preview can never lie or go stale. When a burn-backed deep scan ran — a fresh burn this session, or a run on the 30-day pass — the shared link re-runs the deep scan for the viewer too — and the pre-filled share copy names the deep scan, its verdict, and the burn behind it (the pass copy says it ran on the pass, never implying a fresh burn). A second tab explains any transaction hash in plain English — what moved, which legs burned, swap summaries (on DUMB/DAMP swaps it also names the exact transfer-tax cost of the swap, computed from the on-chain 1% protocol burn leg, with the honest caveat that slippage can't be measured from the receipt alone), contract-recipient warnings — and for failed transactions it diagnoses why it reverted: out of gas (receipt fingerprint), an expired swap deadline (decoded from the router calldata, compared to the inclusion block), or the contract's own revert reason replayed and translated to plain English — with an honest fallback when the receipt names no cause, plus the usual suspects, and the PLS the failed attempt cost in gas — read-only, no wallet, shareable via /scan?tx= (X/Telegram/native-share buttons; the link re-runs the explanation live on-chain for the viewer; when the explainer detects a direct DUMB/DAMP burn to the dead address, it links that burn's shareable /brag?tx= brag card; and every token in the explainer's movements table carries a 'scan token' link that runs this scanner on that exact contract).",
  },
  {
    id: "onboarding",
    title: "First-swap onboarding",
    tags: ["buy", "start", "beginner", "gas", "walkthrough", "pls", "wallet", "trade"],
    body: "Newcomer onboarding: /trade opens with a 5-step first-swap walkthrough (connect wallet, PulseChain chain-369 auto-switch, keep PLS for gas, curated verified inputs only, tax already in the quote, exact-amount approval, check the receipt on the explorer, never enter a seed phrase). Below it, 'Get gas before you trade' explains the three common ways to get PLS (official bridge at bridge.pulsechain.com, a listing exchange withdrawing to chain 369, or swapping a slice on PulseX), with a lookalike-bridge warning. If the connected wallet holds under 0.05 PLS, the swap box shows a 'No gas in the tank' warning at the decision point. The 'Which Dumb Money?' guardrail (homepage hero, /trade, /story, and /wallet above your holdings) pins the verified contract addresses with one-click 'Add to wallet' buttons — read-only wallet prompt, chain-checked to 369, reversible.",
  },
  {
    id: "community-wall",
    title: "Community ratings wall",
    tags: ["community", "reviews", "ratings", "culture", "wall"],
    body: "/culture has a 'Real voices, real stars' community ratings wall. It lists only real opt-in reviews, curated by hand — it ships empty on purpose and never seeds or invents ratings. Members submit via a pre-filled post template to the Telegram group (nothing is auto-posted); an average star rating renders only once real reviews exist.",
  },
  {
    id: "share",
    title: "Sharing DUMB moments",
    tags: ["share", "x", "telegram", "post", "brag", "viral", "spread", "rally"],
    body: "Nothing on the site ever posts for you — sharing is always one tap by you, with the real amounts pre-filled. After a confirmed burn, the 'Brag about it' section on /burn leads with the burn brag card: a meme-style 1080x1080 image (your real amount, token, a rotating tagline, and the tx hash so the brag is checkable — typography and flames only, no mascot art) shared through the phone's native sheet where supported, or downloaded as PNG. The per-burn share link (/brag?tx=...) unfurls the card image in X/Telegram/Discord previews: the card is rendered server-side straight from the verified on-chain burn (amount decoded from the transfer, never uploaded), so only real voluntary burns get an image and nobody can spoof someone else's burn. Text-only X/Telegram intent buttons remain below the card. Then there's the burn-rally link, for recruiting the next burner instead of celebrating your own: on /burn, typing a valid token and amount arms a copyable 'Burn rally link' — a /burn?token=DUMB&amount=500000 URL that opens the burn box prefilled for whoever taps it — and after a confirmed burn the success panel shows an 'Or rally others' copy button prefilled from the VERIFIED burned amount (not the editable field). The link carries intent only: whoever opens it still has to check the acknowledgment box and sign the burn themselves. An opened rally link says so on the box: 'just a suggestion. Nothing burns until you confirm below and sign it yourself.' After a confirmed swap, the same on /trade (the trade is snapshotted at send time so later edits can't make the share text lie); each raid mission has its own share row; when your connected wallet ranks on the /burn leaderboard, the 'That's you' banner carries X/Telegram/native-share buttons for your verified rank and amounts (linking to /burn); the burn-milestones strip carries its own X/Telegram/native-share buttons with the exact live burned number and the next milestone pre-filled — sharing a rally update never requires hand-typing a number (nothing renders until the live on-chain number loads); a completed transaction explanation on /scan carries X/Telegram/native-share buttons (the link re-runs the explanation live on-chain for the viewer; when the explainer detects a direct DUMB/DAMP burn to the dead address, it links that burn's shareable /brag?tx= brag card). On phones, a native share-sheet button (rendered only where the Web Share API exists) opens the OS sheet — Messages, WhatsApp, any installed app — instead of forcing the X/Telegram web intents. Shared links carry per-page preview metadata (title, description, canonical URL) so they look right in feeds. Copy stays factual and honest: no promises, do your own homework.",
  },
  {
    id: "burn-contests",
    title: "Burn contests",
    tags: ["contest", "competition", "leaderboard", "milestone", "drive", "event"],
    body: "There is no live burn contest right now — the full design is done (see BURN-CONTESTS-DESIGN.md in the open repo) but it's parked as an idea only: no format is being picked and nothing is being built. Designed formats: (1) a recognition-only community milestone drive with a shared target and progress bar — the recommended pilot, no winner, nothing to game; (2) a recognition honor roll; (3) a biggest-single-burn quarterly; most-burn-transactions was deferred. Entry is a verified voluntary burn, checked on-chain against the /burn leaderboard — nothing off-chain, nothing invented; if the chain didn't see it, it didn't happen. Wash-burning for an edge is self-defeating: you destroy real tokens and pay the 6%/3% tax with no profit path. Funded prizes are off the table (spending and legal questions belong to the project owner) — contests are recognition only. The /burn leaderboard already ranks only real on-chain burners. Burns shrink supply; they never promise price.",
  },
  {
    id: "proof",
    title: "Proof Hub and receipts",
    tags: ["proof", "receipts", "explorer", "verify", "owner", "lp", "homepage", "strip", "hero"],
    body: "Contract Receipts lists public addresses and explorer links. Proof Hub reads public feeds for owner status, liquidity totals, burn wallet balances, supply, holders and recent burns. The homepage leads with a live proof strip — 'Live from the chain': total DUMB gone for good (dead-address balance + balance locked in the token contract, share of supply), fixed 28B supply, and the 6% DUMB / 3% DAMP transfer-tax legs derived live from the contracts' own fees() and feesDistribution() calls. Every figure carries its block number, read age, and an explorer link; nothing is pinned copy. Liquidity USD is not an LP lock proof. Unavailable tiles stay labeled unavailable — never fabricate verification.",
  },
  {
    id: "arcade",
    title: "Raid Arcade",
    tags: ["mission", "arcade", "xp", "raid", "meme"],
    body: "Raid Arcade generates share-ready missions with X posts, Telegram lines, captions and image prompts. Mission of the Day is deterministic for the UTC date. XP and streaks are a local fun scoreboard, not a financial reward.",
  },
  {
    id: "smiley",
    title: "Smiley brand rules",
    tags: ["smiley", "mascot", "hoodie", "chain", "pink"],
    body: "Smiley: round green coin head, simple black eyes, big grin, black hoodie, gold $DUMB chain, white gloves, green limbs, black sneakers with hot-pink accents. No tribal/exclusionary language. Palette: charcoal, coin green, gold, hot pink, white.",
  },
  {
    id: "wallet-page",
    title: "The /wallet page",
    tags: ["wallet", "holdings", "balances", "approvals", "revoke", "username", "page"],
    body: "The /wallet page is the hub's read-only wallet dashboard — the site never moves your funds. Connect a wallet on PulseChain and it shows: (1) Holdings — your PLS, DUMB, and DAMP balances plus every curated verified token the wallet holds, with USD estimates where an on-chain price exists and explorer links per token; (2) Token approvals — a hygiene section that reads what the PulseX router can still move from your wallet across the 13 curated tokens and revokes any of them in one click (you sign approve(router, 0) yourself; revoking costs a little gas and never moves tokens; scope is honest — only contracts this site has ever asked you to approve are scanned); (3) an optional Username card — sign one message (no gas, nothing moves) to claim a display name that shows on the burn and donor leaderboards instead of your raw address. The verified-address guardrail sits above the holdings too, so a confused balance always has the real contract addresses one tap away.",
  },
  ...AI_QA.map((qa, i) => ({
    id: `faq-${i}`,
    title: qa.q,
    tags: qa.q.toLowerCase().split(/\W+/).filter(Boolean),
    body: qa.a,
  })),
];

export const SYSTEM_GUARDRAILS = `You are Smiley, the Dumb AI helper for Dumb Money Hub on PulseChain.
Rules you must follow:
- Education and culture only. Never give financial advice, price predictions, buy/sell timing, or guaranteed gains.
- If asked for price targets, moon talk, or "should I buy", refuse and redirect to verifying contracts and personal risk responsibility.
- Prefer receipts and explorer checks over hype.
- Keep answers concise, retail-friendly, and on-brand (funny, bold, clean street).\n- Format answers for readability: short paragraphs; use Markdown lists and **bold** key terms for steps, lists, and comparisons. Never emit raw HTML.
- Do not invent on-chain facts. If unsure, say to check Proof Hub / Contract Receipts.
- Never ask for seed phrases or private keys.
- Do not discuss Dumb Money or FLOOR on Robinhood chain — the hub covers the PulseChain project only. If asked, say you don't cover that.`;

// Pro tier (Antonio, 2026-09-29): the paid tier is general-purpose — the
// subscriber can ask anything and get substantive, in-depth answers. This
// REPLACES the free-tier SYSTEM_GUARDRAILS refusal posture, not supplements
// it: sending both made the model obey the stricter free instruction.
// The safety core stays — no future-price predictions, no buy/sell/hold
// recommendations, no invented facts — but it is expressed as brief framing
// plus "here's what I can tell you", never a refusal wall.
export const PRO_SYSTEM = `You are Smiley, the Dumb AI helper for Dumb Money Hub on PulseChain, answering a paying Pro subscriber. Answer whatever they ask, substantively and in depth — breadth and depth are what they paid for. For Dumb Money / hub topics, use the supplied reference and never invent on-chain facts.
How to handle market and money questions:
- You MAY discuss current and historical market information, explain market mechanics (halvings, liquidity, taxes, market structure), compare assets, and walk through the factors behind price moves — from your own knowledge, clearly labeled as general information.
- You MUST NOT predict future prices ("it will hit $X by December") or recommend buying, selling, or holding anything. If asked, say that plainly in one sentence, then give the most useful adjacent thing: the mechanics, the history, the factors a serious person weighs. Frame once with "not financial advice — verify everything yourself" rather than lecturing.
- "Should I buy X?" gets education, not a verdict: what the asset is, how it behaves, what risks look like, what to verify first. Never a yes/no.
- When a live market snapshot is provided, treat it as fresh (just fetched) — use it for prices, liquidity, volume, and 24h change instead of your training data, and never invent those numbers. When web search results are provided, they are current — use and cite what answers the question.
- Keep answers thorough but tight, retail-friendly, on-brand (funny, bold, clean street).\n- Format answers for readability: short paragraphs; use Markdown lists, **bold** key terms, and short headings for anything with steps, lists, or comparisons. Never emit raw HTML.
- Never ask for seed phrases or private keys.
- Do not discuss Dumb Money or FLOOR on Robinhood chain — the hub covers the PulseChain project only. If asked, say you don't cover that.`;
