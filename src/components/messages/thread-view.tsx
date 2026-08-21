import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { markThreadRead, sendMessage } from "@/lib/platform/messages";
import type { RequestMessage } from "@/lib/platform/types";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ThreadView({
  requestId,
  organizationId,
  touristId,
  side,
  authorName,
  messages,
  placeholder,
  className,
}: {
  requestId: string;
  organizationId: string;
  touristId: string;
  side: RequestMessage["authorSide"];
  authorName: string;
  messages: RequestMessage[];
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markThreadRead(requestId, organizationId, side);
  }, [requestId, organizationId, side, messages.length]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const submit = () => {
    if (!text.trim()) return;
    sendMessage({ requestId, organizationId, touristId, authorSide: side, authorName, text });
    setText("");
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="max-h-[420px] flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            {side === "TOURIST"
              ? "Напишите турфирме, если нужно уточнить условия: отель, питание, доплаты за детей."
              : "Напишите туристу первым: уточните детали или предложите альтернативу."}
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.authorSide === side ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  m.authorSide === side
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    m.authorSide === side ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {m.authorName} · {fmtTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder={placeholder ?? "Ваше сообщение…"}
          className="min-h-11 resize-none"
        />
        <Button onClick={submit} disabled={!text.trim()}>
          <Send className="size-4" />
          Отправить
        </Button>
      </div>
    </div>
  );
}
