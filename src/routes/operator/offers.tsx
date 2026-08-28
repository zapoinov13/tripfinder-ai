import { Navigate, Link, createFileRoute } from "@tanstack/react-router";
import { CalendarDays, HandCoins, Inbox, MessageCircle, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { TabPills } from "@/components/admin";
import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { usePlatformStore } from "@/lib/platform/hooks";
import { peopleLabel } from "@/lib/platform/requests";
import type { RequestOffer, RequestOfferStatus, TripRequest } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/offers")({
  head: () => ({ meta: [{ title: "Мои предложения · TourGo" }] }),
  component: OperatorOffersPage,
});

const statusMeta: Record<RequestOfferStatus, { text: string; tone: string; hint: string }> = {
  SENT: {
    text: "Ждёт ответа",
    tone: "bg-primary/12 text-primary",
    hint: "Турист сравнивает предложения",
  },
  CHOSEN: {
    text: "Выбрали вас",
    tone: "bg-success/12 text-success",
    hint: "Свяжитесь с туристом и подтвердите детали",
  },
  DECLINED: {
    text: "Выбрали другую компанию",
    tone: "bg-secondary text-muted-foreground",
    hint: "Попробуйте ответить быстрее на следующие заявки",
  },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

const fmtSent = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

type OfferTab = "all" | RequestOfferStatus;

function OperatorOffersPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [tab, setTab] = useState<OfferTab>("all");

  const offers = useMemo(() => {
    if (!organization) return [];
    return state.requestOffers
      .filter((o) => o.organizationId === organization.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [organization, state.requestOffers]);

  const counts = useMemo(
    () => ({
      all: offers.length,
      SENT: offers.filter((o) => o.status === "SENT").length,
      CHOSEN: offers.filter((o) => o.status === "CHOSEN").length,
      DECLINED: offers.filter((o) => o.status === "DECLINED").length,
    }),
    [offers],
  );

  const filtered = tab === "all" ? offers : offers.filter((o) => o.status === tab);

  if (!allowed || !organization) return null;
  if (isBusinessOnlyServices(organization.services)) {
    return <Navigate to="/operator/services" />;
  }

  const winRate =
    counts.CHOSEN + counts.DECLINED > 0
      ? Math.round((counts.CHOSEN / (counts.CHOSEN + counts.DECLINED)) * 100)
      : null;

  return (
    <DashShell
      tabs="partner"
      brand={organization.name}
      items={nav}
      title="Мои предложения"
      subtitle={
        offers.length > 0
          ? "Все цены и условия, которые вы отправили туристам по заявкам"
          : "Здесь появятся предложения после ответа на заявки туристов"
      }
      actions={
        <Button size="sm" asChild>
          <Link to="/operator/requests">
            <Inbox className="size-4" />
            Заявки туристов
          </Link>
        </Button>
      }
    >
      {offers.length === 0 ? (
        <div className="surface-card p-8 text-center md:p-12">
          <HandCoins className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold">Предложений пока нет</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Когда турист оставит заявку по вашему направлению, откройте «Заявки туристов», укажите
            отели, цену и условия. Отправленное предложение сохранится здесь.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/operator/requests">Смотреть заявки</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiCard label="Отправлено" value={String(counts.all)} hint="всего предложений" />
            <KpiCard
              label="Ждут ответа"
              value={String(counts.SENT)}
              hint="турист ещё выбирает"
              emphasis={counts.SENT > 0}
            />
            <KpiCard
              label="Выбрали вас"
              value={String(counts.CHOSEN)}
              hint={winRate !== null ? `конверсия ${winRate}%` : "пока нет решений"}
            />
            <KpiCard
              label="Не выбрали"
              value={String(counts.DECLINED)}
              hint="можно улучшить цену"
            />
          </div>

          <div className="mt-6">
            <TabPills
              value={tab}
              onChange={(v) => setTab(v as OfferTab)}
              items={[
                { value: "all", label: "Все", count: counts.all },
                { value: "SENT", label: "Ждут ответа", count: counts.SENT },
                { value: "CHOSEN", label: "Выбрали вас", count: counts.CHOSEN },
                { value: "DECLINED", label: "Не выбрали", count: counts.DECLINED },
              ]}
            />
          </div>

          <div className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                В этой вкладке предложений нет.
              </div>
            ) : (
              filtered.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  {...(() => {
                    const req = state.tripRequests.find((r) => r.id === offer.requestId);
                    return req ? { request: req } : {};
                  })()}
                  hasMessages={state.requestMessages.some(
                    (m) => m.requestId === offer.requestId && m.organizationId === organization.id,
                  )}
                />
              ))
            )}
          </div>
        </>
      )}
    </DashShell>
  );
}

function OfferCard({
  offer,
  request,
  hasMessages,
}: {
  offer: RequestOffer;
  request?: TripRequest;
  hasMessages: boolean;
}) {
  const status = statusMeta[offer.status];
  const withinBudget = request ? offer.price <= request.budget : null;

  return (
    <article className="surface-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {request ? (
            <>
              <p className="font-display text-lg font-semibold">
                {request.fromCity} → {request.destinationLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {fmtDate(request.dateStart)} - {fmtDate(request.dateEnd)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {peopleLabel(request)}
                </span>
              </div>
            </>
          ) : (
            <p className="font-medium text-muted-foreground">Заявка недоступна</p>
          )}
        </div>
        <Badge className={cn("shrink-0 border-0", status.tone)}>{status.text}</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="rounded-2xl bg-secondary/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ваше предложение
          </p>
          <p className="mt-1 font-medium">{offer.hotelName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {offer.nights} ноч. · {offer.meal}
          </p>
          {offer.includes ? (
            <p className="mt-2 text-xs text-muted-foreground">Входит: {offer.includes}</p>
          ) : null}
          {offer.comment ? (
            <p className="mt-2 text-sm italic text-muted-foreground">«{offer.comment}»</p>
          ) : null}
        </div>

        <div className="text-left md:text-right">
          <p className="font-display text-2xl font-semibold tabular-nums">
            {formatPrice(offer.price)}
          </p>
          {request ? (
            <p className={cn("mt-1 text-xs", withinBudget ? "text-success" : "text-premium")}>
              Бюджет туриста до {formatPrice(request.budget)}
              {withinBudget ? " · в бюджете" : " · выше бюджета"}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Отправлено {fmtSent(offer.createdAt)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{status.hint}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {offer.status === "CHOSEN" ? (
          <Button size="sm" asChild>
            <Link to="/operator/messages">
              <MessageCircle className="size-4" />
              Написать туристу
            </Link>
          </Button>
        ) : offer.status === "SENT" && hasMessages ? (
          <Button size="sm" variant="outline" asChild>
            <Link to="/operator/messages">
              <MessageCircle className="size-4" />
              Переписка
            </Link>
          </Button>
        ) : null}

        {offer.tourId ? (
          <Button size="sm" variant="outline" asChild>
            <Link to="/tour/$tourId" params={{ tourId: offer.tourId }}>
              Карточка тура
            </Link>
          </Button>
        ) : null}

        {offer.status === "CHOSEN" ? (
          <span className="inline-flex items-center gap-1.5 self-center text-xs font-medium text-success">
            <Trophy className="size-3.5" />
            Поздравляем, турист выбрал ваше предложение
          </span>
        ) : null}
      </div>
    </article>
  );
}
