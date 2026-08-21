import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  excursionCategories,
  excursions,
  formatAed,
  type ExcursionCategory,
} from "@/data/excursions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/excursions")({
  head: () => ({
    meta: [
      { title: "Экскурсии и развлечения — TourGo" },
      {
        name: "description",
        content:
          "Экскурсии, развлечения, морские прогулки и трансферы в Дубае и Абу-Даби. Оставьте заявку — турфирмы предложат варианты.",
      },
    ],
  }),
  component: ExcursionsPage,
});

function ExcursionsPage() {
  const [category, setCategory] = useState<ExcursionCategory | "Все">("Все");
  const list = excursions.filter((e) => category === "Все" || e.category === category);

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Экскурсии и развлечения</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Выберите готовую программу или оставьте заявку — туристические компании предложат свои
          варианты и цены.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["Все", ...excursionCategories] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <article key={e.id} className="surface-card overflow-hidden">
              <img src={e.image} alt="" className="h-44 w-full object-cover" loading="lazy" />
              <div className="p-5">
                <Badge className="bg-secondary text-muted-foreground">{e.category}</Badge>
                <h2 className="mt-2 font-display text-lg font-semibold">{e.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {e.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {e.duration}
                  </span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{e.summary}</p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {e.includes.slice(0, 3).map((inc) => (
                    <li key={inc}>· {inc}</li>
                  ))}
                </ul>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold">{formatAed(e.price)}</p>
                    <p className="text-xs text-muted-foreground">от {e.company}</p>
                  </div>
                  <Button size="sm" asChild>
                    <Link
                      to="/request"
                      search={{ kind: "assistance", destination: e.destinationId }}
                    >
                      Оставить заявку
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="surface-card mt-10 flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Sparkles className="size-5 text-ai" />
              Не нашли нужное?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Опишите, что хотите: сафари для семьи из пяти человек, яхта на вечер, поездка в
              Абу-Даби. Туристические компании предложат варианты и цены.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/request" search={{ kind: "assistance" }}>
              Оставить заявку
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
