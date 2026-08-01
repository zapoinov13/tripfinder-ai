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
      { title: "О платформе и поддержка — Voyago" },
      {
        name: "description",
        content: "Как работает маркетплейс туров Voyago, ответы на частые вопросы и контакты.",
      },
      { property: "og:title", content: "О платформе — Voyago" },
      { property: "og:description", content: "Маркетплейс туров от разных операторов." },
    ],
  }),
  component: AboutPage,
});

const faq = [
  ["Как формируются цены?", "Цены загружают туроператоры, мы показываем их без наценки."],
  ["Кто оформляет тур?", "Договор заключается напрямую с туроператором, мы помогаем с подбором."],
  ["Что даёт Premium?", "Доступ к закрытым ценам, раннему доступу и AI-рекомендациям."],
  ["Как связаться с поддержкой?", "Напишите на support@voyago.demo — отвечаем в течение часа."],
];

function AboutPage() {
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">О платформе</h1>
        <p className="mt-4 text-muted-foreground">
          Voyago — маркетплейс туров. Мы собираем предложения туроператоров в одном месте, чтобы
          путешественник мог сравнить цены, условия и отели, а не обзванивать агентства.
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