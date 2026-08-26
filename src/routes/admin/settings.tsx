import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { isSupabaseConfigured, getSupabasePublicConfig } from "@/lib/supabase/client";
import { resetPlatformStore } from "@/lib/platform/store";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Настройки · Админ" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user, logout } = useAuth();
  const nav = useAdminNav();
  if (!allowed || !user) return null;

  const { url: supabaseUrl, projectId, source } = getSupabasePublicConfig();

  return (
    <DashShell brand="TourGo Админ" items={nav} title="Настройки" subtitle="Система и доступ">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-3 p-6">
          <h2 className="font-display text-lg font-semibold">Окружение</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Supabase</dt>
              <dd className="font-medium">
                {isSupabaseConfigured ? "подключён" : "локальный режим"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">URL</dt>
              <dd className="truncate text-right font-mono text-xs">{supabaseUrl}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Project</dt>
              <dd className="font-mono text-xs">{projectId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Источник</dt>
              <dd className="font-medium">{source === "env" ? "env" : "TourGo fallback"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Хранилище</dt>
              <dd className="font-medium">tourgo:dubai-platform-v2</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            SQL и seed: папка <code className="rounded bg-secondary px-1">supabase/</code> в
            репозитории. Инструкция:{" "}
            <code className="rounded bg-secondary px-1">supabase/SETUP.md</code>.
          </p>
        </div>

        <div className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Данные и сессия</h2>
          <p className="text-sm text-muted-foreground">
            В локальном режиме данные хранятся в браузере. Сброс пересоздаёт стартовый каталог и
            тестовые аккаунты.
          </p>
          <ConfirmAction
            triggerLabel="Сбросить данные платформы"
            title="Сбросить всё локальное хранилище?"
            description="Пользователи, брони, платежи и настройки в браузере будут пересозданы из стартовых данных."
            confirmLabel="Сбросить"
            destructive
            variant="destructive"
            size="default"
            onConfirm={() => {
              resetPlatformStore();
              // Запись — после сброса, иначе её уничтожит сам сброс.
              appendAudit({
                actorId: user.id,
                action: "store_reset",
                entityType: "store",
              });
              toast.success("Хранилище платформы сброшено");
            }}
          />
          <Button variant="outline" onClick={logout}>
            Выйти
          </Button>
        </div>
      </div>
    </DashShell>
  );
}
