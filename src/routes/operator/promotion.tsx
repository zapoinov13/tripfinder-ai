import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/operator/promotion")({
  head: () => ({
    meta: [
      { title: "Продвижение туров — кабинет туроператора | Voyago" },
      {
        name: "description",
        content: "Boost, Featured, Sponsored и Premium размещения для ваших туров.",
      },
      { property: "og:title", content: "Продвижение — Voyago" },
      { property: "og:description", content: "Поднимите туры выше в результатах поиска." },
    ],
  }),
  component: PromotionPage,
});

const cards = [
  { title: "BOOST", text: "Поднимите тур выше в результатах поиска.", price: "от 25 000 ₸" },
  { title: "FEATURED", text: "Покажите тур в специальных подборках.", price: "от 45 000 ₸" },
  { title: "SPONSORED", text: "Получите дополнительное рекламное размещение.", price: "от 80 000 ₸" },
  { title: "PREMIUM", text: "Покажите предложение Premium-аудитории.", price: "от 60 000 ₸" },
];

function PromotionPage() {
  return (
    <DashShell
      brand="Travel Company"
      items={operatorNav}
      title="Продвижение"
      subtitle="Увеличьте видимость ваших туров"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.title} className="surface-card flex flex-col p-6">
            <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold tracking-wide text-primary">
              {card.title}
            </span>
            <p className="mt-4 text-sm text-muted-foreground">{card.text}</p>
            <p className="mt-6 font-display text-xl font-semibold">{card.price}</p>
            <Button className="mt-5 w-fit">Продвинуть тур</Button>
          </div>
        ))}
      </div>
    </DashShell>
  );
}