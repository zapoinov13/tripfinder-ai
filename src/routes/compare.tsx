import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { formatPrice, getHotel, getOperator, nightsLabel, tours } from "@/data/demo";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Сравнение туров — Voyago" },
      {
        name: "description",
        content: "Сравните выбранные туры по цене, отелю, питанию, перелёту и удобствам.",
      },
      { property: "og:title", content: "Сравните туры — Voyago" },
      { property: "og:description", content: "Все параметры выбранных туров рядом." },
    ],
  }),
  component: ComparePage,
});

const rows: Array<{ label: string; render: (i: number) => string }> = [];

function ComparePage() {
  const selected = tours.slice(0, 3);

  const fields: Array<[string, (t: (typeof tours)[number]) => string]> = [
    ["Отель", (t) => getHotel(t.hotelId).name],
    ["Рейтинг", (t) => `${getHotel(t.hotelId).rating.toFixed(1)} / 10`],
    ["Цена", (t) => formatPrice(t.price)],
    ["Даты", (t) => `${t.dateStart} – ${t.dateEnd}`],
    ["Ночи", (t) => nightsLabel(t.nights)],
    ["Питание", (t) => t.meal],
    ["Перелёт", (t) => `${t.from} → ${getHotel(t.hotelId).city}`],
    ["Трансфер", (t) => (t.transfer ? "Включён" : "Нет")],
    ["До моря", (t) => `${getHotel(t.hotelId).distanceToSea} м`],
    ["Удобства", (t) => getHotel(t.hotelId).amenities.join(", ")],
    ["Оператор", (t) => getOperator(t.operatorId).name],
  ];

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Сравните туры</h1>

        <div className="surface-card mt-8 overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr>
                <th className="w-40 px-5 py-4" />
                {selected.map((tour) => {
                  const hotel = getHotel(tour.hotelId);
                  return (
                    <th key={tour.id} className="px-5 py-4 text-left align-top">
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        loading="lazy"
                        className="h-32 w-full rounded-2xl object-cover"
                      />
                      <div className="mt-3 font-display text-base font-semibold">{hotel.name}</div>
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
                    <td key={tour.id} className="px-5 py-3">
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
            <Sparkles className="size-5" /> AI рекомендует
          </h2>
          <p className="mt-2 text-primary-foreground/85">
            «Лучшее соотношение цена / качество — вариант №2.»
          </p>
          <Button variant="secondary" className="mt-5">
            Показать детали
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}