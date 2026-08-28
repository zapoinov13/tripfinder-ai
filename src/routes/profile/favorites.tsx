import { Link, createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { getTour } from "@/data/demo";
import { useTourState } from "@/lib/tour-state";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/profile/favorites")({
  head: () => privatePage("Избранное · TourGo"),
  component: FavoritesProfilePage,
});

function FavoritesProfilePage() {
  return (
    <TouristAccountGate
      kind="generic"
      title="Избранное после входа или на этом устройстве"
      description="Без аккаунта сохранённые туры уже есть в разделе «Избранное». Войдите, чтобы синхронизировать между устройствами."
    >
      <FavoritesContent />
    </TouristAccountGate>
  );
}

function FavoritesContent() {
  const { favorites } = useTourState();
  const tours = favorites.map((id) => getTour(id)).filter(Boolean);

  return (
    <DashShell
      tabs="tourist"
      brand="TourGo"
      items={profileNav}
      title="Избранное"
      subtitle="Сохранённые туры"
    >
      {tours.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="text-muted-foreground">Список пуст</p>
          <Button className="mt-4" asChild>
            <Link to="/search" search={{} as never}>
              Найти туры
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tours.map((tour) => (tour ? <TourCard key={tour.id} tour={tour} /> : null))}
        </div>
      )}
    </DashShell>
  );
}
