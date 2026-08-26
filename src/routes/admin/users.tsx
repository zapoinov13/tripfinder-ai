import { Link, createFileRoute } from "@tanstack/react-router";
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
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import type { Role } from "@/lib/platform-contracts";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Пользователи · Админ TourGo" }] }),
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TabPills
          value={tab}
          onChange={(v) => {
            setTab(v);
            setRole("all");
          }}
          items={[
            { value: "tourists", label: "Туристы", count: counts.tourists },
            { value: "staff", label: "Команда платформы", count: counts.staff },
          ]}
        />
        <Link to="/admin/operators" className="text-sm font-medium text-primary hover:underline">
          Сотрудники партнёров ({counts.partners}) — в разделе «Партнёры» →
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
        <EmptyState title="Никого не нашли" description="Измените поиск или фильтры" />
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
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>{u.city}</TableCell>
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
