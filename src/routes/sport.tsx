import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { destinations } from "@/data/demo";
import { formatKzt, sportKinds, sports } from "@/data/scenario-catalog";
import { cn } from "@/lib/utils";

type Search = { destination?: string; city?: string; kind?: string; q?: string };

export const Route = createFileRoute("/sport")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" ? { destination: search["destination"] } : {}),
    ...(typeof search["city"] === "string" ? { city: search["city"] } : {}),
    ...(typeof search["kind"] === "string" ? { kind: search["kind"] } : {}),
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Спорт в поездке · TourGo" },
      { name: "description", content: "Залы, йога, падел, теннис, дайвинг и персональный тренер." },
    ],
  }),
  component: SportPage,
});

function SportPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/sport" });
  const update = (patch: Search) => void navigate({ search: { ...params, ...patch } as never });
  const [geoHint, setGeoHint] = useState("");

  const needle = (params.q ?? "").toLowerCase();
  const list = sports.filter((item) => {
    if (params.destination && item.destinationId !== params.destination) return false;
    if (params.kind && item.kind !== params.kind) return false;
    if (params.city && item.city !== params.city && item.area !== params.city) return false;
    if (!params.kind && needle) {
      return (
        `${item.name} ${item.city} ${item.kind} ${item.area}`.toLowerCase().includes(needle) ||
        sportKinds.some((kind) => needle.includes(kind.id) && item.kind === kind.id)
      );
    }
    return true;
  });

  const useLocation = () => {
    if (!navigator.geolocation) {
      setGeoHint("Выберите город вручную");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoHint("Похоже, вы в Дубае");
        update({ destination: "uae", city: "Дубай" });
      },
      () => setGeoHint("Не удалось определить место"),
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
        <p className="text-sm font-medium text-primary">Спорт</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">
          Чем хотите заняться?
        </h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground/70">
          Где? Выберите город или определите местоположение.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={useLocation}>
            <MapPin className="size-4" />
            Использовать моё местоположение
          </Button>
          {geoHint ? <p className="self-center text-sm text-foreground/70">{geoHint}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {destinations.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => update({ destination: item.id, city: item.city })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold",
                params.destination === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              {item.flag} {item.city}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {sportKinds.map((kind) => (
            <button
              key={kind.id}
              type="button"
              onClick={() => update({ kind: params.kind === kind.id ? "" : kind.id })}
              className={cn(
                "surface-card min-h-[6.5rem] p-4 text-left",
                params.kind === kind.id && "ring-2 ring-primary",
              )}
            >
              <span className="text-2xl">{kind.emoji}</span>
              <span className="mt-2 block font-display text-sm font-semibold leading-snug md:text-base">
                {kind.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => (
            <article key={item.id} className="surface-card flex flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.city} · {item.area}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold">{item.name}</h3>
              <p className="mt-2 text-sm text-foreground/70">{item.slot}</p>
              <p className="mt-4 font-display text-lg font-semibold">{formatKzt(item.price)}</p>
              <Button className="mt-4" asChild>
                <Link to="/request" search={requestFor(`${item.name}, ${item.city}`)}>
                  Забронировать
                </Link>
              </Button>
            </article>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="surface-card mt-8 p-6 text-center">
            <p className="text-foreground/70">
              Пока нет слотов в витрине. Опишите, чем хотите заняться — компании ответят.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/request" search={requestFor(params.q || "Нужна спортивная активность")}>
                Оставить заявку
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </SiteLayout>
  );
}
