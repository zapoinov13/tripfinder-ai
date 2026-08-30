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
import { PhoneInput } from "@/components/ui/phone-input";
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
import { getSupabase } from "@/lib/supabase/client";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/profile/settings")({
  head: () => privatePage("Данные туриста · TourGo"),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <TouristAccountGate kind="profile" title="Данные туриста после входа">
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
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null);
  const [birthdayEdit, setBirthdayEdit] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [pushEnabled, setPushEnabled] = useState(() => isPushEnabledLocally());
  const name = nameEdit ?? user?.name ?? "";
  const city = cityEdit ?? user?.city ?? "";
  const phone = phoneEdit ?? user?.phone ?? "";
  const birthday = birthdayEdit ?? user?.birthday ?? "";

  if (!user) return null;

  const isOperator = user.role.startsWith("OPERATOR");

  // Настоящий пароль входа живёт в Supabase Auth: локальный стор — лишь витрина.
  const savePassword = async () => {
    if (password.length < 8) {
      toast.error("Пароль не короче 8 символов");
      return;
    }
    if (password !== password2) {
      toast.error("Пароли не совпадают");
      return;
    }
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Не удалось обновить пароль");
        return;
      }
    }
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === user.id ? { ...u, password } : u)),
    }));
    setPassword("");
    setPassword2("");
    toast.success("Пароль обновлён");
  };

  return (
    <DashShell
      tabs="tourist"
      brand="TourGo"
      items={profileNav}
      title="Данные туриста"
      subtitle="Имя, телефон, пароль и уведомления"
    >
      <div className="grid max-w-2xl gap-6">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Личные данные</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" value={name} onChange={(e) => setNameEdit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <PhoneInput id="phone" value={phone} onChange={setPhoneEdit} />
            <p className="text-xs text-muted-foreground">
              По нему с вами свяжется компания по заявке.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Город</Label>
            <Input id="city" value={city} onChange={(e) => setCityEdit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">День рождения</Label>
            <Input
              id="birthday"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={birthday}
              onChange={(e) => setBirthdayEdit(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Пришлём бонус ко дню рождения. Не хотите — оставьте пустым.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Почта для входа</Label>
            <Input id="profile-email" value={user.email} disabled />
          </div>
          <Button
            onClick={() => {
              setState((s) => ({
                ...s,
                users: s.users.map((u) =>
                  u.id === user.id
                    ? {
                        ...u,
                        name: name.trim() || u.name,
                        city: city.trim(),
                        phone: phone.trim(),
                        birthday: birthday.trim(),
                      }
                    : u,
                ),
              }));
              toast.success("Сохранено");
            }}
          >
            Сохранить
          </Button>
        </div>

        <div className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Пароль</h2>
          <p className="text-sm text-muted-foreground">Новый пароль сразу для входа в TourGo.</p>
          <div className="space-y-2">
            <Label htmlFor="profile-pass">Новый пароль</Label>
            <Input
              id="profile-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Не короче 8 символов"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-pass2">Ещё раз</Label>
            <Input
              id="profile-pass2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => void savePassword()}>
            Сменить пароль
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
                Заявки, туры, сообщения и аналитика в отдельном разделе оператора.
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
