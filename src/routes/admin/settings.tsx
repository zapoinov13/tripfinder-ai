import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Voyago Admin" },
      { name: "description", content: "Настройки платформы" },
      { property: "og:title", content: "Settings — Voyago Admin" },
      { property: "og:description", content: "Настройки платформы" },
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
      title="Settings"
      subtitle="Настройки платформы"
      columns={["Section", "Value", "Updated"]}
    />
  );
}
