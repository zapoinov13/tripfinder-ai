import { createFileRoute } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { peopleLabel } from "@/lib/platform/requests";

export const Route = createFileRoute("/operator/offers")({
  head: () => ({ meta: [{ title: "Мои предложения — TourGo" }] }),
  component: OperatorOffersPage,
});

const statusLabel: Record<string, { text: string; tone: string }> = {
  SENT: { text: "Отправлено", tone: "bg-primary/12 text-primary" },
  CHOSEN: { text: "Турист выбрал вас", tone: "bg-success/12 text-success" },
  DECLINED: { text: "Выбрали другую компанию", tone: "bg-secondary text-muted-foreground" },
};

function OperatorOffersPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  if (!allowed || !organization) return null;

  const offers = state.requestOffers
    .filter((o) => o.organizationId === organization.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const won = offers.filter((o) => o.status === "CHOSEN").length;

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Мои предложения"
      subtitle={
        offers.length > 0
          ? `Отправлено ${offers.length} · выбрали вас ${won}`
          : "Вы ещё не отправляли предложения"
      }
    >
      {offers.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <HandCoins className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Откройте «Заявки туристов» и отправьте первое предложение.
          </p>
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заявка</TableHead>
                <TableHead>Отель</TableHead>
                <TableHead>Условия</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o) => {
                const request = state.tripRequests.find((r) => r.id === o.requestId);
                const status = statusLabel[o.status] ?? statusLabel["SENT"]!;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      {request ? (
                        <>
                          <p className="font-medium">
                            {request.fromCity} → {request.destinationLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">{peopleLabel(request)}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{o.hotelName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.nights} ноч. · {o.meal}
                      {o.flightIncluded ? " · перелёт" : ""}
                      {o.transferIncluded ? " · трансфер" : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(o.price)}</TableCell>
                    <TableCell>
                      <Badge className={status.tone}>{status.text}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </DashShell>
  );
}
