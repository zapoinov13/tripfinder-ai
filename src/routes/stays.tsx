import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { destinations, resortsByDestination } from "@/data/demo";
import { formatKzt, popularStayCities, stayAreas, stayKinds, stays } from "@/data/scenario-catalog";
import { cn } from "@/lib/utils";

type Search = {
  destination?: string;
  city?: string;
  kind?: string;
  q?: string;
  checkIn?: string;
  checkOut?: string;
};

export const Route = createFileRoute("/stays")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" ? { destination: search["destination"] } : {}),
    ...(typeof search["city"] === "string" ? { city: search["city"] } : {}),
    ...(typeof search["kind"] === "string" ? { kind: search["kind"] } : {}),
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
    ...(typeof search["checkIn"] === "string" ? { checkIn: search["checkIn"] } : {}),
    ...(typeof search["checkOut"] === "string" ? { checkOut: search["checkOut"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Жильё: отели, квартиры и виллы · TourGo" },
      {
        name: "description",
        content: "Где хотите остановиться? Отели, апартаменты, квартиры и виллы.",
      },
    ],
  }),
  component: StaysPage,
});

function StaysPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/stays" });
  const update = (patch: Search) => void navigate({ search: { ...params, ...patch } as never });
  const [city, setCity] = useState(params.city ?? params.q ?? "");

  useEffect(() => {
    setCity(params.city ?? "");
  }, [params.city]);

  const list = stays.filter((item) => {
    if (params.destination && item.destinationId !== params.destination) return false;
    if (params.kind && item.kind !== params.kind) return false;
    const needle = (params.city || city || "").trim().toLowerCase();
    if (!needle) return true;
    return (
      `${item.city} ${item.area} ${item.name}`.toLowerCase().includes(needle) ||
      popularStayCities.some(
        (place) =>
          place.city.toLowerCase() === item.city.toLowerCase() &&
          (place.name.toLowerCase() === needle || place.city.toLowerCase() === needle),
      )
    );
  });

  const dest = destinations.find((d) => d.id === params.destination);
  const areas = dest
    ? (stayAreas[dest.id] ?? (resortsByDestination[dest.id] ?? []).map((r) => r.name))
    : [];

  const requestFor = (wish: string) => ({
    kind: "assistance" as const,
    ...(params.destination ? { destination: params.destination } : {}),
    ...(params.city ? { city: params.city } : {}),
    wish,
  });

  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-12">
        <p className="text-sm font-medium text-primary">Жильё</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">
          Где хотите остановиться?
        </h1>
        <form
          className="surface-card mt-6 grid gap-3 p-3 md:grid-cols-[1.2fr_1fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const hit = popularStayCities.find(
              (item) =>
                item.name.toLowerCase() === city.toLowerCase() ||
                item.city.toLowerCase() === city.toLowerCase(),
            );
            update({
              city: hit?.city ?? city,
              ...(hit?.destinationId
                ? { destination: hit.destinationId }
                : params.destination
                  ? { destination: params.destination }
                  : {}),
            });
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Город / страна
            </span>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dubai, Phuket, Bali"
                className="h-12 w-full rounded-2xl border border-border bg-background pl-10 pr-3 text-sm"
              />
            </div>
          </label>
          <DateRangePicker
            variant="field"
            label="Заезд — выезд"
            from={params.checkIn ?? ""}
            to={params.checkOut ?? ""}
            onChange={(next) => update({ checkIn: next.from, checkOut: next.to })}
          />
          <Button size="lg" className="h-12" type="submit">
            <Search className="size-4" />
            Найти жильё
          </Button>
        </form>

        <h2 className="mt-10 font-display text-2xl font-semibold">Популярные направления</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {popularStayCities.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setCity(item.city);
                update({ destination: item.destinationId, city: item.city });
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold",
                params.city === item.city
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {stayKinds.map((kind) => (
            <button
              key={kind.id}
              type="button"
              onClick={() => update({ kind: params.kind === kind.id ? "" : kind.id })}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold",
                params.kind === kind.id ? "bg-ink text-primary-foreground" : "bg-secondary",
              )}
            >
              {kind.label}
            </button>
          ))}
        </div>

        {areas.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {areas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => update({ city: area })}
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/40"
              >
                {area}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => (
            <article key={item.id} className="surface-card flex flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.area} · {item.city}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold">{item.name}</h3>
              <p className="mt-2 text-sm text-foreground/70">Рейтинг {item.rating}</p>
              <p className="mt-4 font-display text-lg font-semibold">
                {formatKzt(item.price)}{" "}
                <span className="text-sm font-medium text-foreground/60">{item.nightsHint}</span>
              </p>
              <Button className="mt-4" asChild>
                <Link to="/request" search={requestFor(`${item.name}, ${item.city}`)}>
                  Запросить цену
                </Link>
              </Button>
            </article>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="surface-card mt-8 p-6 text-center">
            <p className="text-foreground/70">
              По этому запросу пока нет карточек. Оставьте заявку — компании пришлют варианты.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/request" search={requestFor(params.q || city || "Нужно жильё")}>
                Оставить заявку
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </SiteLayout>
  );
}
