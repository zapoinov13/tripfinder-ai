import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bath,
  Bus,
  CheckCircle2,
  Heart,
  MapPin,
  Plane,
  Scale,
  Sparkles,
  Star,
  UtensilsCrossed,
  Waves,
  Wifi,
} from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import {
  formatPrice,
  galleryImages,
  getHotel,
  getOperator,
  getTour,
  guestsLabel,
  nightsLabel,
} from "@/data/demo";

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

const amenityIcons = [
  { icon: Wifi, label: "Wi-Fi" },
  { icon: Waves, label: "Pool" },
  { icon: Bath, label: "Spa" },
  { icon: Bus, label: "Kids Club" },
  { icon: MapPin, label: "Beach" },
  { icon: UtensilsCrossed, label: "Restaurant" },
];

const aiReasons = [
  "Первая линия",
  "Подходит для отдыха с детьми",
  "All Inclusive",
  "В вашем бюджете",
  "Рядом с инфраструктурой",
];

function TourPage() {
  const { tour, hotel, operator } = Route.useLoaderData();

  return (
    <SiteLayout>
      <div className="container-page py-6">
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
                  { icon: UtensilsCrossed, text: tour.meal },
                  { icon: Bus, text: "Групповой трансфер" },
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
                {amenityIcons.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm"
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </span>
                ))}
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
              </ul>

              <div className="mt-6 border-t border-border pt-6">
                <div className="text-sm text-muted-foreground">Цена за тур</div>
                <div className="font-display text-3xl font-semibold">{formatPrice(tour.price)}</div>
                <div className="mt-1 text-xs text-muted-foreground">от {operator.name}</div>
              </div>

              <Button size="lg" className="mt-6 w-full">
                Забронировать
              </Button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Heart className="size-4" />
                  В избранное
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/compare">
                    <Scale className="size-4" />
                    Сравнить
                  </Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}