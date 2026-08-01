import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/operators")({
  head: () => ({
    meta: [
      { title: "Operators — Voyago Admin" },
      { name: "description", content: "Туроператоры платформы" },
      { property: "og:title", content: "Operators — Voyago Admin" },
      { property: "og:description", content: "Туроператоры платформы" },
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
      title="Operators"
      subtitle="Туроператоры платформы"
      columns={["Operator", "Tours", "Rating", "GMV", "Status"]}
    />
  );
}
