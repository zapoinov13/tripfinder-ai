import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, MapPin } from "lucide-react";
import { useMemo, useSyncExternalStore, useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { CompanySignals } from "@/components/site/company-signals";
import {
  CityRow,
  KindRow,
  SortRow,
  VitrineHeader,
  citiesWithOffers,
  isOpenNow,
  type VitrineSort,
} from "@/components/site/vitrine-filters";
import { ServiceRequestDialog } from "@/components/company/service-request-dialog";
import { Button } from "@/components/ui/button";
import { formatKzt, sportKinds } from "@/data/scenario-catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { companyPromoBadge, promotedCompanyIds } from "@/lib/platform/promotions";
import { listPublishedSports, subscribeSportListings } from "@/lib/platform/sport-listings";
import { fetchPublishedVertical, listPublishedVertical } from "@/lib/platform/vertical-listings";
import { cn } from "@/lib/utils";
import { vitrineSeo } from "@/lib/seo-vitrine";

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

/** «padel» в адресе — «Падел» в заголовке страницы. */
const kindLabelOf = (id: string | undefined) =>
  id ? sportKinds.find((k) => k.id === id)?.label : undefined;

export const Route = createFileRoute("/sport")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" ? { destination: search["destination"] } : {}),
    ...(typeof search["city"] === "string" ? { city: search["city"] } : {}),
    ...(typeof search["kind"] === "string" ? { kind: search["kind"] } : {}),
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
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
    const stored = listPublishedVertical("sport");
    const listings = stored.length ? stored : await fetchPublishedVertical("sport");
    return { listings, fromStore: stored.length > 0, deps };
  },
  head: ({ loaderData }) =>
    vitrineSeo({
      vertical: "sport",
      path: "/sport",
      listings: loaderData?.listings ?? [],
      filters: loaderData?.deps ?? {},
      kindLabel: kindLabelOf(loaderData?.deps.kind),
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
  const [sort, setSort] = useState<VitrineSort>("default");
  // Заявка клиента в компанию-владельца объявления (запись/бронь).
  const [requestTarget, setRequestTarget] = useState<{
    organizationId: string;
    organizationName: string;
    listingId: string;
    listingName: string;
  } | null>(null);

  const stored = usePublishedSports();
  // До загрузки каталога показываем то, что пришло с сервера.
  const fromLoader = Route.useLoaderData().listings;
  const published = stored.length ? stored : fromLoader;
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

  // Города берём из самих объявлений: пока это Дубай, дальше добавятся сами.
  const cities = citiesWithOffers(catalog);
  const openNow = (item: SportCard) =>
    Boolean(item.organizationId && isOpenNow(orgById.get(item.organizationId)));
  const openCount = list.filter(openNow).length;

  const filtered = sort === "open" ? list.filter(openNow) : list;
  const sorted =
    sort === "cheap"
      ? [...filtered].sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
      : filtered;

  // Продвигаемые компании — выше в витрине (стабильно, без пересортировки прочих).
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
    wish,
  });

  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-12">
        <VitrineHeader
          section="Спорт"
          title="Чем хотите заняться?"
          subtitle="Залы, падел, йога и тренеры от компаний. Сравните цены и забронируйте."
        />

        <CityRow cities={cities} value={params.city} onChange={(city) => update({ city })} />

        <KindRow kinds={sportKinds} value={params.kind} onChange={(kind) => update({ kind })} />

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
