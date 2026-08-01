import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { adminNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — Voyago Admin" },
      { name: "description", content: "Бронирования платформы" },
      { property: "og:title", content: "Bookings — Voyago Admin" },
      { property: "og:description", content: "Бронирования платформы" },
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
      title="Bookings"
      subtitle="Бронирования платформы"
      columns={["Booking", "Tour", "User", "Amount", "Status"]}
    />
  );
}
