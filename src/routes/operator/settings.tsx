import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";

export const Route = createFileRoute("/operator/settings")({
  head: () => ({ meta: [{ title: "Настройки оператора — TourGo" }] }),
  component: OperatorSettingsPage,
});

function OperatorSettingsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization, logout } = useAuth();
  if (!allowed || !user || !organization) return null;

  return (
    <DashShell brand={organization.name} items={operatorNav} title="Настройки" subtitle={user.email}>
      <div className="surface-card max-w-lg space-y-3 p-6 text-sm">
        <p>Роль: {user.role}</p>
        <p>Организация: {organization.name}</p>
        <p>Статус org: {organization.status}</p>
        <Button variant="outline" onClick={logout}>
          Выйти
        </Button>
      </div>
    </DashShell>
  );
}
