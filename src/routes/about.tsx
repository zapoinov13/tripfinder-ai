import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  LifeBuoy,
  Mail,
  MapPinned,
  Palmtree,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { FaqSection } from "@/components/site/faq-section";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { destinations, heroImage } from "@/data/demo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О TourGo · как это работает" },
      {
        name: "description",
        content:
          "TourGo не продаёт туры. Вы находите варианты или оставляете заявку, компании предлагают цены, вы выбираете и платите им.",
      },
    ],
  }),
  component: AboutPage,
});

const paths = [
  {
    to: "/search" as const,
    icon: Palmtree,
    title: "Найти тур самим",
    text: "Страна, даты, отель и цена. Сравниваете предложения и пишете выбранной компании.",
  },
  {
    to: "/excursions" as const,
    icon: MapPinned,
    title: "Экскурсии",
    text: "Сафари, яхты, обзор города, парки и билеты. Цены от разных компаний рядом.",
  },
  {
    to: "/assistance" as const,
    icon: LifeBuoy,
    title: "Уже в поездке?",
    text: "Нужна машина, гид или билеты на сегодня? Компании в городе пришлют цены.",
  },
];

const steps = [
  { n: "1", title: "Находите", text: "Смотрите туры сами или оставьте одну заявку. Можно текстом или голосом." },
  { n: "2", title: "Сравниваете", text: "Несколько компаний на одну поездку. Цена, отель и условия рядом." },
  { n: "3", title: "Выбираете", text: "Пишете выбранной фирме. Договор и оплата у неё, не у TourGo." },
];

function AboutPage() {
  const cover = destinations.find((d) => d.id === "turkey")?.image ?? heroImage;

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <img src={cover} alt="" className="h-[420px] w-full object-cover sm:h-[480px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/35" />
        <div className="container-page absolute inset-x-0 top-0 flex h-full flex-col justify-end pb-8 pt-24">
          <p className="inline-flex w-fit rounded-full bg-primary-foreground/12 px-3 py-1 text-xs font-semibold text-primary-foreground">
            О сервисе
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-tight text-primary-foreground md:text-5xl">
            TourGo не продаёт туры. Мы собираем предложения компаний в одном месте.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/80 md:text-base">
            Найдите тур сами, оставьте одну заявку нескольким фирмам или попросите помощь, когда уже
            на месте. Выбираете вы. Платите выбранной компании.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/search" search={{} as never}>
                Смотреть туры
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20"
              asChild
            >
              <Link to="/request" search={{}}>
                Оставить заявку
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="border-b border-border/70 bg-card">
        <div className="container-page flex flex-wrap gap-x-6 gap-y-2 py-3 text-sm">
          {[
            { href: "#how", label: "Как это работает" },
            { href: "#faq", label: "Вопросы" },
            { href: "#support", label: "Поддержка" },
            { href: "#terms", label: "Условия" },
          ].map((item) => (
            <a key={item.href} href={item.href} className="font-medium text-muted-foreground hover:text-foreground">
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="container-page py-10 md:py-14">
        <section>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Что можно сделать</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Три понятных сценария. Не нужно разбираться, кто такой оператор и как устроен рынок.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {paths.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                search={{} as never}
                className="hover-lift surface-card flex flex-col p-6"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <item.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.text}</p>
                <span className="mt-4 text-sm font-semibold text-primary">Открыть</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="how" className="mt-14 scroll-mt-28">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Как это работает</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((item) => (
              <li key={item.n} className="rounded-3xl bg-secondary/50 p-5">
                <span className="font-display text-3xl font-semibold text-primary/35">{item.n}</span>
                <h3 className="mt-3 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Компании проверяются",
              text: "Перед размещением смотрим данные и документы. После проверки у компании появляется знак.",
            },
            {
              icon: Scale,
              title: "Сравнение рядом",
              text: "Цена, состав и условия в одной таблице. Не нужно держать десять переписок.",
            },
            {
              icon: BadgeCheck,
              title: "Оплата не через TourGo",
              text: "На этом этапе деньги идут выбранной турфирме. Мы не продаём поездку за неё.",
            },
          ].map((item) => (
            <div key={item.title} className="surface-card p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="surface-card mt-14 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Users className="size-5 text-primary" />
              Вы туристическая компания?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Туристы оставляют заявку, вы отвечаете ценой. Клиент ваш, оплата вам. Начать можно
              бесплатно.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/for-companies">Для турфирм</Link>
          </Button>
        </section>

        <section id="faq" className="mt-14 scroll-mt-28">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Частые вопросы</h2>
          <p className="mt-2 text-sm text-muted-foreground">Коротко и по делу, без отраслевых слов.</p>
          <div className="mt-4">
            <FaqSection />
          </div>
        </section>

        <section
          id="support"
          className="surface-card mt-14 scroll-mt-28 grid gap-6 p-6 md:grid-cols-2 md:p-8"
        >
          <div id="contacts">
            <h2 className="font-display text-xl font-semibold">Поддержка и контакты</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Напишите, если что-то не открывается, заявка зависла или компания не отвечает.
            </p>
            <a
              href="mailto:support@tourgo.demo"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Mail className="size-4" />
              support@tourgo.demo
            </a>
            <p className="mt-2 text-xs text-muted-foreground">Обычно отвечаем в рабочие часы, в течение дня.</p>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-ai" />
              Быстрее всего
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Если вы уже в поездке, напишите, что нужно сегодня: машину, гида или билеты. Компании
              в городе ответят быстрее, чем общая почта.
            </p>
            <Button className="mt-4" variant="outline" asChild>
              <Link to="/assistance">Открыть помощь в поездке</Link>
            </Button>
          </div>
        </section>

        <section id="terms" className="mt-14 scroll-mt-28 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold">Условия</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              TourGo показывает предложения туристических компаний и помогает оставить заявку. Договор
              на поездку заключается между вами и выбранной компанией.
            </p>
            <p>
              Мы не гарантируем наличие мест и итоговую цену: их подтверждает компания перед оплатой.
              Размещение компаний на первом этапе бесплатное.
            </p>
          </div>
        </section>

        <section id="privacy" className="mt-10 scroll-mt-28 max-w-3xl pb-6">
          <h2 className="font-display text-2xl font-semibold">Политика конфиденциальности</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Имя и телефон из заявки видят только те компании, которым вы отправили запрос или которых
              выбрали. Мы не продаём контакты.
            </p>
            <p>
              Вход и избранное хранятся в вашем аккаунте. Если есть вопрос по данным, напишите на
              support@tourgo.demo.
            </p>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
