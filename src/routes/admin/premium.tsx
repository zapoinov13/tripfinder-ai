import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/premium")({
  head: () => ({
    meta: [
      { title: "Premium — Voyago Admin" },
      { name: "description", content: "Premium-подписчики" },
      { property: "og:title", content: "Premium — Voyago Admin" },
      { property: "og:description", content: "Premium-подписчики" },
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
      title="Premium"
      subtitle="Premium-подписчики"
      columns={["User", "Plan", "Started", "Amount", "Status"]}
    />
  );
}
