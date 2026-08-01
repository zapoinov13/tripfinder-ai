import { Link, createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import { destinations } from "@/data/demo";

export const Route = createFileRoute("/destinations")({
  head: () => ({
    meta: [
      { title: "Направления — куда поехать | Voyago" },
      {
        name: "description",
        content: "10 популярных направлений: Турция, ОАЭ, Таиланд, Египет, Мальдивы и другие.",
      },
      { property: "og:title", content: "Направления — Voyago" },
      { property: "og:description", content: "Идеи для вашего следующего путешествия." },
    ],
  }),
  component: DestinationsPage,
});

function DestinationsPage() {
  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Направления</h1>
        <p className="mt-2 text-muted-foreground">Идеи для вашего следующего путешествия</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h2 className="font-display text-xl font-semibold text-primary-foreground">
                  {dest.flag} {dest.country}
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/80">{dest.blurb}</p>
                <p className="mt-3 text-xs font-semibold uppercase text-primary-foreground/70">
                  {dest.tours} туров · {dest.city}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}