import { Link } from "@tanstack/react-router";
import { Flame, Star } from "lucide-react";

import { SafeImage } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { destinations, formatPrice, getHotel, tourCover, type Tour } from "@/data/demo";
import { cn } from "@/lib/utils";

/**
 * Главная на телефоне: направления и горящие туры лентой.
 *
 * Турист приходит с одним вопросом — «куда и почём». Поэтому на карточке
 * страны стоит живая цена «от», а горящий тур показывает всё, что решает
 * покупку: отель, даты, сколько человек и насколько дешевле обычного.
 * Цены считаем по реальным предложениям компаний: нет тура — нет и обещания.
 */

/** Самая низкая живая цена по стране. */
function minPriceByDestination(tours: Tour[]): Map<string, number> {
  const min = new Map<string, number>();
  for (const tour of tours) {
    const hotel = getHotel(tour.hotelId);
    if (!hotel) continue;
    const current = min.get(hotel.destinationId);
    if (current === undefined || tour.price < current) min.set(hotel.destinationId, tour.price);
  }
  return min;
}

export function DestinationRail({ tours }: { tours: Tour[] }) {
  const minPrice = minPriceByDestination(tours);
  // Сначала страны, куда реально можно улететь, — остальные следом.
  const ordered = [...destinations].sort(
    (a, b) => (minPrice.has(b.id) ? 1 : 0) - (minPrice.has(a.id) ? 1 : 0),
  );

  return (
    <section className="container-page mt-8 md:mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Популярные направления
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Цены от компаний, которые сейчас продают эти туры
      </p>

      <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5">
        {ordered.map((dest) => {
          const from = minPrice.get(dest.id);
          return (
            <Link
              key={dest.id}
              to="/search"
              search={{ destination: dest.id } as never}
              className="w-[45%] shrink-0 snap-start md:w-auto"
            >
              <SafeImage
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className="aspect-square w-full rounded-2xl object-cover md:rounded-3xl"
              />
              <h3 className="mt-2 font-display text-base font-semibold leading-tight md:text-lg">
                {dest.country}
              </h3>
              <p className="text-sm text-muted-foreground">
                {from ? (
                  <>
                    от <span className="font-semibold text-foreground">{formatPrice(from)}</span>
                  </>
                ) : (
                  dest.city
                )}
              </p>
            </Link>
          );
        })}
      </div>

      <Button variant="secondary" className="mt-4 h-12 w-full md:hidden" asChild>
        <Link to="/destinations">Показать все</Link>
      </Button>
    </section>
  );
}

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });

const peopleLabel = (adults: number, children: number) => {
  const parts = [`${adults} ${adults === 1 ? "взрослый" : "взрослых"}`];
  if (children > 0) parts.push(`${children} ${children === 1 ? "ребёнок" : "детей"}`);
  return parts.join(", ");
};

function HotTourCard({ tour }: { tour: Tour }) {
  const hotel = getHotel(tour.hotelId);
  const discount =
    tour.oldPrice && tour.oldPrice > tour.price
      ? Math.round((1 - tour.price / tour.oldPrice) * 100)
      : 0;

  return (
    <Link
      to="/tour/$tourId"
      params={{ tourId: tour.id }}
      // text-foreground обязателен: блок вокруг белый по цвету, и без сброса
      // название отеля и цена наследуют его — белым по белой карточке.
      className="flex w-[85%] shrink-0 snap-start flex-col rounded-2xl bg-card p-3 text-foreground shadow-sm sm:w-auto"
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <SafeImage
            src={tourCover(tour, hotel)}
            alt={hotel?.name ?? "Тур"}
            loading="lazy"
            className="size-24 rounded-xl object-cover"
          />
          {discount > 0 ? (
            <span className="absolute -left-1 top-2 rounded-r-lg bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              −{discount}%
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          {hotel?.stars ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-premium/15 px-2 py-0.5">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star key={i} className="size-3 fill-premium text-premium" />
              ))}
            </span>
          ) : null}
          <h3 className="mt-1 line-clamp-2 font-display text-[15px] font-semibold leading-tight">
            {tour.title ?? hotel?.name ?? "Тур"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {hotel ? `${hotel.country}, ${hotel.city}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">{tour.meal}</p>
          <p className="mt-0.5 text-sm font-medium">
            {fmtDay(tour.dateStart)} — {fmtDay(tour.dateEnd)}, {tour.nights} ноч.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">
          {peopleLabel(tour.adults, tour.children)}
        </span>
        <span className="text-right">
          {tour.oldPrice && tour.oldPrice > tour.price ? (
            <span className="block text-sm text-muted-foreground line-through">
              {formatPrice(tour.oldPrice)}
            </span>
          ) : null}
          <span className="block font-display text-lg font-semibold leading-tight">
            {formatPrice(tour.price)}
          </span>
        </span>
      </div>
    </Link>
  );
}

export function HotToursRail({ tours }: { tours: Tour[] }) {
  if (tours.length === 0) return null;

  return (
    <section className="container-page mt-8 md:mt-12">
      {/* Тёплый блок: горящее должно выделяться среди спокойных секций. */}
      <div className="rounded-3xl bg-primary px-4 py-6 text-primary-foreground md:px-8 md:py-8">
        <h2 className="flex items-center justify-center gap-2 text-center font-display text-2xl font-semibold md:text-3xl">
          Горящие туры
          <Flame className="size-6" />
        </h2>
        <p className="mt-1 text-center text-sm text-primary-foreground/85">
          Компании снизили цену на ближайшие вылеты
        </p>

        <div
          className={cn(
            "-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-1",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3",
          )}
        >
          {tours.map((tour) => (
            <HotTourCard key={tour.id} tour={tour} />
          ))}
        </div>

        <Button
          variant="secondary"
          className="mt-5 h-12 w-full bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
          asChild
        >
          <Link to="/search" search={{ offers: "hot" } as never}>
            Посмотреть все горящие
          </Link>
        </Button>
      </div>
    </section>
  );
}
