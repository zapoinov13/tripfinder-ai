import { createFileRoute } from "@tanstack/react-router";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { SalesChart } from "@/components/dash/sales-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice, getHotel, tours } from "@/data/demo";

export const Route = createFileRoute("/operator/")({
  head: () => ({
    meta: [
      { title: "Кабинет туроператора — Voyago" },
      {
        name: "description",
        content: "Продажи, заявки, брони и эффективность туров в одном рабочем кабинете.",
      },
      { property: "og:title", content: "Кабинет туроператора — Voyago" },
      { property: "og:description", content: "KPI, продажи и лучшие туры вашей компании." },
    ],
  }),
  component: OperatorDashboard,
});

function OperatorDashboard() {
  return (
    <DashShell
      brand="Travel Company"
      items={operatorNav}
      title="Добрый день, Travel Company"
      subtitle="Обзор за последние 30 дней"
      actions={<Button size="sm">+ Добавить тур</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Активные туры" value="1 284" hint="+42 за неделю" />
        <KpiCard label="Просмотры" value="24 830" hint="+12,4%" />
        <KpiCard label="Заявки" value="428" hint="+6,1%" />
        <KpiCard label="Бронирования" value="87" hint="+9 брони" />
        <KpiCard label="Продажи" value="12.4M ₸" hint="+18,2%" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_minmax(0,1fr)]">
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Продажи</h2>
          <div className="mt-6 h-72">
            <SalesChart />
          </div>
        </div>
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Каналы заявок</h2>
          <ul className="mt-6 space-y-4">
            {[
              ["Поиск на маркетплейсе", 62],
              ["AI-подбор", 21],
              ["Горящие туры", 11],
              ["Premium-аудитория", 6],
            ].map(([label, value]) => (
              <li key={label as string}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${value as number}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="surface-card mt-6 overflow-hidden">
        <div className="p-6">
          <h2 className="font-display text-lg font-semibold">Лучшие туры</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тур</TableHead>
                <TableHead>Просмотры</TableHead>
                <TableHead>Заявки</TableHead>
                <TableHead>Брони</TableHead>
                <TableHead className="text-right">Цена</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.slice(0, 6).map((tour) => {
                const hotel = getHotel(tour.hotelId);
                return (
                  <TableRow key={tour.id}>
                    <TableCell className="font-medium">
                      {hotel.name}
                      <span className="block text-xs text-muted-foreground">
                        {hotel.flag} {hotel.city} · {tour.nights} ночей
                      </span>
                    </TableCell>
                    <TableCell>{formatNumber(tour.views)}</TableCell>
                    <TableCell>{Math.round(tour.views / 58)}</TableCell>
                    <TableCell>{tour.bookings}</TableCell>
                    <TableCell className="text-right">{formatPrice(tour.price)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashShell>
  );
}