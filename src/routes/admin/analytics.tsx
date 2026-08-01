import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Voyago Admin" },
      { name: "description", content: "Аналитика платформы" },
      { property: "og:title", content: "Analytics — Voyago Admin" },
      { property: "og:description", content: "Аналитика платформы" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashPlaceholder
      items={adminNav}
      brand="Voyago Admin"
      title="Analytics"
      subtitle="Аналитика платформы"
      columns={["Metric", "Value", "Change", "Period"]}
    />
  );
}
