import { Link, createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Globe, MessageCircle, Phone, Send, Star } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, getHotel } from "@/data/demo";
import { usePlatformStore } from "@/lib/platform/hooks";
import { getCompanyRating, getCompanyReviews } from "@/lib/platform/messages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/$companyId")({
  head: () => ({ meta: [{ title: "Туристическая компания — TourGo" }] }),
  component: CompanyPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

function CompanyPage() {
  const { companyId } = Route.useParams();
  const state = usePlatformStore();
  const company = state.organizations.find((o) => o.id === companyId);

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

  const rating = getCompanyRating(company.id);
  const reviews = getCompanyReviews(company.id);
  const tours = state.tours
    .filter((t) => t.operatorOrgId === company.id && t.status === "active")
    .slice(0, 6);
  const photos = company.photos ?? [];
  const videos = company.videos ?? [];

  return (
    <SiteLayout>
      <section className="container-page pt-6">
        <div className="relative overflow-hidden rounded-4xl bg-secondary">
          {company.coverUrl ? (
            <img src={company.coverUrl} alt="" className="h-56 w-full object-cover md:h-72" />
          ) : (
            <div className="h-40 w-full bg-[linear-gradient(120deg,oklch(0.55_0.13_250),oklch(0.45_0.1_265))] md:h-52" />
          )}
        </div>

        <div className="surface-card -mt-12 relative mx-auto flex flex-wrap items-center gap-5 p-6 md:mx-8">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt=""
              className="size-16 rounded-2xl border border-border object-cover"
            />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 font-display text-xl font-semibold text-primary">
              {company.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold">
              {company.name}
              {company.status === "APPROVED" ? (
                <Badge className="bg-success/12 text-success">
                  <BadgeCheck className="mr-1 size-3.5" />
                  Проверенная компания
                </Badge>
              ) : null}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {company.city}, {company.country}
              {rating ? ` · ★ ${rating.average.toFixed(1)} (${rating.count})` : ""}
            </p>
          </div>
          <Button asChild>
            <Link to="/request" search={{}}>
              Оставить заявку
            </Link>
          </Button>
        </div>
      </section>

      <div className="container-page grid gap-6 py-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {company.about ? (
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">О компании</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {company.about}
              </p>
            </section>
          ) : null}

          {photos.length > 0 ? (
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Фотографии</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {photos.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    loading="lazy"
                    className="h-32 w-full rounded-2xl object-cover"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {videos.length > 0 ? (
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Видео</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {videos.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
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
                      className="rounded-2xl border border-border p-4 transition-colors hover:border-primary/40"
                    >
                      <p className="font-medium">{hotel?.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.from} → {hotel?.city} · {t.nights} ноч. · {t.meal}
                      </p>
                      <p className="mt-2 font-display text-lg font-semibold">
                        {formatPrice(t.price)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">
              Отзывы {rating ? `· ${rating.average.toFixed(1)} из 5` : ""}
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                У компании пока нет отзывов. Первый отзыв появится, когда турист выберет её
                предложение и поделится впечатлениями.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map((r) => (
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
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Контакты</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {company.phone ? (
                <ContactRow icon={Phone} label={company.phone} href={`tel:${company.phone}`} />
              ) : null}
              {company.whatsapp ? (
                <ContactRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`}
                />
              ) : null}
              {company.telegram ? (
                <ContactRow icon={Send} label="Telegram" href={company.telegram} />
              ) : null}
              {company.website ? (
                <ContactRow icon={Globe} label={company.website} href={company.website} />
              ) : null}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Тур продаёт эта компания. TourGo помогает найти и сравнить предложения.
            </p>
          </section>

          {(company.services ?? []).length > 0 ||
          (company.countries ?? []).length > 0 ||
          (company.languages ?? []).length > 0 ? (
            <section className="surface-card space-y-4 p-6">
              <ChipRow title="Услуги" items={company.services ?? []} />
              <ChipRow title="Страны работы" items={company.countries ?? []} />
              <ChipRow title="Языки общения" items={company.languages ?? []} />
            </section>
          ) : null}
        </aside>
      </div>
    </SiteLayout>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Phone;
  label: string;
  href: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
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
