// Plain-English safety glossary for the /glossary page.
// Every definition is mechanics-only: what the thing IS, not what to buy.
// No advice, no price talk, no invented facts. Terms mirror the vocabulary
// the token safety scanner (/scan) reports use, so a newcomer who hits an
// unfamiliar word mid-report can resolve it here.

export interface GlossaryTerm {
  id: string; // anchor slug
  term: string;
  plain: string; // the definition
  why: string; // why it matters, mechanics only
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "honeypot",
    term: "Honeypot",
    plain:
      "A token that lets you buy but blocks you from selling — the sell transaction reverts, or the sell tax is set to 100%. Your money goes in and never comes out.",
    why: "The scanner catches these with a simulated sell: it pretends to sell and measures what would come back, before you risk real money.",
  },
  {
    id: "transfer-tax",
    term: "Transfer tax",
    plain:
      "A fee taken on every move of a token — buys, sells, and wallet-to-wallet transfers. DUMB takes 6% on every transfer (5% instantly burned, 1% reflected to holders). DAMP takes 3% (2% burned, 1% reflected). The tax is inside the token contract and can't be turned off.",
    why: "Taxes shrink what you receive and what you send. The hub's swap box shows after-tax amounts so the quote matches reality.",
  },
  {
    id: "claimed-vs-measured-tax",
    term: "Claimed vs measured tax",
    plain:
      "What a token's website claims the tax is versus what the contract actually takes. The scanner measures the real tax by simulating transfers on-chain — no trust required in the marketing.",
    why: "Mismatch between claimed and measured tax is one of the loudest warning signs a scan can find.",
  },
  {
    id: "contract-owner",
    term: "Contract owner",
    plain:
      "An address the token contract grants special powers to — often the ability to change the tax, mint new tokens, pause trading, or blacklist wallets. On DUMB and DAMP the owner is the zero address, meaning nobody holds these powers.",
    why: "A live owner with fee-setting or mint powers can change the deal after you buy. The scanner lists exactly which powers exist.",
  },
  {
    id: "renounced-ownership",
    term: "Renounced ownership",
    plain:
      "The owner address has been set to an address nobody controls (usually 0x0), so the owner powers can never be used again. DUMB and DAMP are both renounced — the 6% and 3% taxes and fee splits are fixed forever.",
    why: "Renouncing removes the 'dev changes the rules mid-game' risk. It does not remove risks baked into the code itself, like an already-100% sell tax.",
  },
  {
    id: "mint-function",
    term: "Mint function",
    plain:
      "Code in the contract that creates new tokens out of nothing and sends them somewhere. DUMB and DAMP have a fixed supply (28B and 1B) and no mint function — the supply can only shrink.",
    why: "A live mint function means the 'total supply' you see today can grow tomorrow, diluting every holder. The scanner flags whether one exists and who can call it.",
  },
  {
    id: "blacklist",
    term: "Blacklist",
    plain:
      "An owner power that blocks specific addresses from buying, selling, or transferring. Sometimes used against bots; sometimes used to trap sellers while insiders exit.",
    why: "If the blacklist power is live, your address can be added to it after you buy. The scanner checks whether the power exists.",
  },
  {
    id: "pause",
    term: "Pause",
    plain:
      "An owner power that freezes all trading — nobody can buy or sell until the owner unpauses. Legitimate projects use it during emergencies; malicious ones use it to trap holders.",
    why: "A live pause switch means trading only works while the owner allows it. The scanner checks whether the power exists.",
  },
  {
    id: "trading-toggle",
    term: "Trading toggle",
    plain:
      "An owner switch that turns buying and selling on or off separately. A common rug pattern: launch with sells disabled, hype the chart, enable sells only for insiders.",
    why: "If trading can be toggled, the market you see today can be switched off tomorrow. The scanner checks whether the switch exists and its current state.",
  },
  {
    id: "sell-limit",
    term: "Sell limit",
    plain:
      "A cap on how much can be sold in one transaction, settable by the owner. Anti-whale limits look like protection, but a tiny sell limit applied only to outsiders is a soft honeypot.",
    why: "The scanner measures the real limit by simulating sells of increasing size, instead of trusting the documented number.",
  },
  {
    id: "upgradeable-proxy",
    term: "Upgradeable proxy",
    plain:
      "A contract whose logic can be swapped out later by whoever holds the upgrade key — the code you read today may not be the code running tomorrow. Some proxies renounce the upgrade key; many don't.",
    why: "On an upgradeable token, even 'renounced' claims deserve a second look: the upgrade path can reintroduce owner powers. The scanner flags proxy patterns.",
  },
  {
    id: "liquidity-pool",
    term: "Liquidity pool",
    plain:
      "A pot holding two tokens (for example WPLS and DUMB on PulseX) that a decentralized exchange swaps against. You trade with the pot, not with another person — the ratio in the pot sets the price.",
    why: "Small pools mean your trade moves the price a lot (see price impact). The scanner checks the pool actually exists and has real reserves.",
  },
  {
    id: "lp-tokens",
    term: "LP tokens",
    plain:
      "Receipt tokens you get when you deposit two tokens into a liquidity pool. Whoever holds the LP tokens can withdraw the pool's tokens at any time — including the project's team, if they kept them.",
    why: "LP tokens in the team's wallet are an unlocked exit: they can pull the whole pool whenever they want.",
  },
  {
    id: "locked-liquidity",
    term: "Locked liquidity",
    plain:
      "The LP tokens are held in a time-locked contract that won't release them until a set date. Until then, nobody can pull the pool — not even the team.",
    why: "A lock with a real future date and a real locker contract is one of the strongest anti-rug signals. The scanner checks the lock's terms.",
  },
  {
    id: "burned-liquidity",
    term: "Burned liquidity",
    plain:
      "The LP tokens were sent to the dead address, so the pool can never be withdrawn by anyone — it's locked forever, with no timer to wait out.",
    why: "Burned LP is the strongest form of liquidity commitment: the exit door doesn't just have a lock, it's bricked shut.",
  },
  {
    id: "slippage",
    term: "Slippage",
    plain:
      "The gap between the price you were quoted and the price your trade actually executes at, caused by the price moving (or the pool shifting) between quote and confirmation. You set a tolerance; if the move exceeds it, the trade fails instead of executing badly. The hub's swap box defaults to 8%.",
    why: "On volatile or taxed tokens, too-tight slippage means failed trades; too-loose means you accept a bad price. The default exists to protect you.",
  },
  {
    id: "price-impact",
    term: "Price impact",
    plain:
      "How much your own trade moves the market price, shown as a percentage. A $50 trade in a deep pool barely registers; the same trade in a tiny pool can move the price 20% against you. The hub's swap box warns at 5% and blocks trades above 25%.",
    why: "High impact means you're paying yourself a bad price. The block exists so nobody clicks through a trade that eats their own money.",
  },
  {
    id: "token-approval",
    term: "Token approval",
    plain:
      "Permission you grant a contract (like a DEX router) to move a specific amount of your tokens. Swaps need it; the hub's swap box approves the exact trade amount, nothing more.",
    why: "Approvals are the #1 wallet-drain vector in crypto — a malicious or buggy contract with your approval can take your tokens. The /wallet page shows your open approvals so you can revoke them.",
  },
  {
    id: "unlimited-approval",
    term: "Unlimited approval",
    plain:
      "An approval for the maximum possible amount — effectively your whole balance, now and forever, until revoked. Many dApps request these for convenience. The hub never does.",
    why: "An unlimited approval to a contract that later turns malicious is a blank check. Revoke ones you don't need on the /wallet approvals dashboard.",
  },
  {
    id: "reflections",
    term: "Reflections",
    plain:
      "A slice of every taxed transfer automatically shared among all holders. DUMB reflects 1% of every transfer; DAMP reflects 1%. No staking, no claiming — your balance just grows slightly with every trade anyone makes.",
    why: "Reflections are why DUMB has no staking contract: holding IS the yield mechanism, and it costs you nothing extra.",
  },
  {
    id: "dead-address",
    term: "Dead address",
    plain:
      "0x000000000000000000000000000000000000dEaD — an address nobody has the keys to. Tokens sent there are gone forever. About 56.6% of all DUMB sits at the dead address.",
    why: "Burning = sending to the dead address. It's an ordinary transfer, needs no special contract, and can't be undone — the hub makes you confirm twice before you sign.",
  },
  {
    id: "burn",
    term: "Burn",
    plain:
      "Permanently removing tokens from circulation by sending them to the dead address. Burns shrink supply. They never promise price — price needs real demand on top of shrinking supply.",
    why: "The hub tracks every voluntary burn on /burn with on-chain receipts. If anyone tells you a burn guarantees gains, they're selling you something.",
  },
  {
    id: "verified-contract",
    term: "Verified contract",
    plain:
      "A contract whose source code is published on the block explorer, so anyone can read exactly what it does. Unverified contracts are black boxes — you have to trust the deployer blind.",
    why: "Never trust, always verify starts with the code being readable at all. The scanner works best on verified contracts.",
  },
  {
    id: "dex-router",
    term: "DEX router",
    plain:
      "The contract that actually executes your swap on a decentralized exchange — it routes your tokens through the pools and enforces your slippage and deadline. The hub pins the real PulseX V2 router address and never swaps through anything else.",
    why: "Fake routers are a classic phishing trick: the swap looks normal but your tokens go to the attacker. The hub shows the pinned router address with an explorer link on every trade.",
  },
  {
    id: "simulated-sell",
    term: "Simulated sell",
    plain:
      "The scanner's core probe: it runs a pretend sell of the token against the real pool state and measures what would come back — real tax, real slippage, real blockers. No tokens move; it's a dry run on live chain data.",
    why: "A simulation that returns nothing (or nearly nothing) is how a honeypot gets caught before it catches you.",
  },
];
