# DUMP Money Hub

Build a polished MVP for a web app called DUMP Money Hub.

Project context:
DUMP Money is a PulseChain meme/crypto ecosystem with two tokens:
- DUMP: 0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D
- DAMP / Dumb Amplifier: 0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3

Positioning:
- Main brand idea: The Home of Retail Crypto.
- Core story: Wall Street called everyday investors dumb money, so we built something they cannot control.
- Tagline ideas: The key is gone. The code is in charge. Meme first. Proof second. Community always.
- Tone: bold, funny, retail-first, clean street energy, crypto-native, proof-backed. No scammy promises, no guaranteed gains, no investment advice.

Build the app as the first useful version, not a marketing-only page. The first screen should immediately feel like a fun app/control room for the community.

Core features for MVP:
1. Hero / Control Room
- Name: DUMP Money Hub
- Subtitle: The Home of Retail Crypto
- Strong buttons: Generate Mission, View Contract Receipts, Join Community, Open Chart
- Show a playful Smiley/meme coin style visual using CSS or simple illustration.
- Include clear disclaimer: community tool, not financial advice.

2. DUMP Raid Arcade
An interactive mission generator with:
- Mission type selector: Raid Sprint, Meme Drop, Proof Post, Recruit Holder, Retail Lesson, Burn Hype, Smiley Reaction
- Vibe selector: Funny, Bold, Proof-first, Clean Street, Educational
- Generate button
- Output card with:
  - Mission title
  - Mission brief
  - Share-ready X post
  - Telegram hype line
  - Meme caption
  - Image prompt
  - CTA
- Copy buttons for each output.
- Local XP scoring: DUMP Points, rank, streak, missions completed. Use local state/localStorage if reasonable.

3. Contract Receipts / Proof Hub
Show both tokens as cards:
- DUMP contract address
- DAMP contract address
- Explorer/source links as placeholders where exact URLs can be edited later
- Explain what will be verified in future live version: owner status, source code, supply, burn wallet, LP status, holder count, recent burns.
- Do not claim unverified facts. Use labels like “Receipt link” and “Live verification coming next.”

4. Dump AI Assistant Preview
A chat-like section that feels like the future AI mascot. MVP can be scripted/static for now.
- Suggested questions:
  - What is DUMP?
  - What is DAMP?
  - How do I buy on PulseChain?
  - Explain burns and reflections.
  - Give me a meme post.
  - Give me a beginner retail crypto lesson.
- When clicked, show helpful canned answers. No real API needed yet.

5. Revival Roadmap
Compact roadmap cards:
- Week 1: Brand and receipts
- Week 2: Website MVP
- Week 3: Raid Arcade and content engine
- Week 4: Dump AI prototype
- 60 days: XP, leaderboard, meme contests
- 90 days: merch, sponsor spots, premium AI/content kits

6. Revenue Rails
Cards for monetization:
- Merch
- Premium AI tools
- Content kits for crypto projects
- Sponsor spots
- Education products
- Optional transparent burn events from business revenue
Use careful wording: do not promise price action.

Design direction:
- Fun, bold, modern app/dashboard.
- Dark charcoal background, bright green/yellow accents, white text, high contrast.
- Avoid generic purple SaaS gradient look.
- Use compact cards with 8px radius or less.
- Make it responsive/mobile-friendly.
- Use shadcn/ui and Tailwind if available.
- Prefer lucide icons.
- No giant boring landing page. Start with the usable mission generator/control room.

Technical:
- Build as a clean React/TypeScript app.
- Keep data arrays organized for mission templates, canned AI answers, roadmap, and revenue cards.
- No blockchain API integration yet; use placeholder proof cards and make it easy to wire live data later.
- Include copy-to-clipboard behavior with toast/visual feedback.
- Include localStorage persistence for XP/streak/missions completed if simple.

Goal:
Deliver a working DUMP Money Hub that Antonio can preview, share, and iterate on. It should make Dump Money feel like a culture app, not just another token website.

## Deployment

This project is standalone — it is not connected to the Lovable editor. Preview
deploys go to Cloudflare Workers (`dumb-money-hub-preview`).

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
