import { createFileRoute } from "@tanstack/react-router";
import { Crown, Database, Gem, Rocket, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { isSupabaseConfigured, getSupabasePublicConfig } from "@/lib/supabase/client";
import { STORE_KEY } from "@/lib/platform/seed";
import { resetPlatformStore, setState } from "@/lib/platform/store";
import type { PlatformConfig } from "@/lib/platform/types";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Настройки · Админ" }] }),
  component: AdminSettingsPage,
});

const planIcons = { START: Rocket, BUSINESS: Gem, PRO: Crown } as const;

const planBlurb: Record<string, string> = {
  START: "Для новых партнёров: ручные туры и базовая аналитика",
  BUSINESS: "Фид-API, импорт из ссылок и расширенная аналитика",
  PRO: "Живые цены, приоритет в выдаче и место на главной",
};

function AdminSettingsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user, logout } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [draft, setDraft] = useState<PlatformConfig | null>(null);

  if (!allowed || !user) return null;

  const config = draft ?? state.config;
  const { projectId } = getSupabasePublicConfig();
  const dirty = draft !== null;

  const patchPlan = (code: string, patch: Partial<PlatformConfig["operatorPlans"][number]>) =>
    setDraft({
      ...config,
      operatorPlans: config.operatorPlans.map((p) => (p.code === code ? { ...p, ...patch } : p)),
    });

  const save = () => {
    if (!draft) return;
    setState((s) => ({ ...s, config: draft }));
    appendAudit({
      actorId: user.id,
      action: "platform_config_update",
      entityType: "config",
      meta: {
        premium: draft.premiumMonthlyPrice,
        plans: draft.operatorPlans.map((p) => `${p.code}:${p.price}`).join(", "),
      },
    });
    setDraft(null);
    toast.success("Настройки сохранены и синхронизируются с базой");
  };

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Настройки"
      subtitle="Тарифы партнёров, Premium для туристов и система."
      actions={
        dirty ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
              Отменить
            </Button>
            <Button size="sm" onClick={save}>
              Сохранить
            </Button>
          </div>
        ) : undefined
      }
    >
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Тарифы для партнёров</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Цена подписки в месяц и лимит активных туров. Партнёры видят их в кабинете.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {config.operatorPlans.map((plan) => {
            const Icon = planIcons[plan.code as keyof typeof planIcons] ?? Rocket;
            return (
              <div key={plan.code} className="rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="size-4" />
                  </span>
                  <p className="font-display text-base font-semibold">{plan.name || plan.code}</p>
                </div>
                <p className="mt-2 min-h-8 text-xs text-muted-foreground">
                  {planBlurb[plan.code] ?? ""}
                </p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor={`plan-price-${plan.code}`} className="text-xs">
                      Цена в месяц, ₸
                    </Label>
                    <Input
                      id={`plan-price-${plan.code}`}
                      type="number"
                      min={0}
                      step={1000}
                      value={plan.price}
                      onChange={(e) => patchPlan(plan.code, { price: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`plan-limit-${plan.code}`} className="text-xs">
                      Лимит активных туров
                    </Label>
                    <Input
                      id={`plan-limit-${plan.code}`}
                      type="number"
                      min={1}
                      value={plan.tourLimit}
                      onChange={(e) =>
                        patchPlan(plan.code, { tourLimit: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="size-4 text-premium" />
            Premium для туристов
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Подписка с закрытыми ценами. Оплаты видны в «Платежах» с типом «Premium-подписка».
          </p>
          <div className="mt-4 grid max-w-sm gap-1.5">
            <Label htmlFor="premium-price">Цена в месяц, ₸</Label>
            <Input
              id="premium-price"
              type="number"
              min={0}
              step={100}
              value={config.premiumMonthlyPrice}
              onChange={(e) =>
                setDraft({ ...config, premiumMonthlyPrice: Number(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Сейчас туристы видят {formatPrice(state.config.premiumMonthlyPrice)} на странице
              Premium.
            </p>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Database className="size-4 text-primary" />
            Система
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">База данных</dt>
              <dd className="inline-flex items-center gap-2 font-medium">
                <span
                  className={
                    isSupabaseConfigured
                      ? "size-2 rounded-full bg-success"
                      : "size-2 rounded-full bg-premium"
                  }
                />
                {isSupabaseConfigured ? "Supabase подключён" : "локальный режим"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Проект</dt>
              <dd className="font-mono text-xs">{projectId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Версия хранилища</dt>
              <dd className="font-mono text-xs">{STORE_KEY}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Миграции и инструкция — в папке{" "}
            <code className="rounded bg-secondary px-1">supabase/</code> репозитория (SETUP.md).
            Цены продвижения редактируются в разделе «Продвижение».
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-destructive/25 bg-destructive/[0.03] p-6">
        <h2 className="font-display text-base font-semibold text-destructive">Опасная зона</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Сброс очищает только локальные данные этого браузера (кэш каталога и сессию) и не трогает
          базу Supabase — реальные пользователи и компании останутся.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ConfirmAction
            triggerLabel="Сбросить локальные данные"
            title="Сбросить локальное хранилище браузера?"
            description="Кэш каталога и сессия в этом браузере будут пересозданы. База Supabase не изменится."
            confirmLabel="Сбросить"
            destructive
            variant="outline"
            size="default"
            onConfirm={() => {
              resetPlatformStore();
              appendAudit({ actorId: user.id, action: "store_reset", entityType: "store" });
              toast.success("Локальное хранилище сброшено");
            }}
          />
          <Button variant="outline" onClick={logout}>
            Выйти из аккаунта
          </Button>
        </div>
      </section>
    </DashShell>
  );
}
