import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { formatPrice, getHotel, getTour } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { useTourState } from "@/lib/tour-state";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Личный кабинет путешественника — Voyago" },
      {
        name: "description",
        content: "Избранные туры, история поиска, заявки и настройки Premium-подписки.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { allowed } = useRequireAuth(["TOURIST", "PREMIUM_TOURIST"]);
  const { user, isPremium, purchasePremium, logout } = useAuth();
  const state = usePlatformStore();
  const { favorites, priceAlerts } = useTourState();
  const navigate = useNavigate();

  if (!allowed || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Перенаправление…
      </div>
    );
  }

  const favTours = favorites.map((id) => getTour(id)).filter(Boolean).slice(0, 3);
  const bookings = state.bookings.filter((b) => b.userId === user.id);
  const nextTrip = bookings.find((b) =>
    ["CONFIRMED", "PAID", "AWAITING_PAYMENT", "PENDING"].includes(b.status),
  );

  return (
    <DashShell
      brand="Voyago"
      items={profileNav}
      title={user.name}
      subtitle={`${user.email} · ${user.city}`}
      actions={
        <div className="flex gap-2">
          {!isPremium ? (
            <Button size="sm" onClick={() => purchasePremium()}>
              Подключить Premium
            </Button>
          ) : (
            <Button size="sm" variant="secondary" asChild>
              <Link to="/premium">Premium активен</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={logout}>
            Выйти
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-4">
        {[
          ["Ближайшая поездка", nextTrip?.status ?? "Нет"],
          ["Избранное", `${favorites.length}`],
          ["Активные alerts", `${priceAlerts.filter((a) => a.status === "active").length}`],
          ["Premium", isPremium ? "Active" : "Free"],
        ].map(([label, value]) => (
          <div key={label} className="surface-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Избранное</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile/favorites">Все</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {favTours.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока пусто</p>
            ) : (
              favTours.map((tour) =>
                tour ? (
                  <button
                    key={tour.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl bg-secondary p-3 text-left"
                    onClick={() => navigate({ to: "/tour/$tourId", params: { tourId: tour.id } })}
                  >
                    <img
                      src={getHotel(tour.hotelId).image}
                      alt=""
                      className="size-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{getHotel(tour.hotelId).name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(tour.price)}</p>
                    </div>
                  </button>
                ) : null,
              )
            )}
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Рекомендации</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/search" search={{} as never}>
                Поиск
              </Link>
            </Button>
          </div>
          <div className="mt-4 grid gap-4">
            {state.tours
              .filter((t) => t.tags.includes("best"))
              .slice(0, 2)
              .map((tour) => (
                <TourCard key={tour.id} tour={tour} layout="grid" />
              ))}
          </div>
        </div>
      </div>
    </DashShell>
  );
}
