import { CalendarClock } from "lucide-react";
import { useState } from "react";
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
import { PhoneInput, parsePhoneDigits } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/platform/auth";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  listingId?: string;
  listingName?: string;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("");
  const [people, setPeople] = useState(1);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = name.trim().length > 1 && parsePhoneDigits(phone).length >= 11 && Boolean(date);

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
      date,
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
