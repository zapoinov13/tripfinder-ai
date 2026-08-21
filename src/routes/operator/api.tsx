import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdapterForOrg } from "@/lib/platform/adapters";
import { appendAudit } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState, uid } from "@/lib/platform/store";

export const Route = createFileRoute("/operator/api")({
  head: () => ({ meta: [{ title: "API интеграции — TourGo" }] }),
  component: OperatorApiPage,
});

function OperatorApiPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  const [endpoint, setEndpoint] = useState("https://api.tourgo.travel/supplier-feed");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  if (!allowed || !organization || !user) return null;

  const conn = state.apiConnections.find((c) => c.organizationId === organization.id);
  const logs = state.syncLogs.filter((l) => l.organizationId === organization.id).slice(0, 10);

  const saveConnection = () => {
    const maskedKey = apiKey ? `****${apiKey.slice(-4)}` : (conn?.apiKeyMasked ?? "****");
    const maskedSecret = secret ? `****${secret.slice(-4)}` : (conn?.secretMasked ?? "****");
    setState((s) => {
      const existing = s.apiConnections.find((c) => c.organizationId === organization.id);
      const next = {
        id: existing?.id ?? uid(),
        organizationId: organization.id,
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
      entityId: organization.id,
    });
    setApiKey("");
    setSecret("");
    toast.success("Подключение сохранено (секреты скрыты)");
  };

  const runSync = async (fail = false) => {
    setBusy(true);
    try {
      const adapter = getAdapterForOrg(organization.id);
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
    <DashShell
      brand={organization.name}
      items={nav}
      title="API интеграции"
      subtitle="Синхронизация цен, наличия и статусов бронирований"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-6">
          <div className="space-y-2">
            <Label>Endpoint</Label>
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveConnection}>Сохранить</Button>
            <Button variant="secondary" disabled={busy} onClick={() => runSync(false)}>
              Проверить и синхронизировать
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => runSync(true)}>
              Проверить ошибку
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Статус: {conn?.status ?? "disconnected"} · последняя синхронизация:{" "}
            {conn?.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString("ru-RU") : "—"}
            {conn?.lastError ? ` · ${conn.lastError}` : ""}
          </p>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Журнал синхронизаций</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl bg-secondary p-3">
                <div className="font-medium">
                  {log.status} · {new Date(log.createdAt).toLocaleString("ru-RU")}
                </div>
                <div className="text-muted-foreground">{log.message}</div>
                <div className="text-xs">
                  +{log.toursImported} / ~{log.toursUpdated} / -{log.toursRemoved}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashShell>
  );
}
