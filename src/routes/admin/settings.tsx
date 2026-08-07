import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { resetPlatformStore } from "@/lib/platform/store";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Настройки — Админ" }] }),
  component: () => {
    const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
    const { logout } = useAuth();
    if (!allowed) return null;
    return (
      <DashShell brand="Voyago Админ" items={adminNav} title="Настройки" subtitle="Система и доступ">
        <div className="surface-card max-w-lg space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Локальный MVP: данные хранятся в localStorage. Сброс пересоздаёт демо-данные.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              resetPlatformStore();
              toast.success("Хранилище платформы сброшено");
            }}
          >
            Сбросить данные платформы
          </Button>
          <Button variant="outline" onClick={logout}>
            Выйти
          </Button>
        </div>
      </DashShell>
    );
  },
});
