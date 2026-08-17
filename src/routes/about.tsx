import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О платформе и поддержка — TourGo" },
      {
        name: "description",
        content:
          "Как работает маркетплейс TourGo для русскоязычных туристов и поставщиков путешествий.",
      },
      { property: "og:title", content: "О платформе — TourGo" },
      {
        property: "og:description",
        content: "Маркетплейс туров, отелей, экскурсий и трансферов.",
      },
    ],
  }),
  component: AboutPage,
});

const faq = [
  [
    "Как формируются цены?",
    "Поставщики загружают цены через кабинет, импорт или API. Перед оплатой цена проверяется повторно. На старте подключаем каталог по Дубаю.",
  ],
  [
    "Кто подтверждает бронирование?",
    "Если есть API, подтверждение может быть instant. Если API нет, заявка уходит поставщику и фиксируется в кабинете.",
  ],
  ["Что даёт Premium?", "Закрытые цены, ранний доступ к hot deals и приоритетную поддержку."],
  ["Как связаться с поддержкой?", "Напишите на support@tourgo.demo — отвечаем в течение часа."],
];

function AboutPage() {
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">О платформе</h1>
        <p className="mt-4 text-muted-foreground">
          TourGo — маркетплейс туров, отелей, экскурсий и трансферов для русскоязычных туристов из
          СНГ. Мы собираем предложения проверенных поставщиков в одном месте, чтобы путешественник
          мог сравнить направление, цену, условия и наличие без хаоса в чатах. Первый доступный
          каталог платформы — Дубай.
        </p>
        <h2 className="mt-12 font-display text-2xl font-semibold">FAQ</h2>
        <Accordion type="single" collapsible className="mt-4">
          {faq.map(([q, a]) => (
            <AccordionItem key={q} value={q as string}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SiteLayout>
  );
}
