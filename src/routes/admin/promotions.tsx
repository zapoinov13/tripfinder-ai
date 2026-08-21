import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  StatusBadge,
  orgName,
  promoStatusLabel,
  promoTypeLabel,
  tourTitle,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
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
import { formatPrice } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import type { PromotionType } from "@/lib/platform/types";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({ meta: [{ title: "Продвижение — Админ" }] }),
  component: AdminPromotionsPage,
});

function AdminPromotionsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  /** Цены из стора приходят после гидрации: пока их не правили, показываем актуальные. */
  const [edited, setEdited] = useState<typeof state.config.promotionPrices | null>(null);
  const draft = edited ?? state.config.promotionPrices;
  const setDraft = setEdited;
  if (!allowed || !user) return null;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Продвижение"
      subtitle="Цены пакетов и заказы операторов"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-3 p-6">
          <h2 className="font-display text-lg font-semibold">Цены (за 7 дней)</h2>
          {(Object.keys(draft) as PromotionType[]).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-44 text-sm">{promoTypeLabel[key]}</span>
              <Input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) || 0 })}
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

        <div className="surface-card overflow-x-auto p-2">
          <h2 className="px-4 pt-4 font-display text-lg font-semibold">Заказы</h2>
          {state.promotions.length === 0 ? (
            <EmptyState title="Заказов продвижения нет" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Тур</TableHead>
                  <TableHead>Оператор</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{promoTypeLabel[p.type]}</TableCell>
                    <TableCell>{tourTitle(p.tourOfferId)}</TableCell>
                    <TableCell>{orgName(p.organizationId)}</TableCell>
                    <TableCell>{formatPrice(p.price)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={promoStatusLabel[p.status] ?? p.status}
                        tone={
                          p.status === "ACTIVE"
                            ? "success"
                            : p.status === "CANCELLED"
                              ? "danger"
                              : "neutral"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {p.status === "ACTIVE" ? (
                        <ConfirmAction
                          triggerLabel="Снять"
                          title="Деактивировать продвижение?"
                          description={`${promoTypeLabel[p.type]} · ${tourTitle(p.tourOfferId)}`}
                          confirmLabel="Деактивировать"
                          destructive
                          onConfirm={() => {
                            setState((s) => ({
                              ...s,
                              promotions: s.promotions.map((x) =>
                                x.id === p.id ? { ...x, status: "CANCELLED" } : x,
                              ),
                            }));
                            appendAudit({
                              actorId: user.id,
                              action: "promotion_deactivate",
                              entityType: "promotion",
                              entityId: p.id,
                            });
                            toast.success("Продвижение снято");
                          }}
                        />
                      ) : null}
                    </TableCell>
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
