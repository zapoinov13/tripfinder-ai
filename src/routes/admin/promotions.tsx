import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import type { PromotionType } from "@/lib/platform/types";

const promoTypeLabel: Record<PromotionType, string> = {
  BOOST: "Буст",
  FEATURED: "В топе",
  SPONSORED: "Спонсорский",
  PREMIUM_PLACEMENT: "Premium-размещение",
  HOME_FEATURE: "На главной",
};

const promoStatusLabel: Record<string, string> = {
  active: "Активно",
  pending: "Ожидает",
  expired: "Истекло",
  cancelled: "Отменено",
};

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({ meta: [{ title: "Продвижение — Админ" }] }),
  component: AdminPromotionsPage,
});

function AdminPromotionsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user } = useAuth();
  const state = usePlatformStore();
  const [draft, setDraft] = useState(state.config.promotionPrices);
  if (!allowed || !user) return null;

  return (
    <DashShell
      brand="Voyago Админ"
      items={adminNav}
      title="Продвижение"
      subtitle="Цены и заказы промо"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-3 p-6">
          <h2 className="font-display text-lg font-semibold">Цены (за 7 дней)</h2>
          {(Object.keys(draft) as PromotionType[]).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-40 text-sm">{promoTypeLabel[key] ?? key}</span>
              <Input
                value={draft[key]}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: Number(e.target.value) || 0 })
                }
              />
            </div>
          ))}
          <Button
            onClick={() => {
              setState((s) => ({
                ...s,
                config: { ...s.config, promotionPrices: draft },
              }));
              appendAudit({
                actorId: user.id,
                action: "promotion_prices_update",
                entityType: "config",
              });
              toast.success("Цены сохранены");
            }}
          >
            Сохранить цены
          </Button>
        </div>
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Заказы</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {state.promotions.map((p) => (
              <li key={p.id} className="rounded-xl bg-secondary p-3">
                {promoTypeLabel[p.type as PromotionType] ?? p.type} ·{" "}
                {promoStatusLabel[p.status] ?? p.status} · {formatPrice(p.price)} ·{" "}
                {p.tourOfferId}
              </li>
            ))}
            {state.promotions.length === 0 ? (
              <li className="text-muted-foreground">Пока нет заказов продвижения</li>
            ) : null}
          </ul>
        </div>
      </div>
    </DashShell>
  );
}
