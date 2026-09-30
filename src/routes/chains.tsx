import { createFileRoute, redirect } from "@tanstack/react-router";

// Hidden for now (Antonio, 2026-09-29) — redirect to the homepage instead of deleting,
// so the route stays registered and old links land somewhere sensible.
export const Route = createFileRoute("/chains")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 308 });
  },
});
