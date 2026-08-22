import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";

import { cn } from "@/lib/utils";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background native-app:pt-[env(safe-area-inset-top)]">
      <header className="container-page flex h-16 items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold">TourGo</span>
        </Link>
      </header>

      <main className="container-page flex flex-1 flex-col justify-center py-8">
        <div className="surface-card mx-auto w-full max-w-md p-6 md:p-8">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
          <div className={cn(subtitle ? "mt-6" : "mt-4")}>{children}</div>
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-relaxed text-muted-foreground">
          Продолжая, вы принимаете{" "}
          <Link to="/terms" className="text-primary underline underline-offset-2">
            условия
          </Link>{" "}
          и{" "}
          <Link to="/privacy" className="text-primary underline underline-offset-2">
            политику конфиденциальности
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
