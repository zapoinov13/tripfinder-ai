import { Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "Все предложения", to: "/search" },
      { label: "Направления", to: "/destinations" },
      { label: "Экскурсии", to: "/experiences" },
      { label: "Hot Deals", to: "/hot" },
      { label: "Premium", to: "/premium" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О платформе", to: "/about" },
      { label: "Для поставщиков", to: "/for-operators" },
      { label: "Партнёрам", to: "/for-operators" },
      { label: "Контакты", to: "/about" },
    ],
  },
  {
    title: "Помощь",
    links: [
      { label: "FAQ", to: "/about" },
      { label: "Поддержка", to: "/about" },
      { label: "Условия", to: "/about" },
      { label: "Политика конфиденциальности", to: "/about" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/40 md:mt-24">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:py-14">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">TourGo</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Маркетплейс путешествий: сравниваем туры, отели, экскурсии и трансферы от проверенных
            поставщиков.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 md:block md:space-y-3">
              {col.links.map((link, i) => (
                <li key={`${link.label}-${i}`}>
                  <Link
                    to={link.to}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
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
        <div className="container-page py-6 text-xs text-muted-foreground">
          © 2026 Travel Marketplace
        </div>
      </div>
    </footer>
  );
}
