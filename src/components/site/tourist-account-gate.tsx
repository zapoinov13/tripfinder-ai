import { Link } from "@tanstack/react-router";
import { Heart, Luggage, LogIn, Search, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { getTour } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import type { Role } from "@/lib/platform-contracts";
import { useTourState } from "@/lib/tour-state";
import { cn } from "@/lib/utils";

type GateKind = "profile" | "trips" | "generic";

/**
 * Soft auth for tourist account screens: no instant /login redirect.
 * Guests see a clear CTA; wrong roles get a short hint.
 */
export function TouristAccountGate({
  kind = "generic",
  title,
  description,
  children,
}: {
  kind?: GateKind;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <SiteLayout>
        <div className="container-page grid min-h-[50vh] place-items-center py-16 text-sm text-muted-foreground">
          Загрузка…
        </div>
      </SiteLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <GuestAccountScreen
        kind={kind}
        {...(title !== undefined ? { title } : {})}
        {...(description !== undefined ? { description } : {})}
      />
    );
  }

  const touristRoles: Role[] = ["TOURIST", "PREMIUM_TOURIST"];
  if (!touristRoles.includes(user.role)) {
    const to = user.role.startsWith("PLATFORM")
      ? "/admin"
      : user.role.startsWith("OPERATOR")
        ? "/operator"
        : "/";
    const label = user.role.startsWith("PLATFORM")
      ? "админ-панель"
      : user.role.startsWith("OPERATOR")
        ? "кабинет турфирмы"
        : "главную";
    return (
      <SiteLayout>
        <div className="container-page py-12">
          <div className="surface-card mx-auto max-w-md p-8 text-center">
            <p className="font-display text-xl font-semibold">Это кабинет туриста</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Вы вошли как {user.email}. Откройте {label}.
            </p>
            <Button className="mt-6" asChild>
              <Link to={to}>Перейти</Link>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return <>{children}</>;
}

function GuestAccountScreen({
  kind,
  title,
  description,
}: {
  kind: GateKind;
  title?: string;
  description?: string;
}) {
  const { favorites } = useTourState();
  const favTours = favorites
    .map((id) => getTour(id))
    .filter(Boolean)
    .slice(0, 4);

  const copy =
    kind === "trips"
      ? {
          eyebrow: "Поездки",
          heading: title ?? "Брони и заявки после входа",
          text:
            description ??
            "Чтобы видеть ответы турфирм и статусы брони, войдите. Избранное уже доступно на этом устройстве.",
          icon: Luggage,
        }
      : kind === "profile"
        ? {
            eyebrow: "Профиль",
            heading: title ?? "Войдите в свой кабинет",
            text:
              description ??
              "Заявки, сообщения, поездки и настройки в одном месте. Без входа можно искать туры и сохранять избранное.",
            icon: UserRound,
          }
        : {
            eyebrow: "Аккаунт",
            heading: title ?? "Войдите, чтобы продолжить",
            text: description ?? "Этот раздел доступен после входа в аккаунт туриста.",
            icon: LogIn,
          };

  const Icon = copy.icon;

  return (
    <SiteLayout>
      <div className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-lg">
          <div className="surface-card p-6 text-center sm:p-8">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="size-7" />
            </span>
            <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {copy.heading}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.text}</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link to="/login">
                  <LogIn className="size-4" />
                  Войти
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/registration">Создать аккаунт</Link>
              </Button>
            </div>
          </div>

          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {(
              [
                {
                  to: "/search" as const,
                  icon: Search,
                  label: "Смотреть туры",
                  hint: "Без входа",
                },
                {
                  to: "/favorites" as const,
                  icon: Heart,
                  label: "Избранное",
                  hint: "На этом устройстве",
                },
                {
                  to: "/request" as const,
                  icon: Luggage,
                  label: "Оставить заявку",
                  hint: "Нужен вход",
                },
              ] as const
            ).map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  search={{} as never}
                  className={cn(
                    "surface-card flex h-full flex-col items-start gap-2 p-4 transition-colors hover:border-primary/40",
                  )}
                >
                  <item.icon className="size-4 text-primary" />
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.hint}</span>
                </Link>
              </li>
            ))}
          </ul>

          {kind === "trips" && favTours.length > 0 ? (
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Избранное на устройстве</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/favorites">Все</Link>
                </Button>
              </div>
              <div className="space-y-4">
                {favTours.map((tour) => (tour ? <TourCard key={tour.id} tour={tour} /> : null))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </SiteLayout>
  );
}
