import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";

export const Route = createFileRoute("/admin/premium")({
  head: () => ({ meta: [{ title: "Premium — Админ" }] }),
  component: AdminPremiumPage,
});

function AdminPremiumPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user } = useAuth();
  const state = usePlatformStore();
  const [price, setPrice] = useState(String(state.config.premiumMonthlyPrice));
  if (!allowed || !user) return null;

  const subs = state.subscriptions.filter((s) => s.planId === "premium-monthly");

  return (
    <DashShell
      brand="Voyago Админ"
      items={adminNav}
      title="Premium"
      subtitle="Месячная цена подписки"
    >
      <div className="surface-card max-w-md space-y-4 p-6">
        <div className="space-y-2">
          <Label>Цена за месяц (₸)</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <Button
          onClick={() => {
            const value = Number(price);
            if (!Number.isFinite(value) || value <= 0) {
              toast.error("Некорректная цена");
              return;
            }
            setState((s) => ({
              ...s,
              config: { ...s.config, premiumMonthlyPrice: value },
            }));
            appendAudit({
              actorId: user.id,
              action: "premium_price_update",
              entityType: "config",
              meta: { price: value },
            });
            toast.success(`Premium = ${formatPrice(value)}`);
          }}
        >
          Сохранить
        </Button>
        <p className="text-sm text-muted-foreground">Активных Premium-подписок: {subs.length}</p>
      </div>
    </DashShell>
  );
}
