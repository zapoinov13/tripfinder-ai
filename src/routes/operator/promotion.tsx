import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, getHotel } from "@/data/demo";
import { mockPaymentProvider } from "@/lib/platform/adapters";
import { appendAudit, trackEvent } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState, uid } from "@/lib/platform/store";
import type { PromotionType } from "@/lib/platform/types";

export const Route = createFileRoute("/operator/promotion")({
  head: () => ({ meta: [{ title: "Продвижение — TourGo" }] }),
  component: OperatorPromotionPage,
});

const types: PromotionType[] = [
  "BOOST",
  "FEATURED",
  "SPONSORED",
  "PREMIUM_PLACEMENT",
  "HOME_FEATURE",
];

function OperatorPromotionPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const [tourId, setTourId] = useState("");
  const [type, setType] = useState<PromotionType>("BOOST");
  const [days, setDays] = useState("7");
  if (!allowed || !organization || !user) return null;

  const tours = state.tours.filter(
    (t) => t.operatorOrgId === organization.id && t.status === "active",
  );
  const price = state.config.promotionPrices[type] * (Number(days) / 7);

  const buy = async () => {
    if (!tourId) {
      toast.error("Выберите предложение");
      return;
    }
    const payment = await mockPaymentProvider.createPayment({
      amount: price,
      currency: "KZT",
      type: "promotion",
      metadata: { tourId, type, days },
    });
    const started = nowIso();
    const expires = new Date(Date.now() + Number(days) * 86400000).toISOString();
    setState((s) => ({
      ...s,
      promotions: [
        {
          id: uid(),
          organizationId: organization.id,
          tourOfferId: tourId,
          type,
          durationDays: Number(days),
          price,
          currency: "KZT",
          status: "ACTIVE",
          startedAt: started,
          expiresAt: expires,
        },
        ...s.promotions,
      ],
      payments: [
        {
          id: uid(),
          userId: user.id,
          organizationId: organization.id,
          amount: price,
          currency: "KZT",
          type: "promotion",
          provider: "mock",
          providerPaymentId: payment.providerPaymentId,
          status: "paid",
          createdAt: nowIso(),
          metadata: { tourId, type },
        },
        ...s.payments,
      ],
      tours: s.tours.map((t) => {
        if (t.id !== tourId) return t;
        const tags = new Set(t.tags);
        if (type === "SPONSORED" || type === "HOME_FEATURE") tags.add("sponsored");
        if (type === "PREMIUM_PLACEMENT" || type === "FEATURED") tags.add("premium");
        if (type === "BOOST") tags.add("best");
        return { ...t, tags: Array.from(tags) as typeof t.tags };
      }),
    }));
    appendAudit({
      actorId: user.id,
      action: "promotion_purchased",
      entityType: "promotion",
      entityId: tourId,
      meta: { type, days },
    });
    trackEvent("PROMOTION_PURCHASED", user.id, { type, tourId });
    toast.success("Promotion ACTIVE");
  };

  return (
    <DashShell
      brand={organization.name}
      items={operatorNav}
      title="Продвижение"
      subtitle="Boost / Featured / Sponsored"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-6">
          <div className="space-y-2">
            <Label>Тур</Label>
            <Select value={tourId} onValueChange={setTourId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите предложение" />
              </SelectTrigger>
              <SelectContent>
                {tours.slice(0, 40).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {getHotel(t.hotelId).name} · {formatPrice(t.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={type} onValueChange={(v) => setType(v as PromotionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t} · {formatPrice(state.config.promotionPrices[t])}/7д
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Длительность</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["3", "7", "14", "30"].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d} дней
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm">К оплате: {formatPrice(Math.round(price / 1000) * 1000)}</p>
          <Button onClick={buy}>Оплатить promotion</Button>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Активные</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {state.promotions
              .filter((p) => p.organizationId === organization.id && p.status === "ACTIVE")
              .map((p) => (
                <li key={p.id} className="rounded-xl bg-secondary p-3">
                  {p.type} · {p.tourOfferId} · до{" "}
                  {new Date(p.expiresAt).toLocaleDateString("ru-RU")}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </DashShell>
  );
}
