import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, LogOut, Menu, Plane, User, Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/platform/auth";
import { cn } from "@/lib/utils";

const nav: Array<{ label: string; to: string; exact?: boolean }> = [
  { label: "Главная", to: "/", exact: true },
  { label: "Туры", to: "/search" },
  { label: "Экскурсии", to: "/excursions" },
  { label: "Помощь в поездке", to: "/assistance" },
];

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/" && !compact;
  const [scrolled, setScrolled] = useState(false);
  const overlay = isHome && !scrolled;

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

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
        "sticky top-0 z-40 transition-colors duration-300 native-app:pt-[env(safe-area-inset-top)]",
        compact || !overlay
          ? "border-b border-border/70 bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:h-[72px] md:grid-cols-[auto_1fr_auto]">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-4" />
          </span>
          <span
            className={cn(
              "truncate font-display text-lg font-semibold tracking-tight",
              overlay && "text-primary-foreground",
            )}
          >
            TourGo
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-0.5 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              activeProps={{
                className: overlay
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "bg-secondary text-foreground",
              }}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors",
                overlay
                  ? "text-primary-foreground/80 hover:bg-primary-foreground/12 hover:text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="sm"
            className={
              overlay
                ? "text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"
                : undefined
            }
            asChild
          >
            <Link to="/favorites">
              <Heart className="size-4" />
              Избранное
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={
              overlay
                ? "border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"
                : undefined
            }
            asChild
          >
            <Link to="/for-companies">Для турфирм</Link>
          </Button>
          {isAuthenticated ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className={
                  overlay
                    ? "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
                    : undefined
                }
                asChild
              >
                <Link to={accountTo}>
                  <User className="size-4" />
                  {user?.name.split(" ")[0]}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={
                  overlay
                    ? "text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"
                    : undefined
                }
                onClick={logout}
              >
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
              <Button
                variant="ghost"
                size="icon"
                className={
                  overlay
                    ? "text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"
                    : undefined
                }
                asChild
              >
                <Link to={accountTo} aria-label="Аккаунт">
                  <User className="size-5" />
                </Link>
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Меню"
                    className={
                      overlay
                        ? "text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"
                        : undefined
                    }
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[82vw] max-w-sm">
                  <SheetHeader>
                    <SheetTitle className="font-display">Меню</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-2 flex flex-col gap-1 px-4">
                    {[
                      ...nav,
                      { label: "Избранное", to: "/favorites" },
                      { label: "Горящие туры", to: "/hot" },
                      { label: "Для турфирм", to: "/for-companies" },
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
