import { Link, createFileRoute } from "@tanstack/react-router";
import { Heart, Inbox } from "lucide-react";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";
import { Button } from "@/components/ui/button";
import { formatPrice, getHotel, getTour } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { useTourState } from "@/lib/tour-state";

export const Route = createFileRoute("/profile/trips")({
  head: () => ({
    meta: [
      { title: "Поездки · TourGo" },
      {
        name: "description",
        content: "Ваши бронирования и статусы поездок. Избранное доступно и без входа.",
      },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  return (
    <TouristAccountGate kind="trips">
      <TripsContent />
    </TouristAccountGate>
  );
}

function TripsContent() {
  const { user } = useAuth();
  const state = usePlatformStore();
  const { favorites } = useTourState();
  if (!user) return null;

  const bookings = state.bookings.filter((b) => b.userId === user.id);
  const requests = state.tripRequests.filter((r) => r.userId === user.id).length;

  return (
    <DashShell
      tabs="tourist"
      brand="TourGo"
      items={profileNav}
      title="Поездки"
      subtitle="Брони, заявки и сохранённые туры"
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Брони</p>
          <p className="mt-1 font-display text-2xl font-semibold">{bookings.length}</p>
        </div>
        <Link
          to="/profile/requests"
          className="surface-card p-4 transition-colors hover:border-primary/40"
        >
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Inbox className="size-3.5" />
            Заявки
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{requests}</p>
        </Link>
        <Link
          to="/favorites"
          className="surface-card p-4 transition-colors hover:border-primary/40"
        >
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Heart className="size-3.5" />
            Избранное
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{favorites.length}</p>
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-lg font-semibold">Пока нет поездок</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Найдите тур в каталоге или оставьте заявку, турфирмы пришлют цены.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/search" search={{} as never}>
                Смотреть туры
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/request" search={{}}>
                Оставить заявку
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const tour = getTour(b.tourOfferId);
            const hotel = tour ? getHotel(tour.hotelId) : null;
            return (
              <div key={b.id} className="surface-card flex flex-wrap items-center gap-4 p-5">
                {hotel ? (
                  <img src={hotel.image} alt="" className="size-16 rounded-2xl object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{hotel?.name ?? "Тур"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {b.status} · {formatPrice(b.price)}
                  </p>
                </div>
                {tour ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/tour/$tourId" params={{ tourId: tour.id }}>
                      Открыть
                    </Link>
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </DashShell>
  );
}
