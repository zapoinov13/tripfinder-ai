import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Вопросы одни и те же для страницы и для разметки: Google показывает их
 * прямо в выдаче, но только если текст на странице совпадает с разметкой.
 */
export const faqItems = [
  {
    q: "TourGo - это турагентство?",
    a: "Нет. TourGo: витрина: вы сравниваете предложения разных турфирм. Тур продаёт и оформляет компания, которую вы выбрали.",
  },
  {
    q: "Кто продаёт мне тур?",
    a: "Конкретная туристическая компания из карточки или ответа на заявку. С ней же договор и оплата.",
  },
  {
    q: "Это бесплатно для туриста?",
    a: "Да. Поиск, заявка и сравнение бесплатные. Вы платите только выбранной турфирме за саму поездку.",
  },
  {
    q: "Как получить цены от нескольких турфирм?",
    a: "Оставьте одну заявку: куда, когда, сколько человек и бюджет. Подходящие компании пришлют варианты, вы сравните их в одном окне.",
  },
  {
    q: "Как проверяются турфирмы?",
    a: "Перед размещением компания указывает данные и документы. После проверки рядом с названием появляется знак доверия.",
  },
  {
    q: "Кому я плачу за тур?",
    a: "Напрямую выбранной туристической компании. TourGo на этом этапе не принимает оплату за поездку.",
  },
];

/** Разметка FAQPage для head() страницы, где выводится этот блок. */
export const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export function FaqSection() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqItems.map((item, i) => (
        <AccordionItem key={item.q} value={`faq-${i}`}>
          <AccordionTrigger className="text-left font-display text-base font-medium">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
