import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, MapPin, Search } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

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
import { carClasses, formatKzt } from "@/data/scenario-catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { companyPromoBadge, promotedCompanyIds } from "@/lib/platform/promotions";
import {
  fetchPublishedVertical,
  listPublishedVertical,
  subscribeVerticalListings,
  type VerticalListing,
} from "@/lib/platform/vertical-listings";
import { cn } from "@/lib/utils";
import { vitrineSeo } from "@/lib/seo-vitrine";

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
  organizationId?: string;
  address?: string;
  features?: string[];
  about?: string;
};

/** «padel» в адресе — «Падел» в заголовке страницы. */
const kindLabelOf = (id: string | undefined) =>
  id ? carClasses.find((k) => k.id === id)?.label : undefined;

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
    kind: search.klass ?? "",
    destination: search.destination ?? "",
  }),
  loader: async ({ deps }) => {
    const stored = listPublishedVertical("car");
    const listings = stored.length ? stored : await fetchPublishedVertical("car");
    return { listings, fromStore: stored.length > 0, deps };
  },
  head: ({ loaderData }) =>
    vitrineSeo({
      vertical: "cars",
      path: "/cars",
      listings: loaderData?.listings ?? [],
      filters: loaderData?.deps ?? {},
      kindLabel: kindLabelOf(loaderData?.deps.kind),
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
  const [sort, setSort] = useState<VitrineSort>("default");
  // Заявка клиента в компанию-владельца объявления (запись/бронь).
  const [requestTarget, setRequestTarget] = useState<{
    organizationId: string;
    organizationName: string;
    listingId: string;
    listingName: string;
  } | null>(null);

  const [age, setAge] = useState(params.age ?? "25");
  const stored = usePublishedCars();
  // До загрузки каталога показываем то, что пришло с сервера.
  const fromLoader = Route.useLoaderData().listings;
  const published = stored.length ? stored : fromLoader;
  const state = usePlatformStore();
  // Рейтинг и часы берём из карточек компаний.
  const orgById = new Map(state.organizations.map((o) => [o.id, o] as const));
  const promoted = useMemo(() => promotedCompanyIds(), [state.promotions]);

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
        organizationId: item.organizationId,
        ...(item.address ? { address: item.address } : {}),
        ...(item.amenities?.length ? { features: item.amenities } : {}),
        ...(item.about ? { about: item.about } : {}),
      };
    }),
    // Демо-карточки убраны: в витрине только реальные объявления компаний.
  ];

  const list = catalog.filter((item) => {
    if (params.destination && item.destinationId !== params.destination) return false;
    if (params.city && item.city !== params.city) return false;
    if (params.klass && item.klass !== params.klass) return false;
    if (needle) {
      return `${item.name} ${item.city} ${item.klass} ${item.companyName ?? ""}`
        .toLowerCase()
        .includes(needle);
    }
    return true;
  });

  // Города и порядок показа — по факту объявлений.
  const offerCities = citiesWithOffers(catalog);
  const openNow = (item: CarCard) =>
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

  const requestFor = (wish: string) => ({
    kind: "assistance" as const,
    ...(params.destination ? { destination: params.destination } : {}),
    ...(params.city ? { city: params.city } : {}),
    wish: params.age ? `${wish} Возраст водителя: ${params.age}.` : wish,
  });

  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-12">
        <VitrineHeader
          section="Аренда авто"
          title="Где нужна машина?"
          subtitle="Только авто без водителя. Машину с водителем ищите в разделе «Помощь в поездке»."
        />

        {/* Города — из самих объявлений: пока это Дубай, дальше добавятся сами. */}
        <CityRow cities={offerCities} value={params.city} onChange={(city) => update({ city })} />

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
            <SortRow value={sort} onChange={setSort} openCount={openCount} />
          ) : null}

          {orderedList.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                        Запросить авто
                      </Button>
                    ) : (
                      <Button className="mt-4" asChild>
                        <Link
                          to="/request"
                          search={requestFor(`Аренда ${item.name} в ${item.city}, без водителя`)}
                        >
                          Запросить авто
                        </Link>
                      </Button>
                    )}
                  </article>
                );
              })}
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
                  <Link to="/company-signup" search={{ category: "cars" } as never}>
                    Добавить компанию
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
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
