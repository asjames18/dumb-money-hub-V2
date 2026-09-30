import { createFileRoute } from "@tanstack/react-router";

import { AiPreview } from "@/components/dumb/AiPreview";
import { PageShell } from "@/components/dumb/PageShell";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Dumb AI — Dumb Money Hub";
const DESCRIPTION =
  "Ask Dumb AI about the 6% tax, the supply story, and the raids in plain language. Dumb name, sharp answers.";

export const Route = createFileRoute("/ai")({
  head: () => pageMeta("/ai", TITLE, DESCRIPTION),
  component: AiPage,
});

function AiPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <AiPreview />
      </main>
    </PageShell>
  );
}
