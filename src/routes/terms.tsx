import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "../components/dumb/PageShell";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl uppercase tracking-wide">
          Terms <span className="text-pink">of use</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plain language, last updated September 29, 2026. This is not legal advice — it&apos;s an
          honest description of how this hub works.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              What this is
            </h2>
            <p className="mt-2">
              The Dumb Money Hub is an educational interface for two immutable PulseChain tokens,
              DUMB and DAMP. Ownership of both tokens is renounced; the hub&apos;s maintainers did
              not deploy the tokens and cannot change them. Everything here is experimental,
              unaudited software interacting with unaudited, immutable contracts. You can lose
              everything you put in.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              Not financial advice
            </h2>
            <p className="mt-2">
              Nothing on this site — including the scanner, the AI helper, and any score or verdict
              — is financial advice, a recommendation to buy or sell, or a promise about price. The
              scanner can catch red flags but cannot prove a token is safe. Always verify on the
              block explorer yourself.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              Dumb AI Pro — 30-day pass
            </h2>
            <p className="mt-2">
              Pro is a 30-day access pass, not a subscription — it does not renew. It is unlocked by
              an on-chain payment (roughly $20 in accepted tokens, split between a DUMB burn and
              model funding) verified on PulseChain. The pass is tied to the wallet that made the
              payment and lasts 30 days from activation. Usage caps apply: 100 questions per day and
              1,000 per month per wallet.
            </p>
            <p className="mt-2">
              On-chain payments are irreversible. There are no refunds — the burn leg destroys
              tokens permanently by design. If the payment verifies on-chain, the pass activates; if
              it doesn&apos;t verify, no pass is granted and nothing is owed.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              Burns are permanent
            </h2>
            <p className="mt-2">
              Sending tokens to the dead address cannot be undone by anyone — not you, not the hub
              maintainers, not the token deployer (there isn&apos;t one anymore). The site warns
              before every burn and never moves your funds; your wallet signs everything.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase tracking-wide text-foreground">
              Your responsibilities
            </h2>
            <p className="mt-2">
              You are responsible for your own wallet, your own seed phrase (never share it with
              anyone, including us — we will never ask), and your own decisions. Don&apos;t use the
              hub for anything illegal. We may change or remove features at any time.
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
              — the inbox is anonymous and read by the build crew.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
