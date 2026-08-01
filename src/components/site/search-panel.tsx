import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, MapPin, Mic, Search, SlidersHorizontal, Sparkles, Users, Wallet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const fields = [
  { label: "Откуда", value: "Алматы", icon: MapPin },
  { label: "Куда", value: "Дубай", icon: MapPin },
  { label: "Дата", value: "10–17 августа", icon: CalendarDays },
  { label: "Туристы", value: "2 взрослых + 2 детей", icon: Users },
  { label: "Бюджет", value: "до 1 500 000 ₸", icon: Wallet },
];

export function SearchPanel() {
  const [tab, setTab] = useState<"classic" | "ai">("classic");
  const navigate = useNavigate();
  const goSearch = () => navigate({ to: "/search" });

  return (
    <div className="surface-card overflow-hidden p-2 shadow-lift">
      <div className="flex gap-1 rounded-2xl bg-secondary/70 p-1">
        <button
          type="button"
          onClick={() => setTab("classic")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
            tab === "classic" ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
          )}
        >
          Найти тур
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
            tab === "ai" ? "gradient-ai text-primary-foreground shadow-card" : "text-muted-foreground",
          )}
        >
          ✨ Найти с AI
        </button>
      </div>

      {tab === "classic" ? (
        <div className="p-3 md:p-4">
          <div className="grid gap-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
            {fields.map((field) => (
              <label
                key={field.label}
                className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary/40"
              >
                <field.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </span>
                  <span className="block truncate text-sm font-medium">{field.value}</span>
                </span>
              </label>
            ))}
            <Button size="lg" className="h-full min-h-13 rounded-2xl px-7" onClick={goSearch}>
              <Search className="size-4" />
              Найти туры
            </Button>
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
            Расширенные фильтры
          </button>
        </div>
      ) : (
        <div className="p-3 md:p-4">
          <div className="relative rounded-2xl border border-ai/25 bg-ai/[0.04] p-3">
            <Textarea
              placeholder="Например: хочу из Алматы в Дубай на неделю с женой и двумя детьми. Бюджет до 1,5 млн ₸, всё включено, рядом с морем..."
              className="min-h-32 resize-none border-0 bg-transparent pr-12 text-base shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              aria-label="Голосовой ввод"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-card text-ai shadow-card"
            >
              <Mic className="size-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="gradient-ai mt-3 w-full rounded-2xl text-primary-foreground hover:opacity-90"
            onClick={goSearch}
          >
            <Sparkles className="size-4" />
            Найти подходящий тур
          </Button>
        </div>
      )}
    </div>
  );
}