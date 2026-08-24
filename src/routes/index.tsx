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

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title={"Горящие туры\nуспейте на скидку"}
          subtitle="Вылеты в ближайшие даты: компании уже снизили цену"
          action={
            <Button variant="outline" asChild>
              <Link to="/hot">
                Все горящие
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-3 flex items-center gap-2 text-base text-foreground/70 md:hidden">
          <Flame className="size-4 text-primary" />
          Скидки на ближайший вылет
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hotTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
        <div className="mt-6 md:hidden">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/hot">Смотреть все горящие туры</Link>
          </Button>
        </div>
      </section>

      <HomeFeaturedTours />

      <section className="container-page mt-16 md:mt-24">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/excursions"
            className="group relative overflow-hidden rounded-3xl"
          >
            <SafeImage
              src={destPhoto("uae", 2)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 md:p-8">
              <h3 className="media-caption font-display text-2xl font-semibold tracking-tight">
                Экскурсии
              </h3>
              <p className="media-caption-muted mt-3 max-w-md text-base leading-relaxed">
                Сафари, яхты, обзор города, парки и билеты. Цены от разных компаний рядом.
              </p>
              <span className="media-caption mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                Смотреть экскурсии
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/assistance"
            className="group relative overflow-hidden rounded-3xl"
          >
            <SafeImage
              src={destPhoto("turkey", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 md:p-8">
              <h3 className="media-caption font-display text-2xl font-semibold tracking-tight">
                Уже в поездке?
              </h3>
              <p className="media-caption-muted mt-3 max-w-md text-base leading-relaxed">
                Нужна машина, гид или билеты на сегодня? Компании в городе пришлют цены.
              </p>
              <span className="media-caption mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                Попросить помощь
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {!compactApp ? (
      <section className="container-page mt-10 md:mt-14">
        <div className="relative overflow-hidden rounded-[2rem]">
          <SafeImage
            src={destPhoto("thailand", 1)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,oklch(0.16_0.02_250/0.92)_0%,oklch(0.16_0.02_250/0.72)_46%,oklch(0.16_0.02_250/0.42)_100%)]" />
          <div className="relative grid min-h-[420px] gap-10 p-7 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)] md:items-center md:p-10 lg:min-h-[460px] lg:p-12">
            <div>
              <p className="inline-flex rounded-full bg-primary-foreground/14 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary-foreground uppercase backdrop-blur-md">
                Не хотите искать сами?
              </p>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight text-primary-foreground md:text-5xl md:leading-[1.12]">
                Одна заявка. Несколько цен.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/92 md:text-lg md:leading-relaxed">
                Расскажите, куда и когда едете. Компании сами пришлют отель, цену и условия. Вы
                сравниваете и выбираете.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to="/request" search={{}}>
                    Получить предложения
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20"
                  asChild
                >
                  <a href="#search">Искать самому</a>
                </Button>
              </div>
            </div>

            <div className="relative">
              <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary-foreground/60 uppercase">
                Ответы на заявку
              </p>
              <ul className="space-y-3">
                {[
                  {
                    company: "Family Travel",
                    hotel: "Rixos Premium Dubai",
                    note: "7 ночей · всё включено",
                    price: 1290000,
                    highlight: true,
                  },
                  {
                    company: "Dubai Travel",
                    hotel: "Address Beach Resort",
                    note: "7 ночей · завтраки",
                    price: 1180000,
                  },
                  {
                    company: "Sunway",
                    hotel: "Jumeirah Beach Hotel",
                    note: "7 ночей · полупансион",
                    price: 1350000,
                  },
                ].map((offer) => (
                  <li
                    key={offer.company}
                    className={cn(
                      "rounded-2xl border p-4 backdrop-blur-md",
                      offer.highlight
                        ? "border-primary-foreground/35 bg-primary-foreground text-ink"
                        : "border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-wide uppercase opacity-60">
                          {offer.company}
                        </p>
                        <p className="mt-1 font-display text-sm font-semibold">{offer.hotel}</p>
                        <p className={cn("mt-1 text-xs", offer.highlight ? "opacity-70" : "text-primary-foreground/70")}>
                          {offer.note}
                        </p>
                      </div>
                      <p className="shrink-0 font-display text-sm font-semibold">
                        {formatPrice(offer.price)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {!compactApp ? (
      <>
      <section className="container-page mt-16 md:mt-24">
        <div className="overflow-hidden rounded-[2rem] bg-ink text-primary-foreground">
          <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/70 uppercase">
                Как устроен TourGo
              </p>
              <h2 className="mt-3 max-w-xl whitespace-pre-line font-display text-3xl font-semibold leading-snug tracking-tight md:text-4xl md:leading-[1.15]">
                От идеи отпуска до выбора турфирмы{"\u00A0"}{"\n"}за три шага
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
                Мы не продаём туры сами. Мы собираем предложения компаний, чтобы вы сравнили цены и
                купили у той, что подходит.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                asChild
              >
                <a href="#search">Найти тур</a>
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

          <ol className="grid border-t border-primary-foreground/10 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.n}
                className={cn(
                  "relative p-6 md:p-8",
                  index > 0 && "border-t border-primary-foreground/10 md:border-t-0 md:border-l",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary-foreground/12">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-4xl font-semibold text-primary-foreground/20">
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold leading-snug md:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-primary-foreground/85">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-16 md:mt-24">
        <div className="container-page">
          <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
            Почему TourGo
          </p>
          <h2 className="mt-3 max-w-3xl whitespace-pre-line font-display text-3xl font-semibold leading-snug tracking-tight md:text-5xl md:leading-[1.12]">
            Хватит собирать отпуск{"\u00A0"}{"\n"}в разных приложениях
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/70 md:text-xl md:leading-relaxed">
            Раньше вы писали знакомым агентам и ждали скрины прайсов. Здесь все ответы в одном
            окне: кто какую цену дал, какой отель и что входит.
          </p>
        </div>

        <div className="container-page mt-8 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <Link
            to="/request"
            search={{}}
            className="group relative min-h-[300px] overflow-hidden rounded-[2rem] lg:col-span-7 lg:row-span-2 lg:min-h-[520px]"
          >
            <SafeImage
              src={destPhoto("uae", 1)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[300px] flex-col justify-end p-6 md:p-8 lg:min-h-[520px]">
              <span className="w-fit rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                Самый удобный способ
              </span>
              <h3 className="media-caption mt-4 font-display text-2xl font-semibold leading-snug md:text-4xl md:leading-[1.15]">
                Одна заявка: цены от нескольких турфирм
              </h3>
              <p className="media-caption-muted mt-4 max-w-lg text-base leading-relaxed md:text-lg">
                Опишите куда, когда и бюджет. Подходящие компании пришлют свои варианты. Вы
                сравниваете и пишете той, чья цена и условия лучше.
              </p>
              <span className="media-caption mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                Получить цены от компаний
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/search"
            search={{} as never}
            className="group relative min-h-[220px] overflow-hidden rounded-[2rem] lg:col-span-5"
          >
            <SafeImage
              src={destPhoto("maldives", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[220px] flex-col justify-end p-6">
              <h3 className="media-caption font-display text-xl font-semibold leading-snug md:text-2xl">
                Каталог как витрина, а не лента сторис
              </h3>
              <p className="media-caption-muted mt-3 text-base leading-relaxed">
                Цена, питание, перелёт и название компании сразу на карточке. Без скринов из чата.
              </p>
            </div>
          </Link>

          <Link
            to="/about"
            className="group relative min-h-[220px] overflow-hidden rounded-[2rem] lg:col-span-5"
          >
            <SafeImage
              src={destPhoto("turkey", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[220px] flex-col justify-end p-6">
              <h3 className="media-caption font-display text-xl font-semibold leading-snug md:text-2xl">
                Платите турфирме, не «сайту»
              </h3>
              <p className="media-caption-muted mt-3 text-base leading-relaxed">
                TourGo — витрина. Договор и деньги у компании, которую выбрали вы.
              </p>
            </div>
          </Link>
        </div>

        <div className="container-page mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] border border-border/80 bg-secondary/40 p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Как было раньше
            </p>
            <ul className="mt-5 space-y-4">
              {[
                { icon: MessageCircle, text: "Десять чатов, сторис и «скину прайс вечером»" },
                { icon: Users, text: "Непонятно, кому можно доверять, а кто просто пишет" },
                { icon: Scale, text: "Цены разбросаны: сравнить почти невозможно" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-base leading-relaxed text-foreground/75">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-card">
                    <item.icon className="size-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] bg-ink p-6 text-primary-foreground md:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/70 uppercase">
              Как с TourGo
            </p>
            <ul className="mt-5 space-y-4">
              {[
                { icon: ShieldCheck, text: "Только компании с проверкой документов" },
                { icon: Scale, text: "Отели, питание и цены рядом, выбор за минуты" },
                { icon: Mic, text: "Можно просто сказать голосом, какой отдых хотите" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-base leading-relaxed text-primary-foreground/92">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary-foreground/12">
                    <item.icon className="size-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page mt-16 mb-8 md:mt-24">
        <div className="relative overflow-hidden rounded-[2rem]">
          <SafeImage
            src={destPhoto("uae", 2)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,oklch(0.16_0.02_250/0.92)_0%,oklch(0.16_0.02_250/0.72)_48%,oklch(0.16_0.02_250/0.38)_100%)]" />
          <div className="relative grid min-h-[340px] gap-10 p-7 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] md:items-end md:p-10 lg:min-h-[380px] lg:p-12">
            <div>
              <p className="inline-flex rounded-full bg-primary-foreground/14 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary-foreground uppercase backdrop-blur-md">
                Для турфирм
              </p>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight text-primary-foreground md:text-5xl md:leading-[1.12]">
                Туристы уже ищут отпуск. Покажите свою цену первыми
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/90 md:text-lg">
                Заявки приходят в кабинет. Вы отвечаете предложением. Клиент ваш, оплата идёт вам,
                не платформе.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to="/company-signup">
                    Добавить турфирму
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20"
                  asChild
                >
                  <Link to="/for-companies">Как получать заявки</Link>
                </Button>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                {
                  title: "Заявки без холодных звонков",
                  text: "Турист сам описал поездку, вы видите только подходящие запросы.",
                },
                {
                  title: "Клиент остаётся вашим",
                  text: "Договор и оплата у вас. TourGo не забирает комиссию с тура.",
                },
                {
                  title: "Страница с знаком доверия",
                  text: "Фото, отзывы и проверка: турист видит, что вы настоящая компания.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur-md"
                >
                  <p className="font-display text-base font-semibold text-primary-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-base leading-relaxed text-primary-foreground/80">
                    {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      </>
      ) : null}
    </SiteLayout>
  );
}
