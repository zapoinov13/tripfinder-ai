import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, Clock, Flame, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import heroImage from "@/assets/hero.jpg";
import { AiSearchWidget } from "@/components/site/ai-search-widget";
import { DestinationRail, HotToursRail } from "@/components/site/home-rails";
import { SiteLayout } from "@/components/site/site-layout";
import { SafeImage } from "@/components/media/safe-image";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { destinations } from "@/data/demo";
import { usePlatformStore } from "@/lib/platform/hooks";
import { b2bNav, travelScenarios } from "@/data/scenarios";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Туры, экскурсии, жильё и аренда авто — напрямую от компаний",
      description:
        "Туры из Алматы и Астаны, экскурсии на русском, жильё посуточно, прокат авто и спорт. Цены компаний рядом: сравните и платите выбранной напрямую.",
      path: "/",
    }),
  component: Index,
});

/**
 * Три шага платформы. На телефоне читают одну строку, а не абзац, поэтому у
 * каждого шага есть короткая суть — она говорит то же самое, но за секунду.
 */
const how = [
  {
    icon: Sparkles,
    title: "Скажите, что нужно",
    short: "Опишите поездку — покажем подходящее",
    text: "Опишите поездку своими словами: AI откроет нужный раздел и покажет подходящие варианты.",
  },
  {
    icon: Wallet,
    title: "Сравните и выберите",
    short: "Один тур — сразу от нескольких компаний",
    text: "Один и тот же тур у разных компаний стоит по-разному. У нас эта разница видна сразу, без переписки в чатах.",
  },
  {
    icon: ShieldCheck,
    title: "Бронируйте напрямую",
    short: "Оплата компании. Комиссии с туриста нет",
    text: "Договор и оплата у выбранной компании. TourGo не берёт комиссию с туриста: цена не растёт.",
  },
];

function Index() {
  // Горящие туры — только реальные предложения компаний; пусто — секция скрыта.
  const state = usePlatformStore();
  const liveTours = state.tours.filter((t) => t.status === "active");
  const liveHotTours = liveTours.filter((t) => t.tags.includes("hot")).slice(0, 6);

  return (
    <SiteLayout>
      {/* На телефоне блок больше не растянут на весь экран: пустота под плитками
          отодвигала направления за сгиб, и до первой цены было два экрана. */}
      <div className="flex flex-col">
        <section className="md:container-page md:py-14">
          <div className="relative overflow-hidden md:rounded-[2.5rem]">
            <img
              src={heroImage}
              alt="Пляж и курорт: подбор туров на TourGo"
              className="h-[8.25rem] w-full object-cover object-[center_32%] animate-soft-zoom sm:h-[13rem] md:h-[32rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10" />
            {/* Нижние 16px обложки перекрывает карточка подбора: поднимаем
                текст, чтобы подпись не липла к её краю. */}
            <div className="absolute inset-x-0 bottom-0 px-4 pb-7 pt-8 text-primary-foreground md:p-10">
              <p className="hidden font-display text-3xl font-semibold tracking-tight md:mb-5 md:block">
                TourGo
              </p>
              <h1 className="font-display text-[1.4rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
                Сравните цены
                <br />и купите выгоднее
              </h1>
              <p className="mt-1 max-w-md text-[12.5px] leading-snug text-primary-foreground/85 md:mt-5 md:text-xl md:leading-relaxed">
                Туры, жильё, авто и помощь от компаний
              </p>
            </div>
          </div>
        </section>

        {/* Сначала спрашиваем человека своими словами, и только потом
            предлагаем выбирать раздел: так короче путь у того, кто уже знает,
            чего хочет, и не мешает тому, кто пришёл смотреть. */}
        <AiSearchWidget />

        <section className="flex flex-col px-4 md:container-page md:px-8">
          <h2 className="mt-5 font-display text-[17px] font-semibold md:mt-12 md:text-2xl">
            Или выберите раздел
          </h2>
          <p className="mt-1 hidden text-base text-foreground/60 md:block">
            В каждом — компании, цены и связь напрямую.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 md:mt-6 md:grid-cols-3 md:gap-4">
            {travelScenarios.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                search={{} as never}
                className="flex h-16 items-center gap-3 rounded-2xl bg-card px-3 ring-1 ring-black/[0.06] md:surface-card md:h-auto md:min-h-[11.5rem] md:flex-col md:items-start md:justify-between md:gap-5 md:p-6 md:ring-0 md:transition-transform md:hover:-translate-y-1"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-primary-foreground md:size-12 md:rounded-2xl">
                  <item.icon className="size-5 md:size-[1.35rem]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[13.5px] font-semibold leading-none md:hidden">
                    {item.shortTitle ?? item.title}
                  </span>
                  <span className="hidden font-display text-2xl font-semibold leading-snug md:block">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-[11px] leading-none text-foreground/55 md:mt-1.5 md:text-base md:leading-relaxed md:whitespace-normal md:text-foreground/65">
                    <span className="md:hidden">{item.shortHint}</span>
                    <span className="hidden md:inline">{item.hint}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <Link
            to={b2bNav.to}
            // Турист скачал приложение ради поездки: вход для компаний ему на первом
            // экране не нужен — он есть в меню и в подвале.
            className="mt-3 hidden h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-primary-foreground md:mt-8 md:flex md:h-14 md:w-auto md:self-start md:px-8"
          >
            <Building2 className="size-4 md:size-5" />
            {b2bNav.title}
          </Link>
        </section>
      </div>

      <DestinationRail tours={liveTours} />

      <HotToursRail tours={liveHotTours} />

      <section className="container-page mt-10 md:mt-14">
        <div className="rounded-3xl bg-ink px-5 py-7 text-primary-foreground md:rounded-[2rem] md:px-10 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[1.65rem] font-semibold leading-snug tracking-tight md:text-4xl md:leading-[1.15]">
                Как устроен TourGo
              </h2>
              <p className="mt-1.5 max-w-xl text-base leading-snug text-primary-foreground/70">
                Три шага, чтобы купить поездку дешевле
              </p>
            </div>
          </div>

          {/* Телефон: три строки, каждая говорит суть. Пустые заголовки с
              крупными цифрами занимали пол-экрана и не объясняли ничего. */}
          <ol className="mt-5 space-y-2.5 md:hidden">
            {how.map((item, i) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <item.icon className="size-[18px]" />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block font-display text-[15px] font-semibold leading-tight">
                    {i + 1}. {item.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-primary-foreground/70">
                    {item.short}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <ol className="mt-8 hidden gap-4 md:grid md:grid-cols-3">
            {how.map((item, i) => (
              <li
                key={item.title}
                className="relative rounded-2xl bg-primary-foreground/[0.06] p-5 ring-1 ring-primary-foreground/10"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <item.icon className="size-5" />
                  </span>
                  <span className="font-display text-4xl font-semibold text-primary-foreground/25">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/70">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row md:mt-8">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/ai-search" search={{} as never}>
                <Sparkles className="size-4" />
                Подобрать поездку
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              // Горящие уже отдельным блоком выше — на телефоне это второй раз.
              className="hidden w-full border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:inline-flex sm:w-auto"
              asChild
            >
              <Link to="/search" search={{ offers: "hot" } as never}>
                <Flame className="size-4" />
                Горящие туры
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[1.65rem] font-semibold leading-snug tracking-tight md:text-4xl md:leading-[1.15]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground/70">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="hidden shrink-0 md:block">{action}</div> : null}
    </div>
  );
}

function SeeRestLink({
  to,
  search,
  label,
}: {
  to: "/excursions" | "/search" | "/destinations";
  search?: Record<string, string>;
  label: string;
}) {
  return (
    <div className="mt-4 flex justify-center md:mt-6">
      <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
        <Link to={to} search={(search ?? {}) as never}>
          {label}
        </Link>
      </Button>
    </div>
  );
}
