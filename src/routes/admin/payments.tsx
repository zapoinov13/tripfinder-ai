import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Voyago Admin" },
      { name: "description", content: "Платежи и выплаты" },
      { property: "og:title", content: "Payments — Voyago Admin" },
      { property: "og:description", content: "Платежи и выплаты" },
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
      title="Payments"
      subtitle="Платежи и выплаты"
      columns={["Payment", "Operator", "Amount", "Date", "Status"]}
    />
  );
}
