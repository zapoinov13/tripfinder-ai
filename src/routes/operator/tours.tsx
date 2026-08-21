import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { AddTourDialog } from "@/components/operator/add-tour-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice, getHotel } from "@/data/demo";
import { canCreateTour } from "@/lib/platform-contracts";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState } from "@/lib/platform/store";
import { toast } from "sonner";

export const Route = createFileRoute("/operator/tours")({
  head: () => ({ meta: [{ title: "Туры оператора — TourGo" }] }),
  component: OperatorToursPage,
});

function OperatorToursPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [filter, setFilter] = useState("active");
  const [adding, setAdding] = useState(false);

  const orgTours = useMemo(
    () => (organization ? state.tours.filter((t) => t.operatorOrgId === organization.id) : []),
    [state.tours, organization],
  );

  const filtered = useMemo(() => {
    return orgTours.filter((t) => {
      if (filter === "active") return t.status === "active";
      if (filter === "inactive") return t.status === "inactive" || t.status === "hidden";
      if (filter === "hot") return t.tags.includes("hot");
      if (filter === "premium") return t.tags.includes("premium");
      if (filter === "sponsored") return t.tags.includes("sponsored");
      return true;
    });
  }, [orgTours, filter]);

  if (!allowed || !organization) return null;

  const plan = state.config.operatorPlans.find((p) => p.code === organization.planCode)!;
  const activeCount = orgTours.filter((t) => t.status === "active").length;

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Мои туры"
      subtitle={`${activeCount} / ${plan.tourLimit + organization.additionalTourLimit} активных`}
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

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Тур</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Просмотры</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 50).map((tour) => {
              const hotel = getHotel(tour.hotelId);
              return (
                <TableRow key={tour.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={hotel.image} alt="" className="size-12 rounded-xl object-cover" />
                      <div>
                        <div className="font-medium">{hotel.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {hotel.city} · {tour.tags.join(", ") || "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{tour.departure}</TableCell>
                  <TableCell>{formatPrice(tour.price)}</TableCell>
                  <TableCell>{tour.status === "active" ? "Активен" : "Скрыт"}</TableCell>
                  <TableCell>{formatNumber(tour.views)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
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
                      {tour.status === "active" ? "Скрыть" : "Показать"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {adding ? <AddTourDialog orgId={organization.id} onClose={() => setAdding(false)} /> : null}
    </DashShell>
  );
}
