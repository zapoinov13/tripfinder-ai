import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiChat } from "@/lib/ai-chat.functions";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Привет! Я TourGo AI. Опишите поездку своими словами — город вылета, направление, даты, сколько туристов и бюджет.",
};

export function AiChat({ initialQuery = "" }: { initialQuery?: string }) {
  const send = useServerFn(aiChat);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);
    try {
      const res = await send({
        data: { messages: next.filter((m) => m !== GREETING).slice(-12) },
      });
      if (res.ok) setMessages([...next, { role: "assistant", content: res.text }]);
      else setError(res.error);
    } catch {
      setError("Сервис AI временно недоступен");
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (startedRef.current || !initialQuery.trim()) return;
    startedRef.current = true;
    void ask(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-5 py-4">
        <span className="grid size-9 place-items-center rounded-xl bg-ai text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">TourGo AI</p>
          <p className="text-xs text-muted-foreground">Живой чат с travel-консьержем</p>
        </div>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto p-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {pending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> TourGo AI печатает…
          </div>
        ) : null}
        {error ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-border px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Опишите поездку своими словами…"
          aria-label="Сообщение AI-консьержу"
          className="rounded-full"
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 rounded-full"
          disabled={pending || !input.trim()}
          aria-label="Отправить"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
