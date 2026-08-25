import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import {
  MediaCardCaption,
  mediaBodyClass,
  mediaMetaClass,
  mediaTitleClass,
} from "@/components/media/media-card-overlay";
import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { formatNumber, getDestination, getResorts, getToursByDestination } from "@/data/demo";
import { cityCover } from "@/data/photos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/destination/$destinationId")({
  loader: ({ params }) => {
    const dest = getDestination(params.destinationId);
    if (!dest) throw notFound();
    return { dest };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Направление не найдено · TourGo" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `Туры в ${loaderData.dest.country}: курорты и цены | TourGo`;
    const description = `Все курорты направления ${loaderData.dest.country}: ${getResorts(
      loaderData.dest.id,
    )
      .slice(0, 4)
      .map((r) => r.name)
      .join(", ")} и другие. Сравните туры от проверенных операторов.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DestinationPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Направление не найдено</h1>
        <Button asChild className="mt-6">
          <Link to="/destinations">Все направления</Link>
        </Button>
      </div>
    </SiteLayout>
  ),
});

function DestinationPage() {
  const { dest } = Route.useLoaderData();
  const resorts = getResorts(dest.id);
  const destTours = getToursByDestination(dest.id);

  return (
    <SiteLayout>
      <section className="relative">
        <img src={dest.image} alt={dest.country} className="h-[22rem] w-full object-cover md:h-[28rem]" />
        <div className="absolute inset-0 media-scrim-strong" />
        <div className="container-page absolute inset-x-0 bottom-0 pb-8 pt-20">
          <Link
            to="/destinations"
            className="media-caption-muted text-sm font-medium hover:opacity-100"
          >
            ← Все направления
          </Link>
          <h1 className={cn(mediaTitleClass("lg"), "mt-3 text-3xl md:text-5xl")}>
            {dest.flag} {dest.country}
          </h1>
          <p className="media-caption-muted mt-2 max-w-2xl text-sm sm:text-base">{dest.blurb}</p>
          <p className="media-caption-muted mt-3 text-xs font-semibold tracking-wide">
            {formatNumber(dest.tours)} туров · {resorts.length} курортов
          </p>
        </div>
      </section>

      {(dest.photos?.length ?? 0) > 1 ? (
        <div className="container-page mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar md:mt-6">
          {dest.photos.slice(1, 8).map((img, i) => (
            <img
              key={`${img}-${i}`}
              src={img}
              alt=""
              className="h-28 w-44 shrink-0 rounded-2xl object-cover shadow-card md:h-36 md:w-56"
            />
          ))}
        </div>
      ) : null}

      <section className="container-page mt-12">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">
          Курорты: {dest.country}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Выберите курорт, чтобы посмотреть подходящие туры
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resorts.map((resort) => (
            <Link
              key={resort.name}
              to="/search"
              search={{ destination: dest.id, city: resort.name } as never}
              className="hover-lift group relative overflow-hidden rounded-3xl"
            >
              <img
                src={cityCover(dest.id, resort.name)}
                alt={resort.name}
                className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 media-scrim-strong" />
              <MediaCardCaption>
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 opacity-90" />
                  <span className={mediaTitleClass("sm")}>{resort.name}</span>
                </span>
                <span className={mediaBodyClass()}>{resort.blurb}</span>
                <span className={mediaMetaClass()}>{formatNumber(resort.tours)} туров</span>
              </MediaCardCaption>
            </Link>
          ))}
        </div>
      </section>

      {destTours.length > 0 ? (
        <section className="container-page mt-16 mb-20">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Туры: {dest.country}</h2>
          <div className="mt-8 space-y-5">
            {destTours.slice(0, 6).map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
          <Button variant="outline" asChild className="mt-8">
            <Link to="/search" search={{ destination: dest.id } as never}>
              Все туры
            </Link>
          </Button>
        </section>
      ) : null}
    </SiteLayout>
  );
}
