import { Link, createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { peopleLabel, requestStatusLabel } from "@/lib/platform/requests";

export const Route = createFileRoute("/profile/requests")({
  head: () => ({
    meta: [{ title: "Мои заявки — TourGo" }],
  }),
  component: MyRequestsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

function MyRequestsPage() {
  const { allowed } = useRequireAuth(["TOURIST", "PREMIUM_TOURIST"]);
  const { user } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !user) return null;

  const requests = state.tripRequests
    .filter((r) => r.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <DashShell
      brand="TourGo"
      items={profileNav}
      title="Мои заявки"
      subtitle="Заявки турфирмам и предложения по ним"
    >
      {requests.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Inbox className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Вы пока не оставляли заявок</p>
          <Button className="mt-4" asChild>
            <Link to="/request" search={{}}>
              Получить предложения от турфирм
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const offers = state.requestOffers.filter((o) => o.requestId === r.id);
            return (
              <Link
                key={r.id}
                to="/request/$requestId"
                params={{ requestId: r.id }}
                className="surface-card block p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">
                      {r.kind === "assistance"
                        ? `Помощь в поездке · ${r.destinationLabel}`
                        : `${r.fromCity} → ${r.destinationLabel}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fmtDate(r.dateStart)} — {fmtDate(r.dateEnd)} · {peopleLabel(r)} · до{" "}
                      {formatPrice(r.budget)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        r.status === "CHOSEN"
                          ? "bg-success/12 text-success"
                          : offers.length > 0
                            ? "bg-primary/12 text-primary"
                            : "bg-secondary text-muted-foreground"
                      }
                    >
                      {requestStatusLabel[r.status]}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {offers.length > 0 ? `Предложений: ${offers.length}` : "Ждём предложения"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashShell>
  );
}
