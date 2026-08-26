import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice } from "@/data/demo";
import { mockPaymentProvider } from "@/lib/platform/adapters";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { appendAudit, pushNotification } from "@/lib/platform/catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState, uid } from "@/lib/platform/store";
import type { OperatorPlanCode } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/billing")({
  head: () => ({ meta: [{ title: "Тариф · TourGo" }] }),
  component: OperatorBillingPage,
});

const catalog: Record<
  OperatorPlanCode,
  {
    title: string;
    forWhom: string;
    included: string[];
    highlight?: string;
  }
> = {
  START: {
    title: "Старт",
    forWhom: "Если туров немного и нужно просто отвечать на заявки.",
    included: [
      "Страница компании и знак проверки",
      "Заявки туристов, ответы и сообщения",
      "Туры вручную, со сайта и из Telegram-поста",
      "Простая аналитика: просмотры и брони",
      "Продвижение карточки. Оплачивается отдельно",
    ],
  },
  BUSINESS: {
    title: "Бизнес",
    forWhom: "Если каталог большой и не хотите вести его в двух системах.",
    included: [
      "Всё из тарифа «Старт»",
      "Supplier Feed: автозагрузка цен и наличия по API",
      "Полная аналитика: воронка, города, конверсия",
      "Удобнее вести много туров сразу",
    ],
    highlight: "Чаще всего выбирают",
  },
  PRO: {
    title: "Про",
    forWhom: "Если нужен живой прайс, максимум показов и место на главной.",
    included: [
      "Всё из тарифа «Бизнес»",
      "Перепроверка цены у поставщика при заявке",
      "Приоритет в поиске среди похожих туров",
      "Карточка на главной странице TourGo",
    ],
  },
};

function OperatorBillingPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN"]);
  const { user, organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  if (!allowed || !organization || !user) {
    return (
      <DashShell
        brand="TourGo"
        items={nav}
        title="Тариф"
        subtitle="Меняет только владелец компании"
      >
        <p className="text-sm text-muted-foreground">
          Посмотреть и сменить тариф может владелец. Менеджер работает с заявками и турами.
        </p>
      </DashShell>
    );
  }

  // «Бизнес без туров»: без лимитов туров и туровых формулировок.
  const businessOnly = isBusinessOnlyServices(organization.services);
  const plans = state.config.operatorPlans;
  const current = plans.find((p) => p.code === organization.planCode) ?? plans[0]!;
  const currentCopy = catalog[current.code];
  const activeTours = state.tours.filter(
    (t) => t.operatorOrgId === organization.id && t.status === "active",
  ).length;
  const limit = current.tourLimit + organization.additionalTourLimit;
  const usedPct = Math.min(100, Math.round((activeTours / Math.max(1, limit)) * 100));
  const sub = state.subscriptions.find(
    (s) => s.organizationId === organization.id && s.status === "active",
  );
  const payments = state.payments.filter(
    (p) => p.organizationId === organization.id && p.type === "operator_subscription",
  );

  const selectPlan = async (code: OperatorPlanCode) => {
    const plan = plans.find((p) => p.code === code)!;
    const payment = await mockPaymentProvider.createPayment({
      amount: plan.price,
      currency: plan.currency,
      type: "operator_subscription",
      metadata: { plan: code },
    });
    setState((s) => ({
      ...s,
      organizations: s.organizations.map((o) =>
        o.id === organization.id ? { ...o, planCode: code } : o,
      ),
      payments: [
        {
          id: uid(),
          userId: user.id,
          organizationId: organization.id,
          amount: plan.price,
          currency: plan.currency,
          type: "operator_subscription",
          provider: "mock",
          providerPaymentId: payment.providerPaymentId,
          status: "paid",
          createdAt: nowIso(),
          metadata: { plan: code },
        },
        ...s.payments,
      ],
      subscriptions: [
        {
          id: uid(),
          organizationId: organization.id,
          planId: code,
          status: "active",
          startedAt: nowIso(),
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          autoRenew: true,
          providerSubscriptionId: payment.providerPaymentId,
        },
        ...s.subscriptions.filter((item) => item.organizationId !== organization.id),
      ],
    }));
    appendAudit({
      actorId: user.id,
      action: "operator_plan_change",
      entityType: "organization",
      entityId: organization.id,
      meta: { plan: code },
    });
    pushNotification(
      user.id,
      "subscription_expiry",
      `Тариф «${catalog[code].title}»`,
      businessOnly
        ? `Кабинет переключён на «${catalog[code].title}».`
        : `Кабинет переключён на «${catalog[code].title}». Лимит активных туров: ${plan.tourLimit}.`,
    );
    toast.success(`Тариф «${catalog[code].title}» включён на 30 дней`);
  };

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Тариф"
      subtitle={
        businessOnly
          ? "За кабинет компании. Клиент платит вам напрямую, не TourGo."
          : "За кабинет и лимит туров. Турист платит вам за поездку, не TourGo."
      }
    >
      <div className="surface-card mb-6 grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Сейчас у вас</p>
          <p className="mt-1 font-display text-2xl font-semibold">{currentCopy.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{currentCopy.forWhom}</p>
          {businessOnly ? (
            <p className="mt-4 text-sm">Объявления в витринах — без лимита по количеству.</p>
          ) : (
            <>
              <p className="mt-4 text-sm">
                Активных туров: {formatNumber(activeTours)} из {formatNumber(limit)}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", usedPct >= 90 ? "bg-primary" : "bg-success")}
                  style={{ width: `${Math.max(6, usedPct)}%` }}
                />
              </div>
            </>
          )}
          {sub ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Оплачен до {new Date(sub.expiresAt).toLocaleDateString("ru-RU")}
              {sub.autoRenew ? " · продлевается сам" : ""}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              {formatPrice(current.price)} в месяц
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
          <p className="font-medium">Что входит в тариф</p>
          <p className="mt-2 text-muted-foreground">
            {businessOnly
              ? "Кабинет, объявления, страница компании и статистика визитов."
              : "Кабинет, заявки, страница компании и лимит активных туров."}
          </p>
          <p className="mt-3 font-medium">Что отдельно</p>
          <p className="mt-2 text-muted-foreground">
            Продвижение карточки в поиске: «Хит», «Рекомендуем», место на главной.
          </p>
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold">Выберите тариф</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {businessOnly
          ? "Заметность в витринах и инструменты продвижения компании."
          : "Лимит туров, заметность и способ обновления каталога (вручную или API)."}
      </p>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const copy = catalog[plan.code];
          const on = organization.planCode === plan.code;
          const perTour = plan.tourLimit > 0 ? Math.round(plan.price / plan.tourLimit) : plan.price;
          return (
            <article
              key={plan.code}
              className={cn(
                "surface-card flex flex-col p-6",
                on && "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl font-semibold">{copy.title}</h3>
                  {copy.highlight ? (
                    <p className="mt-1 text-xs font-semibold text-primary">{copy.highlight}</p>
                  ) : null}
                </div>
                {on ? (
                  <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-semibold text-success">
                    Ваш тариф
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">{formatPrice(plan.price)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {businessOnly
                  ? "в месяц · объявления без лимита"
                  : `в месяц · до ${formatNumber(plan.tourLimit)} активных туров`}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{copy.forWhom}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {copy.included.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {businessOnly ? null : (
                <p className="mt-4 text-xs text-muted-foreground">
                  Около {formatPrice(perTour)} за слот тура в месяц
                </p>
              )}
              <Button
                className="mt-6 w-full"
                variant={on ? "secondary" : "default"}
                disabled={on}
                onClick={() => void selectPlan(plan.code)}
              >
                {on ? "Уже подключён" : `Перейти на «${copy.title}»`}
              </Button>
            </article>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">За что платите TourGo</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li>
              <p className="font-medium">Тариф кабинета</p>
              <p className="mt-1 text-muted-foreground">
                Сколько туров одновременно видно туристам, заявки, аналитика, страница компании.
              </p>
            </li>
            <li>
              <p className="font-medium">Продвижение. Отдельно</p>
              <p className="mt-1 text-muted-foreground">
                Поднять один тур в поиске или поставить на главную. Платите за конкретную карточку и
                срок, не за весь каталог.
              </p>
              <Button size="sm" variant="outline" className="mt-3" asChild>
                <Link to="/operator/promotion">
                  <Megaphone className="size-3.5" />
                  Открыть продвижение
                </Link>
              </Button>
            </li>
            <li>
              <p className="font-medium">Что не берём</p>
              <p className="mt-1 text-muted-foreground">
                Комиссию с брони. Турист платит вам. TourGo не проводит оплату за тур.
              </p>
            </li>
          </ul>
        </section>

        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Сравнение</h2>
          <div className="mt-4 overflow-x-auto text-sm">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-2 font-medium">Что входит</th>
                  <th className="pb-2 font-medium">Старт</th>
                  <th className="pb-2 font-medium">Бизнес</th>
                  <th className="pb-2 font-medium">Про</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:pr-3">
                {[
                  ["Активные туры", "100", "1 000", "5 000"],
                  ["Заявки и сообщения", "Да", "Да", "Да"],
                  ["Сайт / Telegram → черновик", "Да", "Да", "Да"],
                  ["API Supplier Feed", "-", "Да", "Да"],
                  ["Live цена при заявке", "-", "-", "Да"],
                  ["Аналитика", "Базовая", "Полная", "Полная"],
                  ["Место на главной", "Отдельно", "Отдельно", "В приоритете"],
                ].map(([name, a, b, c]) => (
                  <tr key={name} className="border-t border-border">
                    <td className="text-muted-foreground">{name}</td>
                    <td>{a}</td>
                    <td>{b}</td>
                    <td>{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {payments.length > 0 ? (
        <section className="surface-card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Оплаты тарифа</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {payments.slice(0, 8).map((p) => {
              const code = String(p.metadata?.["plan"] ?? "") as OperatorPlanCode;
              const title = catalog[code]?.title ?? "Тариф";
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3"
                >
                  <span>
                    {title} · {new Date(p.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                  <span className="font-medium">{formatPrice(p.amount)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </DashShell>
  );
}
