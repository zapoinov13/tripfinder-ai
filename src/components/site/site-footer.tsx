import { Link } from "@tanstack/react-router";
import { Mail, Plane } from "lucide-react";

import { Button } from "@/components/ui/button";
import { b2bNav } from "@/data/scenarios";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/utils";

/**
 * Подвал.
 *
 * Разделы путешествий стоят в шапке на каждой странице, а на телефоне ещё и
 * в нижнем баре. Дублировать их списком внизу незачем — в подвале остаётся
 * только то, чего больше нигде нет: поддержка, правовые страницы и вход для
 * компаний.
 */

/** Широкий экран: всё, чего нет в шапке. */
const siteLinks = [
  { label: "О TourGo", to: "/about" },
  { label: "Добавить турфирму", to: "/company-signup" },
  { label: "Контакты", to: "/about", hash: "contacts" },
  { label: "Вопросы", to: "/about", hash: "faq" },
  { label: "Поддержка", to: "/support" },
  { label: "Условия", to: "/terms" },
  { label: "Конфиденциальность", to: "/privacy" },
];

/** Телефон: ссылок ещё меньше — разделы уже в баре и в меню. */
const essentials = [
  { label: "Поддержка", to: "/support" },
  { label: "О TourGo", to: "/about" },
  { label: "Условия", to: "/terms" },
  { label: "Конфиденциальность", to: "/privacy" },
];

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("mt-10 bg-ink text-primary-foreground md:mt-14", className)}>
      {/* Телефон: коротко и по делу. */}
      <div className="container-page py-7 md:hidden">
        <a
          href={SUPPORT_MAILTO}
          className="flex items-center gap-3 rounded-2xl bg-primary-foreground/[0.07] px-4 py-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/10">
            <Mail className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Написать в поддержку</span>
            <span className="block truncate text-xs text-primary-foreground/60">
              {SUPPORT_EMAIL}
            </span>
          </span>
        </a>

        <Link
          to={b2bNav.to}
          className="mt-3 flex h-11 items-center justify-center rounded-2xl bg-primary-foreground/10 text-sm font-semibold"
        >
          {b2bNav.title}
        </Link>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {essentials.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs text-primary-foreground/60 hover:text-primary-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-primary-foreground/40">
          © 2026 TourGo. Туры продают компании — мы помогаем их сравнить. Поиск и заявка для туриста
          бесплатны.
        </p>
      </div>

      {/* Широкий экран: карта сайта на месте, она помогает и людям, и поиску. */}
      <div className="hidden md:block">
        <div className="container-page py-12">
          <div className="flex flex-col gap-8 border-b border-primary-foreground/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <Link to="/" className="inline-flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Plane className="size-4" />
                </span>
                <span className="font-display text-xl font-semibold tracking-tight">TourGo</span>
              </Link>
              <p className="mt-4 text-base text-primary-foreground/70">
                Сравните цены компаний и купите выгоднее. Платите напрямую выбранной фирме.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
              asChild
            >
              <Link to={b2bNav.to}>{b2bNav.title}</Link>
            </Button>
          </div>

          {/* Разделы путешествий стоят в шапке на каждой странице — второй
              список здесь ничего не добавляет. Оставляем то, чего в шапке нет. */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {siteLinks.map((link) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                {...("hash" in link && link.hash ? { hash: link.hash } : {})}
                className="text-sm text-primary-foreground/75 transition-colors hover:text-primary-foreground"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={SUPPORT_MAILTO}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground hover:underline"
            >
              <Mail className="size-4" />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10">
          <div className="container-page flex items-center justify-between py-5 text-xs text-primary-foreground/50">
            <p>© 2026 TourGo. Туры продают компании. Мы помогаем их сравнить.</p>
            <p>Поиск и заявка бесплатные для туриста.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
