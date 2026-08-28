import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Inbox, Ticket, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  FilterBar,
  KpiLinkCard,
  StatusBadge,
  TabPills,
  bookingStatusLabel,
  orgName,
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
import { formatNumber, formatPrice } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  formatServiceRequestWhen,
  serviceRequestStatusClass,
  serviceRequestStatusLabel,
} from "@/lib/platform/service-requests";
import { nowIso, setState } from "@/lib/platform/store";
import type { BookingStatus, TripRequestStatus } from "@/lib/platform/types";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/bookings")({
  head: () => privatePage("Заявки и брони · Админ"),
  component: AdminBookingsPage,
});

const requestStatusLabel: Record<TripRequestStatus, string> = {
  NEW: "Новая",
  IN_REVIEW: "Смотрят компании",
  OFFERS_RECEIVED: "Есть предложения",
  CHOSEN: "Компания выбрана",
  CLOSED: "Закрыта",
};

const requestStatusTone: Record<TripRequestStatus, "success" | "warning" | "neutral" | "danger"> = {
  NEW: "warning",
  IN_REVIEW: "warning",
  OFFERS_RECEIVED: "success",
  CHOSEN: "success",
  CLOSED: "neutral",
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "";

function AdminBookingsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [view, setView] = useState("requests");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const requests = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...state.tripRequests]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((r) => {
        if (view !== "requests") return true;
        if (status !== "all" && r.status !== status) return false;
        if (!query) return true;
        return (
          userName(r.userId).toLowerCase().includes(query) ||
          (r.destinationLabel ?? "").toLowerCase().includes(query) ||
          (r.fromCity ?? "").toLowerCase().includes(query) ||
          r.contactName.toLowerCase().includes(query)
        );
      });
  }, [state.tripRequests, q, status, view]);

  const bookings = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.bookings.filter((b) => {
      if (view !== "bookings") return true;
      if (status !== "all" && b.status !== status) return false;
      if (!query) return true;
      return (
        userName(b.userId).toLowerCase().includes(query) ||
        tourTitle(b.tourOfferId).toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query)
      );
    });
  }, [state.bookings, q, status, view]);

  // Заявки клиентов бизнесам (зал, жильё, авто) — отдельный поток от туровых.
  const serviceRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const orgName = (id: string) =>
      state.organizations.find((o) => o.id === id)?.name ?? "Компания";
    return [...state.serviceRequests]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r, orgName: orgName(r.organizationId) }))
      .filter((r) => {
        if (view !== "services") return true;
        if (status !== "all" && r.status !== status) return false;
        if (!query) return true;
        return (
          r.orgName.toLowerCase().includes(query) ||
          r.contactName.toLowerCase().includes(query) ||
          r.listingName.toLowerCase().includes(query)
        );
      });
  }, [state.serviceRequests, state.organizations, q, status, view]);

  const newServiceRequests = state.serviceRequests.filter((r) => r.status === "NEW").length;

  const funnel = useMemo(() => {
    const total = state.tripRequests.length;
    const open = state.tripRequests.filter((r) =>
      ["NEW", "IN_REVIEW", "OFFERS_RECEIVED"].includes(r.status),
    ).length;
    const chosen = state.tripRequests.filter((r) => r.status === "CHOSEN").length;
    const offers = state.requestOffers.length;
    const paidSum = state.bookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((s, b) => s + b.price, 0);
    return { total, open, chosen, offers, paidSum };
  }, [state.tripRequests, state.requestOffers, state.bookings]);

  if (!allowed || !user) return null;

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

  const offersFor = (requestId: string) =>
    state.requestOffers.filter((o) => o.requestId === requestId);

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Заявки и брони"
      subtitle="Заявки туристов турфирмам, брони туров и записи клиентов в компании."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiLinkCard
          label="Заявки туристов"
          value={formatNumber(funnel.total)}
          hint={`${formatNumber(funnel.open)} открыто сейчас`}
          tone={funnel.open > 0 ? "warning" : "default"}
        />
        <KpiLinkCard
          label="Предложений компаний"
          value={formatNumber(funnel.offers)}
          hint="ответы на заявки"
        />
        <KpiLinkCard
          label="Выбрали компанию"
          value={formatNumber(funnel.chosen)}
          hint={
            funnel.total
              ? `конверсия ${Math.round((funnel.chosen / funnel.total) * 100)}%`
              : "появится с первыми заявками"
          }
        />
        <KpiLinkCard
          label="Брони и оплата"
          value={formatNumber(state.bookings.length)}
          hint={funnel.paidSum > 0 ? `оплачено ${formatPrice(funnel.paidSum)}` : "оплат пока нет"}
        />
        <KpiLinkCard
          label="Заявки в компании"
          value={formatNumber(state.serviceRequests.length)}
          hint={
            newServiceRequests > 0
              ? `${formatNumber(newServiceRequests)} ждут ответа`
              : "записи в залы, жильё, авто"
          }
          tone={newServiceRequests > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <TabPills
          value={view}
          onChange={(v) => {
            setView(v);
            setStatus("all");
            setQ("");
          }}
          items={[
            { value: "requests", label: "Заявки туристов", count: funnel.total },
            { value: "bookings", label: "Брони", count: state.bookings.length },
            {
              value: "services",
              label: "Заявки в компании",
              count: state.serviceRequests.length,
            },
          ]}
        />
      </div>

      <div className="mt-4">
        <FilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder={
            view === "requests"
              ? "Турист, направление…"
              : view === "services"
                ? "Компания, клиент, объявление…"
                : "Турист, тур, ID…"
          }
          filters={[
            {
              key: "status",
              value: status,
              placeholder: "Статус",
              onChange: setStatus,
              options:
                view === "services"
                  ? [
                      { value: "all", label: "Все статусы" },
                      ...Object.entries(serviceRequestStatusLabel).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    ]
                  : view === "requests"
                    ? [
                        { value: "all", label: "Все статусы" },
                        ...Object.entries(requestStatusLabel).map(([value, label]) => ({
                          value,
                          label,
                        })),
                      ]
                    : [
                        { value: "all", label: "Все статусы" },
                        { value: "PENDING", label: "Ожидает" },
                        { value: "AWAITING_PAYMENT", label: "Ждёт оплаты" },
                        { value: "PAID", label: "Оплачено" },
                        { value: "CONFIRMED", label: "Подтверждено" },
                        { value: "CANCELLED", label: "Отменено" },
                        { value: "COMPLETED", label: "Завершено" },
                      ],
            },
          ]}
        />
      </div>

      {view === "services" ? (
        serviceRows.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Inbox className="size-6" />
            </span>
            <div className="max-w-md">
              <p className="font-display text-base font-semibold">
                {q.trim() || status !== "all" ? "Ничего не нашли" : "Заявок в компании пока нет"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {q.trim() || status !== "all"
                  ? "Измените поиск или фильтр статуса."
                  : "Сюда попадают записи клиентов в залы, жильё и авто: партнёр обрабатывает их в своём кабинете."}
              </p>
            </div>
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Компания</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Когда</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создана</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.orgName}
                      {r.listingName ? (
                        <span className="block text-xs text-muted-foreground">{r.listingName}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {r.contactName || "Клиент"}
                      {r.people > 1 ? (
                        <span className="block text-xs text-muted-foreground">{r.people} чел.</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatServiceRequestWhen(r.date, r.time)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${serviceRequestStatusClass[r.status]}`}
                      >
                        {serviceRequestStatusLabel[r.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : view === "requests" ? (
        requests.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Inbox className="size-6" />
            </span>
            <div className="max-w-md">
              <p className="font-display text-base font-semibold">
                {q.trim() || status !== "all" ? "Ничего не нашли" : "Заявок пока нет"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {q.trim() || status !== "all"
                  ? "Измените поиск или фильтр статуса."
                  : "Как только турист оставит заявку на тур или помощь в поездке, она появится здесь вместе с ответами компаний."}
              </p>
            </div>
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Турист</TableHead>
                  <TableHead>Поездка</TableHead>
                  <TableHead>Бюджет</TableHead>
                  <TableHead>Предложения</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создана</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const offers = offersFor(r.id);
                  const chosen = offers.find((o) => o.status === "CHOSEN");
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-xs font-semibold text-primary">
                            {(r.contactName || userName(r.userId)).slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {r.contactName || userName(r.userId)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.kind === "assistance" ? "Помощь в поездке" : "Тур"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {r.fromCity ? `${r.fromCity} → ` : ""}
                          {r.destinationLabel || "направление не указано"}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {fmtDate(r.dateStart)}
                          {r.dateEnd && r.dateEnd !== r.dateStart ? ` — ${fmtDate(r.dateEnd)}` : ""}
                          <span className="ml-1 inline-flex items-center gap-0.5">
                            <Users className="size-3" />
                            {r.adults}
                            {r.children ? `+${r.children}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.budget
                          ? r.currency === "USD"
                            ? `$${formatNumber(r.budget)}`
                            : formatPrice(r.budget)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {chosen ? (
                          <span className="text-sm font-medium text-success">
                            {orgName(chosen.organizationId)}
                          </span>
                        ) : offers.length > 0 ? (
                          <span className="text-sm">{offers.length}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">нет</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={requestStatusLabel[r.status]}
                          tone={requestStatusTone[r.status]}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : bookings.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Ticket className="size-6" />
          </span>
          <div className="max-w-md">
            <p className="font-display text-base font-semibold">
              {q.trim() || status !== "all" ? "Ничего не нашли" : "Броней пока нет"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q.trim() || status !== "all"
                ? "Измените поиск или фильтр статуса."
                : "Здесь появятся заказы туров с оплатой: статус, сумма и компания-продавец."}
            </p>
          </div>
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Турист</TableHead>
                <TableHead>Тур</TableHead>
                <TableHead>Компания</TableHead>
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
                  <TableCell className="text-sm">
                    {b.organizationId ? orgName(b.organizationId) : "—"}
                  </TableCell>
                  <TableCell>
                    <div>{formatPrice(b.price)}</div>
                    <div
                      className={
                        b.paymentStatus === "paid"
                          ? "text-xs text-success"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {b.paymentStatus === "paid" ? "оплачено" : "не оплачено"}
                    </div>
                  </TableCell>
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
                    {b.status !== "CONFIRMED" &&
                    b.status !== "CANCELLED" &&
                    b.status !== "COMPLETED" &&
                    b.status !== "FAILED" ? (
                      <Button
                        size="sm"
                        onClick={() => setBookingStatus(b.id, "CONFIRMED", "booking_confirm")}
                      >
                        Подтвердить
                      </Button>
                    ) : null}
                    {b.status !== "CANCELLED" && b.status !== "COMPLETED" ? (
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
