import { Link, createFileRoute } from "@tanstack/react-router";

import {
  MediaCardCaption,
  mediaBodyClass,
  mediaMetaClass,
  mediaTitleClass,
} from "@/components/media/media-card-overlay";
import { SiteLayout } from "@/components/site/site-layout";
import { destinations } from "@/data/demo";

export const Route = createFileRoute("/destinations")({
  head: () => ({
    meta: [
      { title: "Направления — куда поехать · TourGo" },
      {
        name: "description",
        content:
          "Страны и курорты с турами от разных компаний. Откройте направление и сравните цены рядом.",
      },
      { property: "og:title", content: "Направления · TourGo" },
      {
        property: "og:description",
        content: "Выберите страну и сравните предложения турфирм.",
      },
    ],
  }),
  component: DestinationsPage,
});

function DestinationsPage() {
  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Куда поехать</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Выберите страну — внутри туры от разных компаний с ценами, отелями и питанием рядом.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              to="/destination/$destinationId"
              params={{ destinationId: dest.id }}
              className="hover-lift group relative overflow-hidden rounded-3xl"
            >
              <img
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-80"
              />
              <div className="absolute inset-0 media-scrim-strong" />
              <MediaCardCaption>
                <h2 className={mediaTitleClass("lg")}>
                  {dest.flag} {dest.country}
                </h2>
                <p className={mediaBodyClass()}>{dest.blurb}</p>
                <p className={mediaMetaClass()}>
                  {dest.tours} предложений · {dest.city}
                </p>
              </MediaCardCaption>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
