import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ScanSearch, ShieldAlert, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type ScamPattern = {
  id: string;
  title: string;
  why: string;
  res: RegExp[];
};

// Curated starter set of known scam-DM scripts. These are pattern matches,
// not verdicts — a message can be a scam without matching anything here, and
// a legit warning can trip a pattern. The copy says so everywhere it matters.
const PATTERNS: ScamPattern[] = [
  {
    id: "double",
    title: "\u201CSend X, get 2X back\u201D",
    why: "Nobody doubles your money. The send is the entire trick \u2014 your crypto goes in and nothing comes back.",
    res: [
      /doubl(e|ing) your/i,
      /send\s+[\d.,]*\s*\w*\s*(to|and)\s+(get|receive|we'?ll send)/i,
      /\b2x\b.{0,20}(back|return|profit)/i,
      /multiply your/i,
    ],
  },
  {
    id: "urgency",
    title: "Countdown pressure",
    why: "Rushing you is the point \u2014 scams need you to act before you think. Real support never puts a timer on you.",
    res: [
      /act\s+(now|fast|immediately)/i,
      /limited time/i,
      /expir(es|ing|ed|y)\s+(in|within|soon)/i,
      /last chance/i,
      /within\s+\d+\s+hours?/i,
      /\burgent\b/i,
      /right now or/i,
    ],
  },
  {
    id: "support",
    title: "\u201CI'm from support\u201D",
    why: "Real support doesn't slide into your DMs. \u201CAdmin\u201D and \u201Csupport team\u201D are free to type \u2014 check the actual account, not the words.",
    res: [
      /support\s+(team|agent|desk)/i,
      /official support/i,
      /customer\s+(service|support)/i,
      /\badmin\b/i,
      /\bdm me\b/i,
      /message me (directly|privately)/i,
    ],
  },
  {
    id: "airdrop",
    title: "\u201CClaim your free tokens\u201D",
    why: "Real airdrops don't arrive by DM with a link attached. The \u201Cclaim\u201D page is usually where the wallet gets drained.",
    res: [
      /\bairdrop\b/i,
      /claim\s+(your|the|this|now)/i,
      /you'?ve?\s+been\s+selected/i,
      /you'?re?\s+eligible/i,
      /free\s+(tokens|coins|dumb|pls)/i,
    ],
  },
  {
    id: "keys",
    title: "Asking for your keys",
    why: "Nobody legitimate ever needs your seed phrase or private key. Anyone who asks is stealing \u2014 full stop.",
    res: [
      /seed\s+phrase/i,
      /private\s+key/i,
      /secret\s+(phrase|key|recovery)/i,
      /enter\s+your.{0,30}(seed|key|phrase)/i,
      /verify\s+your\s+wallet/i,
      /connect\s+your\s+wallet/i,
      /sync.{0,25}wallet/i,
    ],
  },
  {
    id: "fee",
    title: "\u201CPay a small fee first\u201D",
    why: "The fee is the scam. You pay to \u201Cunlock\u201D money that doesn't exist, and then it's gone.",
    res: [
      /(gas|activation|unlock|verification|processing|withdrawal)\s+fee/i,
      /pay.{0,30}fee.{0,30}(unlock|release|activate|verify|withdraw)/i,
      /small\s+(fee|deposit|payment)/i,
      /send\s+[\d.]+\s+\w+\s+to\s+activate/i,
    ],
  },
  {
    id: "guarantee",
    title: "\u201CGuaranteed\u201D anything",
    why: "Crypto has no guarantees. \u201CGuaranteed\u201D and \u201Crisk-free\u201D are confessions, not promises.",
    res: [
      /guarantee(d|s)?/i,
      /risk-?free/i,
      /can'?t\s+lose/i,
      /100%\s+(profit|safe|guaranteed)/i,
      /\bno\s+risk\b/i,
    ],
  },
  {
    id: "offplatform",
    title: "Dragging you off-channel",
    why: "Moving you to Telegram or WhatsApp is about losing witnesses. Real help happens where everyone can see it.",
    res: [/\btelegram\b/i, /\bwhatsapp\b/i, /\bdiscord\b/i, /message\s+me\s+on/i],
  },
  {
    id: "giveaway",
    title: "\u201CGiveaway\u201D",
    why: "Nobody famous is doubling crypto in your DMs. Giveaways that ask you to send first are the double-up trick in a costume.",
    res: [/\bgiveaway\b/i],
  },
  {
    id: "official",
    title: "\u201COfficial\u201D / \u201Cverified\u201D",
    why: "\u201COfficial\u201D costs nothing to claim. Trust an account's history \u2014 age, followers, past posts \u2014 never its adjectives.",
    res: [/\bofficial\b/i, /\bverified\b/i, /team\s+member/i],
  },
];

const ADDRESS_RE = /0x[a-fA-F0-9]{40}\b/g;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const SHORTENER_RE = /bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd/i;

type DecodeResult = {
  flags: ScamPattern[];
  addresses: string[];
  urls: string[];
};

function decode(text: string): DecodeResult {
  const flags = PATTERNS.filter((p) => p.res.some((r) => r.test(text)));
  const addresses = [...new Set(text.match(ADDRESS_RE) ?? [])];
  const urls = [...new Set(text.match(URL_RE) ?? [])];
  return { flags, addresses, urls };
}

const short = (addr: string) => `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;

// A realistic composite scam DM so first-time users see what the tool does.
// Clearly labeled as an example; fill-then-decode only.
const DEMO_DM =
  "Hi! This is the PulseChain Support Team. Your wallet was selected for the DUMB airdrop \u2014 claim your free tokens now, the offer expires in 24 hours! Connect your wallet at https://dumb-airdrop-claim.net to verify. Our admin will DM you on Telegram to help. Just send 0.5 PLS as a gas fee to activate. 100% guaranteed, official!";

export function ScamDmDecoder() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const result = useMemo(() => (submitted ? decode(submitted) : null), [submitted]);

  const run = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setSubmitted(trimmed);
  };

  return (
    <div id="dm-decoder">
      <h2 className="font-display text-2xl uppercase tracking-wide">Decode a scam DM</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Paste the suspicious message. I&apos;ll point at the parts that smell \u2014 in plain
        English.
      </p>

      <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-400/10 p-4">
        <p className="flex items-start gap-2 text-sm leading-relaxed">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <span>
            <strong>How this works:</strong> I match your message against scam scripts I&apos;ve
            actually seen. I can&apos;t catch scripts I haven&apos;t seen, and I can{" "}
            <strong>never tell you a message is safe</strong>. Some of these phrases also show up in
            legit warnings \u2014 read each flag, don&apos;t just count them.
          </span>
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="dm-input" className="sr-only">
          Paste the suspicious DM
        </label>
        <textarea
          id="dm-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"Paste the suspicious DM here\u2026"}
          rows={6}
          className="w-full rounded-xl border border-border bg-background p-4 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={() => run(input)} disabled={!input.trim()}>
            <ShieldAlert className="size-4" aria-hidden />
            Decode it
          </Button>
          <button
            type="button"
            onClick={() => {
              setInput(DEMO_DM);
              run(DEMO_DM);
            }}
            className="text-sm font-bold text-primary underline decoration-dotted underline-offset-2"
          >
            Try an example DM
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6">
          {result.flags.length > 0 ? (
            <>
              <p className="font-display text-sm uppercase tracking-[0.2em] text-amber-500">
                {result.flags.length} red flag{result.flags.length === 1 ? "" : "s"} found
              </p>
              <ul className="mt-3 space-y-3">
                {result.flags.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-xl border border-amber-400/50 bg-amber-400/10 p-4"
                  >
                    <p className="flex items-start gap-2 font-bold">
                      <TriangleAlert
                        className="mt-0.5 size-4 shrink-0 text-amber-500"
                        aria-hidden
                      />
                      {f.title}
                    </p>
                    <p className="mt-1 pl-6 text-sm leading-relaxed text-muted-foreground">
                      {f.why}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-bold">None of my patterns matched this message.</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                That doesn&apos;t mean it&apos;s safe \u2014 it means the script is new, or subtler
                than the ones I know. The rules that never change: nobody legit DMs you first about
                money, nobody needs your seed phrase, and \u201Cguaranteed\u201D means walk away.
              </p>
            </div>
          )}

          {result.addresses.length > 0 && (
            <div className="mt-6">
              <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Addresses found in this message
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                I don&apos;t know what these are \u2014 run each one through the free quick scan
                before you touch it.
              </p>
              <ul className="mt-3 space-y-2">
                {result.addresses.map((a) => (
                  <li
                    key={a}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5"
                  >
                    <code className="text-sm">{short(a)}</code>
                    <Link
                      to="/scan"
                      search={{ token: a, burn: undefined, tx: undefined }}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline decoration-dotted underline-offset-2"
                    >
                      <ScanSearch className="size-4" aria-hidden />
                      Quick-scan this address
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.urls.length > 0 && (
            <div className="mt-6">
              <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Links found \u2014 shown as text on purpose
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                I&apos;m not making these clickable. Scam links look almost right \u2014 read the
                domain character by character, don&apos;t trust the words around it.
              </p>
              <ul className="mt-3 space-y-2">
                {result.urls.map((u) => (
                  <li key={u} className="rounded-lg border border-border bg-card px-4 py-2.5">
                    <code className="break-all text-sm">{u}</code>
                    {SHORTENER_RE.test(u) && (
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-500">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        Shortened link \u2014 you can&apos;t see where it goes. Don&apos;t tap it.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Pattern-matching only catches scripts that already exist. A brand-new scam won&apos;t
            match anything here \u2014 that&apos;s not a clean bill of health. When in doubt:
            don&apos;t click, don&apos;t send, ask in a public channel first.
          </p>
        </div>
      )}
    </div>
  );
}
