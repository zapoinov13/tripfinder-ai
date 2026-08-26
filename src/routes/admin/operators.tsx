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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/data/demo";
import { appendAudit, pushNotification } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import {
  categoriesOfServices,
  companyCategories,
  type CompanyCategoryId,
} from "@/lib/platform/company-categories";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import { verificationDocumentLabel } from "@/lib/platform/verification-documents";
import type { OperatorPlanCode, Organization, OrganizationStatus } from "@/lib/platform/types";

export const Route = createFileRoute("/admin/operators")({
  head: () => ({ meta: [{ title: "Партнёры · Админ TourGo" }] }),
  component: AdminOperatorsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

function AdminOperatorsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("all");
  const [docsOrg, setDocsOrg] = useState<Organization | null>(null);
  const counts = useMemo(() => {
    const all = state.organizations.length;
    const pending = state.organizations.filter((o) => o.status === "PENDING_APPROVAL").length;
    const approved = state.organizations.filter((o) => o.status === "APPROVED").length;
    const rejected = state.organizations.filter((o) => o.status === "REJECTED").length;
    const suspended = state.organizations.filter((o) => o.status === "SUSPENDED").length;
    return { all, pending, approved, rejected, suspended };
  }, [state.organizations]);

  if (!allowed || !user) return null;

  const orgs = state.organizations.filter((o) => {
    if (category !== "all") {
      const cats = categoriesOfServices(o.services ?? []);
      if (!cats.has(category as CompanyCategoryId)) return false;
    }
    if (tab === "all") return true;
    if (tab === "pending") return o.status === "PENDING_APPROVAL";
    if (tab === "approved") return o.status === "APPROVED";
    if (tab === "rejected") return o.status === "REJECTED";
    if (tab === "suspended") return o.status === "SUSPENDED";
    return true;
  });

  const categoryChips = (o: Organization) => {
    const cats = categoriesOfServices(o.services ?? []);
    return companyCategories.filter((c) => cats.has(c.id)).map((c) => c.label);
  };

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
      title="Партнёры"
      subtitle="Все подключённые бизнесы: туры, экскурсии, жильё, авто, спорт. Одобрение, документы и тарифы."
    >
      <div className="flex flex-wrap items-center gap-3">
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
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {companyCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orgs.length === 0 ? (
        <EmptyState title="Нет операторов в этой вкладке" />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Партнёр</TableHead>
                <TableHead>Подключён</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Документы</TableHead>
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
                        БИН {o.registrationNumber || "нет"} ·{" "}
                        {o.contactPerson || "контакт не указан"}
                      </div>
                      {categoryChips(o).length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {categoryChips(o).map((label) => (
                            <span
                              key={label}
                              className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {fmtDate(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={orgStatusLabel[o.status]}
                        tone={toneForOrgStatus(o.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {(o.verificationFiles?.length ?? 0) > 0 ? (
                        <Button size="sm" variant="outline" onClick={() => setDocsOrg(o)}>
                          {o.verificationFiles!.length} док. — смотреть
                        </Button>
                      ) : (o.documents?.length ?? 0) > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {o.documents!.join(", ")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">не загружены</span>
                      )}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(o.id, "APPROVED")}
                        >
                          Возобновить
                        </Button>
                      )}
                      <ConfirmAction
                        triggerLabel="Удалить"
                        title="Удалить компанию?"
                        description={`${o.name}: страница, туры и объявления исчезнут навсегда, сотрудники станут туристами. Брони и платежи сохраняются в отчётах. Действие нельзя отменить.`}
                        confirmLabel="Удалить"
                        destructive
                        onConfirm={() => {
                          setState((s) => ({
                            ...s,
                            organizations: s.organizations.filter((x) => x.id !== o.id),
                            tours: s.tours.filter((t) => t.operatorOrgId !== o.id),
                            members: s.members.filter((m) => m.organizationId !== o.id),
                            users: s.users.map((u2) => {
                              if (u2.organizationId !== o.id) return u2;
                              const { organizationId: _org, ...rest } = u2;
                              return { ...rest, role: "TOURIST" as const };
                            }),
                          }));
                          appendAudit({
                            actorId: user.id,
                            action: "organization_delete",
                            entityType: "organization",
                            entityId: o.id,
                            meta: { name: o.name },
                          });
                          toast.success("Компания удалена");
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(docsOrg)} onOpenChange={(open) => !open && setDocsOrg(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Документы · {docsOrg?.name}</DialogTitle>
            <DialogDescription>
              {docsOrg?.verificationSubmittedAt
                ? `Отправлены на проверку ${fmtDate(docsOrg.verificationSubmittedAt)}`
                : "Загружены, но на проверку ещё не отправлены"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(docsOrg?.verificationFiles ?? []).map((f) => (
              <div key={`${f.type}-${f.fileName}`} className="rounded-2xl border border-border p-4">
                <p className="font-medium">{verificationDocumentLabel(f.type)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {f.fileName} · {fmtDate(f.uploadedAt)}
                </p>
                {f.mimeType.startsWith("image/") ? (
                  <img
                    src={f.dataUrl}
                    alt={verificationDocumentLabel(f.type)}
                    className="mt-3 max-h-96 w-full rounded-xl border border-border object-contain"
                  />
                ) : (
                  <a
                    href={f.dataUrl}
                    download={f.fileName}
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Скачать файл
                  </a>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashShell>
  );
}
