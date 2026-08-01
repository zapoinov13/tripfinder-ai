import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/operator/api")({
  head: () => ({
    meta: [
      { title: "API интеграция — кабинет туроператора | Voyago" },
      {
        name: "description",
        content: "Подключите свой API и синхронизируйте туры и цены автоматически.",
      },
      { property: "og:title", content: "API интеграция — Voyago" },
      { property: "og:description", content: "Автоматическая загрузка туров и цен." },
    ],
  }),
  component: ApiPage,
});

const stats = [
  ["API Status", "🟢 Connected"],
  ["Last Sync", "12:43"],
  ["Tours", "1 284"],
  ["Updated", "342"],
  ["Errors", "0"],
];

function ApiPage() {
  return (
    <DashShell
      brand="Travel Company"
      items={operatorNav}
      title="API Integration"
      subtitle="Автоматическая синхронизация каталога"
    >
      <div className="surface-card p-6 md:p-8">
        <h2 className="font-display text-xl font-semibold">Подключите свой API</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Мы будем забирать туры, цены и доступность по расписанию каждые 15 минут.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 font-display text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button>Настроить</Button>
          <Button variant="outline">Синхронизировать</Button>
        </div>
      </div>
    </DashShell>
  );
}