import { createFileRoute } from "@tanstack/react-router";
import { Check, Inbox, Send, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, getHotel, hotels, type Hotel } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { mealPlainLabel, peopleLabel, declineRequest, sendOffer } from "@/lib/platform/requests";
import type { TripRequest } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/requests")({
  head: () => ({ meta: [{ title: "Заявки туристов · TourGo" }] }),
  component: OperatorRequestsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

const OFFER_INCLUDE_OPTIONS = [
  { key: "stay", label: "Проживание" },
  { key: "flight", label: "Перелёт", offerField: "flightIncluded" as const },
  { key: "meal", label: "Питание" },
  { key: "transfer", label: "Трансфер", offerField: "transferIncluded" as const },
  { key: "insurance", label: "Страховка", offerField: "insuranceIncluded" as const },
  { key: "visa", label: "Визовая поддержка" },
  { key: "excursions", label: "Экскурсии" },
] as const;

const DEFAULT_INCLUDED: Record<(typeof OFFER_INCLUDE_OPTIONS)[number]["key"], boolean> = {
  stay: true,
  flight: true,
  meal: true,
  transfer: true,
  insurance: true,
  visa: false,
  excursions: false,
};

function buildIncludesText(
  included: Record<(typeof OFFER_INCLUDE_OPTIONS)[number]["key"], boolean>,
) {
  return OFFER_INCLUDE_OPTIONS.filter((item) => included[item.key])
    .map((item) => item.label)
    .join(", ");
}

function hotelOptionsForOffer(
  orgId: string,
  destinationId: string,
  platformHotels: Hotel[],
  tourHotelIds: string[],
) {
  const map = new Map<string, Hotel>();
  for (const id of tourHotelIds) {
    const hotel = getHotel(id);
    if (hotel) map.set(hotel.id, hotel);
  }
  for (const hotel of hotels.filter((h) => h.destinationId === destinationId)) {
    map.set(hotel.id, hotel);
  }
  for (const hotel of platformHotels) {
    if (hotel.destinationId === destinationId) map.set(hotel.id, hotel);
  }
  return [...map.values()].sort(
    (a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "ru"),
  );
}

function OperatorRequestsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization, user } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [active, setActive] = useState<TripRequest | null>(null);

  const open = useMemo(() => {
    if (!organization) return [];
    const answered = new Set(
      state.requestOffers
        .filter((o) => o.organizationId === organization.id)
        .map((o) => o.requestId),
    );
    return state.tripRequests
      .filter((r) => r.status !== "CHOSEN" && r.status !== "CLOSED")
      .filter((r) => !r.declinedByOrgIds.includes(organization.id))
      .filter((r) => !answered.has(r.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.tripRequests, state.requestOffers, organization]);

  if (!allowed || !organization) return null;

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Заявки туристов"
      subtitle={open.length > 0 ? `Новых заявок: ${open.length}` : "Новых заявок нет"}
    >
      {open.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Inbox className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Новых заявок нет. Как только турист оставит заявку по вашему направлению, она появится
            здесь.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {open.map((r) => (
            <article key={r.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge className="bg-primary/12 text-primary">
                    {r.kind === "assistance" ? "Помощь в поездке" : "Новая заявка"}
                  </Badge>
                  <h3 className="mt-2 font-display text-lg font-semibold">
                    {r.fromCity} → {r.destinationLabel}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fmtDate(r.dateStart)} - {fmtDate(r.dateEnd)} · {peopleLabel(r)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Бюджет</p>
                  <p className="font-display text-xl font-semibold">до {formatPrice(r.budget)}</p>
                </div>
              </div>

              {r.wishes ? (
                <p className="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Пожелания: </span>
                  {r.wishes}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => setActive(r)}>
                  <Send className="size-4" />
                  Предложить тур
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => declineRequest(r.id, organization.id)}
                >
                  <X className="size-4" />
                  Не подходит
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {active ? (
        <OfferDialog
          request={active}
          orgId={organization.id}
          {...(user?.id ? { actorId: user.id } : {})}
          onClose={() => setActive(null)}
        />
      ) : null}
    </DashShell>
  );
}

function OfferDialog({
  request,
  orgId,
  actorId,
  onClose,
}: {
  request: TripRequest;
  orgId: string;
  actorId?: string;
  onClose: () => void;
}) {
  const state = usePlatformStore();
  const myTours = state.tours
    .filter((t) => t.operatorOrgId === orgId && t.status === "active")
    .slice(0, 40);

  const tourHotelIds = useMemo(() => myTours.map((t) => t.hotelId).filter(Boolean), [myTours]);
  const hotelOptions = useMemo(
    () => hotelOptionsForOffer(orgId, request.destinationId, state.hotels ?? [], tourHotelIds),
    [orgId, request.destinationId, state.hotels, tourHotelIds],
  );

  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([]);
  const [customHotel, setCustomHotel] = useState("");
  const [price, setPrice] = useState(request.budget);
  const [nights, setNights] = useState(7);
  const [meal, setMeal] = useState("Всё включено");
  const [included, setIncluded] = useState(DEFAULT_INCLUDED);
  const [comment, setComment] = useState("");
  const [tourId, setTourId] = useState("");

  const toggleHotel = (hotelId: string) => {
    setSelectedHotelIds((prev) =>
      prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId],
    );
  };

  const pickTour = (id: string) => {
    setTourId(id);
    const tour = state.tours.find((t) => t.id === id);
    if (!tour) {
      setSelectedHotelIds([]);
      return;
    }
    const hotel = getHotel(tour.hotelId);
    setSelectedHotelIds(hotel?.id ? [hotel.id] : []);
    setCustomHotel("");
    setPrice(tour.price);
    setNights(tour.nights);
    setMeal(mealPlainLabel(tour.mealCode));
    setIncluded({
      ...DEFAULT_INCLUDED,
      flight: tour.flightIncluded ?? true,
      transfer: Boolean(tour.transfer),
      insurance: tour.insuranceIncluded ?? true,
    });
  };

  const hotelLabel = () => {
    const names = [...selectedHotelIds.map((id) => getHotel(id).name), customHotel.trim()].filter(
      Boolean,
    );
    return names.join(", ");
  };

  const submit = () => {
    const hotelName = hotelLabel();
    if (!hotelName) {
      toast.error("Выберите хотя бы один отель из списка или укажите название вручную");
      return;
    }
    sendOffer({
      requestId: request.id,
      organizationId: orgId,
      ...(tourId ? { tourId } : {}),
      hotelName,
      nights,
      meal,
      flightIncluded: included.flight,
      transferIncluded: included.transfer,
      insuranceIncluded: included.insurance,
      price,
      includes: buildIncludesText(included),
      comment,
      ...(actorId ? { actorId } : {}),
    });
    toast.success("Предложение отправлено туристу");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Предложить тур</DialogTitle>
          <DialogDescription>
            {request.fromCity} → {request.destinationLabel} · {peopleLabel(request)} · бюджет до{" "}
            {formatPrice(request.budget)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="offer-tour">Выбрать из моих туров</Label>
            <select
              id="offer-tour"
              value={tourId}
              onChange={(e) => pickTour(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Создать новое предложение</option>
              {myTours.map((t) => {
                const hotel = getHotel(t.hotelId);
                return (
                  <option key={t.id} value={t.id}>
                    {hotel?.name} · {t.nights} ноч. · {formatPrice(t.price)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <Label>Отели</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Можно выбрать несколько вариантов для туриста
                </p>
              </div>
              {selectedHotelIds.length > 0 ? (
                <span className="text-xs font-medium text-primary">
                  Выбрано: {selectedHotelIds.length}
                </span>
              ) : null}
            </div>

            {selectedHotelIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedHotelIds.map((id) => {
                  const hotel = getHotel(id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1.5">
                      {hotel.name}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-background/80"
                        aria-label={`Убрать ${hotel.name}`}
                        onClick={() => toggleHotel(id)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : null}

            <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
              {hotelOptions.length > 0 ? (
                hotelOptions.map((hotel) => {
                  const active = selectedHotelIds.includes(hotel.id);
                  return (
                    <button
                      key={hotel.id}
                      type="button"
                      onClick={() => toggleHotel(hotel.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-secondary/80",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {active ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{hotel.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="size-3 fill-premium text-premium" />
                            {hotel.stars} · {hotel.rating}
                          </span>
                          {hotel.city}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Нет отелей в каталоге для этого направления. Укажите название ниже.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-custom-hotel">Другой отель</Label>
              <Input
                id="offer-custom-hotel"
                value={customHotel}
                onChange={(e) => setCustomHotel(e.target.value)}
                placeholder="Если нужного отеля нет в списке"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="offer-price">Цена, ₸</Label>
              <MoneyInput id="offer-price" value={price} onChange={setPrice} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-nights">Ночей</Label>
              <Input
                id="offer-nights"
                type="number"
                min={1}
                value={nights}
                onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-meal">Питание</Label>
              <select
                id="offer-meal"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {[
                  "Всё включено",
                  "Всё включено премиум",
                  "Завтраки",
                  "Завтраки и ужины",
                  "Без питания",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Что входит</Label>
            <p className="text-xs text-muted-foreground">
              Отметьте, что входит в цену. Турист увидит это в предложении.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {OFFER_INCLUDE_OPTIONS.map((item) => (
                <Toggle
                  key={item.key}
                  label={item.label}
                  value={included[item.key]}
                  onChange={(next) => setIncluded((prev) => ({ ...prev, [item.key]: next }))}
                />
              ))}
            </div>
            {buildIncludesText(included) ? (
              <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                В предложении: {buildIncludesText(included)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-comment">Комментарий туристу</Label>
            <Textarea
              id="offer-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Есть места на ваши даты, можем забронировать сегодня."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={submit}>
            <Send className="size-4" />
            Отправить туристу
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
      <span>{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}
