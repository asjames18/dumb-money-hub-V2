import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/dumb/PageShell";
import { Proof } from "@/components/dumb/Proof";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Proof — Dumb Money Hub";
const DESCRIPTION =
  "Live on-chain proof for Dumb Money: price checks, trade receipts, and verification. Don't trust the memes — verify.";

export const Route = createFileRoute("/proof")({
  head: () => pageMeta("/proof", TITLE, DESCRIPTION),
  component: ProofPage,
});

function ProofPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Proof />
      </main>
    </PageShell>
  );
}
