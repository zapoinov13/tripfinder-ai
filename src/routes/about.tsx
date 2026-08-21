import { Link, createFileRoute } from "@tanstack/react-router";

import { FaqSection } from "@/components/site/faq-section";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О TourGo и поддержка — TourGo" },
      {
        name: "description",
        content: "Как работает TourGo, ответы на частые вопросы и контакты поддержки.",
      },
      { property: "og:title", content: "О TourGo" },
      {
        property: "og:description",
        content:
          "Найдите тур сами или оставьте одну заявку и получите предложения от нескольких проверенных турфирм.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">О TourGo</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Найдите тур сами или оставьте одну заявку и получите предложения от нескольких проверенных
          турфирм.
        </p>
        <p className="mt-4 text-muted-foreground">
          А когда вы уже в другой стране — найдите экскурсию или оставьте заявку, если нужна помощь
          во время поездки. TourGo не продаёт туры: их продают туристические компании, которые вы
          выбираете сами.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/request" search={{}}>
              Получить предложения от турфирм
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/for-companies">Я туристическая компания</Link>
          </Button>
        </div>

        <h2 className="mt-12 font-display text-2xl font-semibold">Частые вопросы</h2>
        <div className="mt-4">
          <FaqSection />
        </div>

        <h2 className="mt-12 font-display text-2xl font-semibold">Поддержка</h2>
        <p className="mt-3 text-muted-foreground">
          Напишите на support@tourgo.demo — отвечаем в течение часа.
        </p>
      </div>
    </SiteLayout>
  );
}
