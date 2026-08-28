import { Navigate, createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
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
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { setBookingStatus } from "@/lib/platform/booking";
import { usePlatformStore } from "@/lib/platform/hooks";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/operator/bookings")({
  head: () => privatePage("Бронирования оператора · TourGo"),
  component: OperatorBookingsPage,
});

function OperatorBookingsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  if (!allowed || !organization || !user) return null;
  if (isBusinessOnlyServices(organization.services)) {
    return <Navigate to="/operator/services" />;
  }

  const bookings = state.bookings.filter((b) => b.organizationId === organization.id);

  return (
    <DashShell
      tabs="partner"
      brand={organization.name}
      items={nav}
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
                      {b.status !== "COMPLETED" &&
                      b.status !== "CANCELLED" &&
                      b.status !== "FAILED" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBookingStatus(b.id, "COMPLETED", user.id)}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBookingStatus(b.id, "CANCELLED", user.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}
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
