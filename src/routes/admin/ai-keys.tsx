import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/ai-prompt";
import { PROVIDER_KEY_SOURCE, PROVIDER_LABEL, detectProviderFromKey } from "@/lib/ai-provider-keys";
import {
  getAiSettings,
  listAiModels,
  saveAiSettings,
  testAiSettings,
} from "@/lib/ai-settings.functions";
import type { AiCheck, AiSettingsView } from "@/lib/ai-settings.functions";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/ai-keys")({
  head: () => privatePage("AI и ключи API · Админ TourGo"),
  component: AdminAiKeysPage,
});

/**
 * Список провайдеров нужен только для ручного выбора: обычно провайдера
 * называет сам ключ. Моделей здесь нет намеренно — захардкоженный
 * идентификатор устаревает молча, а провайдер знает свой список точно.
 */
const PROVIDERS: Array<{ value: AiSettingsView["provider"]; label: string }> = [
  { value: "openai", label: "OpenAI (ChatGPT)" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "google", label: "Google Gemini" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "lovable", label: "Встроенный AI (без ключа)" },
  { value: "custom", label: "Свой OpenAI-совместимый endpoint" },
];

const DAY_MS = 86400000;

/**
 * Итог проверки: что ответила модель и что консультант видит на платформе.
 *
 * Одной строки «✓ проверка прошла» мало. Модель может отвечать прекрасно и
 * при этом не знать ни одного вашего предложения — тогда она отвечает
 * «вообще» и советует то, чего у вас нет. Это и есть главное, что здесь
 * нужно увидеть.
 */
function CheckReport({ check }: { check: AiCheck & { at: string } }) {
  const empty = check.catalog.offers === 0 && check.catalog.companies === 0;
  return (
    <div className="mt-2 space-y-1 text-xs">
      <p className={check.model.ok ? "text-success" : "text-destructive"}>
        {check.model.ok
          ? `✓ Модель ответила: ${check.model.text.slice(0, 80)}`
          : `✗ ${check.model.error}`}
      </p>
      <p className={empty ? "text-destructive" : "text-muted-foreground"}>
        {empty
          ? "✗ Консультант не видит ни одного предложения — он будет отвечать общими словами. Заведите компании и туры."
          : `✓ Консультант видит: разделов ${check.catalog.verticals}, предложений ${check.catalog.offers}, направлений ${check.catalog.destinations}, компаний ${check.catalog.companies}`}
      </p>
      {!check.enabled ? (
        <p className="text-destructive">
          ✗ Чат выключен — посетители его не видят. Включите переключатель справа.
        </p>
      ) : null}
      <p className="text-muted-foreground">проверено {formatRelativeRu(check.at)}</p>
    </div>
  );
}

/**
 * Один шаг настройки. Номер и подпись сверху, поля под ними: так видно, что
 * шагов всего три и в каком порядке они идут.
 */
function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold tabular-nums">
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:pl-10">{children}</div>
    </section>
  );
}

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
  const [check, setCheck] = useState<(AiCheck & { at: string }) | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsBusy, setModelsBusy] = useState(false);
  const askModels = useServerFn(listAiModels);

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

  // Ключ уже сохранён — список моделей нужен сразу, без лишнего нажатия.
  useEffect(() => {
    if (!form?.hasKey || models || modelsBusy || modelsError) return;
    void loadModels(form.provider, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.hasKey, form?.provider]);

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
      setCheck({ ...res, at: new Date().toISOString() });
      if (res.model.ok) toast.success("Модель ответила");
      else toast.error(res.model.error);
    } catch {
      setCheck(null);
      toast.error("Проверка не удалась");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Список моделей спрашиваем у провайдера. Ключ из формы отправляем вместе с
   * запросом: иначе выбрать модель можно было бы только после сохранения —
   * то есть сохранить вслепую, а потом исправлять.
   */
  const loadModels = async (provider: AiSettingsView["provider"], key: string) => {
    setModelsBusy(true);
    setModelsError(null);
    try {
      const res = await askModels({ data: { provider, apiKey: key } });
      if (res.ok) {
        setModels(res.models);
      } else {
        setModels(null);
        setModelsError(res.error);
      }
    } catch {
      setModels(null);
      setModelsError("Сервер не ответил");
    } finally {
      setModelsBusy(false);
    }
  };

  const providerLabel = PROVIDERS.find((p) => p.value === form?.provider)?.label ?? form?.provider;
  const detectedProvider = detectProviderFromKey(apiKey);
  const keySource = form ? PROVIDER_KEY_SOURCE[form.provider] : undefined;

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
                {check ? <CheckReport check={check} /> : null}
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
            <div className="surface-card divide-y divide-border overflow-hidden p-0">
              <div className="bg-secondary/30 px-6 py-4">
                <h2 className="font-display text-lg font-semibold">Подключение модели</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Три шага. После сохранения нажмите «Проверить соединение» наверху.
                </p>
              </div>
              {/*
                Шаги, а не свалка полей. Раньше на одном экране лежали рядом
                провайдер, модель, Base URL и ключ — четыре поля, из которых
                три зависят от четвёртого, и ни одно не подсказывало, с чего
                начать. Порядок здесь тот же, что в жизни: сначала ключ,
                потом модель, потом характер.
              */}
              <Step
                number={1}
                title="Ключ провайдера"
                hint="Ключ хранится в закрытой таблице и никогда не отдаётся в браузер."
              >
                <Input
                  id="ai-key"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => {
                    const value = e.target.value;
                    setApiKey(value);
                    // Провайдера называет сам ключ — спрашивать не о чем.
                    const detected = detectProviderFromKey(value);
                    if (detected && detected !== form.provider) {
                      patch({ provider: detected, model: "" });
                      setModels(null);
                      setModelsError(null);
                    }
                  }}
                  onBlur={() => {
                    if (apiKey.trim()) void loadModels(form.provider, apiKey.trim());
                  }}
                  placeholder={form.hasKey ? `Сохранён: ${form.keyMask}` : "sk-…"}
                />

                {detectedProvider ? (
                  <p className="flex items-center gap-1.5 text-sm text-success">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Это ключ {PROVIDER_LABEL[detectedProvider]}
                  </p>
                ) : apiKey.trim() ? (
                  <p className="text-sm text-muted-foreground">
                    Провайдер по такому ключу не узнаётся — выберите его ниже вручную.
                  </p>
                ) : form.hasKey ? (
                  <p className="text-sm text-muted-foreground">
                    Сейчас работает {providerLabel}. Чтобы сменить — вставьте новый ключ.
                  </p>
                ) : null}

                {keySource ? (
                  <a
                    href={keySource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Где взять ключ: {keySource.label}
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}

                <details className="group">
                  <summary className="cursor-pointer list-none text-sm text-muted-foreground underline-offset-2 hover:underline">
                    Выбрать провайдера вручную
                  </summary>
                  <div className="mt-3 space-y-3">
                    <Select
                      value={form.provider}
                      onValueChange={(value) => {
                        patch({ provider: value as AiSettingsView["provider"], model: "" });
                        setModels(null);
                        setModelsError(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/*
                      Адрес endpoint нужен ровно одному варианту — своему
                      серверу. Для остальных провайдеров адрес известен, и
                      поле только путало: пустое оно у всех, а выглядело как
                      незаполненная настройка.
                    */}
                    {form.provider === "custom" ? (
                      <div className="space-y-2">
                        <Label htmlFor="ai-base">Адрес endpoint</Label>
                        <Input
                          id="ai-base"
                          value={form.baseUrl}
                          onChange={(e) => patch({ baseUrl: e.target.value })}
                          placeholder="https://ваш-сервер/v1"
                        />
                      </div>
                    ) : null}
                  </div>
                </details>
              </Step>

              <Step
                number={2}
                title="Модель"
                hint="Список приходит от провайдера — в нём то, что доступно именно вашему ключу."
              >
                {models && models.length > 0 ? (
                  <Select value={form.model} onValueChange={(model) => patch({ model })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите модель" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="ai-model"
                    value={form.model}
                    onChange={(e) => patch({ model: e.target.value })}
                    placeholder="Нажмите «Показать доступные»"
                  />
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={modelsBusy || (!apiKey.trim() && !form.hasKey)}
                    onClick={() => void loadModels(form.provider, apiKey.trim())}
                  >
                    {modelsBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    {models ? "Обновить список" : "Показать доступные"}
                  </Button>
                  {models ? (
                    <span className="text-sm text-muted-foreground">
                      доступно моделей: {models.length}
                    </span>
                  ) : null}
                </div>

                {modelsError ? (
                  <p className="text-sm text-destructive">
                    {modelsError}. Модель можно вписать вручную — поле выше.
                  </p>
                ) : null}
              </Step>

              <Step
                number={3}
                title="Характер консультанта"
                hint="Меняется без деплоя. Что есть в каталоге и чего нельзя выдумывать, сервер добавляет сам — здесь только манера разговора."
              >
                <Textarea
                  id="ai-prompt"
                  rows={9}
                  value={form.systemPrompt}
                  onChange={(e) => patch({ systemPrompt: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 self-start px-2 text-xs"
                  onClick={() => patch({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}
                >
                  <RotateCcw className="size-3" />
                  Вернуть стандартный
                </Button>
              </Step>

              <div className="p-6">
                <Button onClick={submit} disabled={busy !== null}>
                  {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Сохранить
                </Button>
              </div>
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
                  <li>• Консультант живёт на странице «AI-поиск» — в мобильном меню это «Поиск»</li>
                  <li>• В промпт сервер сам кладёт выжимку каталога: модель не выдумывает туры</li>
                  <li>• Все запросы идут через сервер — ключ не попадает в браузер</li>
                  <li>• Подбор на главной работает без модели и от ключа не зависит</li>
                  <li>• Пока AI выключен, страница «AI-поиск» разбирает фразу сама</li>
                  <li>• Лимит: 20 запросов в час с адреса для гостя, 60 для вошедшего</li>
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
