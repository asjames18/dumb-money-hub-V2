import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Flame } from "lucide-react";

import { PageShell } from "@/components/dumb/PageShell";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { SITE_URL } from "@/lib/page-meta";
import { explorerTx } from "@/lib/pulsechain";

const TX_RE = /^0x[0-9a-fA-F]{64}$/;

// A per-burn share page. The whole point of this route is its <head>: when a
// burn link is shared to X/Telegram/Discord, the crawlers read og:image and
// unfurl the burner's generated brag card instead of the explorer's branding.
// The image is rendered server-side from the verified tx — only real,
// on-chain voluntary burns get a card; anything else 404s.
export const Route = createFileRoute("/brag")({
  validateSearch: (search: Record<string, unknown>) => ({
    tx: typeof search["tx"] === "string" ? (search["tx"] as string) : "",
  }),
  head: ({ match }) => {
    const tx = match.search["tx"] ?? "";
    const valid = TX_RE.test(tx);
    const image = valid
      ? `${SITE_URL}/api/brag-image?tx=${tx.toLowerCase()}`
      : `${SITE_URL}/og-card.png`;
    const title = "A DUMB Money burn, verified on-chain 🔥";
    const description =
      "Someone voluntarily burned DUMB or DAMP to the dead address on PulseChain. Burns shrink supply — they never promise price.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE_URL}/brag?tx=${encodeURIComponent(tx)}` },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1080" },
        { property: "og:image:height", content: "1080" },
        { property: "og:image:alt", content: "Burn brag card — verified on-chain" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/brag?tx=${encodeURIComponent(tx)}` }],
    };
  },
  component: BragPage,
});

function BragPage() {
  const { tx } = Route.useSearch();
  const valid = TX_RE.test(tx);
  // A well-formed hash that ISN'T a verified burn makes /api/brag-image 404.
  // Without this, the page would assert "Someone burned" under a broken
  // image — an unverified claim on our own domain. The explorer link stays as
  // the manual-verification escape hatch.
  const [imgFailed, setImgFailed] = useState(false);
  const img = `/api/brag-image?tx=${tx.toLowerCase()}`;
  const verifiedView = valid && !imgFailed;

  return (
    <PageShell>
      <main className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-16">
        <Disclaimer className="mb-6 text-left" />
        {verifiedView && (
          <p className="flex items-center justify-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-pink">
            <Flame className="size-4" /> Verified burn
          </p>
        )}
        <h1 className="mt-2 font-display text-3xl uppercase leading-none sm:text-5xl">
          {verifiedView ? (
            <>
              Someone burned. <span className="text-pink">Supply shrank.</span>
            </>
          ) : (
            <>Couldn&apos;t verify that burn.</>
          )}
        </h1>
        {valid ? (
          imgFailed ? (
            <p className="mx-auto mt-8 max-w-md text-muted-foreground">
              That transaction isn&apos;t a verified DUMB/DAMP voluntary burn — brag cards only
              render for those.{" "}
              <a
                href={explorerTx(tx)}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-pink underline-offset-2 hover:text-pink"
              >
                Check it on the explorer
              </a>{" "}
              to see what it actually did.
            </p>
          ) : (
            <>
              <img
                src={img}
                alt="Burn brag card — verified on-chain"
                className="mx-auto mt-8 w-full max-w-md rounded-xl border border-border"
                onError={() => setImgFailed(true)}
              />
              <p className="mt-6">
                <a
                  href={explorerTx(tx)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 underline decoration-pink underline-offset-2 hover:text-pink"
                >
                  Verify the burn on the explorer <ExternalLink className="size-3.5" />
                </a>
              </p>
            </>
          )
        ) : (
          <p className="mt-8 text-muted-foreground">
            That link doesn't carry a valid burn transaction.
          </p>
        )}
        <p className="mt-8 text-sm text-muted-foreground">
          Burns shrink supply — they never promise price.
        </p>
        <p className="mt-4">
          <Link
            to="/burn"
            className="inline-block rounded-md bg-primary px-5 py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            Burn your own
          </Link>
        </p>
      </main>
    </PageShell>
  );
}
