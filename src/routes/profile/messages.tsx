import { Link, createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { ThreadView } from "@/components/messages/thread-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { getTouristThreads } from "@/lib/platform/messages";
import { cn } from "@/lib/utils";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/profile/messages")({
  head: () => privatePage("Сообщения · TourGo"),
  component: TouristMessagesPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function TouristMessagesPage() {
  return (
    <TouristAccountGate kind="generic" title="Сообщения с турфирмами после входа">
      <MessagesContent />
    </TouristAccountGate>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const state = usePlatformStore();
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!user) return null;

  void state.requestMessages.length;
  const threads = getTouristThreads(user.id);
  const activeKey =
    openKey ?? (threads[0] ? `${threads[0].requestId}::${threads[0].organizationId}` : null);
  const active = threads.find((t) => `${t.requestId}::${t.organizationId}` === activeKey);

  return (
    <DashShell
      tabs="tourist"
      brand="TourGo"
      items={profileNav}
      title="Сообщения"
      subtitle="Переписка с туристическими компаниями"
    >
      {threads.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <MessageSquare className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Переписок пока нет. Откройте свою заявку и напишите компании, которая прислала
            предложение.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/profile/requests">Мои заявки</Link>
          </Button>
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
                    <p className="font-medium">{t.companyName}</p>
                    {t.unreadForTourist > 0 ? (
                      <Badge className="bg-primary text-primary-foreground">
                        {t.unreadForTourist}
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <p className="font-display text-lg font-semibold">{active.companyName}</p>
                  <p className="text-sm text-muted-foreground">{active.destinationLabel}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/request/$requestId" params={{ requestId: active.requestId }}>
                    Открыть заявку
                  </Link>
                </Button>
              </div>
              <ThreadView
                className="pt-4"
                requestId={active.requestId}
                organizationId={active.organizationId}
                touristId={user.id}
                side="TOURIST"
                authorName={user.name}
                messages={active.messages}
                placeholder="Например: можно ли поменять даты на неделю позже?"
              />
            </div>
          ) : null}
        </div>
      )}
    </DashShell>
  );
}
