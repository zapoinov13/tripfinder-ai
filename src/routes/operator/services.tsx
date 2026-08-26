import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useSyncExternalStore, useState } from "react";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { AddVerticalDialog } from "@/components/operator/add-vertical-dialog";
import { Button } from "@/components/ui/button";
import { formatKzt } from "@/data/scenario-catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import {
  carClassLabel,
  sportKindLabel,
  stayKindLabel,
  verticalLabel,
  type VerticalId,
} from "@/lib/platform/service-ingest";
import { ConfirmAction } from "@/components/admin";
import {
  deleteVerticalListing,
  hideVerticalListing,
  listOrgVertical,
  subscribeVerticalListings,
} from "@/lib/platform/vertical-listings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tabs: { id: VerticalId; vitrine: "/sport" | "/stays" | "/cars"; service: string }[] = [
  { id: "stay", vitrine: "/stays", service: "Отели" },
  { id: "car", vitrine: "/cars", service: "Аренда авто" },
  { id: "sport", vitrine: "/sport", service: "Спорт" },
];

export const Route = createFileRoute("/operator/services")({
  validateSearch: (search: Record<string, unknown>): { tab?: VerticalId } => ({
    ...(search["tab"] === "sport" || search["tab"] === "stay" || search["tab"] === "car"
      ? { tab: search["tab"] }
      : {}),
  }),
  head: () => ({ meta: [{ title: "Объявления · TourGo" }] }),
  component: OperatorServicesPage,
});

function kindLabel(vertical: VerticalId, kind: string) {
  if (vertical === "sport") return sportKindLabel(kind);
  if (vertical === "stay") return stayKindLabel(kind);
  return carClassLabel(kind);
}

const EMPTY_ITEMS: ReturnType<typeof listOrgVertical> = [];

function OperatorServicesPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const search = Route.useSearch();
  const [tab, setTab] = useState<VerticalId>(search.tab ?? "stay");
  // Навигация с другим ?tab= должна переключать вкладку и после монтирования.
  useEffect(() => {
    if (search.tab) setTab(search.tab);
  }, [search.tab]);
  const [adding, setAdding] = useState(false);
  const [, bump] = useState(0);
  const items = useSyncExternalStore(
    subscribeVerticalListings,
    () => (organization ? listOrgVertical(organization.id, tab) : EMPTY_ITEMS),
    () => EMPTY_ITEMS,
  );

  if (!allowed || !organization) return null;

  const current = tabs.find((t) => t.id === tab)!;

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Объявления"
      subtitle="Жильё, авто и спорт: карточки из Instagram или сайта попадают в витрины TourGo"
      actions={
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Добавить из ссылки
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              tab === item.id ? "bg-ink text-primary-foreground" : "bg-secondary",
            )}
          >
            {verticalLabel(item.id)}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Как добавить «{verticalLabel(tab)}» за 2 минуты
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/70">
          <li>Зарегистрируйте компанию и отметьте услугу «{current.service}».</li>
          <li>
            Вставьте ссылку на сайт: сервер прочитает HTML. Для Instagram добавьте bio или пост.
          </li>
          <li>
            Проверьте карточку и опубликуйте. Клиенты увидят её в разделе «{verticalLabel(tab)}».
          </li>
        </ol>
      </div>

      {items.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-xl font-semibold">Пока нет опубликованных карточек</p>
          <p className="mt-2 text-sm text-foreground/70">Добавьте первую из Instagram или сайта.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setAdding(true)}>Добавить из ссылки</Button>
            <Button variant="outline" asChild>
              <Link to={current.vitrine}>Открыть витрину</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="surface-card flex flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.status === "published" ? "Опубликовано" : "Скрыто"} ·{" "}
                {kindLabel(item.vertical, item.kind)}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold">{item.name}</h3>
              <p className="mt-1 text-sm text-foreground/70">
                {item.city}
                {item.area ? ` · ${item.area}` : ""}
              </p>
              {item.detail ? (
                <p className="mt-2 text-sm text-foreground/70">{item.detail}</p>
              ) : null}
              {item.seats ? (
                <p className="mt-1 text-sm text-foreground/70">{item.seats} мест</p>
              ) : null}
              <p className="mt-3 font-semibold">
                {item.price > 0 ? formatKzt(item.price) : "Цена по запросу"}
              </p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 truncate text-xs text-primary"
                >
                  {item.sourceUrl}
                </a>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === "published" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      hideVerticalListing(item.id, organization.id);
                      bump((n) => n + 1);
                      toast.success("Скрыто из витрины");
                    }}
                  >
                    Скрыть
                  </Button>
                ) : null}
                <ConfirmAction
                  triggerLabel="Удалить"
                  title="Удалить объявление?"
                  description={`${item.name}: объявление исчезнет из витрины и кабинета навсегда.`}
                  confirmLabel="Удалить"
                  destructive
                  variant="ghost"
                  onConfirm={() => {
                    deleteVerticalListing(item.id, organization.id);
                    bump((n) => n + 1);
                    toast.success("Объявление удалено");
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <AddVerticalDialog
        open={adding}
        onOpenChange={setAdding}
        organizationId={organization.id}
        companyName={organization.name}
        vertical={tab}
        onPublished={() => bump((n) => n + 1)}
      />
    </DashShell>
  );
}
