import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/join")({
  beforeLoad: () => {
    throw redirect({ to: "/raid", statusCode: 308 });
  },
});
