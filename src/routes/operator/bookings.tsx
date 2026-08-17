import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, getHotel, getTour } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { setBookingStatus } from "@/lib/platform/booking";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/operator/bookings")({
  head: () => ({ meta: [{ title: "Бронирования поставщика — TourGo" }] }),
  component: OperatorBookingsPage,
});

function OperatorBookingsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !organization || !user) return null;

  const bookings = state.bookings.filter((b) => b.organizationId === organization.id);

  return (
    <DashShell
      brand={organization.name}
      items={operatorNav}
      title="Бронирования"
      subtitle="Заявки клиентов"
    >
      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Тур</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Пока нет бронирований
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => {
                const tour = getTour(b.tourOfferId);
                const hotel = tour ? getHotel(tour.hotelId) : null;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs">{b.id}</TableCell>
                    <TableCell>{hotel?.name ?? b.tourOfferId}</TableCell>
                    <TableCell>{formatPrice(b.price)}</TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBookingStatus(b.id, "COMPLETED", user.id)}
                      >
                        Завершить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBookingStatus(b.id, "CANCELLED", user.id)}
                      >
                        Отменить
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </DashShell>
  );
}
