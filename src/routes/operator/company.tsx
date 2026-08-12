import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { DEMO_PASSWORD } from "@/lib/platform/seed";
import { nowIso, setState, uid } from "@/lib/platform/store";

export const Route = createFileRoute("/operator/company")({
  head: () => ({ meta: [{ title: "Компания — TourGo" }] }),
  component: OperatorCompanyPage,
});

function OperatorCompanyPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const [form, setForm] = useState(organization);
  const [managerEmail, setManagerEmail] = useState("");
  if (!allowed || !organization || !user || !form) return null;

  const members = state.members.filter((m) => m.organizationId === organization.id);

  return (
    <DashShell
      brand={organization.name}
      items={operatorNav}
      title="Компания"
      subtitle="Профиль и команда"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-3 p-6">
          {(
            [
              ["name", "Company name"],
              ["legalName", "Legal name"],
              ["phone", "Phone"],
              ["website", "Website"],
              ["address", "Address"],
              ["contactPerson", "Contact"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                value={String(form[key] ?? "")}
                disabled={user.role === "OPERATOR_MANAGER" && key !== "phone"}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <Button
            disabled={user.role !== "OPERATOR_ADMIN"}
            onClick={() => {
              setState((s) => ({
                ...s,
                organizations: s.organizations.map((o) =>
                  o.id === organization.id ? { ...o, ...form } : o,
                ),
              }));
              toast.success("Профиль обновлён");
            }}
          >
            Сохранить
          </Button>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Команда</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {members.map((m) => {
              const u = state.users.find((x) => x.id === m.userId);
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2"
                >
                  <span>
                    {u?.name} · {m.role}
                  </span>
                  {user.role === "OPERATOR_ADMIN" && m.role === "OPERATOR_MANAGER" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setState((s) => ({
                          ...s,
                          members: s.members.filter((x) => x.id !== m.id),
                          users: s.users.filter((x) => x.id !== m.userId),
                        }));
                      }}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {user.role === "OPERATOR_ADMIN" ? (
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="manager@company.demo"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
              />
              <Button
                onClick={() => {
                  const email = managerEmail.trim().toLowerCase();
                  if (!email) return;
                  const id = uid();
                  setState((s) => ({
                    ...s,
                    users: [
                      ...s.users,
                      {
                        id,
                        email,
                        password: DEMO_PASSWORD,
                        name: email.split("@")[0]!,
                        city: organization.city,
                        role: "OPERATOR_MANAGER",
                        status: "active",
                        organizationId: organization.id,
                        createdAt: nowIso(),
                      },
                    ],
                    members: [
                      ...s.members,
                      {
                        id: uid(),
                        organizationId: organization.id,
                        userId: id,
                        role: "OPERATOR_MANAGER",
                      },
                    ],
                  }));
                  setManagerEmail("");
                  toast.success("Менеджер добавлен");
                }}
              >
                Добавить
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </DashShell>
  );
}
