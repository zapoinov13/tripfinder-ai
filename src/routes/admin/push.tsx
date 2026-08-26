import { createFileRoute } from "@tanstack/react-router";
import { Bell, Building2, History, Send, Smartphone, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatRelativeRu } from "@/components/admin";
import { useAdminNav } from "@/components/dash/nav-items";
import { DashShell } from "@/components/dash/dash-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/data/demo";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { dispatchPushBroadcast } from "@/lib/push/dispatch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/push")({
  head: () => ({ meta: [{ title: "Push · TourGo Админ" }] }),
  component: AdminPushPage,
});

type Audience = "all" | "tourists" | "operators";

const audienceMeta: Record<Audience, { label: string; hint: string; icon: typeof Users }> = {
  all: { label: "Все с приложением", hint: "туристы и партнёры", icon: Smartphone },
  tourists: { label: "Туристы", hint: "клиенты платформы", icon: Users },
  operators: { label: "Партнёры", hint: "компании и их сотрудники", icon: Building2 },
};

const templates: Record<Audience, { title: string; body: string; name: string }[]> = {
  tourists: [
    {
      name: "Горящие туры",
      title: "Горящие туры недели 🔥",
      body: "Компании снизили цены на ближайшие вылеты. Откройте TourGo и сравните предложения.",
    },
    {
      name: "Напоминание о заявке",
      title: "Компании ждут вас",
      body: "По вашей заявке есть предложения. Откройте приложение, чтобы сравнить цены и выбрать.",
    },
  ],
  operators: [
    {
      name: "Новые заявки",
      title: "Туристы ждут ответа",
      body: "На платформе появились новые заявки. Ответьте первыми — туристы выбирают быстрых.",
    },
    {
      name: "Продвижение",
      title: "Поднимите свои предложения",
      body: "Включите продвижение в кабинете: ваши туры и объявления поднимутся в топ витрины.",
    },
  ],
  all: [
    {
      name: "Обновление",
      title: "TourGo стал лучше",
      body: "Мы обновили приложение: быстрее поиск и новые разделы. Откройте и посмотрите.",
    },
  ],
};

function AdminPushPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const counts = useMemo(() => {
    const tourists = state.users.filter(
      (u) => u.role === "TOURIST" || u.role === "PREMIUM_TOURIST",
    ).length;
    const operators = state.users.filter(
      (u) => u.role === "OPERATOR_ADMIN" || u.role === "OPERATOR_MANAGER",
    ).length;
    return { tourists, operators, all: tourists + operators };
  }, [state.users]);

  const history = useMemo(
    () => state.auditLogs.filter((l) => l.action === "push_broadcast").slice(0, 12),
    [state.auditLogs],
  );

  if (!allowed || !user) return null;

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Заполните заголовок и текст");
      return;
    }
    setBusy(true);
    try {
      const res = await dispatchPushBroadcast({
        title: title.trim(),
        body: body.trim(),
        audience,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось отправить");
        return;
      }
      const summary = `Получателей: ${res.targets ?? 0} · in-app: ${res.notificationsCreated ?? 0} · push на телефоны: ${res.tokensSent ?? 0}`;
      setLastResult(summary);
      appendAudit({
        actorId: user.id,
        action: "push_broadcast",
        entityType: "push",
        meta: {
          title: title.trim(),
          body: body.trim(),
          audience,
          targets: res.targets ?? 0,
        },
      });
      toast.success(`Рассылка отправлена · ${audienceMeta[audience].label}`);
      if (!res.fcmConfigured) {
        toast.message("FCM_SERVER_KEY не настроен: push на телефоны пока только in-app");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Push-уведомления"
      subtitle="Рассылки в приложение: всем, только туристам или только партнёрам."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          className="surface-card space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="space-y-2">
            <Label>Кому отправить</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(audienceMeta) as Audience[]).map((key) => {
                const meta = audienceMeta[key];
                const Icon = meta.icon;
                const on = audience === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAudience(key)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors",
                      on
                        ? "border-primary bg-primary-soft ring-1 ring-primary/20"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <Icon className={cn("size-4", on ? "text-primary" : "text-muted-foreground")} />
                    <p className="mt-1.5 text-sm font-semibold">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(counts[key])} · {meta.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {templates[audience].length > 0 ? (
            <div className="space-y-2">
              <Label>Шаблоны</Label>
              <div className="flex flex-wrap gap-2">
                {templates[audience].map((t) => (
                  <Button
                    key={t.name}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTitle(t.title);
                      setBody(t.body);
                    }}
                  >
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="push-title">Заголовок</Label>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Новые предложения по вашей заявке"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="push-body">Текст</Label>
            <Textarea
              id="push-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="3 турфирмы прислали цены. Откройте приложение, чтобы сравнить."
              rows={4}
              maxLength={500}
            />
          </div>

          {title.trim() || body.trim() ? (
            <div className="max-w-sm rounded-2xl border border-border bg-secondary/40 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Так увидят на телефоне
              </p>
              <div className="mt-2 flex items-start gap-2.5 rounded-xl bg-card p-3 shadow-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{title.trim() || "Заголовок"}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {body.trim() || "Текст уведомления"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <Button type="submit" disabled={busy} className="gap-2">
            <Send className="size-4" />
            {busy
              ? "Отправляем…"
              : `Отправить · ${audienceMeta[audience].label} (${formatNumber(counts[audience])})`}
          </Button>
          {lastResult ? (
            <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
              {lastResult}
            </p>
          ) : null}
        </form>

        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="flex items-center gap-2 font-display font-semibold">
              <History className="size-4" />
              История рассылок
            </h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Пока не отправляли. Первая рассылка появится здесь — её можно будет повторить в один
                клик.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {history.map((log) => {
                  const meta = log.meta ?? {};
                  const aud = (meta["audience"] as Audience) ?? "all";
                  return (
                    <li key={log.id} className="rounded-2xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold">
                          {String(meta["title"] ?? "Рассылка")}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatRelativeRu(log.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {String(meta["body"] ?? "")}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                          {audienceMeta[aud]?.label ?? aud} ·{" "}
                          {formatNumber(Number(meta["targets"] ?? 0))} чел.
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setTitle(String(meta["title"] ?? ""));
                            setBody(String(meta["body"] ?? ""));
                            setAudience(audienceMeta[aud] ? aud : "all");
                            toast.message("Текст подставлен в форму — проверьте и отправьте");
                          }}
                        >
                          Повторить
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="surface-card space-y-3 p-6 text-sm">
            <h2 className="flex items-center gap-2 font-display font-semibold">
              <Bell className="size-4" />
              Как это работает
            </h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Уведомление приходит в приложение и в центр уведомлений на сайте</li>
              <li>• На iOS/Android уходит push, если человек ставил приложение</li>
              <li>• «Партнёры» — все сотрудники компаний, «Туристы» — все клиенты</li>
              <li>• События заявок и сообщений шлют push автоматически, без рассылок</li>
            </ul>
          </aside>
        </div>
      </div>
    </DashShell>
  );
}
