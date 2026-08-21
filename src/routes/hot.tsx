import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { tours } from "@/data/demo";

export const Route = createFileRoute("/hot")({
  head: () => ({
    meta: [
      { title: "Hot Deals: лучшие цены на ближайшие даты | TourGo" },
      {
        name: "description",
        content:
          "Горящие предложения TourGo на ближайшие даты. Сейчас доступны отели, пакетные туры, экскурсии, яхты и трансферы по Дубаю.",
      },
      { property: "og:title", content: "Hot Deals · TourGo" },
      {
        property: "og:description",
        content: "Лучшие предложения на ближайшие даты. Первый каталог: Дубай.",
      },
    ],
  }),
  component: HotPage,
});

function HotPage() {
  const hot = tours.filter((t) => t.tags.includes("hot"));
  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Горящие предложения</h1>
        <p className="mt-2 text-muted-foreground">
          Отели, пакетные туры и впечатления с проверкой цены перед бронью. Сейчас доступны варианты
          по Дубаю
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hot.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
