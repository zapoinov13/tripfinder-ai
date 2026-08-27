import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ChevronRight,
  Gift,
  Globe2,
  History,
  LogOut,
  Mail,
  Sparkles,
  TicketPercent,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";

import { NextStepCard } from "@/components/profile/next-step-card";
import { SiteLayout } from "@/components/site/site-layout";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { tProfile, useAppLocale, type AppLocale } from "@/lib/locale";
import { useAuth } from "@/lib/platform/auth";
import { useBonusPoints } from "@/lib/tourist-bonuses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Личный кабинет · TourGo" },
      {
        name: "description",
        content: "Бонусы, промокоды, история поездок, данные туриста и поддержка.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <TouristAccountGate kind="profile">
      <TouristCabinet />
    </TouristAccountGate>
  );
}

function TouristCabinet() {
  const { user, logout } = useAuth();
  const { locale, setLocale } = useAppLocale();
  const t = tProfile(locale);
  const { points, redeem, refresh } = useBonusPoints();
  const [promoOpen, setPromoOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  useEffect(() => {
    document.documentElement.lang = locale === "kk" ? "kk" : "ru";
  }, [locale]);

  if (!user) return null;

  const applyPromo = () => {
    const result = redeem(promoCode);
    if (result.ok) {
      toast.success(`${t.promoOk}: +${result.points} ${t.points}`);
      setPromoCode("");
      setPromoOpen(false);
      refresh();
      return;
    }
    if (result.reason === "used")
      toast.error(locale === "kk" ? "Бұл код қолданылған" : "Этот код уже использован");
    else toast.error(t.promoBad);
  };

  return (
    <SiteLayout>
      <div className="container-page py-6 md:py-10">
        <div className="mx-auto max-w-lg">
          <header className="mb-6">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              {t.cabinet}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {user.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.email}
              {user.city ? ` · ${user.city}` : ""}
            </p>
          </header>

          <NextStepCard userId={user.id} />

          <button
            type="button"
            onClick={() => setBonusOpen(true)}
            className="surface-card mb-4 flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:border-primary/40"
          >
            <div>
              <p className="text-sm text-muted-foreground">{t.bonusBalance}</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                {points.toLocaleString(locale === "kk" ? "kk-KZ" : "ru-RU")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.points}</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Sparkles className="size-5" />
            </span>
          </button>

          <div className="surface-card overflow-hidden divide-y divide-border">
            <MenuRow
              icon={Sparkles}
              title={t.bonuses}
              hint={t.bonusesHint}
              onClick={() => setBonusOpen(true)}
            />
            <MenuRow
              icon={TicketPercent}
              title={t.promo}
              hint={t.promoHint}
              onClick={() => setPromoOpen(true)}
            />
            <MenuLink icon={History} title={t.history} hint={t.historyHint} to="/profile/trips" />
            <MenuRow
              icon={Gift}
              title={t.gift}
              hint={t.giftHint}
              onClick={() => setGiftOpen(true)}
            />
            <MenuLink icon={UserRound} title={t.data} hint={t.dataHint} to="/profile/settings" />
            <a
              href={SUPPORT_MAILTO}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                <Mail className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t.contact}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t.contactHint} · {SUPPORT_EMAIL}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </a>
          </div>

          <div className="surface-card mt-4 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="size-4 text-primary" />
              {t.language}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { code: "ru" as AppLocale, label: "Русский" },
                  { code: "kk" as AppLocale, label: "Қазақша" },
                ] as const
              ).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLocale(item.code)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    locale === item.code
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              // logout() сам показывает тост о выходе.
              void logout();
              if (locale === "kk") toast.message("Сіз шықтыңыз");
            }}
          >
            <LogOut className="size-4" />
            {t.logout}
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {locale === "kk"
              ? "Әкімші мен турфирма кабинеттері бөлек"
              : "Кабинеты админа и турфирмы отдельно"}
          </p>
        </div>
      </div>

      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.promo}</DialogTitle>
            <DialogDescription>{t.promoHint}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="promo">{locale === "kk" ? "Промокод" : "Промокод"}</Label>
            <Input
              id="promo"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder={t.promoPlaceholder}
              autoCapitalize="characters"
            />
          </div>
          <DialogFooter>
            <Button onClick={applyPromo}>{t.activate}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.bonuses}</DialogTitle>
            <DialogDescription>{t.bonusesHint}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-secondary/70 p-5 text-center">
            <p className="text-sm text-muted-foreground">{t.bonusBalance}</p>
            <p className="mt-2 font-display text-4xl font-semibold tabular-nums">
              {points.toLocaleString(locale === "kk" ? "kk-KZ" : "ru-RU")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t.points}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {locale === "kk"
              ? "Ұпайларды турға жеңілдікке жұмсайсыз. Промокод арқылы толықтырыңыз."
              : "Баллы можно списать как скидку на тур. Пополняйте промокодом."}
          </p>
          <DialogFooter>
            <Button
              onClick={() => {
                setBonusOpen(false);
                setPromoOpen(true);
              }}
            >
              {t.promo}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.giftTitle}</DialogTitle>
            <DialogDescription>{t.giftText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild>
              <a href={SUPPORT_MAILTO}>{t.writeSupport}</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

function MenuRow({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function MenuLink({
  icon: Icon,
  title,
  hint,
  to,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  to: "/profile/trips" | "/profile/settings";
}) {
  return (
    <Link
      to={to}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
