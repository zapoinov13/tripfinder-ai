import { createFileRoute, redirect } from "@tanstack/react-router";

import { routeTravelIntent } from "@/lib/scenario-router";

export const Route = createFileRoute("/ai-search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" && search["q"].length > 0 ? { q: search["q"] } : {},
  beforeLoad: ({ search }) => {
    const q = search.q?.trim();
    if (!q) throw redirect({ to: "/" });
    const next = routeTravelIntent(q);
    throw redirect({ to: next.to, search: next.search as never });
  },
  component: () => null,
});
