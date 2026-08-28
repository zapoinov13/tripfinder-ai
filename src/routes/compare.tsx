import { Link, createFileRoute } from "@tanstack/react-router";
import { Scale, Sparkles, X } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import {
  amenityLabels,
  formatPrice,
  getHotel,
  getOperator,
  getTour,
  nightsLabel,
  tourCover,
  type Tour,
} from "@/data/demo";
import { useTourState } from "@/lib/tour-state";
import { aiRecommendationService } from "@/lib/platform/ai-services";
import { tourSeller } from "@/lib/platform/tour-seller";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/compare")({
  head: () => privatePage("Сравнение туров"),
  component: ComparePage,
});

function ComparePage() {
  const { compare, removeCompare, clearCompare } = useTourState();
  const selected = compare.map((id) => getTour(id)).filter((t) => t !== undefined);

  const bestId =
    selected.length > 1
      ? selected.reduce((best, t) => {
          const score = (x: Tour) => getHotel(x.hotelId).rating / (x.price / 1000000);
          return score(t) > score(best) ? t : best;
        }, selected[0]!).id
      : selected[0]?.id;

  const fields: Array<[string, (t: Tour) => string]> = [
    ["Отель", (t) => getHotel(t.hotelId).name],
    ["Поставщик", (t) => tourSeller(t).name],
    ["Цена", (t) => formatPrice(t.price)],
    ["Рейтинг", (t) => `${getHotel(t.hotelId).rating.toFixed(1)} / 10`],
    ["Звёзды", (t) => `${getHotel(t.hotelId).stars}★`],
    ["Даты", (t) => `${t.dateStart} – ${t.dateEnd}`],
    ["Ночи", (t) => nightsLabel(t.nights)],
    ["Питание", (t) => `${t.mealCode} · ${t.meal}`],
    ["Перелёт", (t) => `${t.from} → ${getHotel(t.hotelId).city}`],
    ["Трансфер", (t) => (t.transfer ? "Включён" : "Нет")],
    ["До моря", (t) => `${getHotel(t.hotelId).distanceToSea} м`],
    [
      "Удобства",
      (t) =>
        getHotel(t.hotelId)
          .amenities.map((a: string) => amenityLabels[a] ?? a)
          .join(", "),
    ],
    ["Premium", (t) => (t.tags.includes("premium") ? "Да" : "нет")],
    ["Hot Deal", (t) => (t.tags.includes("hot") ? "Да" : "нет")],
  ];

  if (selected.length === 0) {
    return (
      <SiteLayout>
        <div className="container-page py-10">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Сравните туры</h1>
          <div className="surface-card mt-8 p-10 text-center">
            <Scale className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-semibold">Список сравнения пуст</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Добавьте до 4 туров кнопкой «Сравнить» на карточке тура.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/search" search={{} as never}>
                Найти туры
              </Link>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Сравните туры</h1>
          <Button variant="ghost" size="sm" onClick={clearCompare}>
            Очистить список
          </Button>
        </div>

        <div className="surface-card mt-8 overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr>
                <th className="w-40 px-5 py-4" />
                {selected.map((tour) => {
                  const hotel = getHotel(tour.hotelId);
                  return (
                    <th
                      key={tour.id}
                      className={cn(
                        "px-5 py-4 text-left align-top",
                        tour.id === bestId && "bg-success/10",
                      )}
                    >
                      <div className="relative">
                        <img
                          src={tourCover(tour, hotel)}
                          alt={hotel.name}
                          loading="lazy"
                          className="h-44 w-full rounded-2xl object-cover"
                        />
                        <button
                          type="button"
                          aria-label="Убрать из сравнения"
                          onClick={() => removeCompare(tour.id)}
                          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-card/90 shadow-card"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {tour.id === bestId ? (
                        <span className="mt-3 inline-block rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                          Лучшее предложение
                        </span>
                      ) : null}
                      <div className="mt-2 font-display text-base font-semibold">{hotel.name}</div>
                      <Button variant="outline" size="sm" className="mt-3" asChild>
                        <Link to="/tour/$tourId" params={{ tourId: tour.id }}>
                          Открыть тур
                        </Link>
                      </Button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {fields.map(([label, get]) => (
                <tr key={label} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-muted-foreground">{label}</td>
                  {selected.map((tour) => (
                    <td
                      key={tour.id}
                      className={cn("px-5 py-3", tour.id === bestId && "bg-success/10")}
                    >
                      {get(tour)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gradient-ai mt-8 rounded-3xl p-6 md:p-8">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-primary-foreground">
            <Sparkles className="size-5" /> AI Summary
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/90">
            {aiRecommendationService
              .summarizeCompare(selected.map((tour) => ({ tour, hotel: getHotel(tour.hotelId) })))
              .map((row) => (
                <li key={row.label}>
                  <span className="font-semibold">{row.label}:</span> {row.hotel}
                </li>
              ))}
          </ul>
          <Button variant="secondary" className="mt-5" asChild>
            <Link to="/tour/$tourId" params={{ tourId: bestId! }}>
              Показать детали
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
