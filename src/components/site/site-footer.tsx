import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail, Plane } from "lucide-react";

import { Button } from "@/components/ui/button";

const columns = [
  {
    title: "Путешествия",
    links: [
      { label: "Все туры", to: "/search" },
      { label: "Направления", to: "/destinations" },
      { label: "Горящие туры", to: "/hot" },
      { label: "Экскурсии", to: "/excursions" },
      { label: "Уже в поездке", to: "/assistance" },
      { label: "Оставить заявку", to: "/request" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О TourGo", to: "/about" },
      { label: "Для турфирм", to: "/for-companies" },
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

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-primary-foreground md:mt-24">
      <div className="container-page py-12 md:py-16">
        <div className="flex flex-col gap-8 border-b border-primary-foreground/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Plane className="size-4" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">TourGo</span>
            </Link>
            <p className="mt-4 text-sm text-primary-foreground/70 md:text-base">
              Маркетплейс туров. Несколько компаний показывают цены рядом. Вы выбираете и платите
              выбранной фирме.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
              asChild
            >
              <Link to="/search" search={{} as never}>
                Найти тур
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
              asChild
            >
              <Link to="/for-companies">Для турфирм</Link>
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
              href="mailto:support@tourgo.demo"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-foreground hover:underline"
            >
              <Mail className="size-4" />
              support@tourgo.demo
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-primary-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TourGo. Туры продают компании, не мы.</p>
          <p>Поиск и заявка бесплатные для туриста.</p>
        </div>
      </div>
    </footer>
  );
}
