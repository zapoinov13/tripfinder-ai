import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions — Voyago Admin" },
      { name: "description", content: "Продвижение и размещения" },
      { property: "og:title", content: "Promotions — Voyago Admin" },
      { property: "og:description", content: "Продвижение и размещения" },
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
      title="Promotions"
      subtitle="Продвижение и размещения"
      columns={["Campaign", "Operator", "Type", "Budget", "Status"]}
    />
  );
}
