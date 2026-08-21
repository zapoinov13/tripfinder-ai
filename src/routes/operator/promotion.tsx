import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Home, Megaphone, Sparkles, Star, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatPrice, nightsLabel, tourCover } from "@/data/demo";
import { mockPaymentProvider } from "@/lib/platform/adapters";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { appendAudit, getHotel, trackEvent } from "@/lib/platform/catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState, uid } from "@/lib/platform/store";
import type { PromotionType } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/promotion")({
  head: () => ({ meta: [{ title: "Продвижение · TourGo" }] }),
  component: OperatorPromotionPage,
});

const catalog: Array<{
  type: PromotionType;
  title: string;
  badge: string;
  where: string;
  forWhom: string;
  gets: string[];
  icon: typeof Megaphone;
}> = [
  {
    type: "BOOST",
    title: "Поднять в поиске",
    badge: "Хит",
    where: "Выдача поиска",
    forWhom: "Если тур уже опубликован и нужно больше просмотров.",
    gets: [
      "Тур поднимается выше обычных предложений",
      "На карточке появляется отметка «Хит»",
    ],
    icon: TrendingUp,
  },
  {
    type: "FEATURED",
    title: "В топе поиска",
    badge: "Выгодная цена",
    where: "Начало выдачи",
    forWhom: "Для сильных цен, которые хотите показать первыми.",
    gets: [
      "Тур ближе к началу результатов",
      "Отметка «Выгодная цена» на карточке",
    ],
    icon: Star,
  },
  {
    type: "PREMIUM_PLACEMENT",
    title: "Приоритет в фильтрах",
    badge: "Выгодная цена",
    where: "Поиск по стране, датам и питанию",
    forWhom: "Когда турист уже выбирает направление, а вам нужно быть рядом.",
    gets: [
      "Тур держится выше похожих предложений",
      "Та же заметная отметка на карточке",
    ],
    icon: Sparkles,
  },
  {
    type: "SPONSORED",
    title: "Рекомендуем",
    badge: "Рекомендуем",
    where: "Поиск и подборки",
    forWhom: "Если хотите, чтобы турист выбрал именно вашу компанию.",
    gets: [
      "Отметка «Рекомендуем»",
      "Выше в выдаче, чем обычные туры",
    ],
    icon: Megaphone,
  },
  {
    type: "HOME_FEATURE",
    title: "На главной",
    badge: "Рекомендуем",
    where: "Главная страница TourGo и поиск",
    forWhom: "Максимум показов: новый тур, сезон, акция.",
    gets: [
      "Карточка на главной странице",
      "Отметка «Рекомендуем» в поиске",
    ],
    icon: Home,
  },
];

const dayOptions = [
  { value: "3", label: "3 дня", hint: "Проверить эффект" },
  { value: "7", label: "7 дней", hint: "Обычный срок" },
  { value: "14", label: "14 дней", hint: "На пик сезона" },
  { value: "30", label: "30 дней", hint: "Держать тур в топе" },
];

function weekPrice(prices: Record<PromotionType, number>, type: PromotionType, days: number) {
  return Math.round((prices[type] * (days / 7)) / 1000) * 1000;
}

function OperatorPromotionPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  const [tourId, setTourId] = useState("");
  const [type, setType] = useState<PromotionType>("BOOST");
  const [days, setDays] = useState("7");
  if (!allowed || !organization || !user) return null;

  const tours = state.tours.filter(
    (t) => t.operatorOrgId === organization.id && t.status === "active",
  );
  const selected = catalog.find((p) => p.type === type)!;
  const daysCount = Number(days);
  const price = weekPrice(state.config.promotionPrices, type, daysCount);
  const chosenTour = tours.find((t) => t.id === tourId);

  const mine = useMemo(
    () => state.promotions.filter((p) => p.organizationId === organization.id),
    [state.promotions, organization.id],
  );
  const active = mine.filter((p) => p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > Date.now());

  const buy = async () => {
    if (!tourId) {
      toast.error("Сначала выберите тур");
      return;
    }
    const payment = await mockPaymentProvider.createPayment({
      amount: price,
      currency: "KZT",
      type: "promotion",
      metadata: { tourId, type, days },
    });
    const started = nowIso();
    const expires = new Date(Date.now() + daysCount * 86400000).toISOString();
    setState((s) => ({
      ...s,
      promotions: [
        {
          id: uid(),
          organizationId: organization.id,
          tourOfferId: tourId,
          type,
          durationDays: daysCount,
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
    toast.success("Продвижение включено. Туристы уже видят отметку на карточке.");
  };

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Продвижение"
      subtitle="Платите за конкретный тур и срок. Турист видит отметку на карточке и чаще открывает её."
    >
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
        Обычный тур виден в поиске. Продвижение ставит его выше и добавляет отметку: «Хит»,
        «Выгодная цена» или «Рекомендуем». Чем сильнее пакет, тем больше показов.
      </div>

      <h2 className="font-display text-lg font-semibold">Что за что</h2>
      <p className="mt-1 text-sm text-muted-foreground">Выберите пакет, затем тур и срок.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((item) => {
          const on = item.type === type;
          const Icon = item.icon;
          const weekly = state.config.promotionPrices[item.type];
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setType(item.type)}
              className={cn(
                "surface-card p-5 text-left transition-colors",
                on ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                {on ? (
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-display text-base font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.forWhom}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {item.gets.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{item.where}</span>
                <span className="rounded-full bg-premium/20 px-2.5 py-1 font-semibold text-ink">
                  Отметка: {item.badge}
                </span>
              </div>
              <p className="mt-4 font-display text-lg font-semibold">
                {formatPrice(weekly)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">за 7 дней</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="surface-card space-y-5 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Какой тур продвигать</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Отметка появится на этой карточке в поиске.
            </p>
          </div>
          {tours.length === 0 ? (
            <div className="rounded-2xl bg-secondary/60 p-5 text-sm">
              <p>Сначала опубликуйте тур, потом его можно продвигать.</p>
              <Button className="mt-3" asChild>
                <Link to="/operator/tours">Мои туры</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tours.slice(0, 12).map((t) => {
                const hotel = getHotel(t.hotelId);
                const on = t.id === tourId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTourId(t.id)}
                    className={cn(
                      "overflow-hidden rounded-2xl border text-left transition-colors",
                      on ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
                    )}
                  >
                    <img src={tourCover(t, hotel)} alt="" className="h-24 w-full object-cover" />
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{t.title || hotel.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {nightsLabel(t.nights)} · {t.meal} · {formatPrice(t.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold">На сколько дней</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {dayOptions.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDays(d.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left",
                    days === d.value
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{d.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="surface-card h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold">К оплате</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">Пакет</span>
              <span className="text-right font-medium">{selected.title}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">Тур</span>
              <span className="truncate text-right font-medium">
                {chosenTour ? chosenTour.title || getHotel(chosenTour.hotelId).name : "Не выбран"}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">Срок</span>
              <span className="font-medium">{daysCount} дн.</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">Отметка</span>
              <span className="font-medium">{selected.badge}</span>
            </li>
          </ul>
          <p className="border-t border-border pt-4 font-display text-2xl font-semibold">
            {formatPrice(price)}
          </p>
          <p className="text-xs text-muted-foreground">
            Деньги идут за показы карточки. Турист платит компании за сам тур.
          </p>
          <Button className="w-full" disabled={!tourId} onClick={() => void buy()}>
            Включить продвижение
          </Button>
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Сейчас работает</h2>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Активного продвижения нет. Выберите пакет выше, и отметка появится на карточке тура.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {active.map((p) => {
              const tour = state.tours.find((t) => t.id === p.tourOfferId);
              const hotel = tour ? getHotel(tour.hotelId) : null;
              const pack = catalog.find((c) => c.type === p.type);
              const left = Math.max(
                0,
                Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 86400000),
              );
              return (
                <li key={p.id} className="surface-card flex gap-3 p-4">
                  {tour && hotel ? (
                    <img
                      src={tourCover(tour, hotel)}
                      alt=""
                      className="size-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tour?.title || hotel?.name || "Тур"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {pack?.title} · отметка «{pack?.badge}»
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ещё {left} дн. · {formatPrice(p.price)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </DashShell>
  );
}
