import { Link, createFileRoute } from "@tanstack/react-router";
import { Car, LifeBuoy, MessageSquare, Ship, Sun, Users } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/assistance")({
  head: () => ({
    meta: [
      { title: "Помощь в поездке — TourGo" },
      {
        name: "description",
        content:
          "Уже в другой стране? Опишите, что нужно — туристические компании предложат варианты и цены.",
      },
    ],
  }),
  component: AssistancePage,
});

const examples = [
  { icon: Car, text: "Хотим завтра поехать из Дубая в Абу-Даби" },
  { icon: Users, text: "Нужен русскоговорящий водитель" },
  { icon: Ship, text: "Хотим заказать яхту на вечер" },
  { icon: LifeBuoy, text: "Нужен трансфер в аэропорт" },
  { icon: Sun, text: "Хотим сафари для семьи из 5 человек" },
  { icon: MessageSquare, text: "Нужен гид, который говорит по-русски" },
];

const steps = [
  {
    title: "Опишите, что нужно",
    text: "Своими словами: сколько вас, когда и что хотите увидеть.",
  },
  {
    title: "Компании отвечают",
    text: "Заявку получают туристические компании, которые работают в этой стране.",
  },
  {
    title: "Сравниваете цены",
    text: "Например: 1 200 AED, 1 300 AED и 1 450 AED за одну и ту же программу.",
  },
  {
    title: "Выбираете",
    text: "Связываетесь с компанией, которая подошла по цене и условиям.",
  },
];

function AssistancePage() {
  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Помощь в поездке</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Уже находитесь в другой стране и не знаете, к кому обратиться? Опишите, что вам нужно —
            туристические компании предложат варианты.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/request" search={{ kind: "assistance" }}>
                Оставить заявку
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/excursions">Посмотреть экскурсии</Link>
            </Button>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">С чем обращаются чаще всего</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map((e) => (
              <div key={e.text} className="surface-card flex items-start gap-3 p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <e.icon className="size-4" />
                </span>
                <p className="text-sm">{e.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Как это работает</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="surface-card p-5">
                <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface-card mt-12 p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold">Пример заявки</h2>
          <p className="mt-3 rounded-xl bg-secondary/60 p-4 text-sm">
            «Мы сейчас в Дубае. Нас пять человек. Завтра хотим посмотреть мечеть в Абу-Даби и
            поехать в Ferrari World. Нужна машина с русскоговорящим водителем.»
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { company: "Dubai Travel", price: "1 200 AED" },
              { company: "Family Travel", price: "1 300 AED" },
              { company: "Marina Boats", price: "1 450 AED" },
            ].map((o) => (
              <div key={o.company} className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">{o.company}</p>
                <p className="mt-1 font-display text-xl font-semibold">{o.price}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Вы сравниваете предложения и выбираете сами. TourGo не берёт оплату за поездку.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/request" search={{ kind: "assistance" }}>
              Оставить заявку
            </Link>
          </Button>
        </section>
      </div>
    </SiteLayout>
  );
}
