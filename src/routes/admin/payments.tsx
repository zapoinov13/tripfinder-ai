import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

const paymentTypeLabel: Record<string, string> = {
  subscription: "Подписка",
  premium_subscription: "Premium-подписка",
  promotion: "Продвижение",
  advertising: "Реклама",
  booking: "Бронирование",
  topup: "Пополнение",
};

const paymentStatusLabel: Record<string, string> = {
  pending: "Ожидает",
  paid: "Оплачен",
  failed: "Ошибка",
  refunded: "Возврат",
};

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Платежи — Админ" }] }),
  component: () => {
    const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
    const state = usePlatformStore();
    if (!allowed) return null;
    return (
      <DashShell
        brand="Voyago Админ"
        items={adminNav}
        title="Платежи"
        subtitle="Все транзакции платформы"
      >
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Когда</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{p.providerPaymentId}</TableCell>
                  <TableCell>{paymentTypeLabel[p.type] ?? p.type}</TableCell>
                  <TableCell>{formatPrice(p.amount)}</TableCell>
                  <TableCell>{paymentStatusLabel[p.status] ?? p.status}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(p.createdAt).toLocaleString("ru-RU")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DashShell>
    );
  },
});
