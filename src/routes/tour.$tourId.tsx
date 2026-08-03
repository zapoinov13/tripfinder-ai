import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bath,
  Bus,
  CheckCircle2,
  Heart,
  MapPin,
  MessageSquare,
  Plane,
  Scale,
  Sparkles,
  Star,
  UtensilsCrossed,
  Waves,
  Wifi,
} from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
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
  galleryImages,
  getHotel,
  getOperator,
  getTour,
  guestsLabel,
  nightsLabel,
  type Hotel,
  type Tour,
} from "@/data/demo";
import { useTourState } from "@/lib/tour-state";
import { cn } from "@/lib/utils";

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
        meta: [{ title: "Тур не найден — Voyago" }, { name: "robots", content: "noindex" }],
      };
    }
    const { hotel, tour } = loaderData;
    const title = `${hotel.name}, ${hotel.city} — тур за ${formatPrice(tour.price)}`;
    const description = `${hotel.name} ${hotel.stars}★ · ${tour.meal} · ${nightsLabel(tour.nights)} · рейтинг ${hotel.rating}. Сравните предложения операторов.`;
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
  const reasons: string[] = [];
  if (tour.price <= 1500000) reasons.push("Подходит под средний бюджет туристов из Казахстана");
  if (tour.mealCode === "AI" || tour.mealCode === "UAI") reasons.push(`Питание ${tour.meal}`);
  if (hotel.beachLine === 1) reasons.push("Первая линия у моря");
  if (hotel.distanceToSea <= 150) reasons.push(`Всего ${hotel.distanceToSea} м до пляжа`);
  if (hotel.amenities.includes("Kids Club") || tour.children > 0)
    reasons.push("Подходит для отдыха с детьми");
  if (hotel.amenities.includes("Spa")) reasons.push("Spa-центр на территории");
  if (hotel.rating >= 9) reasons.push(`Рейтинг ${hotel.rating.toFixed(1)} — превосходно`);
  else reasons.push(`Рейтинг ${hotel.rating.toFixed(1)} по отзывам гостей`);
  if (tour.transfer) reasons.push("Трансфер включён в стоимость");
  if (tour.tags.includes("hot")) reasons.push("Горящая цена — дешевле обычной");
  if (tour.nights <= 7) reasons.push(`Короткая поездка на ${nightsLabel(tour.nights)}`);
  return reasons.slice(0, 6);
}

function TourPage() {
  const { tour, hotel, operator } = Route.useLoaderData();
  const { isFavorite, toggleFavorite, isCompared, toggleCompare } = useTourState();
  const [bookingOpen, setBookingOpen] = useState(false);
  const fav = isFavorite(tour.id);
  const compared = isCompared(tour.id);
  const aiReasons = buildAiReasons(tour, hotel);

  return (
    <SiteLayout>
      <div className="container-page py-6 pb-28 lg:pb-6">
        <div className="grid gap-2 overflow-hidden rounded-3xl md:grid-cols-[2fr_1fr] md:grid-rows-2">
          <img
            src={galleryImages[0]}
            alt={hotel.name}
            className="h-64 w-full object-cover md:row-span-2 md:h-[420px]"
          />
          {galleryImages.slice(1, 3).map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`${hotel.name} фото ${i + 2}`}
              loading="lazy"
              className="hidden h-[206px] w-full object-cover md:block"
            />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold md:text-4xl">{hotel.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {hotel.city}, {hotel.country}
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
            <section className="surface-card p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold">Об отеле</h2>
              <p className="mt-3 text-muted-foreground">
                {hotel.name} — курортный комплекс {hotel.stars}★ в районе {hotel.district}, в{" "}
                {hotel.distanceToSea} м от моря. Просторные номера, несколько бассейнов, spa-центр и
                собственный пляж. Отель подходит как для семейного отдыха, так и для спокойного
                отпуска вдвоём.
              </p>
            </section>

            <section className="surface-card p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold">Что входит</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Plane, text: `Перелёт ${tour.from} → ${hotel.city}` },
                  { icon: MapPin, text: `Проживание, ${nightsLabel(tour.nights)}` },
                  { icon: UtensilsCrossed, text: `${tour.mealCode} · ${tour.meal}` },
                  { icon: Bus, text: tour.transfer ? "Групповой трансфер" : "Трансфер не включён" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-sm">
                    <span className="grid size-9 place-items-center rounded-xl bg-secondary">
                      <item.icon className="size-4" />
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface-card p-6 md:p-8">
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

            <section className="surface-card overflow-hidden">
              <div className="p-6 md:p-8">
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

            <section className="gradient-ai overflow-hidden rounded-3xl p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold text-primary-foreground">
                ✨ Почему этот тур подходит вам
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
          </div>

          <aside>
            <div className="surface-card sticky top-24 p-6">
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
                <div className="text-sm text-muted-foreground">Цена за тур</div>
                <div className="font-display text-3xl font-semibold">{formatPrice(tour.price)}</div>
                <div className="mt-1 text-xs text-muted-foreground">от {operator.name}</div>
              </div>

              <Button size="lg" className="mt-6 w-full" onClick={() => setBookingOpen(true)}>
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
              <Button variant="ghost" size="sm" className="mt-2 w-full" asChild>
                <Link to="/compare">Перейти к сравнению</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
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
          <Button className="flex-1" onClick={() => setBookingOpen(true)}>
            Забронировать — {formatPrice(tour.price)}
          </Button>
        </div>
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Бронирование</DialogTitle>
            <DialogDescription>
              Бронирование будет доступно после подключения оператора.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-secondary p-4 text-sm">
            <div className="font-semibold">{hotel.name}</div>
            <div className="mt-1 text-muted-foreground">
              {tour.dateStart} – {tour.dateEnd} · {nightsLabel(tour.nights)} · {tour.meal}
            </div>
            <div className="mt-2 font-display text-xl font-semibold">{formatPrice(tour.price)}</div>
            <div className="text-xs text-muted-foreground">от {operator.name}</div>
          </div>
          <Button onClick={() => setBookingOpen(false)}>Понятно</Button>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}