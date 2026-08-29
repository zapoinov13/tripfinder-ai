import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, Building2, CreditCard, LogOut, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { isListingBusiness } from "@/lib/platform/company-categories";
import { Switch } from "@/components/ui/switch";
import type { NotifyPrefs } from "@/lib/platform/types";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState } from "@/lib/platform/store";
import { getSupabase } from "@/lib/supabase/client";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/operator/settings")({
  head: () => privatePage("Настройки · TourGo"),
  component: OperatorSettingsPage,
});

const roleCopy = {
  OPERATOR_ADMIN: {
    title: "Владелец",
    text: "Можете менять страницу компании, тариф и сотрудников. Менеджеры отвечают на заявки.",
  },
  OPERATOR_MANAGER: {
    title: "Менеджер",
    text: "Видите заявки, туры и сообщения. Страницу компании и тариф меняет владелец.",
  },
} as const;

function OperatorSettingsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization, logout } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [cityEdit, setCityEdit] = useState<string | null>(null);
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  if (!allowed || !user || !organization) return null;

  const name = nameEdit ?? user.name;
  const city = cityEdit ?? user.city;
  const phone = phoneEdit ?? user.phone ?? "";
  const role = user.role === "OPERATOR_MANAGER" ? "OPERATOR_MANAGER" : "OPERATOR_ADMIN";
  const access = roleCopy[role];
  const plan = state.config.operatorPlans.find((p) => p.code === organization.planCode);
  const businessOnly = isListingBusiness(organization.category, organization.services);
  // Пустое поле = получать всё: так ведёт себя аккаунт, который ничего не настраивал.
  const prefs: NotifyPrefs = {
    requests: user.notifyPrefs?.requests !== false,
    messages: user.notifyPrefs?.messages !== false,
    reviews: user.notifyPrefs?.reviews !== false,
  };
  const togglePref = (key: keyof NotifyPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === user.id ? { ...u, notifyPrefs: next } : u)),
    }));
    toast.success(value ? "Уведомления включены" : "Уведомления отключены");
  };
  const isOwner = user.role === "OPERATOR_ADMIN";
  // Компании открываются автоматически, поэтому статус больше не означает
  // проверку. Знак — только по документам, которые посмотрел человек.
  const verified = Boolean(organization.documentsVerifiedAt);

  const saveProfile = () => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              name: name.trim() || u.name,
              city: city.trim() || u.city,
              phone: phone.trim(),
            }
          : u,
      ),
    }));
    toast.success("Данные сохранены");
  };

  const savePassword = async () => {
    if (password.length < 8) {
      toast.error("Пароль не короче 8 символов");
      return;
    }
    if (password !== password2) {
      toast.error("Пароли не совпадают");
      return;
    }
    // Реальный пароль входа живёт в Supabase Auth: локальный стор — лишь витрина.
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
      tabs="partner"
      brand={organization.name}
      items={nav}
      title="Настройки"
      subtitle="Это ваш вход в кабинет. Страницу компании туристы видят отдельно."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <User className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Кто входит</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Имя увидит турист в переписке. Почта нужна только для входа.
          </p>
          <div className="space-y-2">
            <Label htmlFor="op-name">Имя</Label>
            <Input id="op-name" value={name} onChange={(e) => setNameEdit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-email">Почта для входа</Label>
            <Input id="op-email" value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-city">Город</Label>
            <Input id="op-city" value={city} onChange={(e) => setCityEdit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-phone">Телефон</Label>
            <Input
              id="op-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhoneEdit(e.target.value)}
              placeholder="+7 777 777 77 77"
            />
            <p className="text-xs text-muted-foreground">
              Ваш личный номер. Телефон компании, который видит турист, — в разделе «Компания».
            </p>
          </div>
          <Button onClick={saveProfile}>Сохранить</Button>
        </section>

        <section className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Пароль</h2>
          <p className="text-sm text-muted-foreground">
            Новый пароль сразу для входа в этот кабинет.
          </p>
          <div className="space-y-2">
            <Label htmlFor="op-pass">Новый пароль</Label>
            <Input
              id="op-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Не короче 8 символов"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-pass2">Ещё раз</Label>
            <Input
              id="op-pass2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={savePassword}>
            Сменить пароль
          </Button>
        </section>

        <section className="surface-card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Доступ</h2>
          </div>
          <p className="text-sm">
            Ваша роль: <span className="font-semibold">{access.title}</span>
          </p>
          <p className="text-sm text-muted-foreground">{access.text}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{businessOnly ? "Объявления и статистика: да" : "Заявки, туры, сообщения: да"}</li>
            <li>Страница компании и сотрудники: {isOwner ? "да" : "только просмотр"}</li>
            <li>Тариф: {isOwner ? "да" : "нет, меняет владелец"}</li>
          </ul>
        </section>

        <section className="surface-card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Уведомления</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            О чём вам сигналить. Заявки и записи всё равно видны в кабинете — отключается только
            уведомление.
          </p>
          {[
            { key: "requests" as const, label: "Новые записи и их статусы" },
            { key: "messages" as const, label: "Сообщения от клиентов" },
            { key: "reviews" as const, label: "Новые отзывы" },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <span className="text-sm">{row.label}</span>
              <Switch
                checked={prefs[row.key]}
                aria-label={row.label}
                onCheckedChange={(on) => togglePref(row.key, on)}
              />
            </div>
          ))}
        </section>

        <section className="surface-card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Компания</h2>
          </div>
          <p className="font-medium">{organization.name}</p>
          <p className="text-sm text-muted-foreground">
            {verified
              ? "Проверена TourGo. Знак виден клиентам."
              : "Ещё на проверке. Кабинет уже открыт."}
          </p>
          <p className="text-sm text-muted-foreground">
            Тариф:{" "}
            {plan?.name === "Start"
              ? "Старт"
              : plan?.name === "Business"
                ? "Бизнес"
                : plan?.name === "Pro"
                  ? "Про"
                  : plan?.name}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/operator/company">Страница компании</Link>
            </Button>
            {isOwner ? (
              <Button size="sm" variant="outline" asChild>
                <Link to="/operator/billing">
                  <CreditCard className="size-3.5" />
                  Тариф
                </Link>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link to="/company/$companyId" params={{ companyId: organization.id }}>
                Как видит клиент
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <section className="surface-card mt-6 flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="font-medium">Выйти из кабинета</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {businessOnly
              ? "Объявления и страница компании останутся на месте."
              : "Туры и заявки останутся на месте."}
          </p>
        </div>
        <Button variant="outline" onClick={() => void logout()}>
          <LogOut className="size-4" />
          Выйти
        </Button>
      </section>
    </DashShell>
  );
}
