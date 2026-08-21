import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import {
  Bath,
  Bell,
  Bus,
  CheckCircle2,
  Clock3,
  Heart,
  MapPin,
  MessageSquare,
  Plane,
  Scale,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  TicketCheck,
  UtensilsCrossed,
  Waves,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { PhotoGallery } from "@/components/media/photo-gallery";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  amenityLabels,
  formatPrice,
  formatNumber,
  getOperator,
  getTour,
  guestsLabel,
  nightsLabel,
  offerCategoryLabels,
  availabilityLabel,
  priceFreshnessMinutes,
  supplierTrustScore,
  tourPhotos,
  type Hotel,
  type Tour,
} from "@/data/demo";
import { youtubeEmbed } from "@/lib/image-file";
import { useAuth } from "@/lib/platform/auth";
import { aiExplanationService } from "@/lib/platform/ai-services";
import { createBookingFlow } from "@/lib/platform/booking";
import { getHotel, trackEvent } from "@/lib/platform/catalog";
import { useTourState } from "@/lib/tour-state";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tour/$tourId")({
  loader: ({ params }) => {
    const tour = getTour(params.tourId);
    if (!tour) throw notFound();
    const hotel = getHotel(tour.hotelId);
    return { tour, hotel, operator: getOperator(tour.operatorId) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Предложение не найдено · TourGo" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { hotel, tour } = loaderData;
    const title = `${hotel.name}, ${hotel.city}: ${offerCategoryLabels[tour.offerCategory ?? "tour"]} за ${formatPrice(tour.price)}`;
    const description = `${hotel.name} ${hotel.stars}★ · ${tour.meal} · ${nightsLabel(tour.nights)} · рейтинг ${hotel.rating}. Проверяем цену и наличие перед бронью.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: TourPage,
});

const amenityIconMap: Record<string, typeof Wifi> = {
  "Wi-Fi": Wifi,
  Pool: Waves,
  Spa: Bath,
  "Kids Club": Bus,
  Beach: MapPin,
  Transfer: Bus,
};

function buildAiReasons(tour: Tour, hotel: Hotel) {
  return aiExplanationService.explain(tour, hotel);
}

function buildPriceBreakdown(tour: Tour) {
  const flight = Math.round((tour.price * 0.28) / 1000) * 1000;
  const stay = Math.round((tour.price * 0.48) / 1000) * 1000;
  const meal = Math.round((tour.price * 0.12) / 1000) * 1000;
  const transfer = tour.transfer ? Math.round((tour.price * 0.04) / 1000) * 1000 : 0;
  const extras = Math.max(0, tour.price - flight - stay - meal - transfer);
  const discount = tour.oldPrice ? tour.oldPrice - tour.price : 0;

  return [
    ["Авиаперелёт", flight],
    ["Проживание", stay],
    ["Питание", meal],
    ["Трансфер", transfer],
    ["Дополнительные услуги", extras],
    ...(discount > 0 ? [["Скидка", -discount] as [string, number]] : []),
    ...(tour.premiumPrice ? [["Premium price", tour.premiumPrice] as [string, number]] : []),
  ] as Array<[string, number]>;
}

function TourPage() {
  const { tour, hotel, operator } = Route.useLoaderData();
  const gallery = tourPhotos(tour, hotel);
  const navigate = useNavigate();
  const { user, isAuthenticated, isPremium } = useAuth();
  const {
    isFavorite,
    toggleFavorite,
    isCompared,
    toggleCompare,
    getPriceAlert,
    upsertPriceAlert,
    removePriceAlert,
  } = useTourState();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<"form" | "loading" | "done">("form");
  const [passengerName, setPassengerName] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [confirmedId, setConfirmedId] = useState("");
  const fav = isFavorite(tour.id);
  const compared = isCompared(tour.id);
  const priceAlert = getPriceAlert(tour.id);
  const aiReasons = buildAiReasons(tour, hotel);
  const targetPrice = Math.round((tour.price * 0.9) / 1000) * 1000;
  const priceBreakdown = buildPriceBreakdown(tour);
  const isPremiumDeal = tour.tags.includes("premium") && Boolean(tour.premiumPrice);
  const displayPrice =
    isPremiumDeal && isPremium && tour.premiumPrice ? tour.premiumPrice : tour.price;
  const trust = supplierTrustScore(operator.id);
  const whatsappText = encodeURIComponent(
    `Здравствуйте! Хочу уточнить предложение TourGo: ${hotel.name}, ${tour.dateStart}–${tour.dateEnd}, ${formatPrice(displayPrice)}. ID брони: ${confirmedId || tour.id}`,
  );

  useEffect(() => {
    trackEvent("TOUR_VIEWED", user?.id, { tourId: tour.id });
  }, [tour.id, user?.id]);

  const shareTour = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({
        title: hotel.name,
        text: `${hotel.name}, ${formatPrice(displayPrice)}`,
        url,
      });
      return;
    }
    await navigator.clipboard?.writeText(url);
  };

  const startBooking = async () => {
    if (!isAuthenticated || !user) {
      navigate({ to: "/login" });
      return;
    }
    const [firstName, ...rest] = passengerName.trim().split(/\s+/);
    if (!firstName) {
      setBookingError("Укажите имя пассажира");
      return;
    }
    setBookingStep("loading");
    setBookingError("");
    try {
      const booking = await createBookingFlow({
        userId: user.id,
        tourId: tour.id,
        passengers: [
          {
            firstName,
            lastName: rest.join(" ") || "нет",
            type: "adult",
          },
        ],
      });
      setConfirmedId(booking.id);
      setBookingStep("done");
    } catch (e) {
      setBookingStep("form");
      setBookingError(e instanceof Error ? e.message : "Ошибка бронирования");
    }
  };

  return (
    <SiteLayout>
      <div className="container-page py-4 pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:py-6 lg:pb-6">
        <PhotoGallery images={gallery} alt={tour.title || hotel.name} />

        <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight md:text-4xl">
              {tour.title || hotel.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {offerCategoryLabels[tour.offerCategory ?? "tour"]} · {hotel.city}, {hotel.country}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-0.5 text-premium">
                {Array.from({ length: hotel.stars }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </span>
              <span className="rounded-lg bg-accent/10 px-2.5 py-1 text-sm font-semibold text-accent">
                {hotel.rating.toFixed(1)} / 10
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageSquare className="size-4" />
                {formatNumber(hotel.reviews)} отзывов
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-8">
            <section className="surface-card p-5 md:p-8">
              <h2 className="font-display text-xl font-semibold">О предложении</h2>
              <p className="mt-3 text-muted-foreground">
                {tour.description?.trim()
                  ? tour.description
                  : `${hotel.name}, ${offerCategoryLabels[tour.offerCategory ?? "tour"].toLowerCase()} в районе ${hotel.district}. Перед бронью компания подтверждает цену и наличие мест.`}
              </p>
            </section>

            <section className="surface-card p-5 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Поставщик и доверие</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {operator.name} подключён к TourGo как проверенный поставщик. Мы фиксируем
                    заявку, проверку цены и историю статусов в кабинете.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
                  <ShieldCheck className="size-4" />
                  Проверен
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Рейтинг поставщика", value: `${trust.rating} / 5` },
                  { label: "Средний ответ", value: `~${trust.responseMinutes} мин` },
                  { label: "Брони через TourGo", value: formatNumber(trust.confirmedBookings) },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-secondary p-4">
                    <div className="font-display text-xl font-semibold">{item.value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card p-5 md:p-8">
              <h2 className="font-display text-xl font-semibold">Что входит</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {(tour.includes?.length
                  ? tour.includes.map((text) => ({ icon: CheckCircle2, text }))
                  : [
                      {
                        icon: Plane,
                        text:
                          tour.offerCategory === "hotel" || tour.offerCategory === "excursion"
                            ? `Старт для туристов из ${tour.from}`
                            : `Перелёт или пакет из ${tour.from} → ${hotel.city}`,
                      },
                      {
                        icon: MapPin,
                        text:
                          tour.offerCategory === "excursion"
                            ? `Впечатление в районе ${hotel.district}`
                            : tour.offerCategory === "transfer"
                              ? `Маршрут и время подтверждаются компанией`
                              : `Проживание, ${nightsLabel(tour.nights)}`,
                      },
                      { icon: UtensilsCrossed, text: tour.meal },
                      {
                        icon: Bus,
                        text: tour.transfer
                          ? "Трансфер включён"
                          : "Трансфер уточняется у компании",
                      },
                    ]
                ).map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-sm">
                    <span className="grid size-9 place-items-center rounded-xl bg-secondary">
                      <item.icon className="size-4" />
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
              {tour.excludes?.length ? (
                <div className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Не входит</p>
                  <p className="mt-1">{tour.excludes.join(", ")}</p>
                </div>
              ) : null}
            </section>

            <section className="surface-card p-5 md:p-8">
              <h2 className="font-display text-xl font-semibold">Удобства</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {hotel.amenities.map((key: string) => {
                  const Icon = amenityIconMap[key] ?? CheckCircle2;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {amenityLabels[key] ?? key}
                    </span>
                  );
                })}
              </div>
            </section>

            {tour.videos?.length ? (
              <section className="surface-card space-y-4 p-5 md:p-8">
                <h2 className="font-display text-xl font-semibold">Видео</h2>
                {tour.videos.map((src) => {
                  const embed = youtubeEmbed(src);
                  return embed ? (
                    <iframe
                      key={src}
                      title="Видео отеля"
                      src={embed}
                      className="aspect-video w-full rounded-2xl"
                      allowFullScreen
                    />
                  ) : (
                    <a
                      key={src}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Смотреть видео
                    </a>
                  );
                })}
              </section>
            ) : null}

            <section className="surface-card overflow-hidden">
              <div className="p-5 md:p-8">
                <h2 className="font-display text-xl font-semibold">Расположение</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hotel.district} · {hotel.distanceToSea} м до моря
                </p>
              </div>
              <div className="relative h-64 bg-[linear-gradient(135deg,var(--secondary),var(--primary-soft))]">
                <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:36px_36px]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lift">
                  {hotel.name}
                </div>
              </div>
            </section>

            <section className="gradient-ai overflow-hidden rounded-3xl p-5 md:p-8">
              <h2 className="font-display text-xl font-semibold text-primary-foreground">
                ✨ Почему это предложение подходит вам
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {aiReasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-center gap-2.5 text-sm text-primary-foreground"
                  >
                    <CheckCircle2 className="size-4 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="mt-6">
                <Sparkles className="size-4" />
                Спросить AI
              </Button>
            </section>

            <section className="surface-card p-5 md:p-8">
              <h2 className="font-display text-xl font-semibold">Price breakdown</h2>
              <div className="mt-4 space-y-3">
                {priceBreakdown.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn("font-medium", value < 0 && "text-success")}>
                      {value < 0 ? "−" : ""}
                      {formatPrice(Math.abs(value))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-border pt-4 font-display text-lg font-semibold">
                  <span>Итого</span>
                  <span>{formatPrice(tour.price)}</span>
                </div>
              </div>
            </section>
          </div>

          <aside>
            <div className="surface-card sticky top-24 p-5 md:p-6">
              <ul className="space-y-2.5 text-sm">
                <li className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Даты</span>
                  <span className="font-medium">
                    {tour.dateStart} – {tour.dateEnd}
                  </span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Длительность</span>
                  <span className="font-medium">{nightsLabel(tour.nights)}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Туристы</span>
                  <span className="font-medium">{guestsLabel(tour.adults, tour.children)}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Питание</span>
                  <span className="font-medium">{tour.meal}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Номер</span>
                  <span className="font-medium">
                    {hotel.stars >= 5 ? "Deluxe Sea View" : "Standard Room"}
                  </span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Трансфер</span>
                  <span className="font-medium">{tour.transfer ? "Включён" : "Нет"}</span>
                </li>
              </ul>

              <div className="mt-6 border-t border-border pt-6">
                <div className="text-sm text-muted-foreground">Цена за предложение</div>
                {isPremiumDeal && !isPremium ? (
                  <>
                    <div className="font-display text-3xl font-semibold">Premium Deal</div>
                    <Button className="mt-3 w-full" asChild>
                      <Link to="/premium">Открыть Premium</Link>
                    </Button>
                  </>
                ) : (
                  <div className="font-display text-3xl font-semibold">
                    {formatPrice(displayPrice)}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">от {operator.name}</div>
              </div>

              <div className="mt-5 grid gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                  <Clock3 className="size-4 text-accent" />
                  Цена проверялась {priceFreshnessMinutes(tour)} мин назад
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                  <TicketCheck className="size-4 text-primary" />
                  {availabilityLabel(tour)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                  <ShieldCheck className="size-4 text-success" />
                  Оплата после price check
                </span>
              </div>

              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={() => {
                  setBookingOpen(true);
                  setBookingStep("form");
                }}
              >
                Забронировать
              </Button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant={fav ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleFavorite(tour.id)}
                >
                  <Heart className={cn("size-4", fav && "fill-current text-primary")} />
                  {fav ? "В избранном" : "В избранное"}
                </Button>
                <Button
                  variant={compared ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleCompare(tour.id)}
                >
                  <Scale className="size-4" />
                  {compared ? "В сравнении" : "Сравнить"}
                </Button>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={shareTour}>
                <Share2 className="size-4" />
                Поделиться
              </Button>
              <Button variant="ghost" size="sm" className="mt-2 w-full" asChild>
                <Link to="/compare">Перейти к сравнению</Link>
              </Button>
              <Button
                variant={priceAlert ? "secondary" : "outline"}
                size="sm"
                className="mt-2 w-full"
                onClick={() => setAlertOpen(true)}
              >
                <Bell className="size-4" />
                {priceAlert
                  ? `Alert до ${formatPrice(priceAlert.targetPrice)}`
                  : "Сообщить о снижении цены"}
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 p-3 shadow-[0_-10px_30px_oklch(0.2_0.02_250/0.08)] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="В избранное"
            onClick={() => toggleFavorite(tour.id)}
          >
            <Heart className={cn("size-4", fav && "fill-current text-primary")} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Сравнить"
            onClick={() => toggleCompare(tour.id)}
          >
            <Scale className="size-4" />
          </Button>
          <Button className="min-w-0 flex-1 px-3" onClick={() => setBookingOpen(true)}>
            <span className="truncate">Забронировать, {formatPrice(displayPrice)}</span>
          </Button>
        </div>
      </div>

      <Dialog
        open={bookingOpen}
        onOpenChange={(open) => {
          setBookingOpen(open);
          if (!open) {
            setBookingStep("form");
            setBookingError("");
          }
        }}
      >
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Бронирование</DialogTitle>
            <DialogDescription>
              Перед оплатой проверяем цену и наличие у поставщика. Если instant API недоступен,
              заявка уйдёт на ручное подтверждение.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-secondary p-4 text-sm">
            <div className="font-semibold">{hotel.name}</div>
            <div className="mt-1 text-muted-foreground">
              {tour.dateStart} – {tour.dateEnd} · {nightsLabel(tour.nights)} · {tour.meal}
            </div>
            <div className="mt-2 font-display text-xl font-semibold">
              {formatPrice(displayPrice)}
            </div>
            <div className="text-xs text-muted-foreground">от {operator.name}</div>
          </div>
          {bookingStep === "form" ? (
            <div className="space-y-3">
              <div className="grid gap-2 rounded-2xl border border-border p-4 text-sm">
                {[
                  "Проверим цену и места у поставщика",
                  "Зафиксируем заявку в TourGo",
                  "После подтверждения покажем ID брони и отправим уведомление",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passenger">Пассажир (ФИО)</Label>
                <Input
                  id="passenger"
                  placeholder="Айгерим Касымова"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                />
              </div>
              {bookingError ? <p className="text-sm text-destructive">{bookingError}</p> : null}
              <Button onClick={startBooking} className="w-full">
                Проверить и оплатить
              </Button>
            </div>
          ) : null}
          {bookingStep === "loading" ? (
            <div className="space-y-3 text-sm">
              {[
                "Отправляем price check поставщику",
                "Проверяем наличие мест",
                "Готовим подтверждение заявки",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="size-4 animate-pulse text-primary" />
                  {item}
                </div>
              ))}
            </div>
          ) : null}
          {bookingStep === "done" ? (
            <div className="space-y-3">
              <p className="text-sm text-success">Бронирование {confirmedId} подтверждено.</p>
              <Button variant="outline" className="w-full" asChild>
                <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noreferrer">
                  Написать в WhatsApp по заявке
                </a>
              </Button>
              <Button asChild className="w-full">
                <Link to="/profile/trips">Мои поездки</Link>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Price alert</DialogTitle>
            <DialogDescription>
              Сообщим, если цена на это предложение опустится ниже выбранного порога.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-secondary p-4 text-sm">
            <div className="font-semibold">{hotel.name}</div>
            <div className="mt-1 text-muted-foreground">
              Текущая цена: {formatPrice(tour.price)}
            </div>
            <div className="mt-2 font-display text-xl font-semibold">
              Порог: {formatPrice(priceAlert?.targetPrice ?? targetPrice)}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() => {
                upsertPriceAlert({
                  tourId: tour.id,
                  currentPrice: tour.price,
                  targetPrice: priceAlert?.targetPrice ?? targetPrice,
                });
                setAlertOpen(false);
              }}
            >
              <Bell className="size-4" />
              Сохранить alert
            </Button>
            {priceAlert ? (
              <Button
                variant="outline"
                onClick={() => {
                  removePriceAlert(tour.id);
                  setAlertOpen(false);
                }}
              >
                Удалить
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
