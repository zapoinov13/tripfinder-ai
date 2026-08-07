import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

const bookingStatusLabel: Record<string, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждено",
  CANCELLED: "Отменено",
  COMPLETED: "Завершено",
  FAILED: "Ошибка",
};

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "Бронирования — Админ" }] }),
  component: () => {
    const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
    const state = usePlatformStore();
    if (!allowed) return null;
    return (
      <DashShell
        brand="Voyago Админ"
        items={adminNav}
        title="Бронирования"
        subtitle="Все заказы на платформе"
      >
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Тур</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-xs">{b.id}</TableCell>
                  <TableCell>{b.userId}</TableCell>
                  <TableCell>{b.tourOfferId}</TableCell>
                  <TableCell>{formatPrice(b.price)}</TableCell>
                  <TableCell>{bookingStatusLabel[b.status] ?? b.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DashShell>
    );
  },
});
