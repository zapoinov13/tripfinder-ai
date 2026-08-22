import { createFileRoute } from "@tanstack/react-router";
import { Bell, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAdminNav } from "@/components/dash/nav-items";
import { DashShell } from "@/components/dash/dash-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRequireAuth } from "@/lib/platform/auth";
import { dispatchPushBroadcast } from "@/lib/push/dispatch";

export const Route = createFileRoute("/admin/push")({
  head: () => ({ meta: [{ title: "Push · TourGo Админ" }] }),
  component: AdminPushPage,
});

function AdminPushPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const nav = useAdminNav();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "tourists" | "operators">("all");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!allowed) return null;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Push-уведомления"
      subtitle="Рассылка в приложение и центр уведомлений"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="surface-card space-y-5 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim() || !body.trim()) {
              toast.error("Заполните заголовок и текст");
              return;
            }
            setBusy(true);
            try {
              const res = await dispatchPushBroadcast({ title: title.trim(), body: body.trim(), audience });
              if (!res.ok) {
                toast.error(res.error ?? "Не удалось отправить");
                return;
              }
              const summary = `Доставлено: ${res.targets ?? 0} пользователей, in-app: ${res.notificationsCreated ?? 0}, push: ${res.tokensSent ?? 0}`;
              setLastResult(summary);
              toast.success("Рассылка отправлена");
              if (!res.fcmConfigured) {
                toast.message("FCM_SERVER_KEY не настроен: push на телефоны пока только in-app");
              }
            } finally {
              setBusy(false);
            }
          }}
        >
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
          <div className="space-y-2">
            <Label>Аудитория</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                <SelectItem value="tourists">Туристы</SelectItem>
                <SelectItem value="operators">Турфирмы</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy} className="gap-2">
            <Send className="size-4" />
            {busy ? "Отправляем…" : "Отправить push"}
          </Button>
          {lastResult ? (
            <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
              {lastResult}
            </p>
          ) : null}
        </form>

        <aside className="surface-card h-fit space-y-4 p-6 text-sm">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <Bell className="size-4" />
            Как это работает
          </h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Уведомление сохраняется в центре `/notifications`</li>
            <li>• На iOS/Android уходит push, если есть device token</li>
            <li>• Для FCM добавьте `FCM_SERVER_KEY` в Edge Function secrets</li>
            <li>• События заявок и сообщений тоже шлют push автоматически</li>
          </ul>
        </aside>
      </div>
    </DashShell>
  );
}
