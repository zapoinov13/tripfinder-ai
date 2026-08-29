import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { buildAiChips, parseTravelQuery, parsedQueryToSearch } from "@/lib/ai-search";
import { usePlatformSelector } from "@/lib/platform/hooks";
import { searchService } from "@/lib/platform/search-service";
import { cn } from "@/lib/utils";

/**
 * Интерактивный AI-поиск на демо-логике: текст разбирается локальным парсером
 * (parseTravelQuery), подсказки подстраиваются под то, чего в запросе не хватает,
 * а туры подбираются тем же SearchService, что и на странице /search.
 */
export function AiSearchWidget() {
  // Подписка на каталог, чтобы после hydrate результаты пересчитались.
  const catalogKey = usePlatformSelector((s) => s.tours.length);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");

  // Дебаунс: парсер и поиск не должны дёргаться на каждый символ.
  useEffect(() => {
    const t = setTimeout(() => setQuery(draft), 300);
    return () => clearTimeout(t);
  }, [draft]);

  const trimmed = query.trim();
  const active = trimmed.length >= 3;

  const parsed = useMemo(
    () => (active ? parseTravelQuery(trimmed) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, trimmed, catalogKey],
  );

  const chips = useMemo(() => {
    if (!parsed) return [];
    return buildAiChips(parsed).filter((chip) => {
      if (chip.key === "origin") return parsed.detected.origin;
      if (chip.key === "adults") return parsed.detected.adults;
      if (chip.key === "children" || chip.key === "childAges") return parsed.detected.children;
      if (chip.key === "duration") return parsed.detected.duration;
      if (chip.key === "budgetMax") return parsed.detected.budget;
      return Boolean(chip.value);
    });
  }, [parsed]);

  const results = useMemo(() => {
    if (!parsed) return [];
    const params = parsedQueryToSearch(parsed);
    // Показываем только то, что компании действительно продают. Подставлять
    // сюда демо-каталог нельзя: человек откроет карточку тура, которого нет,
    // напишет по нему компании и не получит ответа — это хуже пустого ответа.
    return searchService.search(params as Record<string, unknown>).slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, catalogKey]);

  const allLink = parsed ? parsedQueryToSearch(parsed) : {};

  // Контекстные подсказки: предлагаем дописать то, чего запросу не хватает.
  const refinements = useMemo(() => {
    if (!parsed) return [];
    const out: string[] = [];
    if (!parsed.destination) out.push("Дубай", "Турция", "Египет", "Мальдивы");
    if (!parsed.meals.length) out.push("всё включено", "завтрак");
    if (!parsed.detected.duration) out.push("на 7 дней", "на 10 дней");
    if (!parsed.detected.budget) out.push("до 800 000 ₸", "до 1.5 млн ₸");
    if (!parsed.detected.children) out.push("с детьми");
    if (!parsed.preferences.includes("near_sea")) out.push("первая линия");
    return out.slice(0, 6);
  }, [parsed]);

  return (
    <section
      // z-10: карточка лежит поверх обложки, иначе картинка срезает ей шапку.
      className="container-page relative z-10 -mt-4 md:mt-10"
      aria-label="AI-подбор туров"
    >
      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-4 py-3 md:px-6 md:py-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ai text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          {/* Подпись не обрезаем: половина фразы хуже, чем её отсутствие. */}
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold md:text-lg">AI-подбор поездки</h2>
            <p className="text-xs text-muted-foreground md:text-sm">Опишите словами — найдём</p>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 shadow-sm focus-within:border-primary"
          >
            <Wand2 className="size-4 shrink-0 text-ai" aria-hidden />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Например: Дубай на неделю"
              aria-label="Опишите поездку"
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </form>

          {parsed ? (
            <>
              {chips.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((chip, i) => (
                    <span
                      key={`${chip.key}-${i}`}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground"
                    >
                      <span className="text-muted-foreground">{chip.label}: </span>
                      {chip.value}
                    </span>
                  ))}
                </div>
              ) : null}

              {refinements.length ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Уточните запрос:</p>
                  <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {refinements.map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => setDraft((current) => `${current.trim()} ${hint}`.trim())}
                        className="shrink-0 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3.5 py-1.5 text-[13px] text-primary hover:bg-primary/10"
                      >
                        + {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    Подходящие туры{results.length ? ` · ${results.length}` : ""}
                  </p>
                  <Link
                    to="/search"
                    search={allLink as never}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
                  >
                    Все варианты <ArrowRight className="size-4" />
                  </Link>
                </div>

                {results.length ? (
                  <div
                    className={cn(
                      "mt-3 grid gap-3",
                      results.length > 1 ? "md:grid-cols-2" : "",
                      results.length > 2 ? "lg:grid-cols-3" : "",
                    )}
                  >
                    {results.map((tour) => (
                      <TourCard key={tour.id} tour={tour} />
                    ))}
                  </div>
                ) : (
                  /* Пустой ответ — не тупик: заявка работает и тогда, когда
                     готового предложения в каталоге ещё нет. Турфирмы
                     соберут вариант под запрос и пришлют цену сами. */
                  <div className="mt-3 rounded-2xl bg-secondary/60 p-4">
                    <p className="text-sm font-medium">
                      Готового такого тура сейчас нет в каталоге
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Отправьте описание турфирмам — они соберут вариант под ваш запрос и пришлют
                      цену. Обычно отвечают в течение дня.
                    </p>
                    <Button className="mt-3 h-11 w-full sm:w-auto" asChild>
                      <Link
                        to="/request"
                        search={
                          {
                            ...(parsed.destination ? { destination: parsed.destination } : {}),
                            wish: trimmed,
                          } as never
                        }
                      >
                        Отправить запрос турфирмам
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
