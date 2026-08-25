import { Link } from "@tanstack/react-router";
import { Mail, Plane } from "lucide-react";

import { Button } from "@/components/ui/button";
import { b2bNav, travelScenarios } from "@/data/scenarios";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/utils";

const columns = [
  {
    title: "Путешествия",
    links: travelScenarios.map((item) => ({ label: item.title, to: item.to })),
  },
  {
    title: "Компания",
    links: [
      { label: "О TourGo", to: "/about" },
      { label: b2bNav.title, to: b2bNav.to },
      { label: "Добавить турфирму", to: "/company-signup" },
      { label: "Контакты", to: "/about", hash: "contacts" },
    ],
  },
  {
    title: "Справка",
    links: [
      { label: "Вопросы", to: "/about", hash: "faq" },
      { label: "Поддержка", to: "/support" },
      { label: "Условия", to: "/terms" },
      { label: "Конфиденциальность", to: "/privacy" },
    ],
  },
];

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("mt-10 bg-ink text-primary-foreground md:mt-14", className)}>
      <div className="container-page py-8 md:py-12">
        <div className="flex flex-col gap-8 border-b border-primary-foreground/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Plane className="size-4" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">TourGo</span>
            </Link>
            <p className="mt-4 text-sm text-primary-foreground/70 md:text-base">
              Сравните цены компаний и купите выгоднее. Туры, экскурсии, жильё, авто и помощь в
              одном месте. Платите напрямую выбранной фирме.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
              asChild
            >
              <Link to="/">Сравнить предложения</Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
              asChild
            >
              <Link to={b2bNav.to}>{b2bNav.title}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/50 uppercase">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link, i) => (
                  <li key={`${link.label}-${i}`}>
                    <Link
                      to={link.to}
                      {...("hash" in link && link.hash ? { hash: link.hash } : {})}
                      className="text-sm text-primary-foreground/75 transition-colors hover:text-primary-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/50 uppercase">
              Связь
            </h3>
            <p className="mt-4 text-sm text-primary-foreground/75">
              Напишите, если заявка зависла или компания не отвечает.
            </p>
            <a
              href={SUPPORT_MAILTO}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-foreground hover:underline"
            >
              <Mail className="size-4" />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-primary-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TourGo. Туры продают компании. Мы помогаем их сравнить.</p>
          <p>Поиск и заявка бесплатные для туриста.</p>
        </div>
      </div>
    </footer>
  );
}
