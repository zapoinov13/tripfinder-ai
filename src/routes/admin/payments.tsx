import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  EmptyState,
  FilterBar,
  KpiLinkCard,
  StatusBadge,
  orgName,
  paymentStatusLabel,
  paymentTypeLabel,
  toneForPaymentStatus,
  userName,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
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

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Платежи · Админ" }] }),
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const payments = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.payments.filter((p) => {
      if (type !== "all" && p.type !== type) return false;
      if (status !== "all" && p.status !== status) return false;
      if (!query) return true;
      return (
        userName(p.userId).toLowerCase().includes(query) ||
        p.providerPaymentId.toLowerCase().includes(query) ||
        (paymentTypeLabel[p.type] ?? "").toLowerCase().includes(query)
      );
    });
  }, [state.payments, q, type, status]);

  if (!allowed) return null;

  const paidSum = state.payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const pendingSum = state.payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);
  const failedCount = state.payments.filter((p) => p.status === "failed").length;

  return (
    <DashShell brand="TourGo Админ" items={nav} title="Платежи" subtitle="Транзакции платформы">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiLinkCard label="Оплачено" value={formatPrice(paidSum)} hint="Успешные платежи" />
        <KpiLinkCard
          label="Ожидает"
          value={formatPrice(pendingSum)}
          hint="В обработке"
          tone="warning"
        />
        <KpiLinkCard
          label="Ошибки"
          value={String(failedCount)}
          hint="Неудачные платежи"
          tone={failedCount ? "danger" : "default"}
        />
      </div>

      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Пользователь, ID платежа…"
        filters={[
          {
            key: "type",
            value: type,
            placeholder: "Тип",
            onChange: setType,
            options: [
              { value: "all", label: "Все типы" },
              ...Object.entries(paymentTypeLabel).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            key: "status",
            value: status,
            placeholder: "Статус",
            onChange: setStatus,
            options: [
              { value: "all", label: "Все статусы" },
              { value: "paid", label: "Оплачен" },
              { value: "pending", label: "Ожидает" },
              { value: "failed", label: "Ошибка" },
              { value: "cancelled", label: "Отменён" },
            ],
          },
        ]}
      />

      {payments.length === 0 ? (
        <EmptyState title="Платежей нет" />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Компания</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Когда</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{p.providerPaymentId}</TableCell>
                  <TableCell>{userName(p.userId)}</TableCell>
                  <TableCell className="text-sm">
                    {p.organizationId ? orgName(p.organizationId) : "—"}
                  </TableCell>
                  <TableCell>{paymentTypeLabel[p.type] ?? p.type}</TableCell>
                  <TableCell>{formatPrice(p.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={paymentStatusLabel[p.status]}
                      tone={toneForPaymentStatus(p.status)}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(p.createdAt).toLocaleString("ru-RU")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashShell>
  );
}
