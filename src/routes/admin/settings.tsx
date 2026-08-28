import { createFileRoute } from "@tanstack/react-router";
import { Crown, Database, Gem, ListOrdered, Rocket, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatNumber, formatPrice } from "@/data/demo";
import { rankingScore, type RankingWeights } from "@/lib/search";
import { pluralRu } from "@/lib/platform/business-stats";
import { appendAudit, getActiveTours, getHotel } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { isSupabaseConfigured, getSupabasePublicConfig } from "@/lib/supabase/client";
import { STORE_KEY } from "@/lib/platform/seed";
import { resetPlatformStore, setState } from "@/lib/platform/store";
import type { PlatformConfig } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Настройки · Админ" }] }),
  component: AdminSettingsPage,
});

/**
 * Настройки платформы — это не форма, а рычаги влияния на выручку и выдачу.
 *
 * Раньше здесь были голые поля: меняешь 149 000 на 159 000 и не знаешь ни
 * сколько партнёров это затронет, ни во что превратится месяц. И главное —
 * веса выдачи, самый сильный рычаг платформы, вообще нигде не редактировались
 * и в поиске работали вхолостую. Теперь у каждой цифры рядом стоит её цена в
 * деньгах и людях, порядок выдачи настраивается с живым предпросмотром, а
 * перед сохранением показывается список ровно того, что изменится.
 */

const planIcons = { START: Rocket, BUSINESS: Gem, PRO: Crown } as const;

const planBlurb: Record<string, string> = {
  START: "Для новых партнёров: ручные туры и базовая аналитика",
  BUSINESS: "Фид-API, импорт из ссылок и расширенная аналитика",
  PRO: "Живые цены, приоритет в выдаче и место на главной",
};

/** Понятное имя каждому весу: «freshness» админу ничего не говорит. */
const weightMeta: { key: keyof RankingWeights; label: string; hint: string }[] = [
  { key: "relevance", label: "Соответствие запросу", hint: "насколько тур отвечает фильтрам" },
  { key: "price", label: "Цена", hint: "выше — дешёвое поднимается" },
  { key: "quality", label: "Звёзды отеля", hint: "класс размещения" },
  { key: "rating", label: "Рейтинг", hint: "оценки туристов" },
  { key: "availability", label: "Полнота услуги", hint: "трансфер и включённое в тур" },
  { key: "conversion", label: "Спрос", hint: "сколько уже забронировали" },
  { key: "freshness", label: "Свежесть", hint: "новые предложения выше" },
  { key: "sponsored", label: "Продвижение «Рекомендуем»", hint: "платный пакет SPONSORED" },
  { key: "premium", label: "Продвижение «В топе»", hint: "платные пакеты FEATURED и Premium" },
];

const WEIGHT_PRESETS: { id: string; label: string; weights: Partial<RankingWeights> }[] = [
  { id: "balanced", label: "Сбалансированно", weights: {} },
  { id: "cheap", label: "Дешёвое вперёд", weights: { price: 2.5, quality: 0.5, premium: 0.5 } },
  { id: "quality", label: "Качество вперёд", weights: { rating: 2.5, quality: 2, price: 0.5 } },
  { id: "paid", label: "Сильнее платное", weights: { sponsored: 3, premium: 3 } },
];

const ONES: RankingWeights = {
  relevance: 1,
  price: 1,
  quality: 1,
  rating: 1,
  availability: 1,
  conversion: 1,
  freshness: 1,
  sponsored: 1,
  premium: 1,
};

function AdminSettingsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const { user, logout } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [draft, setDraft] = useState<PlatformConfig | null>(null);

  const config = draft ?? state.config;

  /** Топ-5 туров при текущих ползунках: настройку видно сразу, до сохранения. */
  const preview = useMemo(() => {
    const tours = getActiveTours().filter(
      (t) => t.status === "active" && t.offerCategory === "tour",
    );
    return [...tours]
      .map((t) => ({ tour: t, score: rankingScore(t, config.rankingWeights) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [config.rankingWeights]);

  if (!allowed || !user) return null;

  const { projectId } = getSupabasePublicConfig();
  const saved = state.config;

  // --- что стоит за каждой цифрой -----------------------------------------
  const partners = state.organizations.filter((o) => o.status === "APPROVED");
  const planStats = saved.operatorPlans.map((plan) => {
    const count = partners.filter((o) => o.planCode === plan.code).length;
    return { code: plan.code, count, mrr: count * plan.price };
  });
  const mrrTotal = planStats.reduce((s, p) => s + p.mrr, 0);
  const premiumUsers = state.users.filter((u) => u.role === "PREMIUM_TOURIST").length;

  // --- список изменений перед сохранением ----------------------------------
  const changes: string[] = [];
  if (draft) {
    for (const plan of draft.operatorPlans) {
      const before = saved.operatorPlans.find((p) => p.code === plan.code);
      if (!before) continue;
      if (before.price !== plan.price) {
        changes.push(
          `${plan.name || plan.code}: ${formatPrice(before.price)} → ${formatPrice(plan.price)} в месяц`,
        );
      }
      if (before.tourLimit !== plan.tourLimit) {
        changes.push(
          `${plan.name || plan.code}: лимит туров ${before.tourLimit} → ${plan.tourLimit}`,
        );
      }
    }
    if (draft.premiumMonthlyPrice !== saved.premiumMonthlyPrice) {
      changes.push(
        `Premium: ${formatPrice(saved.premiumMonthlyPrice)} → ${formatPrice(draft.premiumMonthlyPrice)} в месяц`,
      );
    }
    for (const { key, label } of weightMeta) {
      if (draft.rankingWeights[key] !== saved.rankingWeights[key]) {
        changes.push(
          `Выдача · ${label}: ×${saved.rankingWeights[key]} → ×${draft.rankingWeights[key]}`,
        );
      }
    }
  }
  const dirty = changes.length > 0;

  const patchPlan = (code: string, patch: Partial<PlatformConfig["operatorPlans"][number]>) =>
    setDraft({
      ...config,
      operatorPlans: config.operatorPlans.map((p) => (p.code === code ? { ...p, ...patch } : p)),
    });

  const patchWeight = (key: keyof RankingWeights, value: number) =>
    setDraft({ ...config, rankingWeights: { ...config.rankingWeights, [key]: value } });

  const save = () => {
    if (!draft) return;
    setState((s) => ({ ...s, config: draft }));
    appendAudit({
      actorId: user.id,
      action: "platform_config_update",
      entityType: "config",
      meta: { changes: changes.join("; ") },
    });
    setDraft(null);
    toast.success(`Сохранено: ${changes.length} изменений`);
  };

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Настройки"
      subtitle="Тарифы, Premium и порядок выдачи. Всё, что здесь меняется, видят партнёры и туристы."
      actions={
        dirty ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
              Отменить
            </Button>
            <Button size="sm" onClick={save}>
              Сохранить ({changes.length})
            </Button>
          </div>
        ) : undefined
      }
    >
      {dirty ? (
        <div className="surface-card mb-6 border-primary/30 bg-primary-soft/40 p-4">
          <p className="text-sm font-semibold">Что изменится после сохранения</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {changes.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="surface-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Тарифы для партнёров</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Цена подписки в месяц и лимит активных туров. Партнёры видят их в кабинете.
            </p>
          </div>
          <p className="text-sm">
            <span className="text-muted-foreground">Подписки сейчас: </span>
            <span className="font-display text-base font-semibold">{formatPrice(mrrTotal)}</span>
            <span className="text-muted-foreground"> в месяц</span>
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {config.operatorPlans.map((plan) => {
            const Icon = planIcons[plan.code as keyof typeof planIcons] ?? Rocket;
            const stat = planStats.find((p) => p.code === plan.code);
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
                {/* Цена без числа партнёров — это гадание: показываем, кого затронет. */}
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  {stat && stat.count > 0
                    ? `${formatNumber(stat.count)} ${pluralRu(stat.count, "партнёр", "партнёра", "партнёров")} · ${formatPrice(stat.mrr)} в месяц`
                    : "на этом тарифе пока никого"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-b border-border bg-secondary/20 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <ListOrdered className="size-4 text-primary" />
            Порядок выдачи
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Из чего складывается место тура в поиске и на витринах. Вес 1 — как сейчас, 0 —
            слагаемое не учитывается вовсе.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
          {WEIGHT_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({ ...config, rankingWeights: { ...ONES, ...preset.weights } })
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_20rem]">
          <ul className="space-y-4">
            {weightMeta.map(({ key, label, hint }) => {
              const value = config.rankingWeights[key];
              const changed = value !== saved.rankingWeights[key];
              return (
                <li key={key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">
                      {label}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums text-sm font-semibold",
                        changed ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      ×{value}
                    </span>
                  </div>
                  <Slider
                    className="mt-2"
                    min={0}
                    max={3}
                    step={0.1}
                    value={[value]}
                    onValueChange={([next]) => patchWeight(key, Math.round((next ?? 1) * 10) / 10)}
                  />
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Так встанет выдача
            </p>
            {preview.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Туров в каталоге ещё нет — предпросмотр появится с первыми предложениями.
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {preview.map(({ tour, score }, i) => {
                  const hotel = getHotel(tour.hotelId);
                  return (
                    <li key={tour.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-card text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {tour.title ?? hotel?.name ?? "Тур"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatPrice(tour.price)} · балл {Math.round(score)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="size-4 text-premium" />
            Premium для туристов
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Подписка с закрытыми ценами. Оплаты попадут в «Деньги» после подключения провайдера.
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
              Сейчас туристы видят {formatPrice(saved.premiumMonthlyPrice)} на странице Premium.
            </p>
          </div>
          <p className="mt-4 border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Подписчиков: </span>
            <span className="font-semibold">{formatNumber(premiumUsers)}</span>
            {premiumUsers > 0 ? (
              <span className="text-muted-foreground">
                {" "}
                · {formatPrice(premiumUsers * saved.premiumMonthlyPrice)} в месяц
              </span>
            ) : null}
          </p>
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
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">В каталоге</dt>
              <dd className="font-medium">
                {formatNumber(state.organizations.length)}{" "}
                {pluralRu(state.organizations.length, "компания", "компании", "компаний")} ·{" "}
                {formatNumber(state.tours.length)}{" "}
                {pluralRu(state.tours.length, "тур", "тура", "туров")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Людей в базе</dt>
              <dd className="font-medium">{formatNumber(state.users.length)}</dd>
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
