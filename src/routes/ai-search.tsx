import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Mic, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { routeTravelIntent } from "@/lib/scenario-router";
import { speechErrorMessage, speechService } from "@/lib/speech-service";
import { seo } from "@/lib/seo";

const examples = [
  "Хочу в Дубай на неделю",
  "Нужна машина в Дубае",
  "Хочу поиграть в падел",
  "Нужен водитель на весь день",
];

export const Route = createFileRoute("/ai-search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" && search["q"].length > 0 ? { q: search["q"] } : {},
  beforeLoad: ({ search }) => {
    const q = search.q?.trim();
    if (!q) return;
    const next = routeTravelIntent(q);
    throw redirect({ to: next.to, search: next.search as never });
  },
  head: () =>
    seo({
      title: "Подбор поездки своими словами",
      description:
        "Опишите поездку обычным языком, и TourGo откроет нужный раздел с подходящими предложениями компаний.",
      path: "/ai-search",
    }),
  component: AiSearchPage,
});

function AiSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);

  const go = (text = query) => {
    const next = text.trim();
    if (!next) return;
    const route = routeTravelIntent(next);
    void navigate({ to: route.to, search: route.search as never });
  };

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
    <SiteLayout>
      <div className="container-page py-8 md:py-14">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          Умный поиск
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-5xl">
          Опишите поездку своими словами
        </h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-foreground/70">
          Напишите или скажите. Откроем туры, жильё, авто, спорт или помощь и покажем цены компаний.
        </p>

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
