import { Link } from "@tanstack/react-router";
import { CalendarClock, Compass, MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  formatServiceRequestWhen,
  nextVisit,
  serviceRequestStatusLabel,
  unreadServiceMessages,
} from "@/lib/platform/service-requests";
import { cn } from "@/lib/utils";

/**
 * Первое, что видит турист в кабинете: что у него сейчас происходит и
 * куда идти дальше. Пустой кабинет предлагает три понятных начала, а не
 * бонусный баланс — за бонусами человек сюда не приходил.
 */
export function NextStepCard({ userId }: { userId: string }) {
  const state = usePlatformStore();

  const visit = nextVisit(userId);
  const myRequests = state.serviceRequests.filter((r) => r.userId === userId);
  const myTripRequests = state.tripRequests.filter((r) => r.userId === userId);
  const myBookings = state.bookings.filter((b) => b.userId === userId);
  const unread = myRequests.reduce((sum, r) => sum + unreadServiceMessages(r.id, "CLIENT"), 0);
  const openTripRequests = myTripRequests.filter(
    (r) => r.status !== "CHOSEN" && r.status !== "CLOSED",
  );
  const offersWaiting = openTripRequests.reduce(
    (sum, r) => sum + state.requestOffers.filter((o) => o.requestId === r.id).length,
    0,
  );

  const empty = myRequests.length === 0 && myTripRequests.length === 0 && myBookings.length === 0;

  if (empty) {
    return (
      <section className="surface-card mb-4 p-5">
        <h2 className="font-display text-lg font-semibold">С чего начать</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Поиск и заявка бесплатные. Платите напрямую компании, которую выберете.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <StartRow
            icon={Compass}
            title="Найти тур"
            hint="Страна, даты и бюджет — предложения разных компаний в одной выдаче."
            to="/search"
          />
          <StartRow
            icon={Sparkles}
            title="Пусть компании подберут"
            hint="Опишите поездку словами — турфирмы пришлют цены, вы выберете лучшую."
            to="/request"
          />
          <StartRow
            icon={CalendarClock}
            title="Записаться на месте"
            hint="Зал, прокат авто или жильё посуточно: выбираете время и приходите."
            to="/sport"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card mb-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">Что сейчас</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {visit
              ? `Ближайшее — ${formatServiceRequestWhen(visit.date, visit.time)}`
              : offersWaiting > 0
                ? "Компании прислали предложения по вашей заявке"
                : "Заявки и брони собраны в одном месте"}
          </p>
        </div>
        {unread > 0 ? (
          <Button size="sm" variant="outline" asChild>
            <Link to="/profile/messages">
              <MessageSquare className="size-3.5" />
              {unread}
            </Link>
          </Button>
        ) : null}
      </div>

      {visit ? (
        <div className="mt-4 rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {serviceRequestStatusLabel[visit.status]}
          </p>
          <p className="mt-1 font-medium">
            {state.organizations.find((o) => o.id === visit.organizationId)?.name ?? "Компания"}
          </p>
          {visit.listingName ? (
            <p className="text-sm text-muted-foreground">{visit.listingName}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/profile/requests">Моя запись</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/company/$companyId" params={{ companyId: visit.organizationId }}>
                Страница компании
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <CountLink to="/profile/trips" label="Поездки" value={myBookings.length} />
        <CountLink
          to="/profile/requests"
          label="Заявки"
          value={myRequests.length + myTripRequests.length}
          accent={offersWaiting > 0}
        />
        <CountLink to="/profile/messages" label="Сообщения" value={unread} accent={unread > 0} />
      </div>
    </section>
  );
}

function StartRow({
  icon: Icon,
  title,
  hint,
  to,
}: {
  icon: typeof Compass;
  title: string;
  hint: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
    </Link>
  );
}

function CountLink({
  to,
  label,
  value,
  accent,
}: {
  to: string;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "rounded-2xl border border-border p-3 text-center transition-colors hover:border-primary/40",
        accent && "border-primary/30 bg-primary/[0.04]",
      )}
    >
      <span className="block font-display text-xl font-semibold tabular-nums">{value}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{label}</span>
    </Link>
  );
}
