import { createFileRoute } from "@tanstack/react-router";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { SalesChart } from "@/components/dash/sales-chart";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, operators } from "@/data/demo";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Voyago" },
      { name: "description", content: "Платформенная аналитика: пользователи, операторы, GMV." },
      { property: "og:title", content: "Admin Dashboard — Voyago" },
      { property: "og:description", content: "Внутренняя панель управления маркетплейсом." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <DashShell brand="Voyago Admin" items={adminNav} title="Dashboard" subtitle="Платформа · 30 дней">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Users" value="184 320" hint="+3,2%" />
        <KpiCard label="Premium Users" value="12 470" hint="+8,4%" />
        <KpiCard label="Operators" value="126" hint="+4 новых" />
        <KpiCard label="Active Tours" value="38 942" hint="+1 204" />
        <KpiCard label="Bookings" value="4 318" hint="+6,7%" />
        <KpiCard label="GMV" value="4.82B ₸" hint="+11,3%" />
        <KpiCard label="Revenue" value="286M ₸" hint="+9,1%" />
        <KpiCard label="Take rate" value="5,9%" />
      </div>

      <div className="surface-card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">GMV по месяцам</h2>
        <div className="mt-6 h-72">
          <SalesChart />
        </div>
      </div>

      <div className="surface-card mt-6 overflow-hidden">
        <div className="p-6">
          <h2 className="font-display text-lg font-semibold">Операторы</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Оператор</TableHead>
                <TableHead>Туры</TableHead>
                <TableHead>Рейтинг</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{op.name}</TableCell>
                  <TableCell>{formatNumber(op.tours)}</TableCell>
                  <TableCell>{op.rating.toFixed(1)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashShell>
  );
}