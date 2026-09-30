import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/dumb/PageShell";
import { Roots } from "@/components/dumb/Roots";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Roots — Dumb Money Hub";
const DESCRIPTION =
  "Where Dumb Money comes from: the live DUMB and DAMP tokens on PulseChain — every liquidity pool, the transfer taxes, the dead auto-processing engine, and what's burned forever. Brutally honest numbers.";

export const Route = createFileRoute("/roots")({
  head: () => pageMeta("/roots", TITLE, DESCRIPTION),
  component: RootsPage,
});

function RootsPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Roots />
      </main>
    </PageShell>
  );
}
