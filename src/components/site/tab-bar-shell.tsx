import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  /** Число на значке: непрочитанные, новые заявки. Ноль не показываем. */
  badge?: number;
  /** Вместо перехода открыть меню: у «Ещё» нет своего экрана. */
  action?: () => void;
};

/**
 * Общая рамка нижней навигации: одинаковая на всех ролях, чтобы турист и
 * партнёр видели один и тот же язык интерфейса, а различались только пункты.
 */
export function TabBarShell({ tabs, pathname }: { tabs: TabItem[]; pathname: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 overflow-visible border-t border-border bg-background/95 pt-3 backdrop-blur-xl md:hidden"
      aria-label="Основная навигация"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="grid items-end"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const badge = tab.badge ?? 0;
          const className = cn(
            "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors active:opacity-70",
            active ? "text-primary" : "text-muted-foreground",
          );
          const inner = (
            <>
              <span className="relative">
                <tab.icon className={cn("size-[22px]", active && "stroke-[2.35px]")} aria-hidden />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              <span className={cn("truncate", active && "font-semibold")}>{tab.label}</span>
            </>
          );

          return tab.action ? (
            <button key={tab.id} type="button" onClick={tab.action} className={className}>
              {inner}
            </button>
          ) : (
            <Link key={tab.id} to={tab.to} search={{} as never} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
