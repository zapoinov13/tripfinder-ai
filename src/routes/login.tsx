import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useState } from "react";

import { AuthLayout } from "@/components/site/auth-layout";
import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/platform/auth";
import { getPostLoginPath } from "@/lib/platform/routing";
import { getState } from "@/lib/platform/store";
import { migrateAnonymousToUser } from "@/lib/platform/user-data";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход · TourGo" },
      { name: "description", content: "Войдите в личный кабинет TourGo." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    const to = user.role.startsWith("PLATFORM")
      ? "/admin"
      : user.role.startsWith("OPERATOR")
        ? "/operator"
        : "/profile";
    queueMicrotask(() => navigate({ to }));
  }

  return (
    <AuthLayout
      title="Войти в TourGo"
      subtitle="Личный кабинет туриста или турфирмы: заявки, избранное и переписка."
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const res = await login(email, password);
            if (!res.ok) {
              setError(res.error ?? "Ошибка входа");
              return;
            }
            const sessionUserId = getState().session?.userId;
            const u = sessionUserId
              ? getState().users.find((x) => x.id === sessionUserId)
              : getState().users.find((x) => x.email === email.trim().toLowerCase());
            if (u) migrateAnonymousToUser(u.id);
            navigate({ to: getPostLoginPath(u?.role) });
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={busy}>
          <LogIn className="size-4" />
          {busy ? "Входим…" : "Войти"}
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <span className="relative mx-auto block w-fit bg-card px-2 text-xs text-muted-foreground">
          или
        </span>
      </div>

      <AppleSignInButton />

      <details className="mt-5 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          Тестовые аккаунты (review)
        </summary>
        <ul className="mt-2 space-y-1.5">
          <li>
            Турист: <code className="text-foreground">tourist@test.tourgo.app</code> /{" "}
            <code className="text-foreground">Test1234!</code>
          </li>
          <li>
            Турфирма: <code className="text-foreground">operator@test.tourgo.app</code> /{" "}
            <code className="text-foreground">Test1234!</code>
          </li>
        </ul>
      </details>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Нет аккаунта?{" "}
        <Link to="/registration" className="font-medium text-primary">
          Зарегистрироваться
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        <Link to="/for-companies" className="font-medium text-primary">
          Кабинет турфирмы
        </Link>
      </p>
    </AuthLayout>
  );
}
