import { createFileRoute } from "@tanstack/react-router";

import { Genesis } from "@/components/dumb/Genesis";
import { PageShell } from "@/components/dumb/PageShell";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Supply story — Dumb Money Hub";
const DESCRIPTION =
  "The supply story of the live DUMB token on PulseChain: 28B fixed supply, ~56.6% historically burned, ~12.5% entombed in the contract — 69% immobilized. Immutable and renounced.";

export const Route = createFileRoute("/genesis")({
  head: () => pageMeta("/genesis", TITLE, DESCRIPTION),
  component: GenesisPage,
});

function GenesisPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Genesis />
      </main>
    </PageShell>
  );
}
