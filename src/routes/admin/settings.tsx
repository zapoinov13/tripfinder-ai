import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { resetPlatformStore } from "@/lib/platform/store";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Настройки — Админ" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user, logout } = useAuth();
  const nav = useAdminNav();
  if (!allowed || !user) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

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
              <dd className="truncate text-right font-mono text-xs">{supabaseUrl ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Хранилище</dt>
              <dd className="font-medium">tourgo:platform-v1</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            SQL и seed: папка <code className="rounded bg-secondary px-1">supabase/</code> в
            репозитории. Инструкция —{" "}
            <code className="rounded bg-secondary px-1">supabase/SETUP.md</code>.
          </p>
        </div>

        <div className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Данные и сессия</h2>
          <p className="text-sm text-muted-foreground">
            Локальный MVP: данные в localStorage. Сброс пересоздаёт демо-seed.
          </p>
          <ConfirmAction
            triggerLabel="Сбросить данные платформы"
            title="Сбросить всё локальное хранилище?"
            description="Пользователи, брони, платежи и настройки в браузере будут пересозданы из демо-данных."
            confirmLabel="Сбросить"
            destructive
            variant="destructive"
            size="default"
            onConfirm={() => {
              appendAudit({
                actorId: user.id,
                action: "store_reset",
                entityType: "store",
              });
              resetPlatformStore();
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
