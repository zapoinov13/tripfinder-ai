import { Link, createFileRoute } from "@tanstack/react-router";

import {
  MediaCardCaption,
  mediaBodyClass,
  mediaMetaClass,
  mediaTitleClass,
} from "@/components/media/media-card-overlay";
import { SiteLayout } from "@/components/site/site-layout";
import { VitrineHeader } from "@/components/site/vitrine-filters";
import { destinations } from "@/data/demo";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/destinations")({
  head: () =>
    seo({
      title: "Куда поехать: направления и цены на туры",
      description:
        "ОАЭ, Турция, Таиланд, Египет, Вьетнам и другие направления: курорты, сезон и цены туров от компаний. Откройте страну и сравните предложения.",
      path: "/destinations",
    }),
  component: DestinationsPage,
});

function DestinationsPage() {
  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-12">
        <VitrineHeader
          section="Направления"
          title="Куда поехать"
          subtitle="Выберите страну: внутри туры от разных компаний с ценами, отелями и питанием рядом."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
