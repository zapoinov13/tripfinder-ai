import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { getAiSettings, saveAiSettings, testAiSettings } from "@/lib/ai-settings.functions";
import type { AiSettingsView } from "@/lib/ai-settings.functions";
import { useRequireAuth } from "@/lib/platform/auth";

export const Route = createFileRoute("/admin/ai-keys")({
  head: () => ({
    meta: [
      { title: "AI и ключи API · Админ TourGo" },
      {
        name: "description",
        content: "Подключение LLM-провайдера и API-ключа для AI-чата TourGo.",
      },
      { property: "og:title", content: "AI и ключи API · Админ TourGo" },
      {
        property: "og:description",
        content: "Настройка провайдера, модели и системного промпта AI-консьержа.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAiKeysPage,
});

const PROVIDERS: Array<{ value: AiSettingsView["provider"]; label: string; model: string }> = [
  { value: "lovable", label: "Lovable AI (без ключа)", model: "google/gemini-3-flash" },
  { value: "openai", label: "OpenAI (ChatGPT)", model: "gpt-4o-mini" },
  { value: "anthropic", label: "Anthropic Claude", model: "claude-sonnet-4-5" },
  { value: "google", label: "Google Gemini", model: "gemini-2.5-flash" },
  { value: "openrouter", label: "OpenRouter", model: "openai/gpt-4o-mini" },
  { value: "custom", label: "Свой OpenAI-совместимый endpoint", model: "" },
];

function AdminAiKeysPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN"]);
  const nav = useAdminNav();

  const load = useServerFn(getAiSettings);
  const save = useServerFn(saveAiSettings);
  const test = useServerFn(testAiSettings);

  const [form, setForm] = useState<AiSettingsView | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"load" | "save" | "test" | null>("load");

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    load({})
      .then((data) => {
        if (alive) setForm(data);
      })
      .catch(() => toast.error("Не удалось загрузить настройки AI"))
      .finally(() => {
        if (alive) setBusy(null);
      });
    return () => {
      alive = false;
    };
  }, [allowed, load]);

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
      if (res.ok) toast.success(`Соединение работает: ${res.text.slice(0, 120)}`);
      else toast.error(res.error);
    } catch {
      toast.error("Проверка не удалась");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="AI и ключи API"
      subtitle="Подключение LLM к AI-чату платформы"
    >
      {!form ? (
        <div className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Загружаем настройки…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="surface-card space-y-5 p-6">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/50 p-4">
              <div>
                <p className="font-medium">AI-чат включён</p>
                <p className="text-xs text-muted-foreground">
                  Пока выключено, чат отвечает подсказкой вместо модели.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => patch({ enabled })}
                aria-label="Включить AI-чат"
              />
            </div>

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
                Ключ хранится в закрытой таблице и никогда не отдаётся в браузер. Для Lovable AI
                ключ не нужен.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Системный промпт</Label>
              <Textarea
                id="ai-prompt"
                rows={6}
                value={form.systemPrompt}
                onChange={(e) => patch({ systemPrompt: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={submit} disabled={busy !== null}>
                {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : null}
                Сохранить
              </Button>
              <Button variant="outline" onClick={runTest} disabled={busy !== null}>
                {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : null}
                Проверить соединение
              </Button>
            </div>
          </div>

          <aside className="surface-card space-y-3 p-6 text-sm">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <KeyRound className="size-4" />
            </span>
            <h2 className="font-display text-base font-semibold">Как это работает</h2>
            <p className="text-muted-foreground">
              Ключ подключается к AI-чату на странице «AI-поиск» и в блоке на главной. Все запросы
              идут через сервер, ключ не попадает в браузер.
            </p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Статус</dt>
                <dd className="font-medium">{form.enabled ? "включён" : "выключен"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Ключ</dt>
                <dd className="font-mono">{form.hasKey ? form.keyMask : "не задан"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Обновлено</dt>
                <dd>{form.updatedAt ? new Date(form.updatedAt).toLocaleString("ru-RU") : "нет"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </DashShell>
  );
}
