import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { CompanySignals } from "@/components/site/company-signals";
import {
  CityRow,
  SortRow,
  VitrineHeader,
  citiesWithOffers,
  isOpenNow,
  type VitrineSort,
} from "@/components/site/vitrine-filters";
import { ServiceRequestDialog } from "@/components/company/service-request-dialog";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { destinations, resortsByDestination } from "@/data/demo";
import { formatKzt, popularStayCities, stayAreas, stayKinds } from "@/data/scenario-catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { companyPromoBadge, promotedCompanyIds } from "@/lib/platform/promotions";
import {
  fetchPublishedVertical,
  listPublishedVertical,
  subscribeVerticalListings,
  type VerticalListing,
} from "@/lib/platform/vertical-listings";
import { cn } from "@/lib/utils";
import { matchesQuery } from "@/lib/search-text";
import { vitrineSeo } from "@/lib/seo-vitrine";

type Search = {
  destination?: string;
  city?: string;
  kind?: string;
  q?: string;
  checkIn?: string;
  checkOut?: string;
};

type StayCard = {
  id: string;
  name: string;
  city: string;
  destinationId: string;
  area: string;
  kind: string;
  price: number;
  rating: number;
  nightsHint: string;
  companyName?: string;
  organizationId?: string;
  address?: string;
  amenities?: string[];
  guests?: number;
  bedrooms?: number;
  about?: string;
};

/** «padel» в адресе — «Падел» в заголовке страницы. */
const kindLabelOf = (id: string | undefined) =>
  id ? stayKinds.find((k) => k.id === id)?.label : undefined;

export const Route = createFileRoute("/stays")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" ? { destination: search["destination"] } : {}),
    ...(typeof search["city"] === "string" ? { city: search["city"] } : {}),
    ...(typeof search["kind"] === "string" ? { kind: search["kind"] } : {}),
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
    ...(typeof search["checkIn"] === "string" ? { checkIn: search["checkIn"] } : {}),
    ...(typeof search["checkOut"] === "string" ? { checkOut: search["checkOut"] } : {}),
  }),
  /**
   * Витрина рендерится на сервере, где браузерный стор объявлений пуст, — и
   * страница раздела уходила в индекс с текстом «пока ничего нет». Загрузчик
   * берёт опубликованные объявления сам; в браузере, где каталог уже загружен,
   * запрос не делается.
   *
   * Он же считает мета-теги: заголовок должен знать город, категорию и число
   * предложений, а это известно только вместе с данными.
   */
  loaderDeps: ({ search }: { search: Search }) => ({
    city: search.city ?? "",
    kind: search.kind ?? "",
    destination: search.destination ?? "",
  }),
  loader: async ({ deps }) => {
    const stored = listPublishedVertical("stay");
    const listings = stored.length ? stored : await fetchPublishedVertical("stay");
    return { listings, fromStore: stored.length > 0, deps };
  },
  head: ({ loaderData }) =>
    vitrineSeo({
      vertical: "stays",
      path: "/stays",
      listings: loaderData?.listings ?? [],
      filters: loaderData?.deps ?? {},
      kindLabel: kindLabelOf(loaderData?.deps.kind),
    }),
  component: StaysPage,
});

const EMPTY_LISTINGS: VerticalListing[] = [];

function usePublishedStays() {
  return useSyncExternalStore(
    subscribeVerticalListings,
    () => listPublishedVertical("stay"),
    () => EMPTY_LISTINGS,
  );
}

function StaysPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/stays" });
  const update = (patch: Search) => void navigate({ search: { ...params, ...patch } as never });
  const [city, setCity] = useState(params.city ?? params.q ?? "");
  const [sort, setSort] = useState<VitrineSort>("default");
  // Заявка клиента в компанию-владельца объявления (запись/бронь).
  const [requestTarget, setRequestTarget] = useState<{
    organizationId: string;
    organizationName: string;
    listingId: string;
    listingName: string;
  } | null>(null);

  const stored = usePublishedStays();
  // До загрузки каталога показываем то, что пришло с сервера.
  const fromLoader = Route.useLoaderData().listings;
  const published = stored.length ? stored : fromLoader;
  const state = usePlatformStore();
  // Рейтинг и часы берём из карточек компаний.
  const orgById = new Map(state.organizations.map((o) => [o.id, o] as const));
  const promoted = useMemo(() => promotedCompanyIds(), [state.promotions]);

  useEffect(() => {
    setCity((prev) => params.city ?? prev);
  }, [params.city]);

  const catalog: StayCard[] = [
    ...published.map((item) => ({
      id: item.id,
      name: item.name,
      city: item.city,
      destinationId: item.destinationId,
      area: item.area,
      kind: item.kind,
      price: item.price,
      rating: item.rating ?? 0,
      nightsHint: item.detail || "за ночь",
      companyName: item.companyName,
      organizationId: item.organizationId,
      ...(item.address ? { address: item.address } : {}),
      ...(item.amenities?.length ? { amenities: item.amenities } : {}),
      ...(item.guests ? { guests: item.guests } : {}),
      ...(item.bedrooms ? { bedrooms: item.bedrooms } : {}),
      ...(item.about ? { about: item.about } : {}),
    })),
    // Демо-карточки убраны: в витрине только реальные объявления компаний.
  ];

  const list = catalog.filter((item) => {
    if (params.destination && item.destinationId !== params.destination) return false;
    if (params.kind && item.kind !== params.kind) return false;
    const needle = (params.city || city || "").trim().toLowerCase();
    if (!needle) return true;
    return (
      matchesQuery(`${item.city} ${item.area} ${item.name} ${item.companyName ?? ""}`, needle) ||
      popularStayCities.some(
        (place) =>
          place.city.toLowerCase() === item.city.toLowerCase() &&
          (place.name.toLowerCase() === needle || place.city.toLowerCase() === needle),
      )
    );
  });

  // Города и порядок показа — по факту, а не по списку курортов из демо.
  const cities = citiesWithOffers(catalog);
  const openNow = (item: StayCard) =>
    Boolean(item.organizationId && isOpenNow(orgById.get(item.organizationId)));
  const openCount = list.filter(openNow).length;
  const filtered = sort === "open" ? list.filter(openNow) : list;
  const sorted =
    sort === "cheap"
      ? [...filtered].sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
      : filtered;
  const orderedList =
    sort === "cheap"
      ? sorted
      : [
          ...sorted.filter((i) => i.organizationId && promoted.has(i.organizationId)),
          ...sorted.filter((i) => !i.organizationId || !promoted.has(i.organizationId)),
        ];

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
        <VitrineHeader
          section="Жильё"
          title="Где хотите остановиться?"
          subtitle="Отели, апартаменты и виллы от компаний. Цены и условия — сразу, без переписки."
        />
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
            label="Заезд и выезд"
            from={params.checkIn ?? ""}
            to={params.checkOut ?? ""}
            onChange={(next) => update({ checkIn: next.from, checkOut: next.to })}
          />
          <Button size="lg" className="h-12" type="submit">
            <Search className="size-4" />
            Найти жильё
          </Button>
        </form>

        {/* Города — из самих объявлений: витрина не обещает то, чего в ней нет. */}
        <CityRow
          cities={cities}
          value={params.city}
          onChange={(next) => {
            setCity(next);
            update({ city: next });
          }}
        />

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

        {list.length > 0 ? <SortRow value={sort} onChange={setSort} openCount={openCount} /> : null}

        {orderedList.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      {item.area ? `${item.area} · ` : ""}
                      {item.city}
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
                  {item.rating > 0 ? (
                    <p className="mt-2 text-sm text-foreground/70">Рейтинг {item.rating}</p>
                  ) : null}
                  {item.guests || item.bedrooms ? (
                    <p className="mt-2 text-sm text-foreground/70">
                      {[
                        item.guests ? `до ${item.guests} гостей` : "",
                        item.bedrooms ? `${item.bedrooms} сп.` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {item.about ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-snug text-foreground/60">
                      {item.about}
                    </p>
                  ) : null}
                  {item.amenities?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.amenities.slice(0, 4).map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/70"
                        >
                          {a}
                        </span>
                      ))}
                      {item.amenities.length > 4 ? (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/50">
                          +{item.amenities.length - 4}
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
                          Открыть маршрут в картах
                        </span>
                      </span>
                    </a>
                  ) : null}
                  {item.price > 0 ? (
                    <p className="mt-4 font-display text-lg font-semibold">
                      {formatKzt(item.price)}{" "}
                      <span className="text-sm font-medium text-foreground/60">
                        {item.nightsHint}
                      </span>
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
                      Забронировать
                    </Button>
                  ) : (
                    <Button className="mt-4" asChild>
                      <Link to="/request" search={requestFor(`${item.name}, ${item.city}`)}>
                        Запросить цену
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
                Компании могут регистрироваться и добавлять отели, квартиры и виллы. Оставьте
                заявку, если нужно жильё прямо сейчас.
              </p>
              <Button className="mt-4" asChild>
                <Link to="/request" search={requestFor(params.q || city || "Нужно жильё")}>
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
                Разместите жильё на TourGo
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
                Зарегистрируйте компанию, отметьте «Отели» и добавьте карточку из Instagram или
                сайта.
              </p>
              <Button
                className="mt-4 bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                asChild
              >
                <Link to="/company-signup" search={{ category: "stays" } as never}>
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
