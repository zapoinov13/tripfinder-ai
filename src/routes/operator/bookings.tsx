import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";

import { StatusBadge, bookingStatusLabel, toneForBookingStatus } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatPrice, getHotel, getTour } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { setBookingStatus } from "@/lib/platform/booking";
import { usePlatformStore } from "@/lib/platform/hooks";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/operator/bookings")({
  head: () => privatePage("Бронирования оператора · TourGo"),
  component: OperatorBookingsPage,
});

/**
 * Брони партнёра.
 *
 * Раздел оставался в первоначальном виде: широкая таблица с колонкой «ID»,
 * сырым статусом `CONFIRMED` и кнопками «Complete» и «Cancel» — по-английски,
 * в русском кабинете, на экране телефона. Пустой список показывал шапку
 * таблицы и строчку «Пока нет бронирований», не объясняя, откуда брони
 * вообще берутся.
 *
 * Теперь это список карточек: они одинаково читаются на телефоне и на
 * компьютере, статус написан словами, а действия названы тем, что делают.
 */
function OperatorBookingsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  if (!allowed || !organization || !user) return null;
  if (isBusinessOnlyServices(organization.services)) {
    return <Navigate to="/operator/services" />;
  }

  const bookings = state.bookings
    .filter((b) => b.organizationId === organization.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const active = bookings.filter(
    (b) => b.status !== "COMPLETED" && b.status !== "CANCELLED" && b.status !== "FAILED",
  );

  return (
    <DashShell
      tabs="partner"
      brand={organization.name}
      items={nav}
      title="Бронирования"
      subtitle={
        bookings.length
          ? `${active.length} в работе из ${bookings.length}`
          : "Брони туристов по вашим турам"
      }
    >
      {bookings.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <CalendarCheck className="size-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold">Броней пока нет</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Бронь появляется здесь, когда турист выбрал ваш тур в каталоге и оформил его. Чтобы
              туры было видно в поиске, добавьте карточки с ценой и фото.
            </p>
          </div>
          <Button asChild>
            <Link to="/operator/tours">Мои туры</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => {
            const tour = getTour(booking.tourOfferId);
            const hotel = tour ? getHotel(tour.hotelId) : null;
            const open =
              booking.status !== "COMPLETED" &&
              booking.status !== "CANCELLED" &&
              booking.status !== "FAILED";
            return (
              <li key={booking.id} className="surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{hotel?.name ?? tour?.title ?? "Тур удалён"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {new Date(booking.createdAt).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                      })}
                      {hotel ? ` · ${hotel.city}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold tabular-nums">
                      {formatPrice(booking.price)}
                    </p>
                    <StatusBadge
                      label={bookingStatusLabel[booking.status] ?? booking.status}
                      tone={toneForBookingStatus(booking.status)}
                    />
                  </div>
                </div>

                {open ? (
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      onClick={() => setBookingStatus(booking.id, "COMPLETED", user.id)}
                    >
                      Поездка состоялась
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setBookingStatus(booking.id, "CANCELLED", user.id)}
                    >
                      Отменить
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </DashShell>
  );
}
