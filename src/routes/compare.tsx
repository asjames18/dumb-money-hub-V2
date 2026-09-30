import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/compare")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 308 });
  },
});
