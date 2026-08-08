import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  StatusBadge,
  TabPills,
  orgStatusLabel,
  toneForOrgStatus,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
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
import { formatNumber } from "@/data/demo";
import { appendAudit, pushNotification } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import type { OperatorPlanCode, OrganizationStatus } from "@/lib/platform/types";

export const Route = createFileRoute("/admin/operators")({
  head: () => ({ meta: [{ title: "Операторы — Админ TourGo" }] }),
  component: AdminOperatorsPage,
});

function AdminOperatorsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [tab, setTab] = useState("all");
  if (!allowed || !user) return null;

  const counts = useMemo(() => {
    const all = state.organizations.length;
    const pending = state.organizations.filter((o) => o.status === "PENDING_APPROVAL").length;
    const approved = state.organizations.filter((o) => o.status === "APPROVED").length;
    const rejected = state.organizations.filter((o) => o.status === "REJECTED").length;
    const suspended = state.organizations.filter((o) => o.status === "SUSPENDED").length;
    return { all, pending, approved, rejected, suspended };
  }, [state.organizations]);

  const orgs = state.organizations.filter((o) => {
    if (tab === "all") return true;
    if (tab === "pending") return o.status === "PENDING_APPROVAL";
    if (tab === "approved") return o.status === "APPROVED";
    if (tab === "rejected") return o.status === "REJECTED";
    if (tab === "suspended") return o.status === "SUSPENDED";
    return true;
  });

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
      brand="TourGo Админ"
      items={nav}
      title="Операторы"
      subtitle="Одобрение компаний и тарифы"
    >
      <TabPills
        value={tab}
        onChange={setTab}
        items={[
          { value: "all", label: "Все", count: counts.all },
          { value: "pending", label: "Ожидают", count: counts.pending },
          { value: "approved", label: "Одобрены", count: counts.approved },
          { value: "rejected", label: "Отклонены", count: counts.rejected },
          { value: "suspended", label: "Приостановлены", count: counts.suspended },
        ]}
      />

      {orgs.length === 0 ? (
        <EmptyState title="Нет операторов в этой вкладке" />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Компания</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Тариф</TableHead>
                <TableHead>Туры / брони</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => {
                const tourCount = state.tours.filter((t) => t.operatorOrgId === o.id).length;
                const bookingCount = state.bookings.filter((b) => b.organizationId === o.id).length;
                const plan = state.config.operatorPlans.find((p) => p.code === o.planCode);
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.city} · {o.email}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        БИН {o.registrationNumber || "—"} · {o.contactPerson || "контакт не указан"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={orgStatusLabel[o.status]}
                        tone={toneForOrgStatus(o.status)}
                      />
                    </TableCell>
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
                          toast.success(`Тариф: ${v}`);
                        }}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {state.config.operatorPlans.map((p) => (
                            <SelectItem key={p.code} value={p.code}>
                              {p.name || p.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-1 text-xs text-muted-foreground">
                        лимит {formatNumber(plan?.tourLimit ?? 0)} туров
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatNumber(tourCount)} / {formatNumber(bookingCount)}
                    </TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      {o.status !== "APPROVED" ? (
                        <Button size="sm" onClick={() => setStatus(o.id, "APPROVED")}>
                          Одобрить
                        </Button>
                      ) : null}
                      {o.status !== "REJECTED" ? (
                        <ConfirmAction
                          triggerLabel="Отклонить"
                          title="Отклонить оператора?"
                          description={o.name}
                          confirmLabel="Отклонить"
                          destructive
                          onConfirm={() => setStatus(o.id, "REJECTED")}
                        />
                      ) : null}
                      {o.status !== "SUSPENDED" ? (
                        <ConfirmAction
                          triggerLabel="Приостановить"
                          title="Приостановить оператора?"
                          description="Туры компании могут быть скрыты из выдачи."
                          confirmLabel="Приостановить"
                          variant="ghost"
                          onConfirm={() => setStatus(o.id, "SUSPENDED")}
                        />
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "APPROVED")}>
                          Возобновить
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </DashShell>
  );
}
