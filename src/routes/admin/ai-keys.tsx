import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, RotateCcw, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { KpiLinkCard, formatRelativeRu, userName } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/data/demo";
import { getAiSettings, saveAiSettings, testAiSettings } from "@/lib/ai-settings.functions";
import type { AiSettingsView } from "@/lib/ai-settings.functions";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/ai-keys")({
  head: () => privatePage("AI и ключи API · Админ TourGo"),
  component: AdminAiKeysPage,
});

const PROVIDERS: Array<{ value: AiSettingsView["provider"]; label: string; model: string }> = [
  { value: "lovable", label: "Встроенный AI (без ключа)", model: "google/gemini-3-flash" },
  { value: "openai", label: "OpenAI (ChatGPT)", model: "gpt-4o-mini" },
  { value: "anthropic", label: "Anthropic Claude", model: "claude-opus-5" },
  { value: "google", label: "Google Gemini", model: "gemini-2.5-flash" },
  { value: "openrouter", label: "OpenRouter", model: "openai/gpt-4o-mini" },
  { value: "custom", label: "Свой OpenAI-совместимый endpoint", model: "" },
];

/** Должен совпадать с DEFAULT_SYSTEM_PROMPT в src/lib/ai-provider.server.ts. */
const DEFAULT_PROMPT =
  "Ты TourGo AI, travel-консьерж маркетплейса туров. Отвечай кратко, дружелюбно, по-русски. " +
  "Помогай подобрать тур: уточняй город вылета, направление, даты, количество туристов, бюджет и питание. " +
  "Если данных достаточно, предложи параметры поиска и следующий шаг.";

const DAY_MS = 86400000;

function AdminAiKeysPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const nav = useAdminNav();
  const state = usePlatformStore();

  const load = useServerFn(getAiSettings);
  const save = useServerFn(saveAiSettings);
  const test = useServerFn(testAiSettings);

  const [form, setForm] = useState<AiSettingsView | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"load" | "save" | "test" | null>("load");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string; at: string } | null>(
    null,
  );

  const usage = useMemo(() => {
    const weekAgo = Date.now() - 7 * DAY_MS;
    const recent = state.aiSearches.filter((s) => new Date(s.createdAt).getTime() >= weekAgo);
    const users = new Set(state.aiSearches.map((s) => s.userId)).size;
    const withResults = state.aiSearches.filter((s) => s.resultsCount > 0).length;
    return {
      total: state.aiSearches.length,
      week: recent.length,
      users,
      hitRate: state.aiSearches.length
        ? Math.round((withResults / state.aiSearches.length) * 100)
        : 0,
    };
  }, [state.aiSearches]);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    setLoadError(null);
    load({})
      .then((data) => {
        if (alive) setForm(data);
      })
      .catch((error: unknown) => {
        // Показываем причину на самой странице: тост исчезает, а страница
        // иначе навсегда остаётся на «Загружаем настройки…».
        if (alive) setLoadError(error instanceof Error ? error.message : "Сервер не ответил");
      })
      .finally(() => {
        if (alive) setBusy(null);
      });
    return () => {
      alive = false;
    };
  }, [allowed, load, reloadKey]);

  if (!allowed) return null;

  const patch = (next: Partial<AiSettingsView>) =>
    setForm((prev) => (prev ? { ...prev, ...next } : prev));

  const submit = async () => {
    if (!form) return;
    setBusy("save");
    try {
      await save({
        data: {
          provider: form.provider,
          model: form.model,
          baseUrl: form.baseUrl,
          apiKey,
          enabled: form.enabled,
          systemPrompt: form.systemPrompt,
        },
      });
      setApiKey("");
      const fresh = await load({});
      setForm(fresh);
      toast.success("Настройки AI сохранены");
    } catch {
      toast.error("Не удалось сохранить настройки");
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    setBusy("test");
    try {
      const res = await test({});
      setTestResult({
        ok: res.ok,
        text: res.ok ? res.text.slice(0, 160) : res.error,
        at: new Date().toISOString(),
      });
      if (res.ok) toast.success("Соединение работает");
      else toast.error(res.error);
    } catch {
      setTestResult({ ok: false, text: "Проверка не удалась", at: new Date().toISOString() });
      toast.error("Проверка не удалась");
    } finally {
      setBusy(null);
    }
  };

  const providerLabel = PROVIDERS.find((p) => p.value === form?.provider)?.label ?? form?.provider;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="AI и ключи API"
      subtitle="AI-консьерж платформы: провайдер, ключ, промпт и что спрашивают туристы."
    >
      {!form && loadError ? (
        <div className="surface-card border-destructive/30 bg-destructive/[0.04] p-6">
          <p className="font-display text-base font-semibold">Настройки AI не загрузились</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Ключ и промпт лежат в закрытой таблице и читаются серверной функцией. Сейчас она не
            ответила: {loadError}. Обычно это временная недоступность базы.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setBusy(null);
              setReloadKey((n) => n + 1);
            }}
          >
            Попробовать снова
          </Button>
        </div>
      ) : !form ? (
        <div className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Загружаем настройки…
        </div>
      ) : (
        <>
          {/* Статус AI одним взглядом. */}
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5",
              form.enabled ? "border-success/30 bg-success/5" : "border-premium/30 bg-premium/10",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-2xl",
                  form.enabled ? "bg-success/15 text-success" : "bg-premium/15 text-premium",
                )}
              >
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="font-display text-base font-semibold">
                  {form.enabled ? "AI-консьерж работает" : "AI-консьерж выключен"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {providerLabel} · {form.model || "модель не задана"} · ключ:{" "}
                  {form.hasKey ? form.keyMask : "не задан"}
                </p>
                {/*
                  Встроенный AI берёт ключ из переменной окружения сервера, а не
                  из этой формы, и страница раньше писала «не задан» даже когда
                  ключ был. Теперь спрашиваем тот же ключ, которым пойдёт
                  настоящий запрос, и если его нет — говорим это прямо.
                */}
                {form.provider === "lovable" && form.keySource === "none" ? (
                  <p className="mt-1 max-w-md text-xs text-destructive">
                    Встроенный AI берёт ключ из переменной сервера LOVABLE_API_KEY, а её нет —
                    запрос к модели вернёт ошибку. Либо добавьте переменную в настройках хостинга,
                    либо выберите ниже другого провайдера и вставьте его ключ. Подбор на главной
                    работает без модели: он разбирает запрос сам.
                  </p>
                ) : null}
                {testResult ? (
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      testResult.ok ? "text-success" : "text-destructive",
                    )}
                  >
                    {testResult.ok ? "✓ Проверка прошла: " : "✗ "}
                    {testResult.text} · {formatRelativeRu(testResult.at)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={runTest} disabled={busy !== null}>
                {busy === "test" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Проверить соединение
              </Button>
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => patch({ enabled })}
                aria-label="Включить AI-чат"
              />
            </div>
          </div>

          {/* Использование AI. */}
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiLinkCard
              label="AI-поисков всего"
              value={formatNumber(usage.total)}
              hint="за всю историю"
            />
            <KpiLinkCard
              label="За 7 дней"
              value={formatNumber(usage.week)}
              hint="свежая нагрузка"
            />
            <KpiLinkCard
              label="Пользователей"
              value={formatNumber(usage.users)}
              hint="пробовали AI-поиск"
            />
            <KpiLinkCard
              label="Нашли варианты"
              value={usage.total ? `${usage.hitRate}%` : "—"}
              hint="запросов с результатами"
            />
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="surface-card space-y-5 p-6">
              <h2 className="font-display text-lg font-semibold">Настройки провайдера</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Провайдер</Label>
                  <Select
                    value={form.provider}
                    onValueChange={(value) => {
                      const preset = PROVIDERS.find((p) => p.value === value);
                      patch({
                        provider: value as AiSettingsView["provider"],
                        model: preset?.model || form.model,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-model">Модель</Label>
                  <Input
                    id="ai-model"
                    value={form.model}
                    onChange={(e) => patch({ model: e.target.value })}
                    placeholder="gpt-4o-mini"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-base">Base URL (необязательно)</Label>
                <Input
                  id="ai-base"
                  value={form.baseUrl}
                  onChange={(e) => patch({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
                <p className="text-xs text-muted-foreground">
                  Оставьте пустым: используется стандартный адрес провайдера.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-key">API-ключ</Label>
                <Input
                  id="ai-key"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    form.hasKey ? `Сохранён: ${form.keyMask}, введите новый для замены` : "sk-…"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Ключ хранится в закрытой таблице и никогда не отдаётся в браузер. Встроенному AI
                  ключ не нужен.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="ai-prompt">Системный промпт</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => patch({ systemPrompt: DEFAULT_PROMPT })}
                  >
                    <RotateCcw className="size-3" />
                    Стандартный
                  </Button>
                </div>
                <Textarea
                  id="ai-prompt"
                  rows={6}
                  value={form.systemPrompt}
                  onChange={(e) => patch({ systemPrompt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Характер консьержа: что уточнять у туриста и как отвечать. Меняется без деплоя.
                </p>
              </div>

              <Button onClick={submit} disabled={busy !== null}>
                {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : null}
                Сохранить
              </Button>
            </div>

            <div className="space-y-6">
              <section className="surface-card p-6">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                  <Search className="size-4" />
                  Что спрашивают у AI
                </h2>
                {state.aiSearches.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Запросов пока нет. Как только туристы начнут пользоваться AI-поиском, здесь
                    появятся их формулировки — готовые инсайты, что люди ищут.
                  </p>
                ) : (
                  <ul className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                    {state.aiSearches.slice(0, 15).map((s) => (
                      <li key={s.id} className="rounded-2xl bg-secondary/50 p-3">
                        <p className="text-sm font-medium leading-snug">«{s.originalQuery}»</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {userName(s.userId)} · найдено {formatNumber(s.resultsCount)} ·{" "}
                          {formatRelativeRu(s.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <aside className="surface-card space-y-3 p-6 text-sm">
                <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <KeyRound className="size-4" />
                </span>
                <h2 className="font-display text-base font-semibold">Как это работает</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• AI отвечает в чате на главной и на странице «AI-поиск»</li>
                  <li>• Все запросы идут через сервер — ключ не попадает в браузер</li>
                  <li>• Пока AI выключен, чат отвечает подсказкой вместо модели</li>
                  <li>
                    • Обновлено:{" "}
                    {form.updatedAt ? new Date(form.updatedAt).toLocaleString("ru-RU") : "нет"}
                  </li>
                </ul>
              </aside>
            </div>
          </div>
        </>
      )}
    </DashShell>
  );
}
