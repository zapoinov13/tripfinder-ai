import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";

import { AiIntentBar } from "@/components/site/ai-intent-bar";
import { SiteLayout } from "@/components/site/site-layout";
import { b2bNav, travelScenarios } from "@/data/scenarios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TourGo: туры, экскурсии, жильё, авто и помощь в поездке" },
      {
        name: "description",
        content: "Всё для путешествия в одном месте. Выберите, что нужно — и ищите внутри раздела.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <section className="container-page py-8 md:py-14">
        <h1 className="font-display text-4xl font-semibold leading-[1.12] tracking-tight md:text-6xl">
          Что вам нужно?
        </h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-foreground/70 md:text-xl">
          Всё для путешествия в одном месте
        </p>

        <div className="mt-6 max-w-2xl">
          <AiIntentBar />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-3 md:gap-4">
          {travelScenarios.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              search={{} as never}
              className="hover-lift surface-card flex min-h-[9.5rem] flex-col justify-between p-4 md:min-h-[11.5rem] md:p-6"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary md:size-14">
                <item.icon className="size-6 md:size-7" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-snug md:text-2xl">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-foreground/65 md:text-base">
                  {item.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>

        <Link
          to={b2bNav.to}
          className="mt-6 flex items-center justify-between gap-4 rounded-[1.75rem] bg-ink px-5 py-5 text-primary-foreground md:mt-8 md:px-8 md:py-6"
        >
          <span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
              <Building2 className="size-4" />
              {b2bNav.title}
            </span>
            <span className="mt-2 block font-display text-xl font-semibold leading-snug md:text-2xl">
              Вы туристическая компания?
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              {b2bNav.hint}
            </span>
          </span>
          <ArrowRight className="size-6 shrink-0" />
        </Link>
      </section>
    </SiteLayout>
  );
}
