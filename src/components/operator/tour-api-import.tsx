import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAdapterForOrg } from "@/lib/platform/adapters";
import { useAuth } from "@/lib/platform/auth";
import { appendAudit } from "@/lib/platform/catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { apiFeedUpgradeHint, planAllowsApiFeed, planAllowsLivePrice } from "@/lib/platform/plans";
import { SUPPLIER_FEED_EXAMPLE } from "@/lib/platform/supplier-feed";
import { setState, uid } from "@/lib/platform/store";

export function TourApiImportPanel({ orgId }: { orgId: string }) {
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const plan = organization?.planCode ?? state.organizations.find((o) => o.id === orgId)?.planCode;
  const allowed = planAllowsApiFeed(plan);
  const [endpoint, setEndpoint] = useState(
    () =>
      state.apiConnections.find((c) => c.organizationId === orgId)?.endpoint ??
      "/supplier-feed.example.json",
  );
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [pasteJson, setPasteJson] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const conn = state.apiConnections.find((c) => c.organizationId === orgId);
  const logs = state.syncLogs.filter((l) => l.organizationId === orgId).slice(0, 5);
  const upgradeHint = apiFeedUpgradeHint(plan);

  if (!allowed) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-secondary/40 p-5">
        <p className="text-sm font-medium">Автозагрузка каталога — «Бизнес» и «Про»</p>
        <p className="text-sm text-muted-foreground">
          {upgradeHint} На «Старте» добавляйте туры вручную, по ссылке с сайта или из Telegram-поста.
          После подключения feed TourGo сам подтягивает цены и наличие — не нужно вести два кабинета.
        </p>
        <Button asChild>
          <Link to="/operator/billing">Смотреть тарифы</Link>
        </Button>
      </div>
    );
  }

  const saveConnection = () => {
    const maskedKey = apiKey ? `****${apiKey.slice(-4)}` : (conn?.apiKeyMasked ?? "****");
    const maskedSecret = secret ? `****${secret.slice(-4)}` : (conn?.secretMasked ?? "****");
    setState((s) => {
      const existing = s.apiConnections.find((c) => c.organizationId === orgId);
      const next = {
        id: existing?.id ?? uid(),
        organizationId: orgId,
        provider: "TourGoSupplierFeed",
        endpoint,
        apiKeyMasked: maskedKey,
        secretMasked: maskedSecret,
        apiKey: apiKey || existing?.apiKey || "",
        secret: secret || existing?.secret || "",
        authType: "api_key" as const,
        currency: "KZT" as const,
        syncIntervalMin: 60,
        status: "connected" as const,
        ...(existing?.lastSyncAt ? { lastSyncAt: existing.lastSyncAt } : {}),
      };
      return {
        ...s,
        apiConnections: existing
          ? s.apiConnections.map((c) => (c.id === existing.id ? next : c))
          : [...s.apiConnections, next],
      };
    });
    appendAudit({
      actorId: user.id,
      action: "api_connection_saved",
      entityType: "api_connection",
      entityId: orgId,
    });
    setApiKey("");
    setSecret("");
    toast.success("Подключение сохранено");
  };

  const runSync = async (mode: "url" | "paste" | "example") => {
    setBusy(true);
    try {
      if (mode === "url") saveConnection();
      const adapter = getAdapterForOrg(orgId);
      const test = await adapter.testConnection();
      if (!test.ok) {
        toast.error(test.message);
        return;
      }
      const log = await adapter.sync(
        mode === "paste"
          ? { feedJson: pasteJson }
          : mode === "example"
            ? { useExample: true }
            : undefined,
      );
      toast[log.status === "error" ? "error" : "success"](log.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Выгружайте каталог в формате{" "}
        <a className="underline underline-offset-2" href="/supplier-feed.example.json" target="_blank" rel="noreferrer">
          TourGo Supplier Feed
        </a>
        . Меняете цены у себя — здесь они обновятся после синхронизации. Заявки туристов остаются в
        кабинете TourGo.
        {planAllowsLivePrice(plan)
          ? " На «Про» при заявке дополнительно перепроверяется цена у поставщика."
          : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>URL JSON feed</Label>
          <Input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://your-company.kz/api/tourgo-feed.json"
          />
        </div>
        <div className="space-y-2">
          <Label>API key</Label>
          <Input
            type="password"
            placeholder={conn?.apiKeyMasked ?? "если feed закрыт ключом"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Secret</Label>
          <Input
            type="password"
            placeholder={conn?.secretMasked ?? "опционально"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={saveConnection}>Сохранить</Button>
        <Button variant="secondary" disabled={busy} onClick={() => void runSync("url")}>
          {busy ? "Синхронизация…" : "Загрузить с URL"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void runSync("example")}>
          Демо-feed
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Или вставьте JSON вручную</Label>
        <Textarea
          value={pasteJson}
          onChange={(e) => setPasteJson(e.target.value)}
          placeholder={JSON.stringify(SUPPLIER_FEED_EXAMPLE, null, 2).slice(0, 280) + "…"}
          className="min-h-28 font-mono text-xs"
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !pasteJson.trim()}
          onClick={() => void runSync("paste")}
        >
          Импортировать JSON
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Статус: {conn?.status ?? "не подключено"}
        {conn?.lastSyncAt
          ? ` · последняя загрузка ${new Date(conn.lastSyncAt).toLocaleString("ru-RU")}`
          : ""}
        {conn?.lastError ? ` · ${conn.lastError}` : ""}
      </p>

      {logs.length > 0 ? (
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <p className="text-sm font-semibold">Последние загрузки</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {logs.map((log) => (
              <li key={log.id}>
                {new Date(log.createdAt).toLocaleString("ru-RU")} · {log.message} (+
                {log.toursImported} / ~{log.toursUpdated})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
