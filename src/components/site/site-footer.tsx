import { Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";

const columns = [
  {
    title: "Путешествия",
    links: [
      { label: "Все туры", to: "/search" },
      { label: "Экскурсии", to: "/excursions" },
      { label: "Помощь в поездке", to: "/assistance" },
      { label: "Горящие туры", to: "/hot" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О TourGo", to: "/about" },
      { label: "Для турфирм", to: "/for-companies" },
      { label: "Добавить свою турфирму", to: "/company-signup" },
      { label: "Контакты", to: "/about", hash: "contacts" },
    ],
  },
  {
    title: "Помощь",
    links: [
      { label: "FAQ", to: "/about", hash: "faq" },
      { label: "Поддержка", to: "/about", hash: "support" },
      { label: "Условия", to: "/about", hash: "terms" },
      { label: "Политика конфиденциальности", to: "/about", hash: "privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">TourGo</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Найдите тур сами или оставьте одну заявку и получите предложения от нескольких
            проверенных турфирм.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((link, i) => (
                <li key={`${link.label}-${i}`}>
                  <Link
                    to={link.to}
                    {...("hash" in link && link.hash ? { hash: link.hash } : {})}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70">
        <div className="container-page py-6 text-xs text-muted-foreground">© 2026 TourGo</div>
      </div>
    </footer>
  );
}
