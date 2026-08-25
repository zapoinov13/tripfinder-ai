import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, MapPin, Search } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { resortsByDestination } from "@/data/demo";
import { carClasses, cars, formatKzt, popularCarCountries } from "@/data/scenario-catalog";
import {
  listPublishedVertical,
  subscribeVerticalListings,
  type VerticalListing,
} from "@/lib/platform/vertical-listings";
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

type CarCard = {
  id: string;
  name: string;
  city: string;
  destinationId: string;
  klass: string;
  price: number;
  seats: number;
  gearbox: string;
  deposit: string;
  companyName?: string;
  address?: string;
  features?: string[];
  about?: string;
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
      {
        name: "description",
        content: "Машины без водителя от компаний. Сравните цены и запросите авто.",
      },
    ],
  }),
  component: CarsPage,
});

const EMPTY_LISTINGS: VerticalListing[] = [];

function usePublishedCars() {
  return useSyncExternalStore(
    subscribeVerticalListings,
    () => listPublishedVertical("car"),
    () => EMPTY_LISTINGS,
  );
}

function CarsPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/cars" });
  const update = (patch: Search) => void navigate({ search: { ...params, ...patch } as never });
  const [geoHint, setGeoHint] = useState("");
  const [age, setAge] = useState(params.age ?? "25");
  const published = usePublishedCars();

  const cities = params.destination ? (resortsByDestination[params.destination] ?? []) : [];
  const needle = (params.q ?? "").toLowerCase();

  const catalog: CarCard[] = [
    ...published.map((item) => {
      const parts = item.detail.split("·").map((p) => p.trim());
      const deposit =
        item.deposit !== undefined
          ? item.deposit > 0
            ? `депозит ${formatKzt(item.deposit)}`
            : "без депозита"
          : parts[1] || "с депозитом";
      return {
        id: item.id,
        name: item.name,
        city: item.city,
        destinationId: item.destinationId,
        klass: item.kind,
        price: item.price,
        seats: item.seats ?? 5,
        gearbox: item.transmission || parts[0] || "автомат",
        deposit,
        companyName: item.companyName,
        ...(item.address ? { address: item.address } : {}),
        ...(item.amenities?.length ? { features: item.amenities } : {}),
        ...(item.about ? { about: item.about } : {}),
      };
    }),
    ...cars,
  ];

  const list = catalog.filter((item) => {
    if (params.destination && item.destinationId !== params.destination) return false;
    if (params.city && item.city !== params.city) return false;
    if (params.klass && item.klass !== params.klass) return false;
    if (!params.destination && !params.city && !params.klass && needle) {
      return `${item.name} ${item.city} ${item.klass} ${item.companyName ?? ""}`
        .toLowerCase()
        .includes(needle);
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

        <div id="cars-results" className="mt-8 scroll-mt-28">
          {list.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((item) => (
                <article key={item.id} className="surface-card flex flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.city}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-semibold">{item.name}</h3>
                  {item.companyName ? (
                    <p className="mt-1 text-sm text-foreground/60">{item.companyName}</p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                    {item.seats} мест · {item.gearbox} · {item.deposit}
                  </p>
                  {item.about ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-snug text-foreground/60">
                      {item.about}
                    </p>
                  ) : null}
                  {item.features?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.features.slice(0, 4).map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/70"
                        >
                          {f}
                        </span>
                      ))}
                      {item.features.length > 4 ? (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/50">
                          +{item.features.length - 4}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {item.address ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${item.address}, ${item.city}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-start gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {item.address}
                        <span className="block text-xs font-normal text-foreground/55">
                          Пункт выдачи · маршрут в картах
                        </span>
                      </span>
                    </a>
                  ) : null}
                  {item.price > 0 ? (
                    <p className="mt-4 font-display text-lg font-semibold">
                      {formatKzt(item.price)}{" "}
                      <span className="text-sm font-medium text-foreground/60">/ день</span>
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-foreground/60">Цена по запросу</p>
                  )}
                  <Button className="mt-4" asChild>
                    <Link
                      to="/request"
                      search={requestFor(`Аренда ${item.name} в ${item.city}, без водителя`)}
                    >
                      Запросить авто
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="surface-card grid gap-6 p-6 md:grid-cols-2 md:p-8">
              <div>
                <h2 className="font-display text-xl font-semibold">Пока пусто в витрине</h2>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                  Компании могут регистрироваться и добавлять авто. Оставьте заявку, если машина
                  нужна сейчас.
                </p>
                <Button className="mt-4" asChild>
                  <Link
                    to="/request"
                    search={requestFor(params.q || "Нужна аренда авто без водителя")}
                  >
                    Оставить заявку
                  </Link>
                </Button>
              </div>
              <div className="rounded-2xl bg-ink p-5 text-primary-foreground md:p-6">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary-foreground/70">
                  <Building2 className="size-4" />
                  Для компаний
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold">
                  Разместите авто на TourGo
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
                  Зарегистрируйте компанию, отметьте «Аренда авто» и добавьте карточку из Instagram
                  или сайта.
                </p>
                <Button
                  className="mt-4 bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to="/company-signup">Добавить компанию</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
