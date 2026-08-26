import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmAction,
  EmptyState,
  FilterBar,
  StatusBadge,
  orgName,
  toneForTourStatus,
  tourStatusLabel,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
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

export const Route = createFileRoute("/admin/tours")({
  head: () => ({ meta: [{ title: "Туры · Админ TourGo" }] }),
  component: AdminToursPage,
});

const PAGE = 25;

function AdminToursPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [org, setOrg] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.tours.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (org !== "all" && t.operatorOrgId !== org) return false;
      if (!query) return true;
      const hotel = getHotel(t.hotelId);
      const operator = getOperator(t.operatorId);
      return (
        hotel.name.toLowerCase().includes(query) ||
        operator.name.toLowerCase().includes(query) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [state.tours, q, status, org]);

  if (!allowed || !user) return null;

  const visible = filtered.slice(0, limit);

  return (
    <DashShell brand="TourGo Админ" items={nav} title="Туры" subtitle="Модерация каталога">
      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Отель, оператор, тег…"
        filters={[
          {
            key: "status",
            value: status,
            placeholder: "Статус",
            onChange: setStatus,
            options: [
              { value: "all", label: "Все статусы" },
              { value: "active", label: "Активен" },
              { value: "hidden", label: "Скрыт" },
              { value: "blocked", label: "Заблокирован" },
              { value: "inactive", label: "Неактивен" },
            ],
          },
          {
            key: "org",
            value: org,
            placeholder: "Оператор",
            onChange: setOrg,
            options: [
              { value: "all", label: "Все операторы" },
              ...state.organizations.map((o) => ({ value: o.id, label: o.name })),
            ],
          },
        ]}
      />

      {visible.length === 0 ? (
        <EmptyState title="Туры не найдены" description="Попробуйте другой фильтр" />
      ) : (
        <>
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
                {visible.map((t) => {
                  const hotel = getHotel(t.hotelId);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{hotel.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.tags.slice(0, 3).map((tag) => (
                            <StatusBadge
                              key={tag}
                              label={tag}
                              tone={
                                tag === "premium"
                                  ? "premium"
                                  : tag === "hot" || tag === "best"
                                    ? "warning"
                                    : "neutral"
                              }
                            />
                          ))}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {orgName(t.operatorOrgId)}
                        </div>
                      </TableCell>
                      <TableCell>{getOperator(t.operatorId).name}</TableCell>
                      <TableCell>{formatPrice(t.price)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={tourStatusLabel[t.status] ?? t.status}
                          tone={toneForTourStatus(t.status)}
                        />
                      </TableCell>
                      <TableCell className="space-x-1 whitespace-nowrap">
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
                            appendAudit({
                              actorId: user.id,
                              action: "tour_feature",
                              entityType: "tour",
                              entityId: t.id,
                            });
                            toast.success("Тур выделен");
                          }}
                        >
                          Выделить
                        </Button>
                        {t.status === "hidden" || t.status === "blocked" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setState((s) => ({
                                ...s,
                                tours: s.tours.map((x) =>
                                  x.id === t.id ? { ...x, status: "active" } : x,
                                ),
                              }));
                              appendAudit({
                                actorId: user.id,
                                action: "tour_restore",
                                entityType: "tour",
                                entityId: t.id,
                              });
                              toast.success("Тур восстановлен");
                            }}
                          >
                            Восстановить
                          </Button>
                        ) : (
                          <>
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
                            <ConfirmAction
                              triggerLabel="Блок"
                              title="Заблокировать тур?"
                              description={hotel.name}
                              confirmLabel="Заблокировать"
                              destructive
                              variant="ghost"
                              onConfirm={() => {
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
                            />
                          </>
                        )}
                        <ConfirmAction
                          triggerLabel="Удалить"
                          title="Удалить тур?"
                          description={`${t.title || hotel.name}: тур исчезнет из поиска и базы навсегда. Если по нему были брони, он будет скрыт, а история сохранится.`}
                          confirmLabel="Удалить"
                          destructive
                          variant="ghost"
                          onConfirm={() => {
                            setState((s) => ({
                              ...s,
                              tours: s.tours.filter((x) => x.id !== t.id),
                            }));
                            appendAudit({
                              actorId: user.id,
                              action: "tour_delete",
                              entityType: "tour",
                              entityId: t.id,
                            });
                            toast.success("Тур удалён");
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > limit ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setLimit((n) => n + PAGE)}>
                Показать ещё ({filtered.length - limit})
              </Button>
            </div>
          ) : null}
        </>
      )}
    </DashShell>
  );
}
