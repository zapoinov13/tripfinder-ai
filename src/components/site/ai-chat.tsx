import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, Mic, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { tabBarScrollMarginClass } from "@/components/site/app-tab-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatAction } from "@/lib/ai-action";
import { aiChat } from "@/lib/ai-chat.functions";
import { speechErrorMessage, speechService } from "@/lib/speech-service";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Расскажите, что за поездка: куда, когда, сколько человек и на какой бюджет. Отвечу, что из этого есть на площадке, и покажу где смотреть.",
};

/**
 * Консультант площадки.
 *
 * Отличается от подбора на главной тем, что умеет разговаривать: уточняет,
 * когда человек сам не знает, чего хочет. Отвечает только про то, что на
 * площадке действительно есть, — сводку каталога сервер кладёт в промпт.
 *
 * Под ответом стоит кнопка в нужный раздел. Её адрес собирает наш разбор
 * запроса, а не модель: после хорошего совета упереться в несуществующую
 * страницу — худшее, что может случиться.
 */
export function AiChat({ initialQuery = "" }: { initialQuery?: string }) {
  const send = useServerFn(aiChat);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
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
      setError("Консультант сейчас не отвечает. Попробуйте ещё раз или найдите сами через поиск.");
    } finally {
      setPending(false);
    }
  };

  const listen = async () => {
    if (listening || pending) return;
    setListening(true);
    try {
      const result = await speechService.start();
      await ask(result.text);
    } catch (err) {
      toast.error(speechErrorMessage(err));
    } finally {
      setListening(false);
    }
  };

  useEffect(() => {
    if (startedRef.current || !initialQuery.trim()) return;
    startedRef.current = true;
    void ask(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    // «nearest»: прокручиваем ленту сообщений, но не тащим всю страницу —
    // иначе поле ввода уезжает под нижнюю панель телефона.
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  // Кнопка появляется, когда человек уже сказал, чего хочет: до этого вести
  // его некуда, а пустая кнопка «посмотреть» только мешает.
  const action = useMemo(
    () => chatAction(messages.filter((m) => m.role === "user").map((m) => m.content)),
    [messages],
  );
  const answered = messages.length > 1 && messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-4 py-3 md:px-5 md:py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ai text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">Консультант TourGo</p>
          <p className="text-xs text-muted-foreground">Подскажет по тому, что есть на площадке</p>
        </div>
      </div>

      <div className="max-h-[52vh] min-h-[220px] space-y-3 overflow-y-auto p-4 md:p-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
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
            <Loader2 className="size-4 animate-spin" /> Думаю…
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {action && answered && !pending ? (
          <div className="pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void navigate({ to: action.to, search: action.search as never })}
            >
              {action.label}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        className={cn(
          "flex items-center gap-2 border-t border-border px-3 py-3 md:px-4",
          tabBarScrollMarginClass,
        )}
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 rounded-full"
          aria-label="Сказать голосом"
          onClick={() => void listen()}
          disabled={pending}
        >
          <Mic className={listening ? "size-4 animate-pulse text-primary" : "size-4"} />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Например: Дубай в ноябре вдвоём"
          aria-label="Сообщение консультанту"
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
