import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, MapPin } from "lucide-react";
import { useMemo, useSyncExternalStore, useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { CompanySignals } from "@/components/site/company-signals";
import { ServiceRequestDialog } from "@/components/company/service-request-dialog";
import { Button } from "@/components/ui/button";
import { destinations } from "@/data/demo";
import { formatKzt, sportKinds } from "@/data/scenario-catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { companyPromoBadge, promotedCompanyIds } from "@/lib/platform/promotions";
import { listPublishedSports, subscribeSportListings } from "@/lib/platform/sport-listings";
import { cn } from "@/lib/utils";

type Search = { destination?: string; city?: string; kind?: string; q?: string };

type SportCard = {
  id: string;
  name: string;
  city: string;
  destinationId: string;
  kind: string;
  price: number;
  area: string;
  slot: string;
  address?: string;
  companyName?: string;
  organizationId?: string;
};

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
      {
        name: "description",
        content: "Залы, йога, падел, теннис и тренеры от компаний. Сравните цены и забронируйте.",
      },
    ],
  }),
  component: SportPage,
});

const EMPTY_SPORTS: ReturnType<typeof listPublishedSports> = [];

function usePublishedSports() {
  return useSyncExternalStore(subscribeSportListings, listPublishedSports, () => EMPTY_SPORTS);
}

function SportPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/sport" });
  const update = (patch: Search) => void navigate({ search: { ...params, ...patch } as never });
  const [geoHint, setGeoHint] = useState("");
  // Заявка клиента в компанию-владельца объявления (запись/бронь).
  const [requestTarget, setRequestTarget] = useState<{
    organizationId: string;
    organizationName: string;
    listingId: string;
    listingName: string;
  } | null>(null);

  const published = usePublishedSports();
  const state = usePlatformStore();
  // Рейтинг и часы берём из карточек компаний.
  const orgById = new Map(state.organizations.map((o) => [o.id, o] as const));
  const promoted = useMemo(() => promotedCompanyIds(), [state.promotions]);

  const catalog: SportCard[] = [
    ...published.map((item) => ({
      id: item.id,
      name: item.name,
      city: item.city,
      destinationId: item.destinationId,
      kind: item.kind,
      price: item.price,
      area: item.area,
      slot: item.detail,
      ...(item.address ? { address: item.address } : {}),
      companyName: item.companyName,
      organizationId: item.organizationId,
    })),
    // Демо-карточки убраны: в витрине только реальные объявления компаний.
  ];

  const needle = (params.q ?? "").toLowerCase();
  const list = catalog.filter((item) => {
    if (params.destination && item.destinationId !== params.destination) return false;
    if (params.kind && item.kind !== params.kind) return false;
    if (params.city && item.city !== params.city && item.area !== params.city) return false;
    if (!params.kind && needle) {
      return (
        `${item.name} ${item.city} ${item.kind} ${item.area} ${item.companyName ?? ""}`
          .toLowerCase()
          .includes(needle) ||
        sportKinds.some((kind) => needle.includes(kind.id) && item.kind === kind.id)
      );
    }
    return true;
  });

  // Продвигаемые компании — выше в витрине (стабильно, без пересортировки прочих).
  const orderedList = [
    ...list.filter((i) => i.organizationId && promoted.has(i.organizationId)),
    ...list.filter((i) => !i.organizationId || !promoted.has(i.organizationId)),
  ];

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
          Залы, падел, йога и тренеры от компаний. Сравните цены и забронируйте.
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

        {list.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedList.map((item) => {
              const badge = item.organizationId
                ? companyPromoBadge(promoted.get(item.organizationId))
                : null;
              return (
                <article
                  key={item.id}
                  className={cn(
                    "surface-card flex flex-col p-5",
                    badge?.featured && "border-premium/50 ring-1 ring-premium/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.city}
                      {item.area ? ` · ${item.area}` : ""}
                    </p>
                    {badge ? (
                      <span className="shrink-0 rounded-full bg-premium/15 px-2.5 py-0.5 text-[11px] font-semibold text-premium">
                        {badge.label}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold">{item.name}</h3>
                  {item.companyName ? (
                    item.organizationId ? (
                      <Link
                        to="/company/$companyId"
                        params={{ companyId: item.organizationId }}
                        className="mt-1 text-sm text-foreground/60 hover:text-primary hover:underline"
                      >
                        {item.companyName}
                      </Link>
                    ) : (
                      <p className="mt-1 text-sm text-foreground/60">{item.companyName}</p>
                    )
                  ) : null}
                  {item.organizationId ? (
                    <CompanySignals company={orgById.get(item.organizationId)} />
                  ) : null}
                  {item.slot ? (
                    <p className="mt-2 text-sm text-foreground/70">{item.slot}</p>
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
                          Открыть маршрут в картах
                        </span>
                      </span>
                    </a>
                  ) : null}
                  {item.price > 0 ? (
                    <p className="mt-4 font-display text-lg font-semibold">
                      {formatKzt(item.price)}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-foreground/60">Цена по запросу</p>
                  )}
                  {item.organizationId ? (
                    <Button
                      className="mt-4"
                      onClick={() =>
                        setRequestTarget({
                          organizationId: item.organizationId!,
                          organizationName: item.companyName ?? "Компания",
                          listingId: item.id,
                          listingName: item.name,
                        })
                      }
                    >
                      Записаться
                    </Button>
                  ) : (
                    <Button className="mt-4" asChild>
                      <Link to="/request" search={requestFor(`${item.name}, ${item.city}`)}>
                        Забронировать
                      </Link>
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="surface-card mt-8 grid gap-6 p-6 md:grid-cols-2 md:p-8">
            <div>
              <h2 className="font-display text-xl font-semibold">Пока пусто в витрине</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                Компании уже могут регистрироваться и добавлять залы, корты и тренировки. Оставьте
                заявку, если нужно найти активность прямо сейчас.
              </p>
              <Button className="mt-4" asChild>
                <Link to="/request" search={requestFor(params.q || "Нужна спортивная активность")}>
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
                Разместите спорт на TourGo
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
                Зарегистрируйте компанию, отметьте услугу «Спорт» и добавьте карточку из Instagram
                или сайта. Туристы увидят её в этом разделе.
              </p>
              <Button
                className="mt-4 bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                asChild
              >
                <Link to="/company-signup" search={{ category: "sport" } as never}>
                  Добавить компанию
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {requestTarget ? (
        <ServiceRequestDialog
          open
          onOpenChange={(open) => {
            if (!open) setRequestTarget(null);
          }}
          organizationId={requestTarget.organizationId}
          organizationName={requestTarget.organizationName}
          listingId={requestTarget.listingId}
          listingName={requestTarget.listingName}
        />
      ) : null}
    </SiteLayout>
  );
}
