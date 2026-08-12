import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  FilterBar,
  StatusBadge,
  bookingStatusLabel,
  toneForBookingStatus,
  tourTitle,
  userName,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState } from "@/lib/platform/store";
import type { BookingStatus } from "@/lib/platform/types";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "Бронирования — Админ" }] }),
  component: AdminBookingsPage,
});

function AdminBookingsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const bookings = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!query) return true;
      return (
        userName(b.userId).toLowerCase().includes(query) ||
        tourTitle(b.tourOfferId).toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query)
      );
    });
  }, [state.bookings, q, status]);

  const setBookingStatus = (id: string, next: BookingStatus, action: string) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) =>
        b.id === id ? { ...b, status: next, updatedAt: nowIso() } : b,
      ),
    }));
    appendAudit({
      actorId: user.id,
      action,
      entityType: "booking",
      entityId: id,
      meta: { status: next },
    });
    toast.success(bookingStatusLabel[next] ?? next);
  };

  if (!allowed || !user) return null;
  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Бронирования"
      subtitle="Все заказы на платформе"
    >
      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Турист, тур, ID…"
        filters={[
          {
            key: "status",
            value: status,
            placeholder: "Статус",
            onChange: setStatus,
            options: [
              { value: "all", label: "Все статусы" },
              { value: "PENDING", label: "Ожидает" },
              { value: "CONFIRMED", label: "Подтверждено" },
              { value: "CANCELLED", label: "Отменено" },
              { value: "FAILED", label: "Ошибка" },
              { value: "COMPLETED", label: "Завершено" },
            ],
          },
        ]}
      />

      {bookings.length === 0 ? (
        <EmptyState title="Бронирований нет" description="По фильтру ничего не найдено" />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Турист</TableHead>
                <TableHead>Тур</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium">{userName(b.userId)}</div>
                    <div className="text-xs text-muted-foreground">{b.id.slice(0, 10)}…</div>
                  </TableCell>
                  <TableCell>{tourTitle(b.tourOfferId)}</TableCell>
                  <TableCell>{formatPrice(b.price)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={bookingStatusLabel[b.status] ?? b.status}
                      tone={toneForBookingStatus(b.status)}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(b.createdAt).toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    {b.status !== "CONFIRMED" && b.status !== "CANCELLED" ? (
                      <Button
                        size="sm"
                        onClick={() => setBookingStatus(b.id, "CONFIRMED", "booking_confirm")}
                      >
                        Подтвердить
                      </Button>
                    ) : null}
                    {b.status !== "CANCELLED" ? (
                      <ConfirmAction
                        triggerLabel="Отменить"
                        title="Отменить бронирование?"
                        description={`${userName(b.userId)} · ${tourTitle(b.tourOfferId)}`}
                        confirmLabel="Отменить"
                        destructive
                        variant="ghost"
                        onConfirm={() => setBookingStatus(b.id, "CANCELLED", "booking_cancel")}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashShell>
  );
}
