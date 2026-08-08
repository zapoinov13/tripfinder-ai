import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  StatusBadge,
  connectionStatusLabel,
  formatRelativeRu,
  orgName,
  syncStatusLabel,
  toneForConnectionStatus,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdapterForOrg } from "@/lib/platform/adapters";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/admin/api-monitoring")({
  head: () => ({ meta: [{ title: "Мониторинг API — Админ" }] }),
  component: AdminApiMonitoringPage,
});

function AdminApiMonitoringPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!allowed || !user) return null;

  const runSync = async (organizationId: string) => {
    setBusyId(organizationId);
    try {
      const adapter = getAdapterForOrg(organizationId);
      const test = await adapter.testConnection();
      if (!test.ok) {
        toast.error(test.message);
        return;
      }
      const log = await adapter.sync();
      appendAudit({
        actorId: user.id,
        action: "api_sync",
        entityType: "api_connection",
        entityId: organizationId,
        meta: { status: log.status },
      });
      toast[log.status === "success" ? "success" : "error"](log.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Мониторинг API"
      subtitle="Статус интеграций операторов"
    >
      {state.apiConnections.length === 0 ? (
        <EmptyState
          title="Нет подключений"
          description="Операторы ещё не настроили API"
        />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Оператор</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Синхронизация</TableHead>
                <TableHead>Ошибка</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.apiConnections.map((c) => (
                <TableRow
                  key={c.id}
                  className={c.status === "error" ? "bg-destructive/5" : undefined}
                >
                  <TableCell>
                    <div className="font-medium">{orgName(c.organizationId)}</div>
                    <div className="text-xs text-muted-foreground">{c.provider}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={connectionStatusLabel[c.status] ?? c.status}
                      tone={toneForConnectionStatus(c.status)}
                    />
                  </TableCell>
                  <TableCell>{formatRelativeRu(c.lastSyncAt)}</TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {c.lastError ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === c.organizationId}
                      onClick={() => runSync(c.organizationId)}
                    >
                      {busyId === c.organizationId ? "Синхронизация…" : "Перезапустить"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="surface-card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Недавние логи</h2>
        {state.syncLogs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Логов пока нет</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {state.syncLogs.slice(0, 20).map((l) => (
              <li
                key={l.id}
                className={
                  l.status === "error"
                    ? "rounded-xl bg-destructive/10 px-3 py-2"
                    : "rounded-xl bg-secondary/60 px-3 py-2"
                }
              >
                <StatusBadge
                  label={syncStatusLabel[l.status] ?? l.status}
                  tone={l.status === "error" ? "danger" : l.status === "success" ? "success" : "warning"}
                  className="mr-2"
                />
                {orgName(l.organizationId)} · {l.message} ·{" "}
                {new Date(l.createdAt).toLocaleString("ru-RU")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashShell>
  );
}
