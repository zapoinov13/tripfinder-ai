import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Send, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, formatGrouped } from "@/components/ui/money-input";
import { PhoneInput, parsePhoneDigits } from "@/components/ui/phone-input";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { destinations } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { collectOffersFromCatalog, createTripRequest } from "@/lib/platform/requests";
import type { TripRequestKind } from "@/lib/platform/types";

type Search = { kind?: TripRequestKind; destination?: string; from?: string; city?: string; wish?: string };

export const Route = createFileRoute("/request/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ..(search["kind"] === "assistance" ? { kind: "assistance" as const } : {}),
    ..(typeof search["destination"] === "string" ? { destination: search["destination"] } : {}),
    ..(typeof search["from"] === "string" ? { from: search["from"] } : {}),
    ..(typeof search["city"] === "string" ? { city: search["city"] } : {}),
    ..(typeof search["wish"] === "string" ? { wish: search["wish"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Заявка турфирмам: получите несколько цен на одну поездку · TourGo" },
      {
        name: "description",
        content:
          "Опишите поездку один раз. Проверенные турфирмы пришлют свои варианты с ценой. Сравните и выберите.",
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
  const [wishes, setWishes] = useState(search.wish ?? "");
  /** Имя из профиля доступно только после гидрации, подставляем его, пока поле не тронули. */
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const name = nameEdit ?? user?.name ?? "";
  const setName = setNameEdit;
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const destination = destinations.find((d) => d.id === destinationId);
  const destinationLabel = search.city?.trim() || destination?.city || "Дубай";

  const submit = () => {
    if (!isAuthenticated || !user) {
      toast("Войдите, чтобы турфирмы могли отправить вам предложения");
      void navigate({ to: "/login" });
      return;
    }
    if (!name.trim() || parsePhoneDigits(phone).length < 11) {
      toast.error("Укажите имя и телефон, иначе турфирма не сможет ответить");
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
            {kind === "assistance" ? "Помощь уже в поездке" : "Бесплатная заявка турфирмам"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            {kind === "assistance"
              ? "Что нужно на месте: компании пришлют цены"
              : "Одна заявка: цены от нескольких турфирм"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {kind === "assistance"
              ? "Напишите, что срочно нужно: машина, гид, билеты. Компании в этой стране ответят с ценой."
              : "Укажите куда, когда и бюджет. Подходящие компании пришлют варианты, вы сравните отель, состав и цену в одном окне."}
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
                      {kind === "assistance" ? `${d.flag} ${d.country}` : `${d.city} · ${d.country}`}
                    </option>
                  ))}
                </select>
                {kind === "assistance" && search.city ? (
                  <p className="text-xs text-muted-foreground">Город: {search.city}</p>
                ) : null}
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

              <div className="space-y-2 md:col-span-2">
                <DateRangePicker
                  label={kind === "assistance" ? "Когда нужна помощь" : "Даты поездки"}
                  from={dateStart}
                  to={dateEnd}
                  presets={kind === "assistance" ? "short" : "trip"}
                  months={2}
                  onChange={({ from, to }) => {
                    setDateStart(from);
                    setDateEnd(to);
                  }}
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
                <MoneyInput id="req-budget" value={budget} onChange={setBudget} />
                <div className="flex flex-wrap gap-1.5">
                  {(kind === "assistance"
                    ? [150000, 300000, 500000, 1000000]
                    : [800000, 1200000, 1800000, 2500000, 4000000]
                  ).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setBudget(amount)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        budget === amount
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/70"
                      }`}
                    >
                      {formatGrouped(amount)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Турфирмы увидят бюджет и предложат варианты в этих рамках.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-wishes">Что для вас важно?</Label>
              <VoiceTextarea
                id="req-wishes"
                value={wishes}
                onChange={setWishes}
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
                <PhoneInput
                  id="req-phone"
                  value={phone}
                  onChange={setPhone}
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
              Так вы увидите статус заявки и все предложения.
            </p>
          ) : null}
        </div>
      </div>
    </SiteLayout>
  );
}
