import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { availableSlots, bookableDates, scheduleActive } from "@/lib/platform/booking-slots";
import {
  formatServiceRequestWhen,
  rescheduleServiceRequest,
} from "@/lib/platform/service-requests";
import type { Organization, ServiceRequest } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

/**
 * Перенос записи компанией. При включённом расписании предлагаем свободные
 * слоты, иначе даём выбрать дату и время руками.
 */
export function ServiceRescheduleDialog({
  open,
  onOpenChange,
  request,
  organization,
  actorId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ServiceRequest;
  organization: Organization;
  actorId: string;
}) {
  const bySlots = scheduleActive(organization);
  const openDates = useMemo(
    () => (bySlots ? bookableDates(organization) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bySlots, organization.id],
  );
  const [date, setDate] = useState(request.date);
  const [time, setTime] = useState(request.time);

  const effectiveDate = bySlots ? (openDates.includes(date) ? date : (openDates[0] ?? "")) : date;
  const slots = useMemo(
    () => (bySlots && effectiveDate ? availableSlots(organization, effectiveDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bySlots, organization.id, effectiveDate],
  );

  const changed = effectiveDate !== request.date || time !== request.time;

  const submit = () => {
    if (!effectiveDate || !time || !changed) return;
    rescheduleServiceRequest(request.id, effectiveDate, time, {
      actorId,
      organizationName: organization.name,
    });
    onOpenChange(false);
    toast.success(`Перенесено на ${formatServiceRequestWhen(effectiveDate, time)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Перенести запись</DialogTitle>
          <DialogDescription>
            {request.contactName || "Клиент"} · сейчас{" "}
            {formatServiceRequestWhen(request.date, request.time)}. Клиенту придёт уведомление.
          </DialogDescription>
        </DialogHeader>

        {bySlots ? (
          openDates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
              Свободных слотов нет. Освободите время в расписании или согласуйте в переписке.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Дата</Label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {openDates.slice(0, 14).map((d) => {
                    const day = new Date(`${d}T00:00:00`);
                    const on = d === effectiveDate;
                    return (
                      <button
                        key={d}
                        type="button"
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
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rs-date">Дата</Label>
              <Input
                id="rs-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-time">Время</Label>
              <Input
                id="rs-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={!changed || !time || !effectiveDate}>
            Перенести
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
