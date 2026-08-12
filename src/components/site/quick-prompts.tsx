import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export const quickPrompts = [
  {
    label: "Дубай на выходные",
    query:
      "Хочу из Алматы в Дубай на выходные, двое взрослых, бюджет до 900 000 ₸, отель 5 звёзд рядом с морем",
  },
  {
    label: "Турция с детьми",
    query:
      "Хотим из Алматы в Турцию на 10 ночей, двое взрослых и двое детей 5 и 9 лет, всё включено, первая линия, до 1 800 000 ₸",
  },
  {
    label: "Мальдивы вдвоём",
    query:
      "Мальдивы на 7 ночей вдвоём, тихий отель у моря без вечеринок, завтраки, бюджет до 2 500 000 ₸",
  },
  {
    label: "Египет в декабре",
    query:
      "Египет в декабре на 7 ночей, двое взрослых, всё включено, хороший риф для снорклинга, до 1 200 000 ₸",
  },
  {
    label: "Бали на 10 ночей",
    query: "Бали на 10 ночей вдвоём, бутик-отель, завтраки, спокойный район, бюджет до 2 000 000 ₸",
  },
];

export function QuickPrompts({
  variant = "light",
  className,
}: {
  variant?: "light" | "onImage";
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 no-scrollbar", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium",
          variant === "onImage"
            ? "bg-primary-foreground/10 text-primary-foreground/80 backdrop-blur-md"
            : "bg-ai/10 text-ai",
        )}
      >
        <Sparkles className="size-3.5" />
        Спросите AI
      </span>
      {quickPrompts.map((prompt) => (
        <Link
          key={prompt.label}
          to="/ai-search"
          search={{ q: prompt.query }}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors",
            variant === "onImage"
              ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground backdrop-blur-md hover:bg-primary-foreground/20"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary",
          )}
        >
          {prompt.label}
        </Link>
      ))}
    </div>
  );
}
