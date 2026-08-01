import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/tours")({
  head: () => ({
    meta: [
      { title: "Tours — Voyago Admin" },
      { name: "description", content: "Все туры платформы" },
      { property: "og:title", content: "Tours — Voyago Admin" },
      { property: "og:description", content: "Все туры платформы" },
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
      title="Tours"
      subtitle="Все туры платформы"
      columns={["Tour", "Operator", "Price", "Views", "Status"]}
    />
  );
}
