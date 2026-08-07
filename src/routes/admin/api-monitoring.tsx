import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

const connectionStatusLabel: Record<string, string> = {
  connected: "Подключено",
  disconnected: "Отключено",
  error: "Ошибка",
  syncing: "Синхронизация",
};

const syncStatusLabel: Record<string, string> = {
  success: "Успех",
  error: "Ошибка",
  partial: "Частично",
};

export const Route = createFileRoute("/admin/api-monitoring")({
  head: () => ({ meta: [{ title: "Мониторинг API — Админ" }] }),
  component: () => {
    const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
    const state = usePlatformStore();
    if (!allowed) return null;

    return (
      <DashShell
        brand="Voyago Админ"
        items={adminNav}
        title="Мониторинг API"
        subtitle="Статус интеграций операторов"
      >
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Оператор</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последняя синхронизация</TableHead>
                <TableHead>Ошибка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.apiConnections.map((c) => {
                const org = state.organizations.find((o) => o.id === c.organizationId);
                const mins = c.lastSyncAt
                  ? Math.round((Date.now() - new Date(c.lastSyncAt).getTime()) / 60000)
                  : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell>{org?.name ?? c.organizationId}</TableCell>
                    <TableCell>{connectionStatusLabel[c.status] ?? c.status}</TableCell>
                    <TableCell>
                      {mins !== null
                        ? `Последняя успешная синхронизация: ${mins} мин назад`
                        : "Ещё не было"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.lastError ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {state.apiConnections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Нет подключённых API
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="surface-card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Недавние логи синхронизации</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {state.syncLogs.slice(0, 20).map((l) => (
              <li key={l.id}>
                {syncStatusLabel[l.status] ?? l.status} · {l.message} ·{" "}
                {new Date(l.createdAt).toLocaleString("ru-RU")}
              </li>
            ))}
            {state.syncLogs.length === 0 ? (
              <li className="text-muted-foreground">Логов пока нет</li>
            ) : null}
          </ul>
        </div>
      </DashShell>
    );
  },
});
