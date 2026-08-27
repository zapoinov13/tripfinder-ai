import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

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
import { PhoneInput, parsePhoneDigits } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/platform/auth";
import {
  availableSlots,
  bookableDates,
  isoDate,
  scheduleActive,
} from "@/lib/platform/booking-slots";
import { usePlatformStore } from "@/lib/platform/hooks";
import { createServiceRequest } from "@/lib/platform/service-requests";

/** Ближайшая дата по умолчанию — сегодня. */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function ServiceRequestDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  listingId,
  listingName,
  initialDate,
  initialTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  listingId?: string;
  initialDate?: string;
  initialTime?: string;
  listingName?: string;
}) {
  const { user } = useAuth();
  const state = usePlatformStore();
  const org = state.organizations.find((o) => o.id === organizationId);
  // Расписание задано — предлагаем свободные слоты, иначе прежний ручной ввод.
  const bySlots = scheduleActive(org);
  const openDates = useMemo(
    () => (bySlots && org ? bookableDates(org) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bySlots, org?.id, state.serviceRequests],
  );
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(initialDate ?? todayIso());
  const effectiveDate = bySlots ? (openDates.includes(date) ? date : (openDates[0] ?? "")) : date;
  const [time, setTime] = useState(initialTime ?? "");
  const [people, setPeople] = useState(1);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const slots = useMemo(
    () => (bySlots && org && effectiveDate ? availableSlots(org, effectiveDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bySlots, org?.id, effectiveDate, state.serviceRequests],
  );

  const canSend =
    name.trim().length > 1 &&
    parsePhoneDigits(phone).length >= 11 &&
    Boolean(effectiveDate) &&
    (!bySlots || Boolean(time));

  const submit = () => {
    if (!canSend || sending) return;
    setSending(true);
    createServiceRequest({
      organizationId,
      organizationName,
      ...(user ? { userId: user.id } : {}),
      ...(listingId ? { listingId } : {}),
      listingName: listingName ?? "",
      contactName: name,
      contactPhone: phone,
      date: effectiveDate,
      time,
      people,
      comment,
    });
    setSending(false);
    onOpenChange(false);
    setComment("");
    toast.success("Заявка отправлена — компания свяжется с вами");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            Оставить заявку
          </DialogTitle>
          <DialogDescription>
            {listingName ? `${listingName} · ` : ""}
            {organizationName} получит вашу заявку и свяжется по телефону.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sr-name">Как к вам обращаться</Label>
            <Input
              id="sr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Данияр"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-phone">Телефон</Label>
            <PhoneInput id="sr-phone" value={phone} onChange={setPhone} />
          </div>
          {bySlots ? (
            openDates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                Свободных слотов на ближайшие дни нет. Напишите компании — подберут время.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="sr-date">Дата</Label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {openDates.slice(0, 14).map((d) => {
                      const day = new Date(`${d}T00:00:00`);
                      const on = d === effectiveDate;
                      return (
                        <button
                          key={d}
                          type="button"
                          id={on ? "sr-date" : undefined}
                          onClick={() => {
                            setDate(d);
                            setTime("");
                          }}
                          className={cn(
                            "shrink-0 rounded-xl px-3 py-2 text-center",
                            on ? "bg-ink text-primary-foreground" : "bg-secondary",
                          )}
                        >
                          <span className="block text-[11px] uppercase opacity-70">
                            {day.toLocaleDateString("ru-RU", { weekday: "short" })}
                          </span>
                          <span className="block text-sm font-semibold">
                            {day.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Время</Label>
                  {slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      На этот день слотов не осталось — выберите другую дату.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.full}
                          onClick={() => setTime(slot.time)}
                          title={slot.full ? "Занято" : `Свободно мест: ${slot.left}`}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-sm font-medium",
                            slot.full
                              ? "cursor-not-allowed bg-secondary/50 text-muted-foreground/50 line-through"
                              : slot.time === time
                                ? "bg-ink text-primary-foreground"
                                : "bg-secondary",
                          )}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sr-date">Дата</Label>
                <Input
                  id="sr-date"
                  type="date"
                  value={date}
                  min={todayIso()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-time">Время</Label>
                <Input
                  id="sr-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="sr-people">Сколько человек</Label>
            <Input
              id="sr-people"
              type="number"
              min={1}
              max={50}
              value={people}
              onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-comment">Комментарий</Label>
            <Textarea
              id="sr-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: первый раз, нужен тренер"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={!canSend || sending}>
            Отправить заявку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
