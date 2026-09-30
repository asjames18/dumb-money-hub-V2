import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/dumb/PageShell";
import { Raid } from "@/components/dumb/Raid";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Raid HQ — Dumb Money Hub";
const DESCRIPTION = "Dumb Money raid missions and the arcade. Earn XP and raid together.";

export const Route = createFileRoute("/raid")({
  head: () => pageMeta("/raid", TITLE, DESCRIPTION),
  component: RaidPage,
});

function RaidPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Raid />
      </main>
    </PageShell>
  );
}
