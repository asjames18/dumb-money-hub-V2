import { createFileRoute } from "@tanstack/react-router";

import { Culture } from "@/components/dumb/Culture";
import { PageShell } from "@/components/dumb/PageShell";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Culture — Dumb Money Hub";
const DESCRIPTION =
  "Smiley, the Dumb Money mascot, the brand system, and the share-card studio. Meme first — on-brand.";

export const Route = createFileRoute("/culture")({
  head: () => pageMeta("/culture", TITLE, DESCRIPTION),
  component: CulturePage,
});

function CulturePage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Culture />
      </main>
    </PageShell>
  );
}
