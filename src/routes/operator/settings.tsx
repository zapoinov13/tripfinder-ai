import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { operatorNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/operator/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — Travel Company" },
      { name: "description", content: "Настройки кабинета оператора" },
      { property: "og:title", content: "Настройки — Travel Company" },
      { property: "og:description", content: "Настройки кабинета оператора" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashPlaceholder
      items={operatorNav}
      brand="Travel Company"
      title="Настройки"
      subtitle="Настройки кабинета оператора"
      columns={["Раздел", "Значение", "Обновлено"]}
    />
  );
}
