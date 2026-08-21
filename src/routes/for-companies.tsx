import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  FileText,
  Inbox,
  MessageCircle,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { destinations, formatPrice, heroImage } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/for-companies")({
  head: () => ({
    meta: [
      { title: "Для турфирм · TourGo" },
      {
        name: "description",
        content:
          "Туристы оставляют одну заявку. Вы отправляете предложение с ценой. Клиент выбирает и платит вам.",
      },
    ],
  }),
  component: ForCompaniesPage,
});

const audience = [
  {
    title: "Турфирмы",
    text: "Пакетные туры, отели и готовые поездки из Казахстана и СНГ.",
  },
  {
    title: "Экскурсии и море",
    text: "Сафари, яхты, гиды, билеты и программы на месте.",
  },
  {
    title: "Помощь туристам",
    text: "Машина, трансфер, гид. Когда человек уже в стране и ему нужно сегодня.",
  },
];

const flow = [
  {
    n: "1",
    title: "Турист оставляет заявку",
    text: "Куда, когда, сколько человек и бюджет. Одна заявка, не десять чатов в WhatsApp.",
  },
  {
    n: "2",
    title: "Вы видите её в кабинете",
    text: "Подходят заявки по вашей стране и услугам. Отправляете цену, состав и условия.",
  },
  {
    n: "3",
    title: "Турист выбирает вас",
    text: "Сравнивает предложения рядом. Если выбрал, пишет вам. Оплата идёт вам, не TourGo.",
  },
];

const cabinet = [
  { icon: Inbox, title: "Заявки", text: "Новые запросы туристов и статус ответа." },
  { icon: Send, title: "Предложения", text: "Ваши цены, что турист выбрал, что ещё ждёт." },
  { icon: Upload, title: "Туры", text: "Добавляете вручную или загрузкой со своего сайта." },
  { icon: MessageCircle, title: "Сообщения", text: "Переписка с туристом после выбора." },
  { icon: Building2, title: "Страница компании", text: "Фото, контакты, отзывы. Её видят туристы." },
  { icon: BadgeCheck, title: "Проверка", text: "После документов появляется знак проверенной компании." },
];

const startSteps = [
  { title: "Контакты", text: "Имя, телефон, почта. Это вы, не компания." },
  { title: "Компания", text: "Название, город, сайт, коротко чем занимаетесь." },
  { title: "Услуги и страны", text: "Туры, экскурсии, трансферы. Где работаете и откуда клиенты." },
  { title: "Документы", text: "Регистрация и лицензия, если она нужна. Можно работать уже во время проверки." },
];

const faq = [
  {
    q: "TourGo продаёт туры за меня?",
    a: "Нет. TourGo показывает ваши предложения туристам. Продаёте вы, договор и оплата тоже у вас.",
  },
  {
    q: "Кто платит за поездку?",
    a: "Турист платит вашей компании. TourGo на этом этапе не принимает оплату за тур.",
  },
  {
    q: "Это платно для турфирмы?",
    a: "Размещение туров и ответы на заявки на первом этапе бесплатные. Позже можно подключать продвижение, если нужно больше видимости.",
  },
  {
    q: "Можно работать до проверки документов?",
    a: "Да. Вы сразу добавляете туры и отвечаете на заявки. Знак «Проверенная компания» появится после проверки.",
  },
  {
    q: "Как добавить туры?",
    a: "В кабинете: вручную или ссылкой на страницу вашего сайта. Перед публикацией вы смотрите, что получилось.",
  },
  {
    q: "Кто видит телефон компании?",
    a: "Туристы, которым вы отправили предложение и которые выбрали вас или написали вам.",
  },
];

function ForCompaniesPage() {
  const { user, isAuthenticated } = useAuth();
  const isCompany = Boolean(user?.role.startsWith("OPERATOR"));
  const cover = destinations.find((d) => d.id === "uae")?.image ?? heroImage;

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <img src={cover} alt="" className="h-[460px] w-full object-cover sm:h-[500px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/40" />
        <div className="container-page absolute inset-x-0 top-0 flex h-full flex-col justify-end pb-8 pt-24">
          <p className="inline-flex w-fit rounded-full bg-primary-foreground/12 px-3 py-1 text-xs font-semibold text-primary-foreground">
            Для турфирм
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-tight text-primary-foreground md:text-5xl">
            Туристы сами приходят с заявкой. Вы отвечаете ценой.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/80 md:text-base">
            Одна заявка. Несколько компаний. Турист сравнивает и выбирает. Клиент ваш, оплата вам.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {isCompany ? (
              <Button size="lg" asChild>
                <Link to="/operator">Открыть кабинет</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/company-signup">Добавить свою компанию</Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20"
                  asChild
                >
                  <Link to="/login">Уже есть кабинет. Войти</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="border-b border-border/70 bg-card">
        <div className="container-page grid gap-3 py-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, text: "Начать можно бесплатно" },
            { icon: Send, text: "Турист платит вам, не TourGo" },
            { icon: BadgeCheck, text: "Работать можно до проверки" },
          ].map((item) => (
            <p key={item.text} className="flex items-center gap-2.5 text-sm">
              <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <item.icon className="size-4" />
              </span>
              {item.text}
            </p>
          ))}
        </div>
      </div>

      <div className="container-page py-10 md:py-14">
        <section>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Кому это подходит</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Если вы работаете с туристами и можете назвать цену за тур, экскурсию или помощь на месте.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {audience.map((item) => (
              <div key={item.title} className="surface-card p-6">
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Ищете тур для себя?{" "}
            <Link to="/search" search={{} as never} className="font-semibold text-primary hover:underline">
              Открыть каталог туров
            </Link>
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Как приходят клиенты</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {flow.map((item) => (
              <li key={item.n} className="rounded-3xl bg-secondary/50 p-6">
                <span className="font-display text-3xl font-semibold text-primary/35">{item.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface-card mt-14 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="border-b border-border p-6 md:p-8 lg:border-b-0 lg:border-r">
              <p className="text-sm font-medium text-primary">Заявка туриста</p>
              <h3 className="mt-1 font-display text-xl font-semibold">Семья, Дубай, 7 ночей</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Из Алматы, двое взрослых и двое детей</li>
                <li>Отель у моря, всё включено</li>
                <li>Бюджет до {formatPrice(1_800_000)}</li>
              </ul>
            </div>
            <div className="bg-success/5 p-6 md:p-8">
              <p className="text-sm font-medium text-success">Ваше предложение</p>
              <h3 className="mt-1 font-display text-xl font-semibold">Цена, отель, состав</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>5 звёзд, 1-я линия, завтраки или AI</li>
                <li>Ваша цена, например {formatPrice(1_650_000)}</li>
                <li>Турист сравнивает вас с другими и пишет, если выбрал</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Что есть в кабинете</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cabinet.map((item) => (
              <div key={item.title} className="surface-card p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <item.icon className="size-5" />
                </span>
                <h3 className="mt-3 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Как начать</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Шесть коротких экранов, около десяти минут. Сложные поля можно заполнить позже.
          </p>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {startSteps.map((item, i) => (
              <li key={item.title} className="surface-card p-5">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-sm font-semibold",
                    "bg-primary text-primary-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
            Документы нужны для знака проверки. Без него кабинет уже открыт.
          </p>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Частые вопросы</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Коротко, без терминов. Если остались вопросы, начните регистрацию, в кабинете всё видно.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, i) => (
              <AccordionItem key={item.q} value={`c-faq-${i}`}>
                <AccordionTrigger className="text-left font-display text-base font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="surface-card mt-14 flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="font-display text-xl font-semibold md:text-2xl">
              {isCompany ? "Кабинет уже ваш" : "Добавьте компанию и начните отвечать на заявки"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAuthenticated && !isCompany
                ? "Сейчас вы вошли как турист. Для кабинета компании нужна отдельная регистрация турфирмы."
                : "Регистрация бесплатная. Турист платит вам напрямую."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isCompany ? (
              <Button size="lg" asChild>
                <Link to="/operator">Открыть кабинет</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/company-signup">Добавить свою компанию</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Войти</Link>
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
