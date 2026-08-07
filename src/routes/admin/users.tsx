import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";

const roleLabel: Record<string, string> = {
  TOURIST: "Турист",
  PREMIUM_TOURIST: "Premium-турист",
  OPERATOR_ADMIN: "Админ оператора",
  OPERATOR_MANAGER: "Менеджер оператора",
  PLATFORM_ADMIN: "Админ платформы",
  PLATFORM_MANAGER: "Менеджер платформы",
};

const statusLabel: Record<string, string> = {
  active: "Активен",
  suspended: "Заблокирован",
};

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Пользователи — Админ Voyago" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  if (!allowed || !user) return null;

  const users = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.users.filter(
      (u) =>
        !query ||
        u.email.includes(query) ||
        u.name.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query) ||
        (roleLabel[u.role] ?? "").toLowerCase().includes(query),
    );
  }, [state.users, q]);

  return (
    <DashShell
      brand="Voyago Админ"
      items={adminNav}
      title="Пользователи"
      subtitle="Поиск и блокировка аккаунтов"
    >
      <Input
        className="mb-4 max-w-md"
        placeholder="Поиск по имени, email или роли…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Статус</TableHead>
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
                <TableCell>{roleLabel[u.role] ?? u.role}</TableCell>
                <TableCell>{statusLabel[u.status] ?? u.status}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
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
                        next === "suspended" ? "Пользователь заблокирован" : "Пользователь восстановлен",
                      );
                    }}
                  >
                    {u.status === "active" ? "Заблокировать" : "Восстановить"}
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
