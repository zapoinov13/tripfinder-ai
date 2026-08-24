import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hot")({
  beforeLoad: () => {
    throw redirect({ to: "/search", search: { offers: "hot" } as never });
  },
  component: () => null,
});
