import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Send, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, getHotel } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { mealPlainLabel, peopleLabel, declineRequest, sendOffer } from "@/lib/platform/requests";
import type { TripRequest } from "@/lib/platform/types";

export const Route = createFileRoute("/operator/requests")({
  head: () => ({ meta: [{ title: "Заявки туристов — TourGo" }] }),
  component: OperatorRequestsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

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
                    {fmtDate(r.dateStart)} — {fmtDate(r.dateEnd)} · {peopleLabel(r)}
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

  const [hotelName, setHotelName] = useState("");
  const [price, setPrice] = useState(request.budget);
  const [nights, setNights] = useState(7);
  const [meal, setMeal] = useState("Всё включено");
  const [flight, setFlight] = useState(true);
  const [transfer, setTransfer] = useState(true);
  const [insurance, setInsurance] = useState(true);
  const [includes, setIncludes] = useState("Перелёт, проживание, питание, страховка");
  const [comment, setComment] = useState("");
  const [tourId, setTourId] = useState("");

  const pickTour = (id: string) => {
    setTourId(id);
    const tour = state.tours.find((t) => t.id === id);
    if (!tour) return;
    const hotel = getHotel(tour.hotelId);
    setHotelName(hotel?.name ?? "");
    setPrice(tour.price);
    setNights(tour.nights);
    setMeal(mealPlainLabel(tour.mealCode));
  };

  const submit = () => {
    if (!hotelName.trim()) {
      toast.error("Укажите отель — турист сравнивает предложения по отелю и цене");
      return;
    }
    sendOffer({
      requestId: request.id,
      organizationId: orgId,
      ...(tourId ? { tourId } : {}),
      hotelName: hotelName.trim(),
      nights,
      meal,
      flightIncluded: flight,
      transferIncluded: transfer,
      insuranceIncluded: insurance,
      price,
      includes,
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offer-hotel">Отель</Label>
              <Input
                id="offer-hotel"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Rixos Premium Dubai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-price">Цена, ₸</Label>
              <Input
                id="offer-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
              />
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

          <div className="grid gap-3 sm:grid-cols-3">
            <Toggle label="Перелёт включён" value={flight} onChange={setFlight} />
            <Toggle label="Трансфер включён" value={transfer} onChange={setTransfer} />
            <Toggle label="Страховка включена" value={insurance} onChange={setInsurance} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-includes">Что входит</Label>
            <Input
              id="offer-includes"
              value={includes}
              onChange={(e) => setIncludes(e.target.value)}
            />
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
