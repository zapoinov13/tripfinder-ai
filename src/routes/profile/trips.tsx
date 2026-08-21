import { Link, createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatPrice, getHotel, getTour } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/profile/trips")({
  head: () => ({
    meta: [{ title: "Мои поездки · TourGo" }],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { allowed } = useRequireAuth(["TOURIST", "PREMIUM_TOURIST"]);
  const { user } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !user) return null;

  const bookings = state.bookings.filter((b) => b.userId === user.id);

  return (
    <DashShell
      brand="TourGo"
      items={profileNav}
      title="Мои поездки"
      subtitle="Статусы бронирований"
    >
      {bookings.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="text-muted-foreground">Пока нет поездок</p>
          <Button className="mt-4" asChild>
            <Link to="/search" search={{} as never}>
              Найти тур
            </Link>
          </Button>
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
                <div className="min-w-0">
                  <p className="font-medium">{hotel?.name ?? b.tourOfferId}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(b.price)} · {b.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.id}</p>
                </div>
                <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  {b.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </DashShell>
  );
}
