import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { setState } from "@/lib/platform/store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/settings")({
  head: () => ({ meta: [{ title: "Настройки — Voyago" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { allowed } = useRequireAuth(["TOURIST", "PREMIUM_TOURIST"]);
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  if (!allowed || !user) return null;

  return (
    <DashShell brand="Voyago" items={profileNav} title="Настройки" subtitle="Профиль">
      <div className="surface-card max-w-lg space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="name">Имя</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Город</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Button
          onClick={() => {
            setState((s) => ({
              ...s,
              users: s.users.map((u) =>
                u.id === user.id ? { ...u, name: name.trim() || u.name, city: city.trim() || u.city } : u,
              ),
            }));
            toast.success("Сохранено");
          }}
        >
          Сохранить
        </Button>
      </div>
    </DashShell>
  );
}
