import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Home, Megaphone, Sparkles, Star, TrendingUp, Wallet, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatPrice, nightsLabel, tourCover } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { getHotel } from "@/lib/platform/catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  calcPromotionPrice,
  cancelPromotion,
  expireStalePromotions,
  getActiveOrgPromotions,
  getPromotionPrices,
  promotionCatalogMeta,
  purchasePromotion,
  topUpPromotionBalance,
} from "@/lib/platform/promotions";
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
    gets: ["Тур поднимается выше обычных", "На карточке отметка «Хит»"],
    icon: TrendingUp,
  },
  {
    type: "FEATURED",
    title: "В топе поиска",
    badge: "Выгодная цена",
    where: "Начало выдачи",
    forWhom: "Для сильных цен, которые хотите показать первыми.",
    gets: ["Тур ближе к началу результатов", "Отметка «Выгодная цена»"],
    icon: Star,
  },
  {
    type: "PREMIUM_PLACEMENT",
    title: "Приоритет в фильтрах",
    badge: "Выгодная цена",
    where: "Поиск по стране и датам",
    forWhom: "Когда турист уже выбирает направление.",
    gets: ["Тур держится выше похожих", "Заметная отметка на карточке"],
    icon: Sparkles,
  },
  {
    type: "SPONSORED",
    title: "Рекомендуем",
    badge: "Рекомендуем",
    where: "Поиск и подборки",
    forWhom: "Чтобы турист выбрал именно вашу компанию.",
    gets: ["Отметка «Рекомендуем»", "Выше в выдаче"],
    icon: Megaphone,
  },
  {
    type: "HOME_FEATURE",
    title: "На главной",
    badge: "Рекомендуем",
    where: "Главная TourGo",
    forWhom: "Максимум показов: новый тур, сезон, акция.",
    gets: ["Карточка на главной", "Отметка в поиске"],
    icon: Home,
  },
];

const dayOptions = [
  { value: "3", label: "3 дня", hint: "Проверить эффект" },
  { value: "7", label: "7 дней", hint: "Обычный срок" },
  { value: "14", label: "14 дней", hint: "На пик сезона" },
  { value: "30", label: "30 дней", hint: "Держать в топе" },
];

function OperatorPromotionPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  const [tourId, setTourId] = useState("");
  const [type, setType] = useState<PromotionType>("BOOST");
  const [days, setDays] = useState("7");
  const [payFromBalance, setPayFromBalance] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    expireStalePromotions();
  }, [state.promotions.length]);

  const tours = useMemo(
    () =>
      organization
        ? state.tours.filter((t) => t.operatorOrgId === organization.id && t.status === "active")
        : [],
    [organization, state.tours],
  );

  const prices = useMemo(() => getPromotionPrices(), [state.config.promotionPrices]);
  const active = useMemo(
    () => (organization ? getActiveOrgPromotions(organization.id) : []),
    [organization, state.promotions],
  );

  if (!allowed || !organization || !user) return null;

  const selected = catalog.find((p) => p.type === type)!;
  const daysCount = Number(days);
  const price = calcPromotionPrice(type, daysCount);
  const chosenTour = tours.find((t) => t.id === tourId);
  const canAfford = organization.promotionBalance >= price;

  const buy = async () => {
    if (!tourId) {
      toast.error("Сначала выберите тур");
      return;
    }
    if (payFromBalance && !canAfford) {
      toast.error("Недостаточно средств на балансе продвижения");
      return;
    }

    setBuying(true);
    try {
      const result = await purchasePromotion({
        organizationId: organization.id,
        userId: user.id,
        tourId,
        type,
        days: daysCount,
        payFromBalance,
      });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      toast.success(
        result.paidFromBalance
          ? "Продвижение включено. Списано с баланса."
          : "Продвижение включено. Туристы уже видят отметку.",
      );
    } finally {
      setBuying(false);
    }
  };

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Продвижение"
      subtitle="Оплатите с баланса или картой. Отметка появится на карточке тура в поиске и на главной."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/operator/billing">Пополнить баланс</Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Баланс продвижения"
          value={formatPrice(organization.promotionBalance)}
          hint="списывается при включении"
          emphasis={organization.promotionBalance < price}
        />
        <KpiCard label="Активных кампаний" value={String(active.length)} hint="сейчас работают" />
        <KpiCard
          label="Стоимость выбранного"
          value={formatPrice(price)}
          hint={`${selected.title} · ${daysCount} дн.`}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
        Обычный тур виден в поиске. Продвижение поднимает его выше и добавляет отметку: «Хит»,
        «Выгодная цена» или «Рекомендуем». Пакет «На главной» показывает тур на главной странице
        TourGo.
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Выберите пакет</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((item) => {
          const on = item.type === type;
          const Icon = item.icon;
          const weekly = prices[item.type];
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setType(item.type)}
              className={cn(
                "surface-card p-5 text-left transition-all",
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
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">
                  {item.where}
                </span>
                <span className="rounded-full bg-premium/20 px-2.5 py-1 font-semibold text-ink">
                  {item.badge}
                </span>
              </div>
              <p className="mt-4 font-display text-lg font-semibold">
                {formatPrice(weekly)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ 7 дней</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
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
                const tourActive = active.filter((p) => p.tourOfferId === t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTourId(t.id)}
                    className={cn(
                      "overflow-hidden rounded-2xl border text-left transition-colors",
                      on
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <img src={tourCover(t, hotel)} alt="" className="h-24 w-full object-cover" />
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{t.title || hotel.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {nightsLabel(t.nights)} · {t.meal} · {formatPrice(t.price)}
                      </p>
                      {tourActive.length > 0 ? (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-success">
                          <Zap className="size-3" />
                          Продвигается · {tourActive.length}
                        </p>
                      ) : null}
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

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPayFromBalance(true)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                payFromBalance
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/40",
              )}
            >
              <Wallet className="size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">С баланса</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatPrice(organization.promotionBalance)} доступно
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPayFromBalance(false)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                !payFromBalance
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span className="grid size-4 shrink-0 place-items-center rounded bg-secondary text-[10px] font-bold">
                ₸
              </span>
              <span>
                <span className="font-medium">Картой (демо)</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Мгновенная оплата
                </span>
              </span>
            </button>
          </div>

          {payFromBalance && !canAfford ? (
            <p className="text-xs text-premium">
              Не хватает {formatPrice(price - organization.promotionBalance)}. Пополните баланс или
              оплатите картой.
            </p>
          ) : null}

          <Button
            className="w-full"
            disabled={!tourId || buying || (payFromBalance && !canAfford)}
            onClick={() => void buy()}
          >
            {buying ? "Подключаем…" : "Включить продвижение"}
          </Button>

          {import.meta.env.DEV ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                topUpPromotionBalance(organization.id, 100_000);
                toast.success("Баланс пополнен на 100 000 ₸ (демо)");
              }}
            >
              +100 000 ₸ для теста
            </Button>
          ) : null}
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Сейчас работает</h2>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Активного продвижения нет. Выберите пакет, тур и нажмите «Включить продвижение».
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {active.map((p) => {
              const tour = state.tours.find((t) => t.id === p.tourOfferId);
              const hotel = tour ? getHotel(tour.hotelId) : null;
              const pack = promotionCatalogMeta[p.type];
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{tour?.title || hotel?.name || "Тур"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {pack.title} · «{pack.badge}»
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ещё {left} дн. · {formatPrice(p.price)}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-8 px-2 text-xs"
                      onClick={() => {
                        if (
                          cancelPromotion({
                            promotionId: p.id,
                            organizationId: organization.id,
                            actorId: user.id,
                          })
                        ) {
                          toast.success("Продвижение остановлено");
                        }
                      }}
                    >
                      Остановить
                    </Button>
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
