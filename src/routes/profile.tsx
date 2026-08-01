import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice, getHotel, tours } from "@/data/demo";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Личный кабинет путешественника — Voyago" },
      {
        name: "description",
        content: "Избранные туры, история поиска, заявки и настройки Premium-подписки.",
      },
      { property: "og:title", content: "Личный кабинет — Voyago" },
      { property: "og:description", content: "Ваши избранные туры и заявки." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const favourites = tours.slice(2, 5);
  const requests = tours.slice(6, 9);

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="surface-card flex flex-wrap items-center gap-5 p-6">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-xl font-semibold text-primary">
            АК
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold">Айгерим Касымова</h1>
            <p className="text-sm text-muted-foreground">aigerim@example.com · Алматы</p>
          </div>
          <Button className="ml-auto">💎 Подключить Premium</Button>
        </div>

        <Tabs defaultValue="fav" className="mt-8">
          <TabsList>
            <TabsTrigger value="fav">Избранное</TabsTrigger>
            <TabsTrigger value="requests">Мои заявки</TabsTrigger>
            <TabsTrigger value="history">История поиска</TabsTrigger>
          </TabsList>

          <TabsContent value="fav" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favourites.map((tour) => (
              <TourCard key={tour.id} tour={tour} layout="grid" />
            ))}
          </TabsContent>

          <TabsContent value="requests" className="mt-6 space-y-4">
            {requests.map((tour, i) => {
              const hotel = getHotel(tour.hotelId);
              return (
                <div
                  key={tour.id}
                  className="surface-card flex flex-wrap items-center gap-4 p-5"
                >
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    loading="lazy"
                    className="size-16 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{hotel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tour.dateStart} · {formatPrice(tour.price)}
                    </p>
                  </div>
                  <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {["Новая", "В обработке", "Подтверждена"][i % 3]}
                  </span>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-3">
            {["Турция, 7 ночей, 2 взрослых", "ОАЭ, 5 ночей, Premium", "Мальдивы, 10 ночей"].map(
              (item) => (
                <div key={item} className="surface-card px-5 py-4 text-sm">
                  {item}
                </div>
              ),
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}