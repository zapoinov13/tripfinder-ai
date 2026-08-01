import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { operatorNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/operator/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика — Travel Company" },
      { name: "description", content: "Просмотры, конверсия и продажи" },
      { property: "og:title", content: "Аналитика — Travel Company" },
      { property: "og:description", content: "Просмотры, конверсия и продажи" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashPlaceholder
      items={operatorNav}
      brand="Travel Company"
      title="Аналитика"
      subtitle="Просмотры, конверсия и продажи"
      columns={["Метрика", "Значение", "Динамика", "Период"]}
    />
  );
}
