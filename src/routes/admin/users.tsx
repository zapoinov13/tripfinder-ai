import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  FilterBar,
  StatusBadge,
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

const roles = Object.keys(roleLabel) as Role[];

function AdminUsersPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const users = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.users.filter((u) => {
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
  }, [state.users, q, role, status]);

  if (!allowed || !user) return null;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Пользователи"
      subtitle="Поиск, роли, заморозка и удаление"
    >
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
              ...roles.map((r) => ({ value: r, label: roleLabel[r] })),
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
                        {roles.map((r) => (
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
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2">
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
                    )}
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
