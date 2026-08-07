import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, getHotel, getOperator } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";

const tourStatusLabel: Record<string, string> = {
  active: "Активен",
  hidden: "Скрыт",
  blocked: "Заблокирован",
  draft: "Черновик",
};

export const Route = createFileRoute("/admin/tours")({
  head: () => ({ meta: [{ title: "Туры — Админ Voyago" }] }),
  component: AdminToursPage,
});

function AdminToursPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !user) return null;

  return (
    <DashShell
      brand="Voyago Админ"
      items={adminNav}
      title="Туры"
      subtitle="Выделение, скрытие и блокировка"
    >
      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Тур</TableHead>
              <TableHead>Оператор</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.tours.slice(0, 40).map((t) => {
              const hotel = getHotel(t.hotelId);
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    {hotel.name}
                    <div className="text-xs text-muted-foreground">{t.tags.join(", ")}</div>
                  </TableCell>
                  <TableCell>{getOperator(t.operatorId).name}</TableCell>
                  <TableCell>{formatPrice(t.price)}</TableCell>
                  <TableCell>{tourStatusLabel[t.status] ?? t.status}</TableCell>
                  <TableCell className="space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setState((s) => ({
                          ...s,
                          tours: s.tours.map((x) =>
                            x.id === t.id
                              ? {
                                  ...x,
                                  tags: x.tags.includes("best")
                                    ? x.tags
                                    : ([...x.tags, "best"] as typeof x.tags),
                                }
                              : x,
                          ),
                        }));
                        toast.success("Тур выделен");
                      }}
                    >
                      Выделить
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setState((s) => ({
                          ...s,
                          tours: s.tours.map((x) =>
                            x.id === t.id ? { ...x, status: "hidden" } : x,
                          ),
                        }));
                        appendAudit({
                          actorId: user.id,
                          action: "tour_hide",
                          entityType: "tour",
                          entityId: t.id,
                        });
                        toast.success("Тур скрыт");
                      }}
                    >
                      Скрыть
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setState((s) => ({
                          ...s,
                          tours: s.tours.map((x) =>
                            x.id === t.id ? { ...x, status: "blocked" } : x,
                          ),
                        }));
                        appendAudit({
                          actorId: user.id,
                          action: "tour_block",
                          entityType: "tour",
                          entityId: t.id,
                        });
                        toast.success("Тур заблокирован");
                      }}
                    >
                      Заблокировать
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
