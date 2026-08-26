import { Navigate, createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { ThreadView } from "@/components/messages/thread-view";
import { Badge } from "@/components/ui/badge";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { usePlatformStore } from "@/lib/platform/hooks";
import { getCompanyThreads } from "@/lib/platform/messages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/messages")({
  head: () => ({ meta: [{ title: "Сообщения · TourGo" }] }),
  component: OperatorMessagesPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function OperatorMessagesPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization, user } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!allowed || !organization || !user) return null;
  if (isBusinessOnlyServices(organization.services)) {
    return <Navigate to="/operator/services" />;
  }

  void state.requestMessages.length;
  const threads = getCompanyThreads(organization.id);
  const activeKey =
    openKey ?? (threads[0] ? `${threads[0].requestId}::${threads[0].organizationId}` : null);
  const active = threads.find((t) => `${t.requestId}::${t.organizationId}` === activeKey);

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Сообщения"
      subtitle="Переписка с туристами по их заявкам"
    >
      {threads.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <MessageSquare className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Пока нет переписок. Турист сможет написать вам после того, как вы отправите ему
            предложение.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="surface-card divide-y divide-border overflow-hidden p-0">
            {threads.map((t) => {
              const key = `${t.requestId}::${t.organizationId}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOpenKey(key)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors hover:bg-secondary/60",
                    key === activeKey && "bg-secondary",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{t.touristName}</p>
                    {t.unreadForCompany > 0 ? (
                      <Badge className="bg-primary text-primary-foreground">
                        {t.unreadForCompany}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.destinationLabel}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {t.messages[t.messages.length - 1]?.text}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{fmtDate(t.lastAt)}</p>
                </button>
              );
            })}
          </div>

          {active ? (
            <div className="surface-card flex flex-col p-5">
              <div className="border-b border-border pb-4">
                <p className="font-display text-lg font-semibold">{active.touristName}</p>
                <p className="text-sm text-muted-foreground">{active.destinationLabel}</p>
              </div>
              <ThreadView
                className="pt-4"
                requestId={active.requestId}
                organizationId={active.organizationId}
                touristId={active.touristId}
                side="COMPANY"
                authorName={organization.name}
                messages={active.messages}
                placeholder="Например: можем предложить этот же отель с завтраками дешевле на 90 000 ₸."
              />
            </div>
          ) : null}
        </div>
      )}
    </DashShell>
  );
}
