import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
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
  head: () => ({ meta: [{ title: "Предложения поставщика — TourGo" }] }),
  component: OperatorToursPage,
});

function OperatorToursPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const state = usePlatformStore();
  const [filter, setFilter] = useState("active");

  const plan = state.config.operatorPlans.find((p) => p.code === organization!.planCode)!;
  const orgTours = state.tours.filter((t) => t.operatorOrgId === organization!.id);
  const activeCount = orgTours.filter((t) => t.status === "active").length;

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
  return (
    <DashShell
      brand={organization.name}
      items={operatorNav}
      title="Мои предложения"
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
              toast.error("Лимит активных предложений достигнут.");
              return;
            }
            toast.message(
              "Добавление предложения: используйте API-синхронизацию, CSV или админ-импорт.",
            );
          }}
        >
          + Добавить
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["active", "inactive", "hot", "premium", "sponsored"].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f}
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
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
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
                  <TableCell>{tour.status}</TableCell>
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
                      Toggle
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </DashShell>
  );
}
