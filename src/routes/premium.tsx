import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { formatPrice, getHotel, tourCover } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { trackEvent } from "@/lib/platform/catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/premium")({
  head: () =>
    seo({
      title: "Premium: закрытые цены на туры и горящие предложения",
      description:
        "Подписка TourGo: закрытые цены турфирм, горящие туры раньше остальных и предложения, которых нет в открытом поиске.",
      path: "/premium",
    }),
  component: PremiumPage,
});

const perks = [
  { emoji: "💎", title: "Premium Deals", text: "Закрытые предложения только для подписчиков." },
  { emoji: "🔥", title: "Горящие туры", text: "Первыми видите лучшие цены на ближайшие даты." },
  { emoji: "💰", title: "Закрытые цены", text: "Тарифы, недоступные в обычном поиске." },
  { emoji: "⚡", title: "Ранний доступ", text: "Новые туры появляются у вас раньше." },
  { emoji: "✨", title: "AI-рекомендации", text: "Персональные подборки под ваш стиль отдыха." },
  { emoji: "🔔", title: "Уведомления о цене", text: "Сообщаем, когда цена на тур снижается." },
];

function PremiumPage() {
  const { isAuthenticated, isPremium, purchasePremium } = useAuth();
  const navigate = useNavigate();
  const state = usePlatformStore();
  const price = state.config.premiumMonthlyPrice;
  const premiumTours = state.tours
    .filter((t) => t.status === "active" && t.tags.includes("premium"))
    .slice(0, 3);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    trackEvent("PREMIUM_VIEWED");
  }, []);

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <section className="gradient-premium rounded-4xl px-6 py-16 text-center md:px-14 md:py-24">
          <span className="rounded-full bg-premium/20 px-3 py-1 text-xs font-semibold text-premium">
            PREMIUM
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-3xl font-semibold text-primary-foreground md:text-5xl">
            Получайте доступ к предложениям, которых нет в обычной выдаче
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            MONTHLY · {formatPrice(price)}, цена из конфигурации платформы (можно менять в админке).
          </p>
          {isPremium ? (
            <Button size="lg" className="mt-8" variant="secondary" asChild>
              <Link to="/search" search={{ offers: "premium" } as never}>
                Смотреть Premium Deals
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="mt-8"
              disabled={buying}
              onClick={async () => {
                if (!isAuthenticated) {
                  void navigate({ to: "/login", search: { next: "/premium" } as never });
                  return;
                }
                setBuying(true);
                try {
                  const res = await purchasePremium();
                  if (!res.ok) toast.error(res.error ?? "Не удалось активировать Premium");
                } finally {
                  setBuying(false);
                }
              }}
            >
              {buying ? "Подключаем…" : `Подключить Premium, ${formatPrice(price)}`}
            </Button>
          )}
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Что входит</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk) => (
              <div key={perk.title} className="surface-card p-6">
                <span className="text-2xl">{perk.emoji}</span>
                <h3 className="mt-4 font-display text-lg font-semibold">{perk.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{perk.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Premium-предложения</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {premiumTours.map((tour) => {
              const hotel = getHotel(tour.hotelId);
              return (
                <div key={tour.id} className="surface-card overflow-hidden">
                  <img
                    src={tourCover(tour, hotel)}
                    alt={hotel.name}
                    loading="lazy"
                    className="h-56 w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="text-xs font-semibold text-premium">PREMIUM</div>
                    <h3 className="mt-2 truncate font-display text-lg font-semibold">
                      {hotel.name}
                    </h3>
                    {isPremium ? (
                      <>
                        <div className="mt-4 text-sm text-muted-foreground line-through">
                          {formatPrice(tour.price)}
                        </div>
                        <div className="font-display text-2xl font-semibold">
                          {formatPrice(tour.premiumPrice ?? tour.price)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-4 font-display text-xl font-semibold">Premium Deal</div>
                        <Button className="mt-3" size="sm" asChild>
                          <Link to="/tour/$tourId" params={{ tourId: tour.id }}>
                            Смотреть предложение
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
