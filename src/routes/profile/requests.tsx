import { Link, createFileRoute } from "@tanstack/react-router";
import { Inbox, MessageSquare, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { hasReviewed } from "@/lib/platform/messages";
import type { ServiceRequest } from "@/lib/platform/types";
import { peopleLabel, requestStatusLabel } from "@/lib/platform/requests";
import { CompanyReviewDialog } from "@/components/company/company-review-dialog";
import { ServiceChatDialog } from "@/components/company/service-chat-dialog";
import {
  cancelServiceRequest,
  ensureVisitReminders,
  nextVisit,
  formatServiceRequestWhen,
  serviceRequestStatusClass,
  serviceRequestStatusLabel,
  unreadServiceMessages,
} from "@/lib/platform/service-requests";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";
import { ConfirmAction } from "@/components/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/requests")({
  head: () => ({
    meta: [{ title: "Мои заявки · TourGo" }],
  }),
  component: MyRequestsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

function MyRequestsPage() {
  return (
    <TouristAccountGate kind="trips" title="Заявки турфирмам после входа">
      <RequestsContent />
    </TouristAccountGate>
  );
}

function RequestsContent() {
  const { user } = useAuth();
  const state = usePlatformStore();
  // Крона нет: проверяем ближайшие записи при открытии раздела.
  useEffect(() => {
    if (user) ensureVisitReminders(user.id);
  }, [user]);
  const [chatRequest, setChatRequest] = useState<ServiceRequest | null>(null);
  const [reviewFor, setReviewFor] = useState<ServiceRequest | null>(null);
  if (!user) return null;

  const requests = state.tripRequests
    .filter((r) => r.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Записи в компании (зал, жильё, авто) — отдельный поток от туровых заявок.
  const serviceRequests = state.serviceRequests
    .filter((r) => r.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orgName = (id: string) => state.organizations.find((o) => o.id === id)?.name ?? "Компания";
  const upcoming = nextVisit(user.id);

  return (
    <DashShell
      brand="TourGo"
      items={profileNav}
      title="Мои заявки"
      subtitle="Заявки турфирмам и записи в компании"
    >
      {upcoming ? (
        <section className="mb-6 rounded-3xl border border-primary/25 bg-primary/[0.04] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Ближайшая запись
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold">
                {formatServiceRequestWhen(upcoming.date, upcoming.time)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {orgName(upcoming.organizationId)}
                {upcoming.listingName ? ` · ${upcoming.listingName}` : ""}
                {upcoming.status === "NEW" ? " · ждёт подтверждения" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setChatRequest(upcoming)}>
                <MessageSquare className="size-3.5" />
                Написать
                {unreadServiceMessages(upcoming.id, "CLIENT") > 0 ? (
                  <span className="ml-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unreadServiceMessages(upcoming.id, "CLIENT")}
                  </span>
                ) : null}
              </Button>
              <Button size="sm" asChild>
                <Link to="/company/$companyId" params={{ companyId: upcoming.organizationId }}>
                  Открыть компанию
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {requests.length === 0 && serviceRequests.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Inbox className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Вы пока не оставляли заявок</p>
          <Button className="mt-4" asChild>
            <Link to="/request" search={{}}>
              Получить предложения от турфирм
            </Link>
          </Button>
        </div>
      ) : null}

      {requests.length > 0 ? (
        <section>
          <h2 className="font-display text-lg font-semibold">Заявки турфирмам</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Турфирмы присылают предложения — вы выбираете лучшее.
          </p>
          <div className="mt-4 space-y-4">
            {requests.map((r) => {
              const offers = state.requestOffers.filter((o) => o.requestId === r.id);
              return (
                <Link
                  key={r.id}
                  to="/request/$requestId"
                  params={{ requestId: r.id }}
                  className="surface-card block p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold">
                        {r.kind === "assistance"
                          ? `Помощь в поездке · ${r.destinationLabel}`
                          : `${r.fromCity} → ${r.destinationLabel}`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {fmtDate(r.dateStart)} - {fmtDate(r.dateEnd)} · {peopleLabel(r)} · до{" "}
                        {formatPrice(r.budget)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          r.status === "CHOSEN"
                            ? "bg-success/12 text-success"
                            : offers.length > 0
                              ? "bg-primary/12 text-primary"
                              : "bg-secondary text-muted-foreground"
                        }
                      >
                        {requestStatusLabel[r.status]}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {offers.length > 0 ? `Предложений: ${offers.length}` : "Ждём предложения"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {serviceRequests.length > 0 ? (
        <section className={requests.length > 0 ? "mt-8" : ""}>
          <h2 className="font-display text-lg font-semibold">Записи в компании</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Зал, жильё, авто: компания подтверждает запись и связывается с вами.
          </p>
          <div className="mt-4 space-y-3">
            {serviceRequests.map((r) => (
              <article key={r.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/company/$companyId"
                        params={{ companyId: r.organizationId }}
                        className="font-display text-lg font-semibold hover:text-primary"
                      >
                        {orgName(r.organizationId)}
                      </Link>
                      <Badge className={serviceRequestStatusClass[r.status]}>
                        {serviceRequestStatusLabel[r.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatServiceRequestWhen(r.date, r.time)}
                      {r.people > 1 ? ` · ${r.people} чел.` : ""}
                      {r.listingName ? ` · ${r.listingName}` : ""}
                    </p>
                    {r.comment ? <p className="mt-2 text-sm">{r.comment}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setChatRequest(r)}>
                      <MessageSquare className="size-3.5" />
                      Написать
                      {unreadServiceMessages(r.id, "CLIENT") > 0 ? (
                        <span className="ml-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {unreadServiceMessages(r.id, "CLIENT")}
                        </span>
                      ) : null}
                    </Button>
                    {r.status === "DONE" ? (
                      hasReviewed(r.organizationId, user.id) ? (
                        <span className="text-xs text-muted-foreground">Отзыв оставлен</span>
                      ) : (
                        <Button size="sm" onClick={() => setReviewFor(r)}>
                          <Star className="size-3.5" />
                          Оставить отзыв
                        </Button>
                      )
                    ) : null}
                    {r.status === "NEW" || r.status === "CONFIRMED" ? (
                      <ConfirmAction
                        triggerLabel="Отменить"
                        title="Отменить запись?"
                        description={`${orgName(r.organizationId)} увидит, что вы отменили заявку.`}
                        confirmLabel="Отменить запись"
                        destructive
                        variant="outline"
                        size="sm"
                        onConfirm={() => {
                          cancelServiceRequest(r.id, user.id);
                          toast.success("Запись отменена");
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {reviewFor ? (
        <CompanyReviewDialog
          open
          onOpenChange={(o) => {
            if (!o) setReviewFor(null);
          }}
          organizationId={reviewFor.organizationId}
          organizationName={orgName(reviewFor.organizationId)}
          userId={user.id}
          userName={user.name}
        />
      ) : null}

      {chatRequest ? (
        <ServiceChatDialog
          open
          onOpenChange={(o) => {
            if (!o) setChatRequest(null);
          }}
          request={chatRequest}
          side="CLIENT"
          authorId={user.id}
          authorName={user.name}
          organizationName={orgName(chatRequest.organizationId)}
        />
      ) : null}
    </DashShell>
  );
}
