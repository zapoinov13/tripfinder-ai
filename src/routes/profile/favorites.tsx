import { Link, createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { getTour } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { useTourState } from "@/lib/tour-state";

export const Route = createFileRoute("/profile/favorites")({
  head: () => ({ meta: [{ title: "Избранное — TourGo" }] }),
  component: FavoritesProfilePage,
});

function FavoritesProfilePage() {
  const { allowed } = useRequireAuth(["TOURIST", "PREMIUM_TOURIST"]);
  const { favorites } = useTourState();
  if (!allowed) return null;
  const tours = favorites.map((id) => getTour(id)).filter(Boolean);

  return (
    <DashShell brand="TourGo" items={profileNav} title="Избранное" subtitle="Сохранённые туры">
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (tour ? <TourCard key={tour.id} tour={tour} layout="grid" /> : null))}
        </div>
      )}
    </DashShell>
  );
}
