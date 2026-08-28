import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import {
  EmptyState,
  FilterBar,
  StatusBadge,
  orgName,
  paymentStatusLabel,
  paymentTypeLabel,
  toneForPaymentStatus,
  userName,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import type { PlatformState } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Деньги · Админ" }] }),
  component: AdminPaymentsPage,
});

/**
 * Деньги платформы — как они движутся на самом деле.
 *
 * Раздел показывал «0 ₸ · 0 ₸ · 0 ошибок» и «Платежей нет» — и выглядел как
 * поломка, хотя деньги на платформе есть. Просто онлайн-приём не подключён:
 * партнёр платит переводом, админ начисляет ему баланс продвижения, платформа
 * списывает с этого баланса за кампании. Ровно это здесь и показано —
 * пополнения, списания и остаток, — а карточные платежи честно помечены как
 * то, что появится после подключения провайдера.
 */

const DAY_MS = 86400000;

type Entry = {
  id: string;
  at: string;
  kind: "topup" | "spend" | "online";
  title: string;
  who: string;
  detail: string;
  amount: number;
  status: string;
  tone: "success" | "warning" | "danger" | "neutral";
};

/** Все движения денег в одну ленту: пополнения, списания и онлайн-оплаты. */
function buildLedger(state: PlatformState): Entry[] {
  const entries: Entry[] = [];

  for (const log of state.auditLogs) {
    if (log.action !== "promotion_balance_topup_admin") continue;
    const amount = log.meta?.["amount"];
    if (typeof amount !== "number") continue;
    entries.push({
      id: log.id,
      at: log.createdAt,
      kind: "topup",
      title: "Пополнение баланса",
      who: log.entityId ? orgName(log.entityId) : "—",
      detail: `начислил ${log.actorId ? userName(log.actorId) : "система"} · оплата вне платформы`,
      amount,
      status: "Зачислено",
      tone: "success",
    });
  }

  for (const p of state.payments) {
    const balance = p.provider === "balance";
    entries.push({
      id: p.id,
      at: p.createdAt,
      kind: balance ? "spend" : "online",
      title: paymentTypeLabel[p.type] ?? p.type,
      who: p.organizationId ? orgName(p.organizationId) : userName(p.userId),
      detail: balance ? "списано с баланса продвижения" : `${p.provider} · ${p.providerPaymentId}`,
      amount: balance ? -p.amount : p.amount,
      status: paymentStatusLabel[p.status] ?? p.status,
      tone: toneForPaymentStatus(p.status) === "success" ? "success" : "warning",
    });
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

function MoneyCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
  accent?: "in" | "out";
}) {
  return (
    <div className="surface-card p-5">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl",
          accent === "in"
            ? "bg-success/12 text-success"
            : accent === "out"
              ? "bg-primary-soft text-primary"
              : "bg-secondary text-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function AdminPaymentsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");

  const ledger = useMemo(() => buildLedger(state), [state]);

  const money = useMemo(() => {
    const monthAgo = Date.now() - 30 * DAY_MS;
    let toppedUp = 0;
    let toppedUp30 = 0;
    let spent = 0;
    let online = 0;
    for (const e of ledger) {
      if (e.kind === "topup") {
        toppedUp += e.amount;
        if (new Date(e.at).getTime() >= monthAgo) toppedUp30 += e.amount;
      }
      if (e.kind === "spend") spent += -e.amount;
      if (e.kind === "online") online += e.amount;
    }
    const balances = state.organizations.reduce((s, o) => s + o.promotionBalance, 0);
    return { toppedUp, toppedUp30, spent, online, balances };
  }, [ledger, state.organizations]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ledger.filter((e) => {
      if (kind !== "all" && e.kind !== kind) return false;
      if (!query) return true;
      return (
        e.who.toLowerCase().includes(query) ||
        e.title.toLowerCase().includes(query) ||
        e.detail.toLowerCase().includes(query)
      );
    });
  }, [ledger, q, kind]);

  if (!allowed) return null;

  const hasOnline = ledger.some((e) => e.kind === "online");

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Деньги"
      subtitle="Что платформа получила, что списала и сколько осталось у партнёров."
    >
      {!hasOnline ? (
        <div className="surface-card mb-6 flex flex-col gap-3 border-premium/25 bg-premium/[0.05] p-5 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-premium/15 text-premium">
            <CreditCard className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold">Онлайн-оплата ещё не подключена</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Партнёры платят переводом, а вы начисляете им баланс продвижения — эти движения ниже.
              Когда подключим платёжного провайдера, карточные оплаты Premium и подписок появятся
              здесь автоматически, отдельной строкой.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/promotions">Начислить баланс</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MoneyCard
          icon={ArrowDownLeft}
          label="Получено от партнёров"
          value={formatPrice(money.toppedUp)}
          hint={
            money.toppedUp30 > 0
              ? `${formatPrice(money.toppedUp30)} за 30 дней`
              : "за 30 дней поступлений не было"
          }
          accent="in"
        />
        <MoneyCard
          icon={ArrowUpRight}
          label="Отработано платформой"
          value={formatPrice(money.spent)}
          hint="списано за запущенные кампании"
          accent="out"
        />
        <MoneyCard
          icon={Wallet}
          label="Остаток у партнёров"
          value={formatPrice(money.balances)}
          hint="деньги получены, услуга ещё не оказана"
        />
        <MoneyCard
          icon={CreditCard}
          label="Онлайн-оплаты"
          value={hasOnline ? formatPrice(money.online) : "—"}
          hint={hasOnline ? "картой через провайдера" : "провайдер не подключён"}
        />
      </div>

      <div className="mt-6">
        <FilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Компания, тип, комментарий…"
          filters={[
            {
              key: "kind",
              value: kind,
              placeholder: "Движение",
              onChange: setKind,
              options: [
                { value: "all", label: "Все движения" },
                { value: "topup", label: "Пополнения" },
                { value: "spend", label: "Списания" },
                { value: "online", label: "Онлайн-оплаты" },
              ],
            },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Движений денег ещё не было"
          description="Первое появится, когда вы начислите партнёру баланс продвижения."
          action={
            <Button size="sm" asChild>
              <Link to="/admin/promotions">Перейти в «Продвижение»</Link>
            </Button>
          }
        />
      ) : (
        <ul className="surface-card divide-y divide-border">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center gap-3 p-4">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  e.kind === "topup"
                    ? "bg-success/12 text-success"
                    : e.kind === "spend"
                      ? "bg-primary-soft text-primary"
                      : "bg-secondary text-foreground",
                )}
              >
                {e.kind === "topup" ? (
                  <ArrowDownLeft className="size-4" />
                ) : e.kind === "spend" ? (
                  <ArrowUpRight className="size-4" />
                ) : (
                  <CreditCard className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {e.title}
                  <span className="font-normal text-muted-foreground"> · {e.who}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "font-display text-base font-semibold tabular-nums",
                    e.amount < 0 ? "text-muted-foreground" : "text-success",
                  )}
                >
                  {e.amount < 0 ? "−" : "+"}
                  {formatPrice(Math.abs(e.amount))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                </p>
              </div>
              <div className="hidden shrink-0 sm:block">
                <StatusBadge
                  label={e.status}
                  tone={
                    e.tone === "success" ? "success" : e.tone === "danger" ? "danger" : "neutral"
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashShell>
  );
}
