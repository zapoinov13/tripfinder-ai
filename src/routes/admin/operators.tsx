import { createFileRoute } from "@tanstack/react-router";

import { getSupabase } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  KpiLinkCard,
  StatusBadge,
  TabPills,
  orgName,
  orgStatusLabel,
  roleLabel,
  toneForOrgStatus,
  toneForUserStatus,
  userStatusLabel,
} from "@/components/admin";
import { AddCompanyDialog } from "@/components/admin/add-company-dialog";
import { AddTourForCompanyDialog } from "@/components/admin/add-tour-for-company-dialog";
import { CompanyClaimsSection } from "@/components/admin/company-claims-section";
import { AddTourDialog } from "@/components/operator/add-tour-dialog";
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
import { formatNumber, formatPrice } from "@/data/demo";
import { cn } from "@/lib/utils";
import { appendAudit, pushNotification } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import {
  categoriesOfServices,
  companyCategories,
  type CompanyCategoryId,
} from "@/lib/platform/company-categories";
import { partnerActivity, recordsWord } from "@/lib/platform/business-stats";
import { pendingCompanyClaims } from "@/lib/platform/company-claims";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import { verificationDocumentLabel } from "@/lib/platform/verification-documents";
import type { OperatorPlanCode, Organization, OrganizationStatus } from "@/lib/platform/types";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/operators")({
  head: () => privatePage("Партнёры · Админ TourGo"),
  component: AdminOperatorsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

function AdminOperatorsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const [addingCompany, setAddingCompany] = useState(false);
  // Наполнение витрины турами: сначала выбираем компанию-продавца.
  const [pickingTourOrg, setPickingTourOrg] = useState(false);
  const [tourOrgId, setTourOrgId] = useState<string | null>(null);
  const state = usePlatformStore();
  const [view, setView] = useState("companies");
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("all");
  const [life, setLife] = useState("all");
  const [docsOrg, setDocsOrg] = useState<Organization | null>(null);
  const counts = useMemo(() => {
    const all = state.organizations.length;
    const pending = state.organizations.filter((o) => o.status === "PENDING_APPROVAL").length;
    const approved = state.organizations.filter((o) => o.status === "APPROVED").length;
    const rejected = state.organizations.filter((o) => o.status === "REJECTED").length;
    const suspended = state.organizations.filter((o) => o.status === "SUSPENDED").length;
    return { all, pending, approved, rejected, suspended };
  }, [state.organizations]);

  // Активность за 30 дней: кто реально работает, а кто подключился и заглох.
  const activityById = new Map(
    state.organizations.map((o) => [o.id, partnerActivity(o.id, 30)] as const),
  );
  const liveCount = [...activityById.values()].filter((a) => !a.asleep).length;
  const totalRequests = [...activityById.values()].reduce((sum, a) => sum + a.requests, 0);
  const totalEarned = [...activityById.values()].reduce((sum, a) => sum + a.earned, 0);

  if (!allowed || !user) return null;

  const orgs = state.organizations.filter((o) => {
    if (category !== "all") {
      const cats = categoriesOfServices(o.services ?? []);
      if (!cats.has(category as CompanyCategoryId)) return false;
    }
    if (life === "live" && activityById.get(o.id)?.asleep !== false) return false;
    if (life === "asleep" && activityById.get(o.id)?.asleep !== true) return false;
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

  // Владельцы просят передать им карточку, которую завела платформа.
  const claims = pendingCompanyClaims();

  // Люди с бизнес-ролями: живут здесь, а не в «Пользователях».
  const partnerUsers = state.users
    .filter((u) => u.role === "OPERATOR_ADMIN" || u.role === "OPERATOR_MANAGER")
    .sort((a, b) => (a.organizationId ?? "").localeCompare(b.organizationId ?? ""));

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

  /**
   * Знак «Проверена» — вручную и только после документов.
   *
   * Идёт отдельным вызовом, а не общим сохранением организации: пока миграция
   * автоодобрения не применена, колонки нет, и общий набор полей с ней уронил
   * бы редактирование компании целиком. Отдельный вызов в этом случае просто
   * не находится, и мы честно говорим об этом.
   */
  const setDocumentsVerified = async (orgId: string, verified: boolean) => {
    const sb = getSupabase();
    if (!sb) {
      toast.error("Supabase не настроен");
      return;
    }
    const rpc = sb.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc("set_company_documents_verified", {
      p_org: orgId,
      p_verified: verified,
    });
    if (error) {
      toast.error(
        /not find|does not exist|PGRST202/i.test(error.message)
          ? "Сначала примените supabase/AUTO-APPROVE.sql в SQL Editor"
          : error.message,
      );
      return;
    }
    setState((s) => ({
      ...s,
      organizations: s.organizations.map((o) =>
        o.id === orgId
          ? { ...o, documentsVerifiedAt: verified ? new Date().toISOString() : "" }
          : o,
      ),
    }));
    const orgUsers = state.users.filter((u) => u.organizationId === orgId);
    orgUsers.forEach((u) =>
      pushNotification(
        u.id,
        "operator_approval",
        verified ? "Документы проверены" : "Знак проверки снят",
        verified
          ? "На вашей карточке появился знак «Проверена»."
          : "Знак «Проверена» снят: проверьте документы в разделе «Компания».",
      ),
    );
    appendAudit({
      actorId: user.id,
      action: "company_documents_verified",
      entityType: "organization",
      entityId: orgId,
      meta: { verified },
    });
    toast.success(verified ? "Документы проверены" : "Знак проверки снят");
  };

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Партнёры"
      subtitle="Все подключённые бизнесы: туры, экскурсии, жильё, авто, спорт. Одобрение, документы и тарифы."
      actions={
        <>
          <Button size="sm" onClick={() => setAddingCompany(true)}>
            <Plus className="size-4" />
            Добавить компанию
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPickingTourOrg(true)}>
            <Plus className="size-4" />
            Добавить тур
          </Button>
        </>
      }
    >
      <AddCompanyDialog
        open={addingCompany}
        onOpenChange={setAddingCompany}
        actorId={user?.id ?? ""}
      />

      <AddTourForCompanyDialog
        open={pickingTourOrg}
        onOpenChange={setPickingTourOrg}
        onPick={(orgId) => {
          setPickingTourOrg(false);
          setTourOrgId(orgId);
        }}
      />

      {tourOrgId ? <AddTourDialog orgId={tourOrgId} onClose={() => setTourOrgId(null)} /> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiLinkCard
          label="Партнёров"
          value={formatNumber(counts.all)}
          hint={`${formatNumber(counts.pending)} ждут одобрения`}
          tone={counts.pending > 0 ? "warning" : "default"}
        />
        <KpiLinkCard
          label="Работают"
          value={formatNumber(liveCount)}
          hint={`${formatNumber(counts.all - liveCount)} без активности 30 дней`}
        />
        <KpiLinkCard
          label="Записей за 30 дней"
          value={formatNumber(totalRequests)}
          hint="клиенты записались к партнёрам"
        />
        <KpiLinkCard
          label="Оборот партнёров"
          value={formatPrice(totalEarned)}
          hint="по ценам услуг, оплата мимо платформы"
        />
      </div>

      <div className="mb-4">
        <TabPills
          value={view}
          onChange={setView}
          items={[
            { value: "companies", label: "Компании", count: counts.all },
            { value: "staff", label: "Сотрудники", count: partnerUsers.length },
            { value: "claims", label: "Заявки на компании", count: claims.length },
          ]}
        />
      </div>

      {view === "claims" ? (
        <CompanyClaimsSection actorId={user.id} />
      ) : view === "staff" ? (
        partnerUsers.length === 0 ? (
          <EmptyState
            title="Сотрудников партнёров нет"
            description="Появятся после регистрации компаний"
          />
        ) : (
          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Компания</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.organizationId ? orgName(u.organizationId) : "без компании"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {state.organizations.find((o) => o.id === u.organizationId)?.city ?? u.city}
                    </TableCell>
                    <TableCell className="text-sm">{roleLabel[u.role]}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={userStatusLabel[u.status]}
                        tone={toneForUserStatus(u.status)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <ConfirmAction
                          triggerLabel={u.status === "active" ? "Заморозить" : "Разморозить"}
                          title={
                            u.status === "active"
                              ? "Заморозить сотрудника?"
                              : "Разморозить сотрудника?"
                          }
                          description={`${u.name} (${u.email})${
                            u.status === "active"
                              ? " не сможет войти, пока вы не разморозите аккаунт."
                              : " снова сможет входить в кабинет компании."
                          }`}
                          confirmLabel={u.status === "active" ? "Заморозить" : "Разморозить"}
                          destructive={u.status === "active"}
                          onConfirm={() => {
                            const next = u.status === "active" ? "suspended" : "active";
                            setState((s) => ({
                              ...s,
                              users: s.users.map((x) =>
                                x.id === u.id ? { ...x, status: next } : x,
                              ),
                            }));
                            appendAudit({
                              actorId: user.id,
                              action: next === "suspended" ? "user_suspend" : "user_restore",
                              entityType: "user",
                              entityId: u.id,
                            });
                            toast.success(
                              next === "suspended" ? "Сотрудник заморожен" : "Сотрудник разморожен",
                            );
                          }}
                        />
                        <ConfirmAction
                          triggerLabel="Удалить"
                          title="Удалить сотрудника?"
                          description={`${u.name} (${u.email}) исчезнет навсегда. Компания и её данные останутся.`}
                          confirmLabel="Удалить"
                          destructive
                          onConfirm={() => {
                            setState((s) => ({
                              ...s,
                              users: s.users.filter((x) => x.id !== u.id),
                              members: s.members.filter((m) => m.userId !== u.id),
                            }));
                            appendAudit({
                              actorId: user.id,
                              action: "user_delete",
                              entityType: "user",
                              entityId: u.id,
                              meta: { email: u.email, role: u.role },
                            });
                            toast.success("Сотрудник удалён");
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <>
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
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "all", label: "Все" },
                { value: "live", label: `Работают (${liveCount})` },
                { value: "asleep", label: `Спят (${counts.all - liveCount})` },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setLife(f.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    life === f.value ? "bg-secondary text-foreground" : "text-muted-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
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
                    <TableHead>Активность 30 дней</TableHead>
                    <TableHead>Туры / брони</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((o) => {
                    const tourCount = state.tours.filter((t) => t.operatorOrgId === o.id).length;
                    const bookingCount = state.bookings.filter(
                      (b) => b.organizationId === o.id,
                    ).length;
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
                        <TableCell className="whitespace-nowrap text-sm">
                          {(() => {
                            const a = activityById.get(o.id);
                            if (!a || a.asleep) {
                              return (
                                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                  спит
                                </span>
                              );
                            }
                            return (
                              <>
                                <span className="font-medium">
                                  {formatNumber(a.requests)} {recordsWord(a.requests)}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {formatNumber(a.views)} просмотров
                                  {a.earned > 0 ? ` · ${formatPrice(a.earned)}` : ""}
                                </span>
                              </>
                            );
                          })()}
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
                          <Button
                            size="sm"
                            variant={o.documentsVerifiedAt ? "outline" : "secondary"}
                            onClick={() => void setDocumentsVerified(o.id, !o.documentsVerifiedAt)}
                          >
                            {o.documentsVerifiedAt ? "Снять знак проверки" : "Документы проверены"}
                          </Button>
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
        </>
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
