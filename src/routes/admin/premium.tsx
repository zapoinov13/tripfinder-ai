import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, KpiLinkCard, userName } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/data/demo";
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
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [price, setPrice] = useState(String(state.config.premiumMonthlyPrice));
  if (!allowed || !user) return null;

  const subs = state.subscriptions.filter(
    (s) => s.planId === "premium-monthly" && s.status === "active",
  );
  const mrr = subs.length * state.config.premiumMonthlyPrice;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Premium"
      subtitle="Цена подписки и активные подписчики"
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiLinkCard
          label="Цена / месяц"
          value={formatPrice(state.config.premiumMonthlyPrice)}
        />
        <KpiLinkCard label="Активные подписки" value={formatNumber(subs.length)} />
        <KpiLinkCard label="MRR" value={formatPrice(mrr)} hint="Месячный доход" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-6">
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
            Сохранить цену
          </Button>
        </div>

        <div className="surface-card overflow-x-auto p-2">
          {subs.length === 0 ? (
            <EmptyState title="Активных подписчиков нет" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Подписчик</TableHead>
                  <TableHead>До</TableHead>
                  <TableHead>Автопродление</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.userId ? userName(s.userId) : "—"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(s.expiresAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell>{s.autoRenew ? "Да" : "Нет"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashShell>
  );
}
