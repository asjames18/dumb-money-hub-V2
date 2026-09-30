import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/dumb/PageShell";
import { Plan } from "@/components/dumb/Plan";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Roadmap — Dumb Money Hub";
const DESCRIPTION =
  "The Dumb Money roadmap on PulseChain: the live-token analytics home, the raid as community engine, and what has to happen first.";

export const Route = createFileRoute("/plan")({
  head: () => pageMeta("/plan", TITLE, DESCRIPTION),
  component: PlanPage,
});

function PlanPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Plan />
      </main>
    </PageShell>
  );
}
