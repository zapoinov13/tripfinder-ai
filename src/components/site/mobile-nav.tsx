import { Link } from "@tanstack/react-router";
import { Heart, Home, Search, Sparkles, Ticket, User } from "lucide-react";

const items = [
  { label: "Главная", to: "/", icon: Home },
  { label: "Поиск", to: "/search", icon: Search },
  { label: "Экскурсии", to: "/experiences", icon: Ticket },
  { label: "Избранное", to: "/favorites", icon: Heart },
  { label: "AI", to: "/ai-search", icon: Sparkles },
  { label: "Профиль", to: "/profile", icon: User },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_oklch(0.2_0.02_250/0.08)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-6">
        {items.map((item, i) => (
          <Link
            key={`${item.to}-${i}`}
            to={item.to}
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-primary" }}
            className="flex min-h-15 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold leading-none text-muted-foreground"
          >
            <item.icon className="size-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
