import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  FilterBar,
  StatusBadge,
  TabPills,
  roleLabel,
  toneForUserStatus,
  userStatusLabel,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
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
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import type { Role } from "@/lib/platform-contracts";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/users")({
  head: () => privatePage("Пользователи · Админ TourGo"),
  component: AdminUsersPage,
});

/**
 * Раздел «Пользователи» — только туристы и команда платформы.
 * Все, кто зарегистрировался как бизнес (турфирма, спорт, аренда и т.д.),
 * живут в разделе «Партнёры» — там компании и их сотрудники.
 */
const touristRoles: Role[] = ["TOURIST", "PREMIUM_TOURIST"];
const staffRoles: Role[] = ["PLATFORM_ADMIN", "PLATFORM_MANAGER"];
const partnerRoles: Role[] = ["OPERATOR_ADMIN", "OPERATOR_MANAGER"];

function AdminUsersPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [tab, setTab] = useState("tourists");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const tabRoles = tab === "staff" ? staffRoles : touristRoles;
  const users = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.users.filter((u) => {
      if (!tabRoles.includes(u.role)) return false;
      if (role !== "all" && u.role !== role) return false;
      if (status !== "all" && u.status !== status) return false;
      if (!query) return true;
      return (
        u.email.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query) ||
        u.city.toLowerCase().includes(query) ||
        (roleLabel[u.role] ?? "").toLowerCase().includes(query)
      );
    });
  }, [state.users, q, role, status, tabRoles]);

  const counts = useMemo(
    () => ({
      tourists: state.users.filter((u) => touristRoles.includes(u.role)).length,
      staff: state.users.filter((u) => staffRoles.includes(u.role)).length,
      partners: state.users.filter((u) => partnerRoles.includes(u.role)).length,
    }),
    [state.users],
  );

  if (!allowed || !user) return null;

  const isPlatformAdmin = user.role === "PLATFORM_ADMIN";
  // Менеджер не может назначать роль админа платформы и трогать админов,
  // и никто не редактирует собственный аккаунт (защита от самоблокировки).
  // Бизнес-роли здесь не назначаются: партнёром становятся через регистрацию
  // компании, а сотрудники партнёров управляются в разделе «Партнёры».
  const assignableRoles = tabRoles.filter((r) => isPlatformAdmin || r !== "PLATFORM_ADMIN");
  const canEdit = (target: (typeof state.users)[number]) =>
    target.id !== user.id && (isPlatformAdmin || target.role !== "PLATFORM_ADMIN");

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Пользователи"
      subtitle="Туристы и команда платформы. Бизнес-аккаунты — в разделе «Партнёры»."
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setTab("tourists");
            setRole("all");
          }}
          className={cn(
            "surface-card p-4 text-left transition-colors",
            tab === "tourists"
              ? "border-primary ring-2 ring-primary/20"
              : "hover:border-primary/30",
          )}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
            <Users className="size-4" />
          </span>
          <p className="mt-2.5 text-xs text-muted-foreground">Туристы</p>
          <p className="font-display text-xl font-semibold tabular-nums">
            {formatNumber(counts.tourists)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("staff");
            setRole("all");
          }}
          className={cn(
            "surface-card p-4 text-left transition-colors",
            tab === "staff" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30",
          )}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <p className="mt-2.5 text-xs text-muted-foreground">Команда платформы</p>
          <p className="font-display text-xl font-semibold tabular-nums">
            {formatNumber(counts.staff)}
          </p>
        </button>
        <Link
          to="/admin/operators"
          className="surface-card col-span-2 flex items-center gap-3 p-4 transition-colors hover:border-primary/30 lg:col-span-2"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
            <Building2 className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">Сотрудники партнёров</span>
            <span className="block font-display text-xl font-semibold tabular-nums">
              {formatNumber(counts.partners)}
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium text-primary">В разделе «Партнёры» →</span>
        </Link>
      </div>

      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Имя, email, город…"
        filters={[
          {
            key: "role",
            value: role,
            placeholder: "Роль",
            onChange: setRole,
            options: [
              { value: "all", label: "Все роли" },
              ...tabRoles.map((r) => ({ value: r, label: roleLabel[r] })),
            ],
          },
          {
            key: "status",
            value: status,
            placeholder: "Статус",
            onChange: setStatus,
            options: [
              { value: "all", label: "Все статусы" },
              { value: "active", label: "Активен" },
              { value: "suspended", label: "Заморожен" },
            ],
          },
        ]}
      />

      {users.length === 0 ? (
        q.trim() || role !== "all" || status !== "all" ? (
          <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Users className="size-6" />
            </span>
            <div>
              <p className="font-display text-base font-semibold">Никого не нашли</p>
              <p className="mt-1 text-sm text-muted-foreground">
                По этому поиску и фильтрам совпадений нет.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQ("");
                setRole("all");
                setStatus("all");
              }}
            >
              Сбросить фильтры
            </Button>
          </div>
        ) : tab === "tourists" ? (
          <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Users className="size-6" />
            </span>
            <div className="max-w-md">
              <p className="font-display text-base font-semibold">Туристов пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Здесь появится каждый, кто зарегистрируется на сайте или в приложении: имя, город,
                статус и дата регистрации. Отсюда же можно замораживать и удалять аккаунты.
              </p>
            </div>
          </div>
        ) : (
          <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <ShieldCheck className="size-6" />
            </span>
            <div className="max-w-md">
              <p className="font-display text-base font-semibold">
                Команда платформы пока не видна
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Админы и менеджеры платформы подтянутся из базы после входа. Ваш аккаунт управляется
                через Supabase.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Город</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-semibold",
                          u.status === "suspended"
                            ? "bg-secondary text-muted-foreground"
                            : "bg-primary-soft text-primary",
                        )}
                      >
                        {(u.name || u.email).slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {u.name}
                          {u.id === user.id ? (
                            <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              вы
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.city}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      disabled={!canEdit(u)}
                      onValueChange={(v) => {
                        setState((s) => ({
                          ...s,
                          users: s.users.map((x) =>
                            x.id === u.id ? { ...x, role: v as Role } : x,
                          ),
                        }));
                        appendAudit({
                          actorId: user.id,
                          action: "user_role_change",
                          entityType: "user",
                          entityId: u.id,
                          meta: { role: v },
                        });
                        toast.success("Роль обновлена");
                      }}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(assignableRoles.includes(u.role)
                          ? assignableRoles
                          : [u.role, ...assignableRoles]
                        ).map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabel[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={userStatusLabel[u.status]}
                      tone={toneForUserStatus(u.status)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                  </TableCell>
                  <TableCell>
                    {u.id === user.id ? (
                      <span className="text-xs text-muted-foreground">Это вы</span>
                    ) : canEdit(u) ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {tab === "tourists" ? (
                          <ConfirmAction
                            triggerLabel="В партнёры"
                            title="Перевести в партнёры?"
                            description={`${u.name} (${u.email}) станет админом компании и попадёт в раздел «Партнёры» → «Сотрудники». При следующем входе он завершит регистрацию компании (название, категория, город).`}
                            confirmLabel="Перевести"
                            variant="outline"
                            onConfirm={() => {
                              setState((s) => ({
                                ...s,
                                users: s.users.map((x) =>
                                  x.id === u.id ? { ...x, role: "OPERATOR_ADMIN" as Role } : x,
                                ),
                              }));
                              appendAudit({
                                actorId: user.id,
                                action: "user_to_partner",
                                entityType: "user",
                                entityId: u.id,
                                meta: { email: u.email },
                              });
                              toast.success(
                                "Переведён в партнёры. Теперь он в разделе «Партнёры» → «Сотрудники».",
                              );
                            }}
                          />
                        ) : null}
                        <ConfirmAction
                          triggerLabel={u.status === "active" ? "Заморозить" : "Разморозить"}
                          title={
                            u.status === "active"
                              ? "Заморозить пользователя?"
                              : "Разморозить пользователя?"
                          }
                          description={
                            u.status === "active"
                              ? `${u.name} (${u.email}) не сможет войти, пока вы не разморозите аккаунт. Данные сохраняются.`
                              : `${u.name} (${u.email}) снова сможет входить и пользоваться платформой.`
                          }
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
                              next === "suspended"
                                ? "Пользователь заморожен: вход закрыт"
                                : "Пользователь разморожен",
                            );
                          }}
                        />
                        <ConfirmAction
                          triggerLabel="Удалить"
                          title="Удалить пользователя?"
                          description={`${u.name} (${u.email}) исчезнет из списка навсегда. Действие нельзя отменить.`}
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
                            toast.success("Пользователь удалён");
                          }}
                        />
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashShell>
  );
}
