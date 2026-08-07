import { createFileRoute } from "@tanstack/react-router";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { formatNumber } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

const eventLabel: Record<string, string> = {
  page_view: "Просмотры страниц",
  search: "Поиски",
  tour_view: "Просмотры туров",
  favorite_add: "В избранное",
  booking_start: "Старт бронирования",
  booking_complete: "Бронирование завершено",
  premium_click: "Клики Premium",
  login: "Входы",
  register: "Регистрации",
};

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Аналитика — Админ" }] }),
  component: () => {
    const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
    const state = usePlatformStore();
    if (!allowed) return null;

    const counts = state.analyticsEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {});

    return (
      <DashShell
        brand="Voyago Админ"
        items={adminNav}
        title="Аналитика"
        subtitle="События и трекинг"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(counts)
            .slice(0, 8)
            .map(([type, count]) => (
              <KpiCard
                key={type}
                label={eventLabel[type] ?? type}
                value={formatNumber(count)}
              />
            ))}
          {Object.keys(counts).length === 0 ? (
            <KpiCard label="События" value="0" />
          ) : null}
        </div>
        <div className="surface-card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Последние события</h2>
          <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
            {state.analyticsEvents.slice(0, 50).map((e) => (
              <li key={e.id}>
                {eventLabel[e.type] ?? e.type} · {e.userId ?? "аноним"} ·{" "}
                {new Date(e.createdAt).toLocaleString("ru-RU")}
              </li>
            ))}
            {state.analyticsEvents.length === 0 ? (
              <li className="text-muted-foreground">Событий пока нет</li>
            ) : null}
          </ul>
        </div>
      </DashShell>
    );
  },
});
