import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, Building2, Cable, Store, Ticket, Users } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { heroImage } from "@/data/demo";

export const Route = createFileRoute("/for-operators")({
  head: () => ({
    meta: [
      { title: "Для поставщиков — подключите предложения | TourGo" },
      {
        name: "description",
        content:
          "Подключите отели, туры, экскурсии, яхты и трансферы к TourGo и получайте русскоязычных туристов из СНГ. Первое направление запуска — Дубай.",
      },
      { property: "og:title", content: "Для поставщиков — TourGo" },
      {
        property: "og:description",
        content: "Продавайте предложения через единый marketplace. На старте подключаем Дубай.",
      },
    ],
  }),
  component: OperatorsLanding,
});

const flow = [
  { label: "Поставщик", icon: Building2 },
  { label: "Цены/API", icon: Cable },
  { label: "TourGo", icon: Store },
  { label: "Туристы СНГ", icon: Users },
  { label: "Заявки", icon: Ticket },
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
              Для поставщиков
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold text-primary-foreground md:text-5xl">
              Получайте туристов из СНГ на туры, отели, экскурсии и трансферы
            </h1>
            <p className="mt-4 max-w-xl text-primary-foreground/85">
              Подключите каталог через кабинет, CSV или API. Мы проверяем цены перед бронью и
              приводим русскоязычных клиентов, которые уже готовы выбрать поездку. Первый фокус
              подключения — Дубай.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/operator">Подключить поставщика</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/operator">Посмотреть кабинет</Link>
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
            { title: "Каталог и price check", text: "Загружайте цены вручную, CSV или через API." },
            { title: "Продвижение", text: "Boost, Featured и Sponsored места в выдаче." },
            {
              title: "Заявки и аналитика",
              text: "Просмотры, price checks, заявки и брони в кабинете.",
            },
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
