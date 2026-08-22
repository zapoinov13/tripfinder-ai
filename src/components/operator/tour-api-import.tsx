import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdapterForOrg } from "@/lib/platform/adapters";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { setState, uid } from "@/lib/platform/store";

export function TourApiImportPanel({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const state = usePlatformStore();
  const [endpoint, setEndpoint] = useState("https://api.tourgo.travel/supplier-feed");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const conn = state.apiConnections.find((c) => c.organizationId === orgId);
  const logs = state.syncLogs.filter((l) => l.organizationId === orgId).slice(0, 5);

  const saveConnection = () => {
    const maskedKey = apiKey ? `****${apiKey.slice(-4)}` : (conn?.apiKeyMasked ?? "****");
    const maskedSecret = secret ? `****${secret.slice(-4)}` : (conn?.secretMasked ?? "****");
    setState((s) => {
      const existing = s.apiConnections.find((c) => c.organizationId === orgId);
      const next = {
        id: existing?.id ?? uid(),
        organizationId: orgId,
        provider: "SupplierFeed",
        endpoint,
        apiKeyMasked: maskedKey,
        secretMasked: maskedSecret,
        apiKey: apiKey || existing?.apiKey || "demo-api-key",
        secret: secret || existing?.secret || "demo-secret",
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

  const runSync = async (fail = false) => {
    setBusy(true);
    try {
      const adapter = getAdapterForOrg(orgId);
      const test = await adapter.testConnection();
      if (!test.ok) {
        toast.error(test.message);
        return;
      }
      const log = await adapter.sync({ fail });
      toast[log.status === "success" ? "success" : "error"](log.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Подключите каталог туроператора: цены, наличие и статусы подтянутся автоматически. После
        синхронизации туры появятся в списке «Мои туры».
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Адрес API (endpoint)</Label>
          <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>API key</Label>
          <Input
            type="password"
            placeholder={conn?.apiKeyMasked ?? "новый ключ"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Secret</Label>
          <Input
            type="password"
            placeholder={conn?.secretMasked ?? "новый secret"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={saveConnection}>Сохранить подключение</Button>
        <Button variant="secondary" disabled={busy} onClick={() => void runSync(false)}>
          {busy ? "Синхронизация…" : "Загрузить туры"}
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
                {new Date(log.createdAt).toLocaleString("ru-RU")} · {log.message} (+{log.toursImported}{" "}
                / ~{log.toursUpdated})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
