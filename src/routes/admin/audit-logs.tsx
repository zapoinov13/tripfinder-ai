import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

const actionLabel: Record<string, string> = {
  user_suspend: "Блокировка пользователя",
  user_restore: "Восстановление пользователя",
  operator_status: "Статус оператора",
  operator_plan_admin: "Тариф оператора",
  tour_hide: "Скрытие тура",
  tour_block: "Блокировка тура",
  premium_price_update: "Цена Premium",
  promotion_prices_update: "Цены продвижения",
};

const entityLabel: Record<string, string> = {
  user: "пользователь",
  organization: "организация",
  tour: "тур",
  config: "настройки",
};

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({ meta: [{ title: "Журнал аудита — Админ" }] }),
  component: () => {
    const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
    const state = usePlatformStore();
    if (!allowed) return null;
    return (
      <DashShell
        brand="Voyago Админ"
        items={adminNav}
        title="Журнал аудита"
        subtitle="Действия администраторов"
      >
        <div className="space-y-3">
          {state.auditLogs.map((log) => (
            <div key={log.id} className="surface-card p-4 text-sm">
              <div className="font-medium">
                {actionLabel[log.action] ?? log.action} ·{" "}
                {entityLabel[log.entityType] ?? log.entityType}
                {log.entityId ? ` · ${log.entityId}` : ""}
              </div>
              <div className="text-muted-foreground">
                исполнитель: {log.actorId ?? "система"} ·{" "}
                {new Date(log.createdAt).toLocaleString("ru-RU")}
              </div>
            </div>
          ))}
          {state.auditLogs.length === 0 ? (
            <div className="surface-card p-6 text-sm text-muted-foreground">
              Записей аудита пока нет
            </div>
          ) : null}
        </div>
      </DashShell>
    );
  },
});
