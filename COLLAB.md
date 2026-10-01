# COLLAB.md — read this if you're an agent working on this repo

Hey — I'm Mosheh, the agent working this project from Antonio's main setup. Since we're both touching the same codebase, here's how we avoid stepping on each other.

**What this is:** The DUMB/DAMP hub on PulseChain — live at dumbmoneypulse.melanatedintech.com. Repo: `asjames18/dumb-money-hub-V2`, local checkout `dump-money-hub`. Heads up on spelling: there's also a *different* project called `dumb-money-hub` (Robinhood chain). Separate product — never mix the two repos, and never put Robinhood or FLOOR references anywhere on the PulseChain site.

**How we coordinate:**
- The checkout on my side is the deploy source. GitHub is our meeting point. Rule of thumb: push before the other side deploys, and pull before you build on top of either branch. A deploy from a stale tree silently reverts the other person's fixes.
- I'm syncing through the GitHub API right now — my checkout has no `git remote` configured. If you sync from your side, be careful: the sync tool sends a full tree, and files that exist on the remote but not locally get **deleted**. Always diff the trees first (I did, and reconciled Antonio's pushed fixes against ours at ~13:41 today — both sides' work is in).
- Never rewrite history, never commit secrets.

**Files that are mine (the build loop):** `BUILD_LOOP.md` and `BULLISH-RESEARCH.md`. A loop on my side appends to these and commits every ~10 minutes, so please don't hand-edit them — that's where conflicts breed. Everything else: shared, with the push/pull habit above.

**Production traps:**
- The Cloudflare Worker is named `dump-money-hub-preview`, but the public domain points straight at it. There is no staging — every deploy is a live production deploy. Deploys go through `~/workspace/skills/cloudflare/bin/deploy-wrangler.py`, never raw `wrangler deploy`.
- Before any deploy: `npx tsc --noEmit`, eslint, `npm run build`, then verify the live routes after.

**Locked facts — don't "improve" these:**
- Taxes: DUMB 6% on buy/sell/transfer (5% instant burn, 1% reflections); DAMP 3% (2% instant burn, 1% reflections).
- Supply headline: 69.1% of DUMB and 41.4% of DAMP are "gone for good" (burned to the dead address + locked inside the token contract) — verified on-chain 2026-10-01. The site leads with that total.
- Never invent users, burns, reviews, transactions, or analytics. Leaderboards and stats show only real on-chain or genuinely opted-in data.

**Hard lines (Antonio's approval required):** spending money, new smart contracts, new external data sources/APIs, anything involving signing/keys/custody, posting anything publicly as Antonio, publishing new Smiley mascot art (only Antonio-approved art goes live). Security holes get fixed immediately, no queuing.

**What I do over here:** run the build loop (small, user-visible fixes and improvements, one unit at a time), deploy + verify, keep `/plan`/roadmap copy honest, and sync GitHub when Antonio asks or when the loop has piled up commits. Antonio is the coordinator — if any of this conflicts with what he's told you, his word wins, and when in doubt, ask him before touching the tree.

Good to be working with you — let's keep this thing moving.

— Mosheh
