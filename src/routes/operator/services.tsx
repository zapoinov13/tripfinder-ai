import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useSyncExternalStore, useState } from "react";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { AddSportDialog } from "@/components/operator/add-sport-dialog";
import { Button } from "@/components/ui/button";
import { formatKzt, sportKinds } from "@/data/scenario-catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import {
  hideSportListing,
  listOrgSports,
  subscribeSportListings,
} from "@/lib/platform/sport-listings";
import { toast } from "sonner";

export const Route = createFileRoute("/operator/services")({
  head: () => ({ meta: [{ title: "Спорт и услуги · TourGo" }] }),
  component: OperatorServicesPage,
});

function OperatorServicesPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const [adding, setAdding] = useState(false);
  const [, bump] = useState(0);
  const items = useSyncExternalStore(
    subscribeSportListings,
    () => (organization ? listOrgSports(organization.id) : []),
    () => [],
  );

  if (!allowed || !organization) return null;

  return (
    <DashShell
      brand="TourGo Компания"
      items={nav}
      title="Спорт и услуги"
      subtitle="Добавляйте залы, корты и тренировки из Instagram или сайта"
      actions={
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Добавить из ссылки
        </Button>
      }
    >
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Как добавить за 2 минуты</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/70">
          <li>Зарегистрируйте компанию и отметьте услугу «Спорт».</li>
          <li>Вставьте ссылку на Instagram или сайт и текст bio / поста / страницы.</li>
          <li>Проверьте карточку и опубликуйте. Туристы увидят её в разделе «Спорт».</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Полный автоскрейп Instagram требует Meta API. Пока работаем по ссылке + тексту. Для сайтов
          позже подключим серверный разбор HTML.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-xl font-semibold">Пока нет опубликованных услуг</p>
          <p className="mt-2 text-sm text-foreground/70">
            Добавьте первую карточку из Instagram или сайта.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setAdding(true)}>Добавить из ссылки</Button>
            <Button variant="outline" asChild>
              <Link to="/sport">Открыть витрину</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="surface-card flex flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.status === "published" ? "Опубликовано" : "Скрыто"} ·{" "}
                {sportKinds.find((k) => k.id === item.kind)?.label ?? item.kind}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold">{item.name}</h3>
              <p className="mt-1 text-sm text-foreground/70">
                {item.city}
                {item.area ? ` · ${item.area}` : ""}
              </p>
              {item.slot ? <p className="mt-2 text-sm text-foreground/70">{item.slot}</p> : null}
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
              {item.status === "published" ? (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    hideSportListing(item.id, organization.id);
                    bump((n) => n + 1);
                    toast.success("Скрыто из витрины");
                  }}
                >
                  Скрыть
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <AddSportDialog
        open={adding}
        onOpenChange={setAdding}
        organizationId={organization.id}
        companyName={organization.name}
        onPublished={() => bump((n) => n + 1)}
      />
    </DashShell>
  );
}
