import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — Voyago Admin" },
      { name: "description", content: "Пользователи маркетплейса" },
      { property: "og:title", content: "Users — Voyago Admin" },
      { property: "og:description", content: "Пользователи маркетплейса" },
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
      title="Users"
      subtitle="Пользователи маркетплейса"
      columns={["User", "Email", "Premium", "Bookings", "Status"]}
    />
  );
}
