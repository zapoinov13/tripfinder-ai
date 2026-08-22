import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, ExternalLink, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsNativeApp } from "@/hooks/use-native-app";
import { useAuth } from "@/lib/platform/auth";
import {
  isPushEnabledLocally,
  registerNativePushNotifications,
  setPushEnabledLocally,
  unregisterNativePushNotifications,
} from "@/lib/native/push";
import { setState } from "@/lib/platform/store";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";

export const Route = createFileRoute("/profile/settings")({
  head: () => ({ meta: [{ title: "Данные туриста · TourGo" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <TouristAccountGate kind="profile" title="Данные туриста — после входа">
      <SettingsContent />
    </TouristAccountGate>
  );
}

function SettingsContent() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const isNative = useIsNativeApp();
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [cityEdit, setCityEdit] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(() => isPushEnabledLocally());
  const name = nameEdit ?? user?.name ?? "";
  const city = cityEdit ?? user?.city ?? "";

  if (!user) return null;

  const isOperator = user.role.startsWith("OPERATOR");

  return (
    <DashShell brand="TourGo" items={profileNav} title="Данные туриста" subtitle="Имя, город и уведомления">
      <div className="grid max-w-2xl gap-6">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Личные данные</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" value={name} onChange={(e) => setNameEdit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Город</Label>
            <Input id="city" value={city} onChange={(e) => setCityEdit(e.target.value)} />
          </div>
          <Button
            onClick={() => {
              setState((s) => ({
                ...s,
                users: s.users.map((u) =>
                  u.id === user.id
                    ? { ...u, name: name.trim() || u.name, city: city.trim() || u.city }
                    : u,
                ),
              }));
              toast.success("Сохранено");
            }}
          >
            Сохранить
          </Button>
        </div>

        {isNative ? (
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Уведомления</h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Push-уведомления</p>
                <p className="text-xs text-muted-foreground">
                  Новые предложения, сообщения и статусы заявок
                </p>
              </div>
              <Switch
                checked={pushEnabled}
                onCheckedChange={async (checked) => {
                  setPushEnabled(checked);
                  setPushEnabledLocally(checked);
                  if (checked) {
                    await registerNativePushNotifications();
                    toast.success("Уведомления включены");
                  } else {
                    await unregisterNativePushNotifications();
                    toast.success("Уведомления отключены");
                  }
                }}
              />
            </div>
          </div>
        ) : null}

        {isOperator ? (
          <div className="surface-card flex items-start gap-4 p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold">Кабинет турфирмы</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Заявки, туры, сообщения и аналитика — в отдельном разделе оператора.
              </p>
              <Button className="mt-4" asChild>
                <Link to="/operator">Открыть кабинет</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="surface-card flex items-start gap-4 p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Вы турфирма?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Подключите компанию и получайте заявки от туристов.
              </p>
              <Button className="mt-4" variant="outline" asChild>
                <Link to="/for-companies">Узнать больше</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="surface-card space-y-3 p-6">
          <h2 className="font-display text-lg font-semibold">Правовая информация</h2>
          <div className="flex flex-col gap-2">
            <Link
              to="/privacy"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                Политика конфиденциальности
              </span>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
            <Link
              to="/terms"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                Условия использования
              </span>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
            <Link
              to="/support"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                Поддержка
              </span>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          </div>
          {isNative ? (
            <p className="pt-2 text-xs text-muted-foreground">TourGo · версия 1.0.0 (build 1)</p>
          ) : null}
        </div>

        <div className="surface-card border-destructive/20 p-6">
          <h2 className="font-display text-lg font-semibold text-destructive">Удалить аккаунт</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Данные профиля и история будут удалены. Это действие необратимо (требование App Store).
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4">
                <Trash2 className="size-4" />
                Удалить аккаунт
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы потеряете доступ к заявкам, избранному и сообщениям. Восстановить аккаунт будет
                  нельзя.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    const res = await deleteAccount();
                    if (res.ok) navigate({ to: "/" });
                    else toast.error(res.error ?? "Не удалось удалить");
                  }}
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </DashShell>
  );
}
