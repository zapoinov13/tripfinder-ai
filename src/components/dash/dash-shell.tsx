import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Plane } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { useAppTabBarPaddingClass } from "@/hooks/use-native-app";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DashItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
};

function NavList({ items }: { items: DashItem[] }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          activeOptions={{ exact: true }}
          activeProps={{ className: "bg-primary-soft text-primary" }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <item.icon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge && item.badge > 0 ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function DashShell({
  items,
  title,
  subtitle,
  brand,
  actions,
  children,
  showAppTabs = false,
}: {
  items: DashItem[];
  title: string;
  subtitle?: string;
  brand: string;
  actions?: ReactNode;
  children: ReactNode;
  showAppTabs?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabPadding = useAppTabBarPaddingClass();
  const tabs = showAppTabs || pathname.startsWith("/profile");

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link to="/" className="mb-6 flex items-center gap-2 px-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-4" />
            </span>
            <span className="truncate font-display font-semibold">{brand}</span>
          </Link>
          <NavList items={items} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl">
          {/*
            На телефоне кнопка действия отъедала ширину и от заголовка
            оставалось «Кабинет к...». Там она уходит на свою строку.
          */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] md:px-8">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Меню">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle className="font-display">{brand}</SheetTitle>
                </SheetHeader>
                <div className="px-4">
                  <NavList items={items} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 lg:col-start-2">
              <h1 className="font-display text-lg font-semibold sm:truncate md:text-xl">{title}</h1>
              {subtitle ? (
                <p className="line-clamp-2 text-sm text-muted-foreground sm:truncate">{subtitle}</p>
              ) : null}
            </div>
            {actions ? (
              <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
                {actions}
              </div>
            ) : null}
          </div>
        </header>
        <div className={cn("p-4 md:p-8", tabs && tabPadding)}>{children}</div>
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        // На телефоне плитки стоят по две в ряд: крупный отступ и кегль
        // растянули бы четыре счётчика на три экрана прокрутки.
        "surface-card p-4 sm:p-5",
        emphasis && "border-primary/30 bg-primary/[0.03] ring-1 ring-primary/15",
      )}
    >
      <p className="text-[13px] leading-snug text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-1.5 font-display text-xl font-semibold tabular-nums sm:mt-2 sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "mt-1 text-[11px] leading-snug sm:text-xs",
            emphasis ? "font-medium text-primary" : "text-success",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
