import { Link } from "@tanstack/react-router";
import { Heart, Menu, Plane, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const nav = [
  { label: "Туры", to: "/search" },
  { label: "Направления", to: "/destinations" },
  { label: "Горящие туры", to: "/hot" },
  { label: "Premium", to: "/premium" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="container-page grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:h-[72px] md:grid-cols-[auto_1fr_auto]">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-4" />
          </span>
          <span className="truncate font-display text-lg font-semibold tracking-tight">
            Voyago
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-foreground bg-secondary" }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/profile">
              <Heart className="size-4" />
              Избранное
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/profile">Войти</Link>
          </Button>
        </div>

        <div className="flex items-center justify-end gap-1 md:hidden">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile" aria-label="Профиль">
              <User className="size-5" />
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Меню">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[82vw] max-w-sm">
              <SheetHeader>
                <SheetTitle className="font-display">Меню</SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-4">
                {[...nav, { label: "Для туроператоров", to: "/for-operators" }].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}