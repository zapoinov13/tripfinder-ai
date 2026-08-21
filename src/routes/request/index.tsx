import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Send, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { destinations } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { collectOffersFromCatalog, createTripRequest } from "@/lib/platform/requests";
import type { TripRequestKind } from "@/lib/platform/types";

type Search = { kind?: TripRequestKind; destination?: string; from?: string };

export const Route = createFileRoute("/request/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(search["kind"] === "assistance" ? { kind: "assistance" as const } : {}),
    ...(typeof search["destination"] === "string" ? { destination: search["destination"] } : {}),
    ...(typeof search["from"] === "string" ? { from: search["from"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Получить предложения от турфирм — TourGo" },
      {
        name: "description",
        content:
          "Оставьте одну заявку — несколько проверенных турфирм предложат вам свои варианты поездки.",
      },
    ],
  }),
  component: RequestPage,
});

const cities = ["Алматы", "Астана", "Шымкент", "Актау", "Ташкент", "Бишкек"];

function todayPlus(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function RequestPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const kind: TripRequestKind = search.kind === "assistance" ? "assistance" : "tour";

  const [fromCity, setFromCity] = useState(search.from ?? "Алматы");
  const [destinationId, setDestinationId] = useState(
    destinations.find((d) => d.id === search.destination)?.id ?? "uae",
  );
  const [dateStart, setDateStart] = useState(todayPlus(kind === "assistance" ? 1 : 21));
  const [dateEnd, setDateEnd] = useState(todayPlus(kind === "assistance" ? 1 : 28));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(kind === "assistance" ? 0 : 2);
  const [budget, setBudget] = useState(kind === "assistance" ? 300000 : 1800000);
  const [wishes, setWishes] = useState("");
  /** Имя из профиля доступно только после гидрации — подставляем его, пока поле не тронули. */
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const name = nameEdit ?? user?.name ?? "";
  const setName = setNameEdit;
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const destination = destinations.find((d) => d.id === destinationId);
  const destinationLabel = destination ? destination.city : "Дубай";

  const submit = () => {
    if (!isAuthenticated || !user) {
      toast("Войдите, чтобы турфирмы могли отправить вам предложения");
      void navigate({ to: "/login" });
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error("Укажите имя и телефон — иначе турфирма не сможет ответить");
      return;
    }
    setSending(true);
    const request = createTripRequest({
      userId: user.id,
      kind,
      fromCity,
      destinationId,
      destinationLabel,
      dateStart,
      dateEnd,
      adults,
      children,
      budget,
      wishes,
      contactName: name.trim(),
      contactPhone: phone.trim(),
    });
    collectOffersFromCatalog(request.id);
    void navigate({ to: "/request/$requestId", params: { requestId: request.id } });
  };

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-primary">
            {kind === "assistance" ? "Помощь в поездке" : "Заявка турфирмам"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            {kind === "assistance"
              ? "Расскажите, что вам нужно на месте"
              : "Оставьте одну заявку — получите несколько предложений"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {kind === "assistance"
              ? "Туристические компании в этой стране предложат варианты и цены."
              : "Заполните короткую форму. Проверенные турфирмы предложат свои варианты, а вы сравните и выберете."}
          </p>

          <div className="surface-card mt-8 space-y-6 p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="req-destination">
                  {kind === "assistance" ? "Где вы находитесь?" : "Куда хотите поехать?"}
                </Label>
                <select
                  id="req-destination"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.city} · {d.country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-from">
                  {kind === "assistance" ? "Откуда вы приехали?" : "Откуда?"}
                </Label>
                <select
                  id="req-from"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-start">
                  {kind === "assistance" ? "Когда нужно?" : "Когда вылет?"}
                </Label>
                <Input
                  id="req-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-end">
                  {kind === "assistance" ? "До какого числа?" : "Когда обратно?"}
                </Label>
                <Input
                  id="req-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-adults">Взрослых</Label>
                <Input
                  id="req-adults"
                  type="number"
                  min={1}
                  max={20}
                  value={adults}
                  onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-children">Детей</Label>
                <Input
                  id="req-children"
                  type="number"
                  min={0}
                  max={10}
                  value={children}
                  onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="req-budget">Ваш бюджет, ₸ (до)</Label>
                <Input
                  id="req-budget"
                  type="number"
                  min={0}
                  step={50000}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                />
                <p className="text-xs text-muted-foreground">
                  Турфирмы увидят бюджет и предложат варианты в этих рамках.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-wishes">Что для вас важно?</Label>
              <Textarea
                id="req-wishes"
                rows={4}
                value={wishes}
                onChange={(e) => setWishes(e.target.value)}
                placeholder={
                  kind === "assistance"
                    ? "Мы сейчас в Дубае, нас пять человек. Завтра хотим мечеть в Абу-Даби и Ferrari World. Нужна машина с русскоговорящим водителем."
                    : "Хотим семейный отель рядом с морем. Желательно всё включено."
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="req-name">Ваше имя</Label>
                <Input
                  id="req-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Айгерим"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-phone">Телефон или WhatsApp</Label>
                <Input
                  id="req-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 701 000 00 00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-success" />
                Ваш телефон видят только компании, которым вы отправили заявку.
              </p>
              <Button size="lg" onClick={submit} disabled={sending}>
                <Send className="size-4" />
                Отправить заявку
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BadgeCheck, text: "Заявку получают только проверенные компании" },
              { icon: Users, text: "Несколько предложений на одну заявку" },
              { icon: ArrowRight, text: "Сравниваете и выбираете сами" },
            ].map((item) => (
              <div key={item.text} className="surface-card flex items-start gap-3 p-4">
                <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>

          {!isAuthenticated ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Войдите
              </Link>{" "}
              — так вы увидите статус заявки и все предложения.
            </p>
          ) : null}
        </div>
      </div>
    </SiteLayout>
  );
}
