import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  EmptyState,
  FilterBar,
  auditActionLabel,
  auditEntityLabel,
  formatRelativeRu,
  userName,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({ meta: [{ title: "Журнал аудита — Админ" }] }),
  component: AdminAuditLogsPage,
});

function AdminAuditLogsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");

  const entityOptions = useMemo(() => {
    const set = new Set(state.auditLogs.map((l) => l.entityType));
    return [
      { value: "all", label: "Все типы" },
      ...[...set].map((value) => ({
        value,
        label: auditEntityLabel[value] ?? value,
      })),
    ];
  }, [state.auditLogs]);

  const logs = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.auditLogs.filter((log) => {
      if (entity !== "all" && log.entityType !== entity) return false;
      if (!query) return true;
      const action = (auditActionLabel[log.action] ?? log.action).toLowerCase();
      const actor = log.actorId ? userName(log.actorId).toLowerCase() : "система";
      return (
        action.includes(query) || actor.includes(query) || (log.entityId ?? "").includes(query)
      );
    });
  }, [state.auditLogs, q, entity]);

  if (!allowed) return null;
  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Журнал аудита"
      subtitle="Действия администраторов"
    >
      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Действие, исполнитель, ID…"
        filters={[
          {
            key: "entity",
            value: entity,
            placeholder: "Тип сущности",
            onChange: setEntity,
            options: entityOptions,
          },
        ]}
      />

      {logs.length === 0 ? (
        <EmptyState
          title="Записей нет"
          description="Измените фильтр или выполните действие в админке"
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="surface-card p-4 text-sm">
              <div className="font-medium">
                {auditActionLabel[log.action] ?? log.action}
                <span className="text-muted-foreground">
                  {" "}
                  · {auditEntityLabel[log.entityType] ?? log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </span>
              </div>
              <div className="mt-1 text-muted-foreground">
                исполнитель: {log.actorId ? userName(log.actorId) : "система"} ·{" "}
                {formatRelativeRu(log.createdAt)} ·{" "}
                {new Date(log.createdAt).toLocaleString("ru-RU")}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashShell>
  );
}
