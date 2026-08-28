import { Link, createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/support")({
  head: () =>
    seo({
      title: "Поддержка и частые вопросы",
      description:
        "Ответы на частые вопросы о заявках, оплате и работе с компаниями. Не нашли ответ — напишите в поддержку TourGo.",
      path: "/support",
      type: "article",
    }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <SiteLayout>
      <div className="container-page max-w-2xl py-10 md:py-14">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Поддержка
        </h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Ответим по заявкам, бронированиям и работе приложения. Обычно в течение 1 рабочего дня.
        </p>

        <div className="mt-8 grid gap-4">
          <div className="surface-card flex items-start gap-4 p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Mail className="size-5" />
            </span>
            <div>
              <h2 className="font-display font-semibold">Email</h2>
              <a
                href={SUPPORT_MAILTO}
                className="mt-1 block text-sm text-primary underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          <div className="surface-card flex items-start gap-4 p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary">
              <MessageCircle className="size-5" />
            </span>
            <div>
              <h2 className="font-display font-semibold">Частые вопросы</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ответы о TourGo, оплате и проверенных турфирмах.
              </p>
              <Button className="mt-3" variant="outline" size="sm" asChild>
                <Link to="/about" hash="faq">
                  Открыть FAQ
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Button variant="outline" asChild>
            <Link to="/privacy">Конфиденциальность</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/terms">Условия</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
