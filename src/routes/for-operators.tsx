import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, Building2, Cable, Store, Ticket, Users } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { heroImage } from "@/data/demo";

export const Route = createFileRoute("/for-operators")({
  head: () => ({
    meta: [
      { title: "Для туроператоров — продавайте больше туров | TourGo" },
      {
        name: "description",
        content:
          "Подключите свои туры к маркетплейсу TourGo через API и получайте новых клиентов из нашей аудитории.",
      },
      { property: "og:title", content: "Для туроператоров — TourGo" },
      {
        property: "og:description",
        content: "Продавайте больше туров через единый marketplace.",
      },
    ],
  }),
  component: OperatorsLanding,
});

const flow = [
  { label: "Operator", icon: Building2 },
  { label: "API", icon: Cable },
  { label: "Marketplace", icon: Store },
  { label: "Tourists", icon: Users },
  { label: "Bookings", icon: Ticket },
];

function OperatorsLanding() {
  return (
    <SiteLayout>
      <section className="container-page pt-6">
        <div className="relative overflow-hidden rounded-4xl">
          <img src={heroImage} alt="Морское побережье" className="h-[420px] w-full object-cover" />
          <div className="absolute inset-0 bg-ink/70" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-14">
            <span className="w-fit rounded-full bg-card/15 px-3 py-1 text-xs font-semibold text-primary-foreground">
              Для туроператоров
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold text-primary-foreground md:text-5xl">
              Продавайте больше туров через единый marketplace
            </h1>
            <p className="mt-4 max-w-xl text-primary-foreground/85">
              Подключите свои предложения и получайте новых клиентов из нашей аудитории.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/operator">Подключить компанию</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/operator">Демо кабинета</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page mt-20">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">Как это работает</h2>
        <div className="mt-8 flex flex-col items-center gap-3 md:flex-row md:justify-between">
          {flow.map((step, i) => (
            <div key={step.label} className="flex w-full flex-col items-center gap-3 md:flex-row">
              <div className="surface-card flex w-full items-center gap-3 p-5 md:w-auto md:flex-1">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <step.icon className="size-5" />
                </span>
                <span className="font-display font-semibold">{step.label}</span>
              </div>
              {i < flow.length - 1 ? (
                <ArrowDown className="size-5 shrink-0 text-muted-foreground md:mx-3 md:-rotate-90" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { title: "Единый API", text: "Загружайте туры автоматически и обновляйте цены." },
            { title: "Продвижение", text: "Boost, Featured и Sponsored размещения." },
            { title: "Аналитика", text: "Просмотры, заявки и брони в реальном времени." },
          ].map((item) => (
            <div key={item.title} className="surface-card p-6">
              <h3 className="font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
