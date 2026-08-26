import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, Gift, Megaphone, Wallet, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  KpiLinkCard,
  StatusBadge,
  orgName,
  promoStatusLabel,
  promoTypeLabel,
  tourTitle,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatNumber, formatPrice } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  adminGrantPromotion,
  adminTopUpBalance,
  calcPromotionPrice,
  cancelPromotion,
  expireStalePromotions,
  isCompanyPromotion,
} from "@/lib/platform/promotions";
import { setState } from "@/lib/platform/store";
import type { PromotionType } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({ meta: [{ title: "Продвижение · Админ" }] }),
  component: AdminPromotionsPage,
});

const DAY_MS = 86400000;

const grantPacks: { type: PromotionType; label: string }[] = [
  { type: "BOOST", label: "Выше в витрине / поиске («Хит»)" },
  { type: "SPONSORED", label: "«Рекомендуем» на карточках" },
  { type: "FEATURED", label: "Максимум: выделенные карточки" },
];

function AdminPromotionsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();

  const [edited, setEdited] = useState<typeof state.config.promotionPrices | null>(null);
  const [topUpOrgId, setTopUpOrgId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("50000");
  const [grantOrgId, setGrantOrgId] = useState<string | null>(null);
  const [grantType, setGrantType] = useState<PromotionType>("BOOST");
  const [grantDays, setGrantDays] = useState("7");
  const [grantCharge, setGrantCharge] = useState(false);

  const draft = edited ?? state.config.promotionPrices;
  const now = Date.now();

  const rows = useMemo(() => {
    const monthAgo = now - 30 * DAY_MS;
    return state.organizations
      .map((org) => {
        const promos = state.promotions.filter((p) => p.organizationId === org.id);
        const active = promos.filter(
          (p) => p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > now,
        );
        const spent = state.payments
          .filter(
            (p) => p.organizationId === org.id && p.type === "promotion" && p.status === "paid",
          )
          .reduce((s, p) => s + p.amount, 0);
        let views = 0;
        let clicks = 0;
        for (const e of state.analyticsEvents) {
          if (e.payload?.["companyId"] !== org.id) continue;
          if (new Date(e.createdAt).getTime() < monthAgo) continue;
          if (e.type === "COMPANY_PAGE_VIEW") views += 1;
          if (e.type === "COMPANY_CONTACT_CLICK") clicks += 1;
        }
        return { org, promos, active, spent, views, clicks };
      })
      .sort(
        (a, b) =>
          b.active.length - a.active.length ||
          b.org.promotionBalance - a.org.promotionBalance ||
          b.spent - a.spent,
      );
  }, [state.organizations, state.promotions, state.payments, state.analyticsEvents, now]);

  const promoPayments = useMemo(
    () => state.payments.filter((p) => p.type === "promotion" && p.status === "paid"),
    [state.payments],
  );

  if (!allowed || !user) return null;

  const revenueAll = promoPayments.reduce((s, p) => s + p.amount, 0);
  const revenue30 = promoPayments
    .filter((p) => new Date(p.createdAt).getTime() >= now - 30 * DAY_MS)
    .reduce((s, p) => s + p.amount, 0);
  const activeCampaigns = state.promotions.filter(
    (p) => p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > now,
  );
  const balanceTotal = state.organizations.reduce((s, o) => s + o.promotionBalance, 0);
  const campaigns = [...state.promotions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const topUpOrg = topUpOrgId ? state.organizations.find((o) => o.id === topUpOrgId) : null;
  const grantOrg = grantOrgId ? state.organizations.find((o) => o.id === grantOrgId) : null;
  const grantPrice = calcPromotionPrice(grantType, Number(grantDays));

  const stopAll = (orgId: string) => {
    const active = state.promotions.filter(
      (p) =>
        p.organizationId === orgId &&
        p.status === "ACTIVE" &&
        new Date(p.expiresAt).getTime() > now,
    );
    for (const p of active) {
      cancelPromotion({ promotionId: p.id, organizationId: orgId, actorId: user.id });
    }
    toast.success(`Остановлено кампаний: ${active.length}`);
  };

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Продвижение"
      subtitle="Выручка, кампании и балансы всех компаний. Внутренний таргетинг — отсюда."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiLinkCard
          label="Выручка с продвижения"
          value={formatPrice(revenueAll)}
          hint={`${formatPrice(revenue30)} за 30 дней`}
        />
        <KpiLinkCard
          label="Активных кампаний"
          value={String(activeCampaigns.length)}
          hint="работают прямо сейчас"
        />
        <KpiLinkCard
          label="Компаний продвигаются"
          value={String(new Set(activeCampaigns.map((p) => p.organizationId)).size)}
          hint={`из ${state.organizations.length} на платформе`}
        />
        <KpiLinkCard
          label="Балансы компаний"
          value={formatPrice(balanceTotal)}
          hint="ещё не потраченные деньги"
        />
      </div>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/20 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Компании</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Баланс, кампании и эффект за 30 дней. Начисляйте баланс и запускайте продвижение сами.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Компания</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Кампании</TableHead>
                <TableHead>Потрачено</TableHead>
                <TableHead>Эффект (30 дн)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ org, promos, active, spent, views, clicks }) => (
                <TableRow key={org.id} className={cn(active.length > 0 && "bg-success/[0.04]")}>
                  <TableCell>
                    <Link
                      to="/company/$companyId"
                      params={{ companyId: org.id }}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {org.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {org.city} ·{" "}
                      {(org.services ?? []).slice(0, 2).join(", ") || "услуги не указаны"}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {formatPrice(org.promotionBalance)}
                  </TableCell>
                  <TableCell>
                    {active.length > 0 ? (
                      <span className="inline-flex items-center gap-1 font-medium text-success">
                        <Zap className="size-3.5" />
                        {active.length} активн.
                      </span>
                    ) : (
                      <span className="text-muted-foreground">нет</span>
                    )}
                    {promos.length > active.length ? (
                      <div className="text-xs text-muted-foreground">всего {promos.length}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatPrice(spent)}</TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {formatNumber(views)} просм. · {formatNumber(clicks)} клик.
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTopUpOrgId(org.id);
                          setTopUpAmount("50000");
                        }}
                      >
                        <Wallet className="size-3.5" />
                        Начислить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setGrantOrgId(org.id);
                          setGrantType("BOOST");
                          setGrantDays("7");
                          setGrantCharge(false);
                        }}
                      >
                        <Megaphone className="size-3.5" />
                        Запустить
                      </Button>
                      {active.length > 0 ? (
                        <ConfirmAction
                          triggerLabel="Стоп"
                          title="Остановить все кампании компании?"
                          description={`${org.name}: ${active.length} активных кампаний будут сняты.`}
                          confirmLabel="Остановить"
                          destructive
                          variant="ghost"
                          onConfirm={() => stopAll(org.id)}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-b border-border bg-secondary/20 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Все кампании</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Каждый запуск продвижения на платформе: кто, что, на сколько и за сколько.
          </p>
        </div>
        {campaigns.length === 0 ? (
          <EmptyState
            title="Кампаний ещё не было"
            description="Запустите первую кнопкой «Запустить» в таблице компаний"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Компания</TableHead>
                  <TableHead>Цель</TableHead>
                  <TableHead>Пакет</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.slice(0, 40).map((p) => {
                  const isActive = p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > now;
                  const left = Math.max(
                    0,
                    Math.ceil((new Date(p.expiresAt).getTime() - now) / DAY_MS),
                  );
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{orgName(p.organizationId)}</TableCell>
                      <TableCell className="text-sm">
                        {isCompanyPromotion(p) ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-muted-foreground" />
                            Компания и объявления
                          </span>
                        ) : (
                          tourTitle(p.tourOfferId)
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{promoTypeLabel[p.type]}</TableCell>
                      <TableCell className="text-sm">
                        {p.durationDays} дн.
                        {isActive ? (
                          <span className="ml-1 text-xs text-success">ещё {left}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {p.price === 0 ? (
                          <span className="inline-flex items-center gap-1 text-premium">
                            <Gift className="size-3.5" />
                            Подарок
                          </span>
                        ) : (
                          formatPrice(p.price)
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={promoStatusLabel[p.status] ?? p.status}
                          tone={
                            isActive ? "success" : p.status === "CANCELLED" ? "danger" : "neutral"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <ConfirmAction
                            triggerLabel="Снять"
                            title="Деактивировать продвижение?"
                            description={`${orgName(p.organizationId)} · ${promoTypeLabel[p.type]}`}
                            confirmLabel="Деактивировать"
                            destructive
                            variant="ghost"
                            onConfirm={() => {
                              expireStalePromotions();
                              if (
                                cancelPromotion({
                                  promotionId: p.id,
                                  organizationId: p.organizationId,
                                  actorId: user.id,
                                })
                              ) {
                                toast.success("Продвижение снято");
                              }
                            }}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="surface-card mt-6 max-w-xl space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold">Цены пакетов (за 7 дней)</h2>
        <p className="text-sm text-muted-foreground">
          Эти цены видят компании в своих кабинетах при покупке продвижения.
        </p>
        {(Object.keys(draft) as PromotionType[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-52 text-sm">{promoTypeLabel[key]}</span>
            <Input
              value={draft[key]}
              onChange={(e) => setEdited({ ...draft, [key]: Number(e.target.value) || 0 })}
            />
          </div>
        ))}
        <Button
          onClick={() => {
            setState((s) => ({ ...s, config: { ...s.config, promotionPrices: draft } }));
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
      </section>

      <Dialog open={Boolean(topUpOrg)} onOpenChange={(open) => !open && setTopUpOrgId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Начислить баланс продвижения</DialogTitle>
            <DialogDescription>
              {topUpOrg?.name}: сейчас {formatPrice(topUpOrg?.promotionBalance ?? 0)}. Начисление —
              для оплат вне платформы или бонусов; попадает в аудит.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="topup-amount">Сумма, ₸</Label>
            <Input
              id="topup-amount"
              type="number"
              min={1000}
              step={1000}
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {[25000, 50000, 100000, 250000].map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant="outline"
                  onClick={() => setTopUpAmount(String(v))}
                >
                  {formatPrice(v)}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpOrgId(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                const amount = Number(topUpAmount) || 0;
                if (!topUpOrg || amount <= 0) {
                  toast.error("Введите сумму");
                  return;
                }
                adminTopUpBalance(topUpOrg.id, amount, user.id);
                toast.success(`Начислено ${formatPrice(amount)} · ${topUpOrg.name}`);
                setTopUpOrgId(null);
              }}
            >
              Начислить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(grantOrg)} onOpenChange={(open) => !open && setGrantOrgId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запустить продвижение</DialogTitle>
            <DialogDescription>
              {grantOrg?.name}: кампания на страницу компании и все объявления в витринах.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Пакет</Label>
              <Select value={grantType} onValueChange={(v) => setGrantType(v as PromotionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {grantPacks.map((p) => (
                    <SelectItem key={p.type} value={p.type}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Срок</Label>
              <Select value={grantDays} onValueChange={setGrantDays}>
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
            <button
              type="button"
              onClick={() => setGrantCharge((v) => !v)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                grantCharge ? "border-primary bg-primary-soft" : "border-border",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                  grantCharge
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {grantCharge ? "✓" : ""}
              </span>
              <span>
                <span className="font-medium">
                  Списать с баланса компании ({formatPrice(grantPrice)})
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Без галочки кампания запустится бесплатно — как подарок от платформы.
                </span>
              </span>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOrgId(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!grantOrg) return;
                const result = adminGrantPromotion({
                  organizationId: grantOrg.id,
                  actorId: user.id,
                  type: grantType,
                  days: Number(grantDays),
                  chargeBalance: grantCharge,
                });
                if (!result.ok) {
                  toast.error(result.reason);
                  return;
                }
                toast.success(
                  grantCharge
                    ? `Кампания запущена, списано ${formatPrice(result.promotion.price)}`
                    : "Кампания запущена бесплатно (подарок)",
                );
                setGrantOrgId(null);
              }}
            >
              Запустить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashShell>
  );
}
