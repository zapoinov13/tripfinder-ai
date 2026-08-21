import { Link } from "@tanstack/react-router";
import { Plane, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatPrice, getHotel, hotTours } from "@/data/demo";
import { cn } from "@/lib/utils";

const script = [
  {
    from: "user" as const,
    text: "Хочу в Дубай в августе на двоих, тихий отель у моря, бюджет 1,3 млн ₸",
    time: "9:38",
  },
  {
    from: "ai" as const,
    text: "Понял: Алматы → Дубай, 7 ночей, 2 взрослых, до 1 300 000 ₸. Питание: всё включено?",
    time: "9:38",
  },
  { from: "user" as const, text: "Да, и первая линия", time: "9:39" },
  {
    from: "ai" as const,
    text: "Нашёл 18 предложений от 4 поставщиков. Лучшее совпадение:",
    time: "9:39",
  },
];

export function ChatDemo() {
  const [visible, setVisible] = useState(1);
  const tour = hotTours[0];
  const hotel = tour ? getHotel(tour.hotelId) : null;

  useEffect(() => {
    if (visible >= script.length) return;
    const timer = setTimeout(() => setVisible((n) => n + 1), 900);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-5 py-4">
        <span className="grid size-9 place-items-center rounded-xl bg-ai text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">TourGo AI</p>
          <p className="text-xs text-success">● онлайн · отвечает за секунды</p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {script.slice(0, visible).map((msg, i) => (
          <div
            key={i}
            className={cn(
              "animate-fade-up flex",
              msg.from === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                msg.from === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
              )}
            >
              {msg.text}
              <span
                className={cn(
                  "mt-1 block text-[10px]",
                  msg.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {visible >= script.length && tour && hotel ? (
          <div className="animate-fade-up overflow-hidden rounded-2xl border border-border">
            <div className="flex gap-3 p-3">
              <img
                src={hotel.image}
                alt={hotel.name}
                loading="lazy"
                className="size-20 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">{hotel.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hotel.flag} {hotel.city} · {tour.nights} ночей · {tour.meal}
                </p>
                <p className="mt-1.5 font-display text-base font-semibold">
                  {formatPrice(tour.price)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-border p-3">
              <Button size="sm" className="flex-1" asChild>
                <Link to="/tour/$tourId" params={{ tourId: tour.id }}>
                  Открыть тур
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/ai-search">Ещё варианты</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <span className="flex-1 truncate rounded-full bg-secondary px-4 py-2 text-sm text-muted-foreground">
          Опишите поездку своими словами…
        </span>
        <Button size="icon" className="shrink-0 rounded-full" asChild>
          <Link to="/ai-search" aria-label="Открыть AI-поиск">
            <Send className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ChatDemoFeatures() {
  const items = [
    {
      title: "Обычный язык",
      text: "«Тихо, у моря, без вечеринок»: AI понимает смысл, а не только теги.",
    },
    {
      title: "Помнит контекст",
      text: "Уточняет детали и продолжает с того места, где вы остановились.",
    },
    {
      title: "Сразу подборка",
      text: "Из запроса собираются параметры поиска и предложения от разных поставщиков.",
    },
    {
      title: "Можно голосом",
      text: "Расскажите идею вслух, распознаем и превратим в поиск.",
    },
  ];

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.title} className="flex gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Plane className="size-4" />
          </span>
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
