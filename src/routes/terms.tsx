import { Link, createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    seo({
      title: "Условия использования",
      description:
        "Условия использования сервиса TourGo: правила размещения, ответственность сторон и порядок работы с компаниями.",
      path: "/terms",
      type: "article",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-10 md:py-14">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">TourGo</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Условия использования
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Обновлено: 22 августа 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            TourGo показывает предложения туристических компаний и помогает оставить заявку. Договор
            на поездку заключается между вами и выбранной компанией.
          </p>
          <h2 className="font-display text-lg font-semibold text-foreground">Для туристов</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Поиск, сравнение и заявки на TourGo бесплатны.</li>
            <li>Оплата тура напрямую выбранной турфирме.</li>
            <li>Мы не гарантируем наличие мест: итоговую цену подтверждает компания.</li>
          </ul>
          <h2 className="font-display text-lg font-semibold text-foreground">Для турфирм</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Размещение на первом этапе бесплатное.</li>
            <li>Компания отвечает за достоверность цен, условий и документов.</li>
            <li>TourGo может скрыть предложения при нарушении правил платформы.</li>
          </ul>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Ограничение ответственности
          </h2>
          <p>
            TourGo не является турагентством и не участвует в расчётах между туристом и компанией.
            Споры по поездке решаются напрямую с турфирмой.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/privacy">Конфиденциальность</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/about">О платформе</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
