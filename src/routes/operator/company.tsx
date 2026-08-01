import { createFileRoute } from "@tanstack/react-router";

import { DashPlaceholder } from "@/components/dash/dash-placeholder";
import { operatorNav } from "@/components/dash/nav-items";

export const Route = createFileRoute("/operator/company")({
  head: () => ({
    meta: [
      { title: "Компания — Travel Company" },
      { name: "description", content: "Данные вашей туристической компании" },
      { property: "og:title", content: "Компания — Travel Company" },
      { property: "og:description", content: "Данные вашей туристической компании" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashPlaceholder
      items={operatorNav}
      brand="Travel Company"
      title="Компания"
      subtitle="Данные вашей туристической компании"
      columns={["Поле", "Значение", "Обновлено"]}
    />
  );
}
