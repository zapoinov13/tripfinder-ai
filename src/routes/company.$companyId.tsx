import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Percent,
  Phone,
  Send,
  Star,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { ClaimCompanyDialog } from "@/components/company/claim-company-dialog";
import { CompanyReviewDialog } from "@/components/company/company-review-dialog";
import { PhotoGallery } from "@/components/company/photo-gallery";
import { WorkingHours } from "@/components/company/working-hours";
import { ServiceRequestDialog } from "@/components/company/service-request-dialog";
import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, nightsLabel, tourCover } from "@/data/demo";
import { youtubeEmbed } from "@/lib/image-file";
import { useAuth } from "@/lib/platform/auth";
import { getHotel, trackEvent } from "@/lib/platform/catalog";
import {
  availableSlots,
  bookableDates,
  isoDate,
  openState,
  scheduleActive,
} from "@/lib/platform/booking-slots";
import {
  carClassLabel,
  sportKindLabel,
  stayKindLabel,
  type VerticalId,
} from "@/lib/platform/service-ingest";
import {
  listOrgVertical,
  subscribeVerticalListings,
  type VerticalListing,
} from "@/lib/platform/vertical-listings";
import { categoriesOfServices } from "@/lib/platform/company-categories";
import { usePlatformStore } from "@/lib/platform/hooks";
import { getCompanyRating, getCompanyReviews, hasReviewed } from "@/lib/platform/messages";
import { cn } from "@/lib/utils";

/** Стабильная ссылка для useSyncExternalStore, когда объявлений нет. */
const EMPTY_LISTINGS: VerticalListing[] = [];

function listingKindLabel(vertical: VerticalId, kind: string) {
  if (vertical === "sport") return sportKindLabel(kind);
  if (vertical === "stay") return stayKindLabel(kind);
  return carClassLabel(kind);
}

export const Route = createFileRoute("/company/$companyId")({
  head: () => ({
    meta: [{ title: "Туристическая компания · TourGo" }],
  }),
  component: CompanyPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

function CompanyPage() {
  const { companyId } = Route.useParams();
  const state = usePlatformStore();
  const { user } = useAuth();
  const company = state.organizations.find((o) => o.id === companyId);
  const userId = user?.id;

  // Просмотр страницы: один раз за визит, свои сотрудники не считаются.
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestListing, setRequestListing] = useState<VerticalListing | null>(null);
  const [requestSlot, setRequestSlot] = useState<{ date: string; time: string } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [allReviews, setAllReviews] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const listings = useSyncExternalStore(
    subscribeVerticalListings,
    () => (companyId ? listOrgVertical(companyId) : EMPTY_LISTINGS),
    () => EMPTY_LISTINGS,
  );

  useEffect(() => {
    if (!company) return;
    if (user && user.organizationId === company.id) return;
    trackEvent("COMPANY_PAGE_VIEW", userId, { companyId: company.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  if (!company) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center">
          <h1 className="font-display text-2xl font-semibold">Компания не найдена</h1>
          <Button className="mt-6" asChild>
            <Link to="/">На главную</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const todayLocal = isoDate(new Date());
  const nowOpen = openState(company.bookingSchedule);
  const publishedListings = listings.filter((l) => l.status === "published");
  // «от N ₸» на карточке: минимальная цена среди опубликованных услуг.
  const minPrice = publishedListings.reduce(
    (min, l) => (l.price > 0 && (min === 0 || l.price < min) ? l.price : min),
    0,
  );
  const rating = getCompanyRating(company.id);
  const reviews = getCompanyReviews(company.id);
  // Распределение оценок: считаем после объявления reviews.
  const ratingBuckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  const tours = state.tours
    .filter((t) => t.operatorOrgId === company.id && t.status === "active")
    .slice(0, 6);
  const photos = company.photos ?? [];
  const videos = company.videos ?? [];
  // Карточку собрала платформа: владелец её ещё не подтвердил, и запись
  // может остаться без ответа. Честно говорим об этом туристу.
  const listedByPlatform = company.listedByPlatform === true;
  // Знак проверки — только тем, кто прошёл модерацию как партнёр. Карточка,
  // которую завела сама платформа, «проверенной» называться не может.
  const verified = company.status === "APPROVED" && !listedByPlatform;
  const wa = company.whatsapp?.replace(/\D/g, "") || company.phone?.replace(/\D/g, "") || "";
  const mapsUrl = company.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${company.address}, ${company.city}`,
      )}`
    : "";
  const today = new Date().toISOString().slice(0, 10);
  const promoActive = Boolean(
    company.promoText?.trim() && (!company.promoUntil || company.promoUntil >= today),
  );
  const trackClick = (channel: string) => {
    if (user && user.organizationId === company.id) return;
    trackEvent("COMPANY_CONTACT_CLICK", userId, { companyId: company.id, channel });
  };

  // Чекин «я пришёл»: для бизнеса (спорт, жильё, авто) считаем реальные визиты
  // из приложения. Один раз в день, свои сотрудники не считаются.
  const cats = categoriesOfServices(company.services ?? []);
  const isBusiness = cats.has("sport") || cats.has("stays") || cats.has("cars");
  const isOwnStaff = Boolean(user && user.organizationId === company.id);
  // Ближайшие свободные окна: показываем прямо на странице, чтобы запись
  // была в один тап, без открытия формы и поиска времени.
  const nextSlots = (() => {
    if (!scheduleActive(company) || isOwnStaff) return [];
    const out: { date: string; time: string }[] = [];
    for (const date of bookableDates(company).slice(0, 4)) {
      for (const slot of availableSlots(company, date)) {
        if (slot.full) continue;
        out.push({ date, time: slot.time });
        if (out.length >= 4) return out;
        break;
      }
    }
    return out;
  })();

  const openRequest = (
    listing: VerticalListing | null,
    slot: { date: string; time: string } | null,
  ) => {
    setRequestListing(listing);
    setRequestSlot(slot);
    setRequestOpen(true);
  };

  // Отзыв предлагаем тем, кто реально был: выполненная запись или отметка визита.
  const visitedBefore = Boolean(
    user &&
    (state.serviceRequests.some(
      (r) => r.organizationId === company.id && r.userId === user.id && r.status === "DONE",
    ) ||
      state.analyticsEvents.some(
        (e) =>
          e.type === "COMPANY_CHECKIN" &&
          e.userId === user.id &&
          e.payload?.["companyId"] === company.id,
      )),
  );
  const canReview = Boolean(user && isBusiness && !isOwnStaff && visitedBefore);
  const alreadyReviewed = Boolean(user && hasReviewed(company.id, user.id));

  const checkedInToday = Boolean(
    user &&
    state.analyticsEvents.some(
      (e) =>
        e.type === "COMPANY_CHECKIN" &&
        e.userId === user.id &&
        e.payload?.["companyId"] === company.id &&
        e.createdAt.slice(0, 10) === today,
    ),
  );
  const checkIn = () => {
    if (!user || isOwnStaff || checkedInToday) return;
    trackEvent("COMPANY_CHECKIN", user.id, { companyId: company.id, userName: user.name });
    toast.success("Отметили визит. Компания увидит, что вы пришли из TourGo.");
  };

  return (
    <SiteLayout>
      <section className="container-page pt-6">
        <div className="relative overflow-hidden rounded-3xl">
          {company.coverUrl ? (
            <img src={company.coverUrl} alt="" className="h-36 w-full object-cover md:h-52" />
          ) : (
            <div className="h-28 w-full bg-[linear-gradient(120deg,oklch(0.55_0.13_250),oklch(0.45_0.1_265))] md:h-40" />
          )}
          <div className="absolute inset-0 media-scrim" />
        </div>

        <div className="surface-card relative z-10 -mt-12 mx-auto p-5 md:mx-8 md:p-6">
          <div className="flex flex-wrap items-start gap-4 md:items-center md:gap-5">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt=""
                className="size-16 rounded-2xl border border-border object-cover md:size-20"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 font-display text-xl font-semibold text-primary md:size-20">
                {company.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold md:text-2xl">{company.name}</h1>
              {verified ? (
                <Badge className="mt-1.5 border-0 bg-success/12 text-success">
                  <BadgeCheck className="mr-1 size-3.5" />
                  Проверенная компания
                </Badge>
              ) : null}
              {listedByPlatform ? (
                // Бейдж — он же вход для владельца: он первым делом смотрит
                // на шапку своей страницы, а не на карточку контактов внизу.
                <button type="button" onClick={() => setClaimOpen(true)} className="mt-1.5 block">
                  <Badge className="border-0 bg-secondary text-muted-foreground hover:bg-secondary/70">
                    Карточку собрал TourGo · это наша компания
                  </Badge>
                </button>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {rating ? (
                  <a href="#reviews" className="inline-flex items-center gap-1 font-medium">
                    <Star className="size-4 fill-premium text-premium" />
                    {rating.average.toFixed(1)}
                    <span className="text-muted-foreground">({rating.count})</span>
                  </a>
                ) : null}
                <span className="text-muted-foreground">
                  {company.city}, {company.country}
                </span>
                {nowOpen.open ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-success">
                    <span className="size-1.5 rounded-full bg-success" />
                    Открыто до {nowOpen.closesAt}
                  </span>
                ) : nowOpen.opensLabel ? (
                  <span className="inline-flex items-baseline gap-1.5 font-medium text-muted-foreground">
                    <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                    Откроется {nowOpen.opensLabel}
                  </span>
                ) : null}
                {minPrice > 0 ? (
                  <span className="text-muted-foreground">
                    от{" "}
                    <span className="font-semibold text-foreground">{formatPrice(minPrice)}</span>
                  </span>
                ) : null}
              </div>
              {(company.services ?? []).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {company.services!.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">
            {wa ? (
              <Button variant="outline" size="sm" className="md:h-10 md:px-4" asChild>
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackClick("whatsapp")}
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {mapsUrl ? (
              <Button variant="outline" size="sm" className="md:h-10 md:px-4" asChild>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackClick("map")}
                >
                  <MapPin className="size-4" />
                  Маршрут
                </a>
              </Button>
            ) : null}
            {isBusiness && !isOwnStaff ? (
              user ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="md:h-10 md:px-4"
                  disabled={checkedInToday}
                  onClick={checkIn}
                >
                  <CheckCircle2 className="size-4" />
                  {checkedInToday ? "Визит отмечен" : "Я здесь — отметиться"}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="md:h-10 md:px-4" asChild>
                  <Link to="/login" search={{ next: `/company/${company.id}` } as never}>
                    <CheckCircle2 className="size-4" />
                    Отметить визит
                  </Link>
                </Button>
              )
            ) : null}
            {isBusiness ? (
              isOwnStaff ? null : (
                <Button
                  size="sm"
                  className="ml-auto md:h-10 md:px-4"
                  onClick={() => setRequestOpen(true)}
                >
                  Оставить заявку
                </Button>
              )
            ) : (
              <Button size="sm" className="ml-auto md:h-10 md:px-4" asChild>
                <Link to="/request" search={{}}>
                  Оставить заявку
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="container-page grid gap-6 py-10 pb-44 md:pb-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {promoActive ? (
            <section className="overflow-hidden rounded-3xl border border-premium/30 bg-[linear-gradient(120deg,oklch(0.97_0.03_85),oklch(0.98_0.015_60))] p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-premium/15 text-premium">
                  <Percent className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold">Акция</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                    {company.promoText}
                  </p>
                  {company.promoUntil ? (
                    <p className="mt-2 text-xs font-medium text-premium">
                      Действует до {fmtDate(company.promoUntil)}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {nextSlots.length > 0 ? (
            <section className="surface-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">Ближайшее свободное</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Нажмите время — заполните имя и телефон, это всё.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {nextSlots.map((slot) => {
                  const day = new Date(`${slot.date}T00:00:00`);
                  const isToday = slot.date === todayLocal;
                  return (
                    <button
                      key={`${slot.date}-${slot.time}`}
                      type="button"
                      onClick={() => openRequest(null, slot)}
                      className="rounded-2xl border border-border px-4 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
                    >
                      <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                        {isToday
                          ? "сегодня"
                          : day.toLocaleDateString("ru-RU", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                      </span>
                      <span className="block font-display text-lg font-semibold">{slot.time}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {publishedListings.length > 0 ? (
            <section className="surface-card p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">Услуги и цены</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Выберите, что нужно — запись займёт минуту.
                  </p>
                </div>
                {minPrice > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    от{" "}
                    <span className="font-display text-lg font-semibold text-foreground">
                      {formatPrice(minPrice)}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {publishedListings.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border transition-colors hover:border-primary/40"
                  >
                    {item.photos?.[0] ? (
                      <img
                        src={item.photos[0]}
                        alt=""
                        loading="lazy"
                        className="h-32 w-full object-cover"
                      />
                    ) : null}
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {listingKindLabel(item.vertical, item.kind)}
                      </p>
                      <h3 className="mt-1 font-display text-base font-semibold">{item.name}</h3>
                      {item.detail ? (
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                        <p className="font-display text-lg font-semibold">
                          {item.price > 0 ? formatPrice(item.price) : "по запросу"}
                        </p>
                        {isOwnStaff ? null : (
                          <Button size="sm" onClick={() => openRequest(item, null)}>
                            Записаться
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {company.about ? (
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">О компании</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {company.about}
              </p>
            </section>
          ) : null}

          {photos.length > 0 ? (
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Фотографии</h2>
              <PhotoGallery photos={photos} alt={company.name} />
            </section>
          ) : null}

          {videos.length > 0 ? (
            <section className="surface-card space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Видео</h2>
              {videos.map((url) => {
                const embed = youtubeEmbed(url);
                return embed ? (
                  <iframe
                    key={url}
                    title="Видео компании"
                    src={embed}
                    className="aspect-video w-full rounded-2xl"
                    allowFullScreen
                  />
                ) : (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Смотреть видео
                  </a>
                );
              })}
            </section>
          ) : null}

          {tours.length > 0 ? (
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Туры компании</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {tours.map((t) => {
                  const hotel = getHotel(t.hotelId);
                  return (
                    <Link
                      key={t.id}
                      to="/tour/$tourId"
                      params={{ tourId: t.id }}
                      className="overflow-hidden rounded-2xl border border-border transition-colors hover:border-primary/40"
                    >
                      <img src={tourCover(t, hotel)} alt="" className="h-32 w-full object-cover" />
                      <div className="p-4">
                        <p className="font-medium">{t.title || hotel.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.from} → {hotel.city} · {nightsLabel(t.nights)} · {t.meal}
                        </p>
                        <p className="mt-2 font-display text-lg font-semibold">
                          {formatPrice(t.price)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section id="reviews" className="scroll-mt-24 surface-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Отзывы</h2>
              {canReview ? (
                alreadyReviewed ? (
                  <span className="text-xs text-muted-foreground">Вы оставили отзыв</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
                    <Star className="size-3.5" />
                    Оставить отзыв
                  </Button>
                )
              ) : null}
            </div>
            {rating ? (
              <div className="mt-4 flex flex-wrap items-center gap-6 rounded-2xl bg-secondary/40 p-4">
                <div className="text-center">
                  <p className="font-display text-3xl font-semibold">{rating.average.toFixed(1)}</p>
                  <div className="mt-1 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3.5",
                          i <= Math.round(rating.average)
                            ? "fill-premium text-premium"
                            : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{rating.count} отзывов</p>
                </div>
                <div className="min-w-[12rem] flex-1 space-y-1">
                  {ratingBuckets.map((bucket) => (
                    <div key={bucket.stars} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground">{bucket.stars}</span>
                      <Star className="size-3 fill-premium text-premium" />
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <span
                          className="block h-full rounded-full bg-premium"
                          style={{
                            width: `${rating.count ? (bucket.count / rating.count) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      <span className="w-4 text-right tabular-nums text-muted-foreground">
                        {bucket.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {isBusiness
                  ? "Отзывов пока нет. Их оставляют клиенты после визита."
                  : "Отзывов пока нет. Они появятся, когда туристы съездят с этой компанией."}
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {(allReviews ? reviews : reviews.slice(0, 3)).map((r) => (
                  <article key={r.id} className="rounded-2xl bg-secondary/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{r.authorName}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p>
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3.5",
                            i <= r.rating
                              ? "fill-premium text-premium"
                              : "text-muted-foreground/40",
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm">{r.text}</p>
                    {r.reply ? (
                      <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Ответ компании
                        </p>
                        <p className="mt-2 text-sm leading-relaxed">{r.reply}</p>
                        {r.replyByName ? (
                          <p className="mt-2 text-xs text-muted-foreground">{r.replyByName}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
                {!allReviews && reviews.length > 3 ? (
                  <Button variant="outline" className="w-full" onClick={() => setAllReviews(true)}>
                    Показать ещё {reviews.length - 3}
                  </Button>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {company.address ? (
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Как добраться</h2>
              <p className="mt-2 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  {company.address}
                  <span className="block text-muted-foreground">
                    {company.city}, {company.country}
                  </span>
                </span>
              </p>
              {mapsUrl ? (
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackClick("map")}
                  >
                    <MapPin className="size-4" />
                    Построить маршрут
                  </a>
                </Button>
              ) : null}
            </section>
          ) : null}

          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Контакты</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <WorkingHours
                schedule={company.bookingSchedule}
                {...(company.workingHours ? { fallbackText: company.workingHours } : {})}
              />
              {company.phone ? (
                <ContactRow
                  icon={Phone}
                  label={company.phone}
                  href={`tel:${company.phone}`}
                  onClick={() => trackClick("phone")}
                />
              ) : null}
              {company.whatsapp ? (
                <ContactRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`}
                  onClick={() => trackClick("whatsapp")}
                />
              ) : null}
              {company.telegram ? (
                <ContactRow
                  icon={Send}
                  label="Telegram"
                  href={company.telegram}
                  onClick={() => trackClick("telegram")}
                />
              ) : null}
              {company.instagram ? (
                <ContactRow
                  icon={Instagram}
                  label={company.instagram}
                  href={
                    company.instagram.startsWith("http")
                      ? company.instagram
                      : `https://instagram.com/${company.instagram.replace(/^@/, "")}`
                  }
                  onClick={() => trackClick("instagram")}
                />
              ) : null}
              {company.website ? (
                <ContactRow
                  icon={Globe}
                  label={company.website}
                  href={company.website}
                  onClick={() => trackClick("website")}
                />
              ) : null}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Услуги оказывает эта компания. TourGo помогает найти и сравнить предложения.
            </p>
            {listedByPlatform ? (
              <div className="mt-4 rounded-xl bg-secondary/50 px-4 py-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Страницу собрал TourGo по открытым данным. Владелец её ещё не подтвердил — на
                  запись могут ответить не сразу.
                </p>
                <button
                  type="button"
                  onClick={() => setClaimOpen(true)}
                  className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  Это наша компания
                </button>
              </div>
            ) : null}
          </section>

          {(company.services ?? []).length > 0 ||
          (company.countries ?? []).length > 0 ||
          (company.languages ?? []).length > 0 ||
          (company.clientCountries ?? []).length > 0 ? (
            <section className="surface-card space-y-4 p-6">
              <ChipRow title="Услуги" items={company.services ?? []} />
              <ChipRow title="Где работает" items={company.countries ?? []} />
              <ChipRow title="Откуда туристы" items={company.clientCountries ?? []} />
              <ChipRow title="Языки" items={company.languages ?? []} />
            </section>
          ) : null}
        </aside>
      </div>

      {isBusiness && !isOwnStaff ? (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{company.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {minPrice > 0 ? `от ${formatPrice(minPrice)}` : "запись без предоплаты"}
                {nowOpen.open ? ` · открыто до ${nowOpen.closesAt}` : ""}
              </p>
            </div>
            <Button className="shrink-0" onClick={() => openRequest(null, nextSlots[0] ?? null)}>
              Записаться
            </Button>
          </div>
        </div>
      ) : null}

      {listedByPlatform ? (
        <ClaimCompanyDialog
          open={claimOpen}
          onOpenChange={setClaimOpen}
          organizationId={company.id}
          companyName={company.name}
        />
      ) : null}

      {user ? (
        <CompanyReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          organizationId={company.id}
          organizationName={company.name}
          userId={user.id}
          userName={user.name}
        />
      ) : null}

      <ServiceRequestDialog
        key={`${requestListing?.id ?? "company"}:${requestSlot?.date ?? ""}:${requestSlot?.time ?? ""}`}
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) {
            setRequestListing(null);
            setRequestSlot(null);
          }
        }}
        organizationId={company.id}
        organizationName={company.name}
        {...(requestListing
          ? { listingId: requestListing.id, listingName: requestListing.name }
          : {})}
        {...(requestSlot ? { initialDate: requestSlot.date, initialTime: requestSlot.time } : {})}
      />
    </SiteLayout>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: typeof Phone;
  label: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
        className="flex items-center gap-2 text-foreground hover:text-primary"
      >
        <Icon className="size-4 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </a>
    </li>
  );
}

function ChipRow({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs">
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
