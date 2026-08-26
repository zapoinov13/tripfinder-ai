import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ConfirmAction } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { AddTourDialog } from "@/components/operator/add-tour-dialog";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice, guestsLabel, nightsLabel, tourCover } from "@/data/demo";
import { canCreateTour } from "@/lib/platform-contracts";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { getHotel } from "@/lib/platform/catalog";
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState } from "@/lib/platform/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Search = { add?: "api" | "1" };

export const Route = createFileRoute("/operator/tours")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(search["add"] === "api" || search["add"] === "1"
      ? { add: search["add"] as "api" | "1" }
      : {}),
  }),
  head: () => ({ meta: [{ title: "Мои туры · TourGo" }] }),
  component: OperatorToursPage,
});

function OperatorToursPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const search = Route.useSearch();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [filter, setFilter] = useState("active");
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<"choose" | "api">("choose");

  useEffect(() => {
    if (search.add === "api" || search.add === "1") {
      setAddMode(search.add === "api" ? "api" : "choose");
      setAdding(true);
    }
  }, [search.add]);

  const orgTours = useMemo(
    () => (organization ? state.tours.filter((t) => t.operatorOrgId === organization.id) : []),
    [state.tours, organization],
  );

  const filtered = useMemo(() => {
    return orgTours.filter((t) => {
      if (filter === "active") return t.status === "active";
      if (filter === "inactive")
        return t.status === "inactive" || t.status === "hidden" || t.status === "blocked";
      if (filter === "hot") return t.tags.includes("hot");
      if (filter === "premium") return t.tags.includes("premium");
      if (filter === "sponsored") return t.tags.includes("sponsored");
      return true;
    });
  }, [orgTours, filter]);

  if (!allowed || !organization) return null;
  // «Бизнес без туров» (зал, прокат, жильё) работает с объявлениями, не с турами.
  if (organization && isBusinessOnlyServices(organization.services)) {
    return <Navigate to="/operator/services" />;
  }

  const plan = state.config.operatorPlans.find((p) => p.code === organization.planCode)!;
  const activeCount = orgTours.filter((t) => t.status === "active").length;
  const limit = plan.tourLimit + organization.additionalTourLimit;

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Мои туры"
      subtitle={`${activeCount} из ${limit} активных. Так турист видит карточку в поиске.`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            if (
              !canCreateTour(
                activeCount,
                {
                  code: plan.code,
                  activeTourLimit: plan.tourLimit,
                  features: plan.features,
                },
                organization.additionalTourLimit,
              )
            ) {
              toast.error("Достигнут лимит активных туров по вашему тарифу.");
              return;
            }
            setAdding(true);
            setAddMode("choose");
          }}
        >
          + Добавить тур
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["active", "Активные"],
            ["inactive", "Скрытые"],
            ["hot", "Горящие"],
            ["premium", "Premium"],
            ["sponsored", "Продвигаемые"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">Пока нет туров в этом списке</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Добавьте карточку: фото отеля, питание, что входит в цену и описание.
          </p>
          <Button
            className="mt-5"
            onClick={() => {
              if (
                !canCreateTour(
                  activeCount,
                  { code: plan.code, activeTourLimit: plan.tourLimit, features: plan.features },
                  organization.additionalTourLimit,
                )
              ) {
                toast.error("Достигнут лимит активных туров по вашему тарифу.");
                return;
              }
              setAddMode("choose");
              setAdding(true);
            }}
          >
            Добавить тур
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 50).map((tour) => {
            const hotel = getHotel(tour.hotelId);
            const cover = tourCover(tour, hotel);
            const active = tour.status === "active";
            const moderated = tour.status === "hidden" || tour.status === "blocked";
            return (
              <article key={tour.id} className="surface-card overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img src={cover} alt="" className="size-full object-cover" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        active ? "bg-success text-white" : "bg-card text-muted-foreground",
                      )}
                    >
                      {active ? "В поиске" : "Скрыт"}
                    </span>
                    {tour.tags.includes("hot") ? (
                      <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                        Горящий
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-xs text-muted-foreground">
                    {hotel.city}, {hotel.country} · {hotel.stars}★
                  </p>
                  <h2 className="font-display text-base font-semibold leading-snug">
                    {tour.title || hotel.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {tour.from} → {hotel.city} · {nightsLabel(tour.nights)} · {tour.meal}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tour.dateStart} - {tour.dateEnd} · {guestsLabel(tour.adults, tour.children)}
                  </p>
                  {tour.includes?.length ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {tour.includes.slice(0, 3).join(" · ")}
                    </p>
                  ) : null}
                  <div className="flex items-end justify-between gap-3 pt-2">
                    <div>
                      <p className="font-display text-xl font-semibold">
                        {formatPrice(tour.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(tour.views)} просмотров
                      </p>
                    </div>
                    {moderated ? (
                      <span className="text-xs text-muted-foreground">
                        {tour.status === "blocked" ? "Заблокирован модерацией" : "Скрыт модерацией"}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={active ? "outline" : "default"}
                        onClick={() => {
                          if (
                            !active &&
                            !canCreateTour(
                              activeCount,
                              {
                                code: plan.code,
                                activeTourLimit: plan.tourLimit,
                                features: plan.features,
                              },
                              organization.additionalTourLimit,
                            )
                          ) {
                            toast.error("Достигнут лимит активных туров по вашему тарифу.");
                            return;
                          }
                          setState((s) => ({
                            ...s,
                            tours: s.tours.map((t) =>
                              t.id === tour.id
                                ? {
                                    ...t,
                                    status: t.status === "active" ? "inactive" : "active",
                                    lastSyncedAt: nowIso(),
                                  }
                                : t,
                            ),
                          }));
                        }}
                      >
                        {active ? "Скрыть" : "Показать"}
                      </Button>
                    )}
                    <ConfirmAction
                      triggerLabel="Удалить"
                      title="Удалить тур?"
                      description={`${tour.title || getHotel(tour.hotelId).name}: тур исчезнет из поиска и вашего кабинета навсегда. Если по нему были брони, он будет скрыт, а история броней сохранится.`}
                      confirmLabel="Удалить"
                      destructive
                      variant="ghost"
                      onConfirm={() => {
                        setState((s) => ({
                          ...s,
                          tours: s.tours.filter((t) => t.id !== tour.id),
                        }));
                        toast.success("Тур удалён");
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {adding ? (
        <AddTourDialog
          orgId={organization.id}
          initialMode={addMode}
          onClose={() => {
            setAdding(false);
            setAddMode("choose");
          }}
        />
      ) : null}
    </DashShell>
  );
}
