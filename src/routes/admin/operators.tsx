import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appendAudit, pushNotification } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import type { OperatorPlanCode, OrganizationStatus } from "@/lib/platform/types";

const orgStatusLabel: Record<OrganizationStatus, string> = {
  PENDING_APPROVAL: "Ожидает одобрения",
  APPROVED: "Одобрен",
  REJECTED: "Отклонён",
  SUSPENDED: "Приостановлен",
};

export const Route = createFileRoute("/admin/operators")({
  head: () => ({ meta: [{ title: "Операторы — Админ Voyago" }] }),
  component: AdminOperatorsPage,
});

function AdminOperatorsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !user) return null;

  const setStatus = (orgId: string, status: OrganizationStatus) => {
    setState((s) => ({
      ...s,
      organizations: s.organizations.map((o) => (o.id === orgId ? { ...o, status } : o)),
    }));
    const orgUsers = state.users.filter((u) => u.organizationId === orgId);
    orgUsers.forEach((u) =>
      pushNotification(
        u.id,
        "operator_approval",
        `Статус: ${orgStatusLabel[status]}`,
        `Организация: ${orgStatusLabel[status]}`,
      ),
    );
    appendAudit({
      actorId: user.id,
      action: "operator_status",
      entityType: "organization",
      entityId: orgId,
      meta: { status },
    });
    toast.success(orgStatusLabel[status]);
  };

  return (
    <DashShell
      brand="Voyago Админ"
      items={adminNav}
      title="Операторы"
      subtitle="Одобрение и тарифные планы"
    >
      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Компания</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.organizations.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="font-medium">{o.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.city} · {o.email}
                  </div>
                </TableCell>
                <TableCell>{orgStatusLabel[o.status] ?? o.status}</TableCell>
                <TableCell>
                  <Select
                    value={o.planCode}
                    onValueChange={(v) => {
                      setState((s) => ({
                        ...s,
                        organizations: s.organizations.map((x) =>
                          x.id === o.id ? { ...x, planCode: v as OperatorPlanCode } : x,
                        ),
                      }));
                      appendAudit({
                        actorId: user.id,
                        action: "operator_plan_admin",
                        entityType: "organization",
                        entityId: o.id,
                        meta: { plan: v },
                      });
                      toast.success(`Тариф обновлён: ${v}`);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {state.config.operatorPlans.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" onClick={() => setStatus(o.id, "APPROVED")}>
                    Одобрить
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "REJECTED")}>
                    Отклонить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "SUSPENDED")}>
                    Приостановить
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashShell>
  );
}
