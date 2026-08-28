import { Link, createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { getTour } from "@/data/demo";
import { useTourState } from "@/lib/tour-state";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/favorites")({
  head: () => privatePage("Избранное"),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, toggleFavorite } = useTourState();
  const list = favorites.map((id) => getTour(id)).filter((t) => t !== undefined);

  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Избранное
        </h1>
        <p className="mt-2 text-muted-foreground">
          {list.length > 0 ? `Сохранено туров: ${list.length}` : "Пока пусто"}
        </p>

        {list.length === 0 ? (
          <div className="surface-card mt-8 p-10 text-center">
            <Heart className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-semibold">Нет сохранённых туров</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Нажмите ♡ на карточке тура, чтобы вернуться к нему позже.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/search" search={{} as never}>
                Найти туры
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {list.map((tour) => (
              <div key={tour.id} className="space-y-2">
                <TourCard tour={tour} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => toggleFavorite(tour.id)}
                >
                  Удалить из избранного
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
