import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2 } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Уведомления — TourGo" },
      {
        name: "description",
        content: "Центр уведомлений: бронирования, снижение цены, Premium deals и важные обновления.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, isAuthenticated } = useAuth();
  const state = usePlatformStore();
  const items = isAuthenticated && user
    ? state.notifications.filter((n) => n.userId === user.id)
    : state.notifications.slice(0, 0);

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold md:text-4xl">Уведомления</h1>
            <p className="mt-2 text-muted-foreground">In-app центр уведомлений.</p>
          </div>
          <div className="flex gap-2">
            {isAuthenticated ? (
              <Button
                variant="outline"
                onClick={() => {
                  if (!user) return;
                  setState((s) => ({
                    ...s,
                    notifications: s.notifications.map((n) =>
                      n.userId === user.id ? { ...n, read: true } : n,
                    ),
                  }));
                }}
              >
                Отметить прочитанными
              </Button>
            ) : (
              <Button asChild>
                <Link to="/login">Войти</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/profile">Личный кабинет</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                Нет уведомлений. Войдите под демо-аккаунтом, чтобы увидеть ленту.
              </div>
            ) : (
              items.map((item) => (
                <article key={item.id} className="surface-card flex gap-4 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary">
                    <Bell className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-semibold">{item.title}</h2>
                      {!item.read ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("ru-RU")} · {item.type}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>

          <aside className="surface-card h-fit p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Bell className="size-5" />
              Каналы
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {["In-app включён", "Email abstraction готов", "Push/SMS — позже"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
