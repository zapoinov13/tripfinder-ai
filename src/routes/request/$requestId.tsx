import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Check, MessageCircle, Minus, Star, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ThreadView } from "@/components/messages/thread-view";
import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone } from "@/components/ui/phone-input";
import { formatPrice } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  addCompanyReview,
  getCompanyRating,
  getThread,
  hasReviewed,
} from "@/lib/platform/messages";
import { chooseOffer, peopleLabel } from "@/lib/platform/requests";
import type { RequestOffer, TripRequest } from "@/lib/platform/types";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/request/$requestId")({
  head: () => privatePage("Ваша заявка"),
  component: RequestStatusPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

function RequestStatusPage() {
  const { requestId } = Route.useParams();
  const state = usePlatformStore();
  const { user } = useAuth();
  const [compareOpen, setCompareOpen] = useState(false);
  const [chatWith, setChatWith] = useState<RequestOffer | null>(null);

  const request = state.tripRequests.find((r) => r.id === requestId);
  const offers = state.requestOffers
    .filter((o) => o.requestId === requestId)
    .sort((a, b) => a.price - b.price);

  if (!request) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center">
          <h1 className="font-display text-2xl font-semibold">Заявка не найдена</h1>
          <Button className="mt-6" asChild>
            <Link to="/request" search={{}}>
              Оставить новую заявку
            </Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const chosen = offers.find((o) => o.id === request.chosenOfferId);
  // Управлять заявкой (видеть телефон, выбирать предложение) может только владелец.
  const isOwner = Boolean(user && user.id === request.userId);

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <Link
          to="/profile/requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Мои заявки
        </Link>

        <div className="surface-card mt-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-success/12 text-success">Заявка отправлена ✓</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(request.createdAt).toLocaleString("ru-RU")}
            </span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
            {request.kind === "assistance"
              ? `Помощь в поездке · ${request.destinationLabel}`
              : `${request.fromCity} → ${request.destinationLabel}`}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Мы нашли туристические компании, которые работают с вашим направлением. Они смогут
            предложить свои варианты.
          </p>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Даты</dt>
              <dd className="mt-1 font-medium">
                {fmtDate(request.dateStart)} - {fmtDate(request.dateEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Кто едет</dt>
              <dd className="mt-1 font-medium">{peopleLabel(request)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Бюджет</dt>
              <dd className="mt-1 font-medium">до {formatPrice(request.budget)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Пожелания</dt>
              <dd className="mt-1 font-medium">{request.wishes || "нет"}</dd>
            </div>
          </dl>
        </div>

        <StatusTrack request={request} offersCount={offers.length} />

        {chosen ? (
          <div className="surface-card mt-6 border-success/40 bg-success/5 p-6">
            <h2 className="font-display text-lg font-semibold">Вы выбрали предложение</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {orgName(state, chosen.organizationId)} получила уведомление и свяжется с вами
              {isOwner
                ? ` по телефону ${formatPhone(request.contactPhone) || request.contactPhone}`
                : " по указанному в заявке телефону"}
              .
            </p>
            {user ? (
              <ReviewBox
                organizationId={chosen.organizationId}
                companyName={orgName(state, chosen.organizationId)}
                userId={user.id}
                userName={user.name}
                requestId={request.id}
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold md:text-2xl">Предложения турфирм</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {offers.length > 0
                ? `Получено предложений: ${offers.length}`
                : "Пока предложений нет. Обычно первые приходят в течение часа"}
            </p>
          </div>
          {offers.length > 1 ? (
            <Button
              variant={compareOpen ? "secondary" : "default"}
              onClick={() => setCompareOpen((v) => !v)}
            >
              {compareOpen ? "Скрыть сравнение" : "Сравнить предложения"}
            </Button>
          ) : null}
        </div>

        {compareOpen && offers.length > 1 ? (
          <CompareOffers request={request} offers={offers} />
        ) : null}

        <div className="mt-6 space-y-4">
          {offers.map((offer, i) => (
            <OfferCard
              key={offer.id}
              index={i + 1}
              offer={offer}
              company={orgName(state, offer.organizationId)}
              rating={orgRating(offer.organizationId)}
              canChoose={isOwner && request.status !== "CHOSEN" && request.status !== "CLOSED"}
              chosen={offer.id === request.chosenOfferId}
              onChoose={() => {
                if (!isOwner) return;
                chooseOffer(request.id, offer.id);
              }}
              onMessage={() => {
                if (!user) {
                  toast.error("Войдите, чтобы написать турфирме");
                  return;
                }
                setChatWith(offer);
              }}
            />
          ))}
        </div>
      </div>

      {chatWith && user ? (
        <Dialog open onOpenChange={(v) => (!v ? setChatWith(null) : undefined)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{orgName(state, chatWith.organizationId)}</DialogTitle>
              <DialogDescription>
                Вопросы по предложению: {chatWith.hotelName}, {formatPrice(chatWith.price)}
              </DialogDescription>
            </DialogHeader>
            <ThreadView
              requestId={request.id}
              organizationId={chatWith.organizationId}
              touristId={user.id}
              side="TOURIST"
              authorName={user.name}
              messages={getThread(request.id, chatWith.organizationId)}
              placeholder="Например: входит ли доплата за детей и можно ли поменять даты?"
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </SiteLayout>
  );
}

function ReviewBox({
  organizationId,
  companyName,
  userId,
  userName,
  requestId,
}: {
  organizationId: string;
  companyName: string;
  userId: string;
  userName: string;
  requestId: string;
}) {
  const state = usePlatformStore();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  void state.companyReviews.length;
  if (hasReviewed(organizationId, userId, requestId)) {
    return (
      <p className="mt-4 text-sm text-success">Спасибо! Ваш отзыв о {companyName} опубликован.</p>
    );
  }

  return (
    <div className="mt-5 border-t border-success/30 pt-5">
      <p className="font-medium">Оставить отзыв о {companyName}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Отзыв помогает другим туристам выбрать компанию.
      </p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Оценка ${i}`}
            onClick={() => setRating(i)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-6",
                i <= rating ? "fill-premium text-premium" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        className="mt-3"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Как прошло общение с компанией, всё ли совпало с предложением?"
      />
      <Button
        className="mt-3"
        onClick={() => {
          if (text.trim().length < 10) {
            toast.error("Напишите хотя бы пару слов о компании");
            return;
          }
          addCompanyReview({
            organizationId,
            userId,
            authorName: userName,
            requestId,
            rating,
            text,
          });
          toast.success("Отзыв опубликован");
        }}
      >
        Отправить отзыв
      </Button>
    </div>
  );
}

type StoreState = ReturnType<typeof usePlatformStore>;

function orgName(state: StoreState, orgId: string) {
  return state.organizations.find((o) => o.id === orgId)?.name ?? "Турфирма";
}

/** Рейтинг из отзывов; пока их нет, стабильное значение из id, чтобы карточка не пустовала. */
function orgRating(orgId: string) {
  const rating = getCompanyRating(orgId);
  if (rating) return rating.average.toFixed(1);
  const sum = Array.from(orgId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (4.6 + (sum % 4) / 10).toFixed(1);
}

function StatusTrack({ request, offersCount }: { request: TripRequest; offersCount: number }) {
  const steps = [
    { label: "Заявка получена", done: true },
    { label: "Турфирмы рассматривают", done: request.status !== "NEW" || offersCount > 0 },
    {
      label: offersCount > 0 ? `Получено предложений: ${offersCount}` : "Ожидаем предложения",
      done: offersCount > 0,
    },
    { label: "Вы выбрали предложение", done: request.status === "CHOSEN" },
  ];

  return (
    <ol className="mt-6 grid gap-3 md:grid-cols-4">
      {steps.map((step, i) => (
        <li
          key={step.label}
          className={cn(
            "surface-card flex items-center gap-3 p-4",
            step.done ? "border-primary/40" : "opacity-70",
          )}
        >
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
              step.done
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {step.done ? <Check className="size-4" /> : i + 1}
          </span>
          <span className="text-sm font-medium">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function OfferCard({
  index,
  offer,
  company,
  rating,
  canChoose,
  chosen,
  onChoose,
  onMessage,
}: {
  index: number;
  offer: RequestOffer;
  company: string;
  rating: string;
  canChoose: boolean;
  chosen: boolean;
  onChoose: () => void;
  onMessage: () => void;
}) {
  return (
    <article
      className={cn(
        "surface-card p-5 md:p-6",
        chosen ? "border-success/50 bg-success/5" : undefined,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Предложение {index}
          </p>
          <h3 className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
            <Link
              to="/company/$companyId"
              params={{ companyId: offer.organizationId }}
              className="hover:text-primary"
            >
              {company}
            </Link>
            <span title="Проверенная компания">
              <BadgeCheck className="size-4 text-success" />
            </span>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-premium text-premium" />
            {rating}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold">{formatPrice(offer.price)}</p>
          <p className="text-xs text-muted-foreground">за всех туристов</p>
        </div>
      </div>

      <div className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Отель" value={offer.hotelName} />
        <Fact label="Ночей" value={String(offer.nights)} />
        <Fact label="Питание" value={offer.meal} />
        <Fact
          label="Перелёт и трансфер"
          value={
            [offer.flightIncluded ? "перелёт" : null, offer.transferIncluded ? "трансфер" : null]
              .filter(Boolean)
              .join(", ") || "не включены"
          }
        />
      </div>

      {offer.comment ? (
        <p className="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          «{offer.comment}»
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {offer.tourId ? (
          <Button variant="secondary" asChild>
            <Link to="/tour/$tourId" params={{ tourId: offer.tourId }}>
              Посмотреть
            </Link>
          </Button>
        ) : null}
        <Button variant="outline" onClick={onMessage}>
          <MessageCircle className="size-4" />
          Написать турфирме
        </Button>
        {canChoose ? (
          <Button onClick={onChoose}>
            <Wallet className="size-4" />
            Выбрать предложение
          </Button>
        ) : chosen ? (
          <Badge className="self-center bg-success/12 text-success">Выбрано</Badge>
        ) : null}
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function CompareOffers({ request, offers }: { request: TripRequest; offers: RequestOffer[] }) {
  const state = usePlatformStore();
  const rows: Array<{ label: string; render: (o: RequestOffer) => ReactNode }> = [
    { label: "Цена", render: (o) => <span className="font-semibold">{formatPrice(o.price)}</span> },
    { label: "Отель", render: (o) => o.hotelName },
    { label: "Ночей", render: (o) => o.nights },
    { label: "Питание", render: (o) => o.meal },
    { label: "Перелёт", render: (o) => <YesNo value={o.flightIncluded} /> },
    { label: "Трансфер", render: (o) => <YesNo value={o.transferIncluded} /> },
    { label: "Страховка", render: (o) => <YesNo value={o.insuranceIncluded} /> },
    { label: "Рейтинг турфирмы", render: (o) => orgRating(o.organizationId) },
  ];

  return (
    <div className="surface-card mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-4 text-left font-medium text-muted-foreground">Что входит</th>
            {offers.map((o) => (
              <th key={o.id} className="p-4 text-left font-semibold">
                {orgName(state, o.organizationId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/60 last:border-0">
              <td className="p-4 text-muted-foreground">{row.label}</td>
              {offers.map((o) => (
                <td key={o.id} className="p-4">
                  {row.render(o)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-4" />
            {offers.map((o) => (
              <td key={o.id} className="p-4">
                <Button
                  size="sm"
                  variant={o.id === request.chosenOfferId ? "secondary" : "default"}
                  disabled={request.status === "CHOSEN"}
                  onClick={() => chooseOffer(request.id, o.id)}
                >
                  {o.id === request.chosenOfferId ? "Выбрано" : "Выбрать предложение"}
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-success">
      <Check className="size-4" />
      Да
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="size-4" />
      Нет
    </span>
  );
}
