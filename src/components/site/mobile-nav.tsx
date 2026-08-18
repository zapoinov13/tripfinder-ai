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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item, i) => (
          <Link
            key={`${item.to}-${i}`}
            to={item.to}
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-primary" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
