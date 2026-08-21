import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faq = [
  {
    q: "TourGo — это турагентство?",
    a: "Нет. TourGo помогает туристам находить и сравнивать предложения разных туристических компаний.",
  },
  {
    q: "Кто продаёт мне тур?",
    a: "Тур продаёт конкретная туристическая компания, указанная в предложении.",
  },
  {
    q: "Как получить предложения от нескольких турфирм?",
    a: "Оставьте одну заявку. Подходящие компании смогут предложить вам свои варианты, а вы сравните их в одном окне.",
  },
  {
    q: "Как работает умный поиск?",
    a: "Вы рассказываете, какой отдых хотите, а TourGo превращает ваш запрос в обычные параметры поиска. Придуманных туров в выдаче нет — только реальные предложения компаний.",
  },
  {
    q: "Можно говорить голосом?",
    a: "Да. TourGo распознаёт речь и заполняет поиск. Перед поиском мы покажем, что поняли, и вы сможете поправить детали.",
  },
  {
    q: "Как проверяются турфирмы?",
    a: "Перед размещением компания предоставляет данные и документы для проверки. После проверки рядом с названием появляется отметка.",
  },
  {
    q: "Кому я оплачиваю тур?",
    a: "На первом этапе TourGo не принимает оплату за тур. Оплата производится выбранной туристической компании.",
  },
];

export function FaqSection() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faq.map((item, i) => (
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
