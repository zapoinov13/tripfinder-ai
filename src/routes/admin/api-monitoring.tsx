import { createFileRoute } from "@tanstack/react-router";
import { Cable, Copy, RefreshCw, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  KpiLinkCard,
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
import { formatNumber } from "@/data/demo";
import { getAdapterForOrg } from "@/lib/platform/adapters";
import { syncDueConnections, useAutoApiSync } from "@/lib/platform/api-sync";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { SUPPLIER_FEED_EXAMPLE } from "@/lib/platform/supplier-feed";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/api-monitoring")({
  head: () => privatePage("Мониторинг API · Админ"),
  component: AdminApiMonitoringPage,
});

const DAY_MS = 86400000;

function AdminApiMonitoringPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showFeed, setShowFeed] = useState(false);

  // Пока открыта админка, просроченные подключения синхронизируются сами.
  useAutoApiSync();

  const stats = useMemo(() => {
    const dayAgo = Date.now() - DAY_MS;
    const recent = state.syncLogs.filter((l) => new Date(l.createdAt).getTime() >= dayAgo);
    return {
      connections: state.apiConnections.length,
      errors: state.apiConnections.filter((c) => c.status === "error").length,
      imported24h: recent.reduce((s, l) => s + l.toursImported + l.toursUpdated, 0),
      syncs24h: recent.length,
    };
  }, [state.apiConnections, state.syncLogs]);

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
      toast[log.status === "error" ? "error" : "success"](log.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Синхронизация не удалась");
    } finally {
      setBusyId(null);
    }
  };

  const runAll = async () => {
    setBulkBusy(true);
    try {
      const result = await syncDueConnections({ actorId: user.id, force: true });
      toast.success(
        result.ran === 0
          ? "Нет подключений для синхронизации"
          : `Синхронизировано: ${result.ok} ок, ${result.failed} с ошибками`,
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const feedJson = JSON.stringify(SUPPLIER_FEED_EXAMPLE, null, 2);

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Мониторинг API"
      subtitle="Фиды партнёров и агрегаторов: статусы, автосинхронизация и журнал."
      actions={
        <Button size="sm" disabled={bulkBusy} onClick={() => void runAll()}>
          <RefreshCw className="size-3.5" />
          {bulkBusy ? "Синхронизация…" : "Синхронизировать все"}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiLinkCard label="Подключений" value={String(stats.connections)} hint="фиды партнёров" />
        <KpiLinkCard
          label="С ошибками"
          value={String(stats.errors)}
          hint="требуют внимания"
          tone={stats.errors > 0 ? "danger" : "default"}
        />
        <KpiLinkCard
          label="Туров за 24 часа"
          value={formatNumber(stats.imported24h)}
          hint="импортировано и обновлено"
        />
        <KpiLinkCard
          label="Синхронизаций за 24 часа"
          value={String(stats.syncs24h)}
          hint="автоматических и ручных"
        />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 text-sm">
        <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Автосинхронизация включена:</span> пока
          открыта админка или кабинет партнёра, просроченные фиды подтягиваются сами по интервалу
          подключения. Подключения с ошибкой повторяются реже, чтобы не нагружать сервер партнёра.
        </p>
      </div>

      {state.apiConnections.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Нет подключений" description="Партнёры ещё не настроили API" />
        </div>
      ) : (
        <div className="surface-card mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Партнёр</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Интервал</TableHead>
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
                  <TableCell className="max-w-56">
                    <div className="truncate text-xs text-muted-foreground" title={c.endpoint}>
                      {c.endpoint || "не задан"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      авторизация: {c.authType} · {c.currency}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.syncIntervalMin} мин</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={connectionStatusLabel[c.status] ?? c.status}
                      tone={toneForConnectionStatus(c.status)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">{formatRelativeRu(c.lastSyncAt)}</TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {c.lastError ?? "нет"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === c.organizationId}
                      onClick={() => void runSync(c.organizationId)}
                    >
                      {busyId === c.organizationId ? "Синхронизация…" : "Синхронизировать"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Журнал синхронизаций</h2>
          {state.syncLogs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Логов пока нет</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {state.syncLogs.slice(0, 25).map((l) => (
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
                    tone={
                      l.status === "error"
                        ? "danger"
                        : l.status === "success"
                          ? "success"
                          : "warning"
                    }
                    className="mr-2"
                  />
                  {orgName(l.organizationId)} · {l.message} ·{" "}
                  {new Date(l.createdAt).toLocaleString("ru-RU")}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Cable className="size-5 text-primary" />
            Как подключаются агрегаторы
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Партнёр или агрегатор отдаёт каталог в формате{" "}
              <span className="font-medium text-foreground">TourGo Supplier Feed v1</span> — один
              JSON по URL. Авторизация: API-ключ, Basic или Bearer.
            </li>
            <li>
              Партнёр указывает URL в кабинете (Туры → Добавить → API), платформа тянет фид через
              серверный прокси (Edge Function <code>sync-supplier-feed</code>), поэтому CORS у
              источника не мешает.
            </li>
            <li>
              Дальше всё автоматически: импорт, обновление цен и наличия, снятие исчезнувших туров —
              по интервалу подключения. Результаты в журнале слева.
            </li>
            <li>
              Следующий шаг (заложено): серверный cron вместо синка из браузера и MCP-сервер, чтобы
              AI-агенты агрегаторов подключались напрямую. Формат и адаптеры уже общие — см.{" "}
              <code>docs/API-INTEGRATIONS.md</code> в репозитории.
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowFeed((v) => !v)}>
              {showFeed ? "Скрыть пример фида" : "Показать пример фида"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard
                  .writeText(feedJson)
                  .then(() => toast.success("Пример фида скопирован"))
                  .catch(() => toast.error("Не удалось скопировать"));
              }}
            >
              <Copy className="size-3.5" />
              Копировать JSON
            </Button>
          </div>
          {showFeed ? (
            <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-primary-foreground/90">
              {feedJson}
            </pre>
          ) : null}
        </section>
      </div>
    </DashShell>
  );
}
