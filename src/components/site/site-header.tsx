import { Link } from "@tanstack/react-router";
import { Heart, LogOut, Menu, Plane, User, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { b2bNav, travelScenarios } from "@/data/scenarios";
import { useAuth } from "@/lib/platform/auth";
import { cn } from "@/lib/utils";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { user, isAuthenticated, logout } = useAuth();

  const accountTo = !isAuthenticated
    ? "/login"
    : user?.role.startsWith("PLATFORM")
      ? "/admin"
      : user?.role.startsWith("OPERATOR")
        ? "/operator"
        : "/profile";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl transition-colors duration-300 native-app:pt-[env(safe-area-inset-top)]",
      )}
    >
      <div className="container-page grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:h-[72px] md:grid-cols-[auto_1fr_auto]">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-4" />
          </span>
          <span
            className="truncate font-display text-lg font-semibold tracking-tight"
          >
            TourGo
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-0.5 md:flex">
          {travelScenarios.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{
                className: "bg-secondary text-foreground",
              }}
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.navTitle}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/favorites">
              <Heart className="size-4" />
              Избранное
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={b2bNav.to}>{b2bNav.title}</Link>
          </Button>
          {isAuthenticated ? (
            <>
              <Button variant="secondary" size="sm" asChild>
                <Link to={accountTo}>
                  <User className="size-4" />
                  {user?.name.split(" ")[0]}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">Войти</Link>
            </Button>
          )}
        </div>

        <div className={cn("flex items-center justify-end gap-1 md:hidden", compact && "gap-2")}>
          {!compact ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to={accountTo} aria-label="Аккаунт">
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
                    {[
                      { label: "Главная", to: "/" },
                      ...travelScenarios.map((item) => ({ label: item.title, to: item.to })),
                      { label: "Избранное", to: "/favorites" },
                      { label: b2bNav.title, to: b2bNav.to },
                      {
                        label: isAuthenticated ? (user?.name ?? "Профиль") : "Войти",
                        to: accountTo,
                      },
                    ].map((item) => (
                      <Link
                        key={item.to + item.label}
                        to={item.to}
                        className="rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-secondary"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {isAuthenticated ? (
                      <button
                        type="button"
                        className="rounded-xl px-3 py-3 text-left text-base font-medium text-foreground hover:bg-secondary"
                        onClick={logout}
                      >
                        Выйти
                      </button>
                    ) : null}
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/notifications" aria-label="Уведомления">
                <Bell className="size-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
