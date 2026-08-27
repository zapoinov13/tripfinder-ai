import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  formatServiceRequestWhen,
  markServiceThreadRead,
  sendServiceMessage,
} from "@/lib/platform/service-requests";
import type { ServiceRequest } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Переписка по заявке: одна и та же для клиента и для компании,
 * отличается только сторона (`side`).
 */
export function ServiceChatDialog({
  open,
  onOpenChange,
  request,
  side,
  authorId,
  authorName,
  organizationName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ServiceRequest;
  side: "CLIENT" | "COMPANY";
  authorId: string;
  authorName: string;
  organizationName: string;
}) {
  const state = usePlatformStore();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const messages = state.serviceMessages
    .filter((m) => m.requestId === request.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Открыли тред — чужие сообщения считаются прочитанными.
  useEffect(() => {
    if (open) markServiceThreadRead(request.id, side);
  }, [open, request.id, side, messages.length]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages.length]);

  const submit = () => {
    if (!text.trim()) return;
    sendServiceMessage({
      request,
      authorId,
      authorName,
      authorSide: side,
      text,
      organizationName,
    });
    setText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {side === "CLIENT" ? organizationName : request.contactName || "Клиент"}
          </DialogTitle>
          <DialogDescription>
            {formatServiceRequestWhen(request.date, request.time)}
            {request.listingName ? ` · ${request.listingName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-secondary/30 p-3">
          {messages.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {side === "CLIENT"
                ? "Напишите компании — уточните время, цену или условия."
                : "Напишите клиенту — подтвердите время или задайте вопрос."}
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.authorSide === side;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2",
                      mine ? "bg-primary text-primary-foreground" : "bg-background",
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        mine ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {m.authorName} · {timeFmt.format(new Date(m.createdAt))}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <Button onClick={submit} disabled={!text.trim()} aria-label="Отправить">
            <Send className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
