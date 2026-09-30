import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "../components/dumb/PageShell";
import { pageMeta } from "../lib/page-meta";

const TITLE = "Privacy — Dumb Money Hub";
const DESCRIPTION =
  "What the Dumb Money Hub does and does not collect: anonymous visit counts only — no cookies, no tracking, no wallet data.";

export const Route = createFileRoute("/privacy")({
  head: () => pageMeta("/privacy", TITLE, DESCRIPTION),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl uppercase tracking-wide">
          Privacy <span className="text-pink">policy</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plain language, last updated September 29, 2026.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              The short version
            </h2>
            <p className="mt-2">
              We count anonymous visits so we know which pages get used. That&apos;s it. No cookies,
              no cross-site tracking, no ad pixels, no selling data — there&apos;s nothing to sell.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              What we collect
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Anonymous page-view and feature-use counts (which page, which country) — stored as
                aggregate counters, not per-visitor records.
              </li>
              <li>
                Feedback you choose to send through the feedback form — message, category, and page,
                with no name, email, or wallet attached.
              </li>
              <li>
                Community reviews you choose to publish on the culture page — the name and words you
                write yourself.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              What we don&apos;t collect
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                No wallet addresses tied to your visits — connecting a wallet only talks to the
                blockchain through your own provider.
              </li>
              <li>
                No seed phrases or private keys — we never ask, and you should never share them with
                anyone.
              </li>
              <li>No account, no email, no name — there is nothing to sign up for.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              What stays on your device
            </h2>
            <p className="mt-2">
              Your scan watchlist, raid XP, leaderboard display name, and AI chat history live in
              your browser&apos;s local storage on your device only. Clearing your browser data
              removes them. We never see them.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              Pro payments
            </h2>
            <p className="mt-2">
              Dumb AI Pro activation is verified against public on-chain records — the payment
              transaction and the wallet that sent it are visible to everyone on PulseChain by the
              nature of blockchains. The hub records the wallet address, the transaction hashes, and
              the pass expiry so it can enforce the 30-day term. See the{" "}
              <Link to="/terms" className="underline underline-offset-2 hover:text-primary">
                terms
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              Questions
            </h2>
            <p className="mt-2">
              <Link to="/feedback" className="underline underline-offset-2 hover:text-primary">
                Send feedback
              </Link>{" "}
              — anonymous, read by the build crew.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
