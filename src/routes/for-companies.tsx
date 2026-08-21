import { Link, createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, BarChart3, Inbox, Send, Star, Upload } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { heroImage } from "@/data/demo";

export const Route = createFileRoute("/for-companies")({
  head: () => ({
    meta: [
      { title: "Для турфирм — получайте новых клиентов | TourGo" },
      {
        name: "description",
        content:
          "Создайте страницу компании, разместите туры и отвечайте на заявки туристов в TourGo.",
      },
      { property: "og:title", content: "Для турфирм — TourGo" },
    ],
  }),
  component: ForCompaniesPage,
});

const benefits = [
  { icon: Upload, title: "Размещайте свои туры", text: "Вручную или загрузкой со своего сайта." },
  {
    icon: Inbox,
    title: "Получайте заявки",
    text: "Туристы оставляют заявку — вы видите её сразу.",
  },
  {
    icon: Send,
    title: "Предлагайте варианты",
    text: "Отправляйте предложение с ценой и условиями.",
  },
  { icon: Star, title: "Собирайте отзывы", text: "Хорошие отзывы поднимают вас в списке." },
  {
    icon: BarChart3,
    title: "Следите за результатами",
    text: "Просмотры, заявки и выбранные предложения.",
  },
  { icon: BadgeCheck, title: "Знак проверенной компании", text: "После проверки документов." },
];

const steps = [
  { title: "Создайте страницу компании", text: "Название, город, контакты, фото и описание." },
  {
    title: "Пройдите проверку",
    text: "Загрузите документ о регистрации и лицензию, если она нужна.",
  },
  { title: "Добавьте туры", text: "Заполните вручную или загрузите с вашего сайта." },
  { title: "Отвечайте на заявки", text: "Отправляйте предложения туристам и получайте клиентов." },
];

function ForCompaniesPage() {
  return (
    <SiteLayout>
      <section className="container-page pt-6">
        <div className="relative overflow-hidden rounded-4xl">
          <img src={heroImage} alt="" className="h-[380px] w-full object-cover" />
          <div className="absolute inset-0 bg-ink/70" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-14">
            <span className="w-fit rounded-full bg-card/15 px-3 py-1 text-xs font-semibold text-primary-foreground">
              Для турфирм
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold text-primary-foreground md:text-5xl">
              Получайте новых клиентов через TourGo
            </h1>
            <p className="mt-4 max-w-xl text-primary-foreground/85">
              Создайте страницу своей компании, разместите туры и отвечайте на заявки туристов.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/company-signup">Создать страницу компании</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/operator">Посмотреть кабинет</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page mt-16">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">Что вы получаете</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="surface-card p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <b.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-16">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">Как начать</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="surface-card p-6">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page my-16">
        <div className="surface-card flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold md:text-2xl">
              Готовы принимать заявки?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Регистрация занимает несколько минут. Размещение туров на первом этапе бесплатное.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/company-signup">Добавить свою турфирму</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
