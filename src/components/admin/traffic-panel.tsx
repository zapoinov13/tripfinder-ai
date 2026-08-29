import { ArrowDownRight, ArrowUpRight, Eye, Globe, MousePointerClick, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { formatNumber } from "@/data/demo";
import {
  DEVICE_LABEL,
  SOURCE_LABEL,
  bounceRate,
  fetchTrafficStats,
  pagesPerSession,
  type TrafficResult,
  type TrafficSlice,
  type TrafficStats,
} from "@/lib/analytics/traffic";
import { cn } from "@/lib/utils";

/**
 * Посещаемость сайта: свой счётчик вместо Метрики и GA.
 *
 * Отвечает на вопросы, на которые внутренние события платформы ответить не
 * могут: сколько людей вообще дошло до сайта, откуда они, с чего начали и
 * ушли ли сразу. Без этого «поиск → заявка» считается от неизвестного числа —
 * видно, что конверсия упала, и непонятно, стало ли хуже на сайте или просто
 * кончился трафик.
 */

function Change({ value, prev }: { value: number; prev: number }) {
  if (prev === 0) {
    if (value > 0) return <span className="text-xs font-semibold text-success">первые данные</span>;
    return <span className="text-xs text-muted-foreground">нет сравнения</span>;
  }
  const pct = Math.round(((value - prev) / prev) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground">как в прошлый период</span>;
  const Icon = pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        pct > 0 ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(pct)}% к прошлому периоду
    </span>
  );
}

function Bars({
  rows,
  empty,
  label,
}: {
  rows: Array<{ key: string; sessions: number }>;
  empty: string;
  label?: (key: string) => string;
}) {
  if (rows.length === 0) return <p className="mt-4 text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.sessions), 1);
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{label ? label(row.key) : row.key}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatNumber(row.sessions)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.max(4, (row.sessions / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Внутренние переходы — не источник трафика, а хождение по сайту. */
function realSources(rows: TrafficSlice[]) {
  return rows.filter((r) => r.key !== "internal");
}

function Kpi({
  icon: Icon,
  label,
  value,
  prev,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  prev?: { value: number; prev: number };
  hint?: string;
}) {
  return (
    <div className="surface-card p-5">
      <span className="grid size-9 place-items-center rounded-xl bg-secondary text-foreground">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {prev ? (
        <div className="mt-1.5">
          <Change value={prev.value} prev={prev.prev} />
        </div>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Panels({ stats }: { stats: TrafficStats }) {
  const bounce = bounceRate(stats);
  const perSession = pagesPerSession(stats);
  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="Посетителей"
          value={formatNumber(stats.visitors)}
          prev={{ value: stats.visitors, prev: stats.prevVisitors }}
          hint="разные браузеры за период"
        />
        <Kpi
          icon={MousePointerClick}
          label="Визитов"
          value={formatNumber(stats.sessions)}
          prev={{ value: stats.sessions, prev: stats.prevSessions }}
          hint="заход с перерывом от 30 минут — новый визит"
        />
        <Kpi
          icon={Eye}
          label="Просмотров страниц"
          value={formatNumber(stats.visits)}
          prev={{ value: stats.visits, prev: stats.prevVisits }}
          {...(perSession !== null ? { hint: `страниц за визит: ${perSession}` } : {})}
        />
        <Kpi
          icon={Globe}
          label="Ушли с первой страницы"
          value={bounce === null ? "—" : `${bounce}%`}
          hint={
            bounce === null
              ? "визитов пока не было"
              : bounce > 70
                ? "высоко: страница входа не отвечает на запрос"
                : "норма для витрины — 40–70%"
          }
        />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <section className="surface-card p-6">
          <h3 className="font-display text-lg font-semibold">Откуда приходят</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Считается по первой странице визита: только она знает, откуда человек пришёл.
          </p>
          <Bars
            rows={realSources(stats.sources)}
            empty="Визитов за период не было."
            label={(k) => SOURCE_LABEL[k] ?? k}
          />
        </section>

        <section className="surface-card p-6">
          <h3 className="font-display text-lg font-semibold">Конкретные источники</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Какой поисковик, какая соцсеть, какой сайт привёл людей.
          </p>
          <Bars rows={stats.refs} empty="Пока только прямые заходы — по ссылке или из закладок." />
        </section>

        <section className="surface-card p-6">
          <h3 className="font-display text-lg font-semibold">С чего начинают</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Первая страница визита. Ей и нужен самый сильный заголовок.
          </p>
          <Bars rows={stats.entryPages} empty="Визитов за период не было." />
        </section>

        <section className="surface-card p-6">
          <h3 className="font-display text-lg font-semibold">Что смотрят</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Страницы по числу просмотров.</p>
          {stats.pages.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Просмотров за период не было.</p>
          ) : (
            <Bars rows={stats.pages.map((p) => ({ key: p.key, sessions: p.visits }))} empty="" />
          )}
        </section>
      </div>

      {stats.campaigns.length > 0 ? (
        <section className="surface-card mt-6 p-6">
          <h3 className="font-display text-lg font-semibold">Рекламные кампании</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            По метке utm_campaign в ссылке. Видно, какое объявление реально приводит людей.
          </p>
          <Bars rows={stats.campaigns} empty="" />
        </section>
      ) : null}

      <section className="surface-card mt-6 p-6">
        <h3 className="font-display text-lg font-semibold">С каких устройств</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Если телефон впереди, всё решают первый экран и скорость.
        </p>
        <Bars
          rows={stats.devices}
          empty="Визитов за период не было."
          label={(k) => DEVICE_LABEL[k] ?? k}
        />
      </section>
    </>
  );
}

export function TrafficPanel({ days }: { days: number }) {
  const [result, setResult] = useState<TrafficResult | null>(null);

  useEffect(() => {
    let alive = true;
    setResult(null);
    void fetchTrafficStats(days).then((r) => {
      if (alive) setResult(r);
    });
    return () => {
      alive = false;
    };
  }, [days]);

  if (result === null) {
    return (
      <div className="surface-card mt-4 p-6 text-sm text-muted-foreground">
        Считаем посещаемость…
      </div>
    );
  }

  if (result.state === "needs-sql") {
    return (
      <div className="surface-card mt-4 border-premium/30 bg-premium/5 p-6">
        <p className="font-display text-base font-semibold">Осталось включить подсчёт</p>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Визиты уже записываются — они копятся в базе с этой минуты. Чтобы их посчитать, нужно один
          раз выполнить запрос из файла{" "}
          <code className="text-foreground">supabase/TRAFFIC.sql</code> в SQL Editor проекта. После
          этого раздел заполнится сам.
        </p>
      </div>
    );
  }

  if (result.state === "offline") {
    return (
      <div className="surface-card mt-4 p-6 text-sm text-muted-foreground">
        База не настроена в этом окружении — посещаемость считать не из чего.
      </div>
    );
  }

  if (result.state === "error") {
    return (
      <div className="surface-card mt-4 p-6">
        <p className="font-display text-base font-semibold">Не удалось получить посещаемость</p>
        <p className="mt-1 text-sm text-muted-foreground">{result.reason}</p>
      </div>
    );
  }

  if (result.stats.visits === 0) {
    return (
      <div className="surface-card mt-4 p-6">
        <p className="font-display text-base font-semibold">За период на сайт никто не заходил</p>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Счётчик работает и ждёт первых посетителей. Свои заходы он тоже считает — откройте сайт с
          телефона, и здесь появится первый визит.
        </p>
      </div>
    );
  }

  return <Panels stats={result.stats} />;
}
