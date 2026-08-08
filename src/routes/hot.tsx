import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { tours } from "@/data/demo";

export const Route = createFileRoute("/hot")({
  head: () => ({
    meta: [
      { title: "Горящие туры — лучшие цены на ближайшие даты | TourGo" },
      {
        name: "description",
        content: "Горящие туры со скидками до 30% на ближайшие вылеты от проверенных операторов.",
      },
      { property: "og:title", content: "Горящие туры — TourGo" },
      { property: "og:description", content: "Лучшие предложения на ближайшие даты." },
    ],
  }),
  component: HotPage,
});

function HotPage() {
  const hot = tours.filter((t) => t.tags.includes("hot"));
  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">🔥 Горящие туры</h1>
        <p className="mt-2 text-muted-foreground">Лучшие предложения на ближайшие даты</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hot.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}