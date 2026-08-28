import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  EmptyState,
  FilterBar,
  TabPills,
  auditEntityLabel,
  auditToneClass,
  auditView,
  ROUTINE_ACTIONS,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import type { AuditLog } from "@/lib/platform/types";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => privatePage("Журнал аудита · Админ"),
  component: AdminAuditLogsPage,
});

/**
 * Журнал аудита читают в двух случаях: «что вообще происходило» и «кто это
 * сделал». Раньше он отвечал ни на то, ни на другое: строки вида
 * `migrate_anonymous_state · пользователь · 071224f9-…` идут вперемешку с
 * реальными решениями, время у всех одинаковое, объекты — сырые id.
 *
 * Теперь записи сгруппированы по дням, каждая читается предложением, а входы
 * и служебные переносы спрятаны за отдельной вкладкой — они нужны редко и
 * только по конкретному человеку.
 */

const DAY_MS = 86400000;

const dayTitle = (iso: string) => {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(date)) / DAY_MS);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

function AdminAuditLogsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [scope, setScope] = useState<"important" | "all">("important");

  const routineCount = useMemo(
    () => state.auditLogs.filter((l) => ROUTINE_ACTIONS.has(l.action)).length,
    [state.auditLogs],
  );

  const logs = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.auditLogs.filter((log) => {
      if (scope === "important" && ROUTINE_ACTIONS.has(log.action)) return false;
      if (entity !== "all" && log.entityType !== entity) return false;
      if (!query) return true;
      const view = auditView(log);
      return (
        view.title.toLowerCase().includes(query) ||
        view.actor.toLowerCase().includes(query) ||
        (view.target ?? "").toLowerCase().includes(query) ||
        (log.entityId ?? "").toLowerCase().includes(query)
      );
    });
  }, [state.auditLogs, q, entity, scope]);

  /** Дни идут сверху вниз; внутри дня — от позднего к раннему. */
  const days = useMemo(() => {
    const groups: { key: string; title: string; logs: AuditLog[] }[] = [];
    for (const log of logs) {
      const key = log.createdAt.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.logs.push(log);
      else groups.push({ key, title: dayTitle(log.createdAt), logs: [log] });
    }
    return groups;
  }, [logs]);

  const entityOptions = useMemo(() => {
    const set = new Set(state.auditLogs.map((l) => l.entityType));
    return [
      { value: "all", label: "Все типы" },
      ...[...set].map((value) => ({ value, label: auditEntityLabel[value] ?? value })),
    ];
  }, [state.auditLogs]);

  if (!allowed) return null;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Журнал аудита"
      subtitle="Каждое решение на платформе: кто, что и когда сделал."
    >
      <TabPills
        value={scope}
        onChange={(v) => setScope(v as typeof scope)}
        items={[
          { value: "important", label: "Решения и изменения" },
          { value: "all", label: "Всё, включая входы", count: routineCount },
        ]}
      />

      <div className="mt-4">
        <FilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Действие, кто сделал, название…"
          filters={[
            {
              key: "entity",
              value: entity,
              placeholder: "Тип объекта",
              onChange: setEntity,
              options: entityOptions,
            },
          ]}
        />
      </div>

      {days.length === 0 ? (
        <EmptyState
          title="Записей нет"
          description={
            scope === "important" && routineCount > 0
              ? "Значимых действий не было. Входы и служебные события — на вкладке «Всё»."
              : "Измените фильтр или выполните действие в админке"
          }
        />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.key}>
              <h2 className="sticky top-0 z-10 -mx-1 bg-background/90 px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                {day.title}
                <span className="ml-2 font-normal normal-case tracking-normal">
                  {day.logs.length}
                </span>
              </h2>
              <ul className="surface-card divide-y divide-border">
                {day.logs.map((log) => {
                  const view = auditView(log);
                  return (
                    <li key={log.id} className="flex items-start gap-3 p-4">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-xl",
                          auditToneClass[view.tone],
                        )}
                      >
                        <view.icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {view.title}
                          {view.target ? (
                            <span className="font-normal text-muted-foreground">
                              {" · "}
                              {view.target}
                            </span>
                          ) : null}
                          {view.extra ? (
                            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                              {view.extra}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {view.actor}
                          {view.trace ? (
                            <>
                              {" · "}
                              {/* Объект уже удалён: имени нет, остаётся след id. */}
                              <span title={log.entityId}>
                                {auditEntityLabel[log.entityType] ?? log.entityType} {view.trace}…
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-xs tabular-nums text-muted-foreground"
                        title={new Date(log.createdAt).toLocaleString("ru-RU")}
                      >
                        {clock(log.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </DashShell>
  );
}
