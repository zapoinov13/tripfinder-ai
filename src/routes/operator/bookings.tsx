import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { operatorNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/operator/bookings")({
  head: () => ({
    meta: [
      { title: "Бронирования — Travel Company" },
      { name: "description", content: "Заявки и подтверждённые брони" },
      { property: "og:title", content: "Бронирования — Travel Company" },
      { property: "og:description", content: "Заявки и подтверждённые брони" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashPlaceholder
      items={operatorNav}
      brand="Travel Company"
      title="Бронирования"
      subtitle="Заявки и подтверждённые брони"
      columns={["Бронь", "Тур", "Клиент", "Дата", "Статус"]}
    />
  );
}
