import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock3, MessageCircle, ShieldCheck, Sparkles, TicketCheck } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import {
  destinations,
  experienceTours,
  formatNumber,
  formatPrice,
  getHotel,
  supplierTrustScore,
} from "@/data/demo";

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Экскурсии и впечатления в Дубае | TourGo" },
      {
        name: "description",
        content:
          "Сафари, яхты, Burj Khalifa, обзорные туры, билеты и трансферы в Дубае от проверенных поставщиков TourGo.",
      },
      { property: "og:title", content: "Экскурсии и впечатления в Дубае · TourGo" },
      {
        property: "og:description",
        content:
          "Отдельная витрина впечатлений: price check, русскоязычная поддержка и подтверждение поставщика.",
      },
    ],
  }),
  component: ExperiencesPage,
});

const categories = [
  "Desert Safari",
  "Yacht & Marina",
  "Burj Khalifa",
  "Old Dubai",
  "Family Parks",
  "Transfers",
];

function ExperiencesPage() {
  const hero = destinations.find((d) => d.id === "dubai-experiences") ?? destinations[0]!;
  const featured = experienceTours.slice(0, 3);
  const avgPrice = Math.round(
    experienceTours.reduce((sum, tour) => sum + tour.price, 0) /
      Math.max(1, experienceTours.length),
  );
  const suppliers = new Set(experienceTours.map((tour) => tour.operatorId)).size;
  const topTrust = supplierTrustScore(featured[0]?.operatorId ?? "op-1");

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <img
          src={hero.image}
          alt={hero.country}
          className="h-[520px] w-full object-cover sm:h-[500px] md:h-[460px]"
        />
        <div className="absolute inset-0 bg-ink/65" />
        <div className="container-page absolute inset-x-0 top-0 flex h-full flex-col justify-end pb-8 pt-24 md:pb-10">
          <p className="font-display text-sm font-semibold tracking-[0.2em] text-primary-foreground/80 uppercase">
            Dubai experiences
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-3xl font-semibold leading-tight text-primary-foreground sm:text-4xl md:text-6xl">
            Экскурсии, яхты и впечатления в Дубае
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/82">
            Отдельная витрина для туристов из СНГ: сафари, яхты, Burj Khalifa, обзорные туры,
            билеты, трансферы и семейные активности с проверкой цены перед бронью.
          </p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/search" search={{ category: "excursion" } as never}>
                Смотреть предложения
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full bg-primary-foreground/12 text-primary-foreground backdrop-blur-md hover:bg-primary-foreground/20 sm:w-auto"
              asChild
            >
              <Link to="/ai-search">
                <Sparkles className="size-4" />
                Подобрать с AI
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: TicketCheck,
            label: "Активные впечатления",
            value: formatNumber(experienceTours.length),
          },
          { icon: ShieldCheck, label: "Поставщики", value: formatNumber(suppliers) },
          { icon: Clock3, label: "Ответ поставщика", value: `~${topTrust.responseMinutes} мин` },
          { icon: MessageCircle, label: "Средний чек", value: formatPrice(avgPrice) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-card px-4 py-4 md:px-5"
          >
            <item.icon className="size-5 text-primary" />
            <div className="mt-3 font-display text-xl font-semibold md:text-2xl">{item.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="container-page mt-12">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((category) => (
            <Link
              key={category}
              to="/search"
              search={{ q: category, category: "excursion" } as never}
              className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {featured.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
      </section>

      <section className="container-page mt-14">
        <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-semibold leading-tight md:text-3xl">
              Все впечатления Дубая
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Price check, наличие мест и подтверждение поставщика фиксируются в заявке.
            </p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/destination/$destinationId" params={{ destinationId: "dubai-experiences" }}>
              Раздел направления
            </Link>
          </Button>
        </div>
        <div className="grid gap-5">
          {experienceTours.map((tour) => {
            const hotel = getHotel(tour.hotelId);
            return (
              <div key={tour.id} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <TourCard tour={tour} />
                <div className="surface-card flex flex-col justify-center p-5 text-sm">
                  <div className="font-display text-lg font-semibold">{hotel.district}</div>
                  <p className="mt-2 text-muted-foreground">
                    Русскоязычная поддержка, pickup details и ваучер после подтверждения.
                  </p>
                  <Button className="mt-4 w-full" asChild>
                    <Link to="/tour/$tourId" params={{ tourId: tour.id }}>
                      Проверить цену
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
