import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mic, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AiChat } from "@/components/site/ai-chat";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { aiChatStatus } from "@/lib/ai-chat.functions";
import { routeTravelIntent } from "@/lib/scenario-router";
import { speechErrorMessage, speechService } from "@/lib/speech-service";
import { seo } from "@/lib/seo";

const examples = [
  "Хочу в Дубай на неделю",
  "Нужна машина в Дубае",
  "Что посмотреть с детьми",
  "Нужен водитель на весь день",
];

export const Route = createFileRoute("/ai-search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" && search["q"].length > 0 ? { q: search["q"] } : {},
  // Состояние консультанта нужно знать до первой отрисовки: показать поле для
  // чата, который ответит «ключ не задан», — значит обмануть человека.
  loader: () => aiChatStatus(),
  head: () =>
    seo({
      title: "Подбор тура по описанию: расскажите, куда хотите",
      description:
        "Напишите обычными словами — «Дубай в ноябре на двоих до миллиона» — и получите готовую подборку туров, экскурсий и жилья от компаний.",
      path: "/ai-search",
    }),
  component: AiSearchPage,
});

/**
 * Консультант площадки.
 *
 * Раньше страница только перекидывала на результаты: человек нажимал
 * «Спросить AI», и его молча уносило в отфильтрованный список — спросить было
 * не у кого. Теперь здесь разговор: консультант уточняет, что нужно, и
 * отвечает по тому, что на площадке действительно есть.
 *
 * Если консультант выключен или без ключа, страница работает как прежде —
 * разбирает фразу и открывает нужный раздел. Мёртвой она не бывает.
 */
function AiSearchPage() {
  const { available } = Route.useLoaderData();
  const { q } = Route.useSearch();

  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-14">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          {available ? "Консультант" : "Умный поиск"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-5xl">
          {available ? "Спросите, как у знакомого в поездке" : "Опишите поездку своими словами"}
        </h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-foreground/70">
          {available
            ? "Расскажите, чего хотите. Подскажу, что из этого есть у компаний площадки, и открою нужный раздел."
            : "Напишите или скажите. Откроем туры, жильё, авто, спорт или помощь и покажем цены компаний."}
        </p>

        {available ? (
          <Consultant initialQuery={q ?? ""} />
        ) : (
          <InstantSearch initialQuery={q ?? ""} />
        )}

        <p className="mt-10 text-sm text-foreground/60">
          Или выберите раздел на{" "}
          <Link to="/" className="font-semibold text-primary">
            главной
          </Link>
          .
        </p>
      </div>
    </SiteLayout>
  );
}

function Consultant({ initialQuery }: { initialQuery: string }) {
  // Пример подставляем в поле разговора, а не открываем отдельной страницей:
  // человек пришёл спросить, а не листать.
  const [seed, setSeed] = useState(initialQuery);
  const [chatKey, setChatKey] = useState(0);

  return (
    <>
      <div className="mt-6">
        <AiChat key={chatKey} initialQuery={seed} />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground/70">С чего начать</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSeed(item);
                // Новый ключ начинает разговор заново: дописывать чужой пример
                // в середину диалога — путать и себя, и модель.
                setChatKey((k) => k + 1);
              }}
              className="rounded-full border border-border bg-card px-3.5 py-2 text-sm hover:border-primary/40"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/** Запасной вид страницы: тот же разбор фразы, что и раньше, без модели. */
function InstantSearch({ initialQuery }: { initialQuery: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [listening, setListening] = useState(false);

  const go = (text = query) => {
    const next = text.trim();
    if (!next) return;
    const route = routeTravelIntent(next);
    void navigate({ to: route.to, search: route.search as never });
  };

  // Человек нажал «Спросите AI» с готовым вопросом, а консультант выключен —
  // не бросаем его на странице, а сразу открываем подходящий раздел.
  useEffect(() => {
    if (!initialQuery.trim()) return;
    const route = routeTravelIntent(initialQuery);
    void navigate({ to: route.to, search: route.search as never });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const listen = async () => {
    if (listening) return;
    setListening(true);
    try {
      const result = await speechService.start();
      setQuery(result.text);
      go(result.text);
    } catch (error) {
      toast.error(speechErrorMessage(error));
    } finally {
      setListening(false);
    }
  };

  return (
    <>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter отправляет запрос; перенос строки остаётся на Shift+Enter.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                go();
              }
            }}
            rows={3}
            placeholder="Например: хочу в Дубай на неделю"
            className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-base shadow-sm outline-none focus:border-primary"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-12 shrink-0 rounded-2xl"
            aria-label="Сказать голосом"
            onClick={() => void listen()}
          >
            <Mic className={listening ? "size-5 animate-pulse text-primary" : "size-5"} />
          </Button>
        </div>
        <Button className="mt-3 w-full md:w-auto" size="lg" type="submit">
          Найти
        </Button>
      </form>

      <div className="mt-8">
        <p className="text-sm font-semibold text-foreground/70">Примеры</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              className="rounded-full border border-border bg-card px-3.5 py-2 text-sm hover:border-primary/40"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
