import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyState, KpiLinkCard, TabPills, eventLabel, formatRelativeRu, userName } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { formatNumber } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Аналитика — Админ" }] }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [period, setPeriod] = useState("all");
  if (!allowed) return null;

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const events = useMemo(() => {
    if (period === "today") {
      return state.analyticsEvents.filter((e) => new Date(e.createdAt) >= startOfToday);
    }
    return state.analyticsEvents;
  }, [state.analyticsEvents, period, startOfToday]);

  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Аналитика"
      subtitle="События и трекинг"
    >
      <TabPills
        value={period}
        onChange={setPeriod}
        items={[
          { value: "today", label: "Сегодня" },
          { value: "all", label: "Всё время", count: state.analyticsEvents.length },
        ]}
      />

      {sorted.length === 0 ? (
        <EmptyState title="Событий пока нет" description="Появятся по мере использования сайта" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sorted.slice(0, 8).map(([type, count]) => (
              <KpiLinkCard
                key={type}
                label={eventLabel[type] ?? type}
                value={formatNumber(count)}
              />
            ))}
          </div>

          <div className="surface-card mt-6 space-y-3 p-6">
            <h2 className="font-display text-lg font-semibold">Топ событий</h2>
            {sorted.slice(0, 10).map(([type, count]) => (
              <div key={type}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{eventLabel[type] ?? type}</span>
                  <span className="font-medium">{formatNumber(count)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="surface-card mt-6 p-6">
            <h2 className="font-display text-lg font-semibold">Последние события</h2>
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
              {events.slice(0, 50).map((e) => (
                <li key={e.id}>
                  {eventLabel[e.type] ?? e.type} · {e.userId ? userName(e.userId) : "аноним"} ·{" "}
                  {formatRelativeRu(e.createdAt)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </DashShell>
  );
}
