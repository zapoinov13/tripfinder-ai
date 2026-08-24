import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { resortsByDestination } from "@/data/demo";
import { carClasses, cars, formatKzt, popularCarCountries } from "@/data/scenario-catalog";
import { cn } from "@/lib/utils";

type Search = {
  destination?: string;
  city?: string;
  klass?: string;
  q?: string;
  pickup?: string;
  dropoff?: string;
  age?: string;
};

export const Route = createFileRoute("/cars")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" ? { destination: search["destination"] } : {}),
    ...(typeof search["city"] === "string" ? { city: search["city"] } : {}),
    ...(typeof search["klass"] === "string" ? { klass: search["klass"] } : {}),
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
    ...(typeof search["pickup"] === "string" ? { pickup: search["pickup"] } : {}),
    ...(typeof search["dropoff"] === "string" ? { dropoff: search["dropoff"] } : {}),
    ...(typeof search["age"] === "string" ? { age: search["age"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Аренда авто без водителя · TourGo" },
      { name: "description", content: "Машины без водителя. Страна, город, даты и класс авто." },
    ],
  }),
  component: CarsPage,
});

function CarsPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/cars" });
  const update = (patch: Search) => void navigate({ search: { ...params, ...patch } as never });
  const [geoHint, setGeoHint] = useState("");
  const [age, setAge] = useState(params.age ?? "25");

  const cities = params.destination ? (resortsByDestination[params.destination] ?? []) : [];
  const needle = (params.q ?? "").toLowerCase();
  const list = cars.filter((item) => {
    if (params.destination && item.destinationId !== params.destination) return false;
    if (params.city && item.city !== params.city) return false;
    if (params.klass && item.klass !== params.klass) return false;
    if (!params.destination && !params.city && !params.klass && needle) {
      return `${item.name} ${item.city} ${item.klass}`.toLowerCase().includes(needle);
    }
    return true;
  });

  const useLocation = () => {
    if (!navigator.geolocation) {
      setGeoHint("Геолокация недоступна, выберите страну вручную");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoHint("Определили регион. Проверьте город и даты.");
        update({ destination: "uae", city: "Дубай" });
      },
      () => setGeoHint("Не удалось определить место, выберите страну"),
    );
  };

  const requestFor = (wish: string) => ({
    kind: "assistance" as const,
    ...(params.destination ? { destination: params.destination } : {}),
    ...(params.city ? { city: params.city } : {}),
    wish,
  });

  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-12">
        <p className="text-sm font-medium text-primary">Аренда авто</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">Где нужна машина?</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground/70">
          Только авто без водителя. Машину с водителем ищите в разделе «Помощь в поездке».
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={useLocation}>
            Использовать моё местоположение
          </Button>
          {geoHint ? <p className="self-center text-sm text-foreground/70">{geoHint}</p> : null}
        </div>

        <h2 className="mt-10 font-display text-2xl font-semibold">Популярные страны</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {popularCarCountries.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => update({ destination: item.id, city: "" })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold",
                params.destination === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              {item.flag} {item.country}
            </button>
          ))}
        </div>

        {cities.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => update({ city: city.name })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm",
                  params.city === city.name ? "bg-ink text-primary-foreground" : "bg-secondary",
                )}
              >
                {city.name}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="surface-card mt-8 grid gap-3 p-4 md:grid-cols-[1fr_10rem_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            update({ age });
            document.getElementById("cars-results")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <DateRangePicker
            variant="field"
            label="Получение и возврат"
            from={params.pickup ?? ""}
            to={params.dropoff ?? ""}
            onChange={(next) => update({ pickup: next.from, dropoff: next.to })}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Возраст водителя
            </span>
            <input
              type="number"
              min={18}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm"
            />
          </label>
          <Button type="submit" size="lg" className="h-12">
            <Search className="size-4" />
            Найти авто
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap gap-2">
          {carClasses.map((klass) => (
            <button
              key={klass.id}
              type="button"
              onClick={() => update({ klass: params.klass === klass.id ? "" : klass.id })}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold",
                params.klass === klass.id ? "bg-ink text-primary-foreground" : "bg-secondary",
              )}
            >
              {klass.label}
            </button>
          ))}
        </div>

        <div id="cars-results" className="mt-8 grid scroll-mt-28 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => (
            <article key={item.id} className="surface-card flex flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.city}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold">{item.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {item.seats} мест · {item.gearbox} · {item.deposit}
              </p>
              <p className="mt-4 font-display text-lg font-semibold">
                {formatKzt(item.price)} <span className="text-sm font-medium text-foreground/60">/ день</span>
              </p>
              <Button className="mt-4" asChild>
                <Link to="/request" search={requestFor(`Аренда ${item.name} в ${item.city}, без водителя`)}>
                  Запросить авто
                </Link>
              </Button>
            </article>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="surface-card mt-8 p-6 text-center">
            <p className="text-foreground/70">В этом городе пока нет машин в витрине. Компании пришлют варианты по заявке.</p>
            <Button className="mt-4" asChild>
              <Link to="/request" search={requestFor(params.q || "Нужна аренда авто без водителя")}>
                Оставить заявку
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </SiteLayout>
  );
}
