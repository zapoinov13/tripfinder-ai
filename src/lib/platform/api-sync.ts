/**
 * Автоматическая синхронизация каталогов по API.
 *
 * У каждого подключения есть syncIntervalMin. Планировщик раз в минуту
 * проверяет, у кого интервал истёк, и запускает sync у адаптера — так фиды
 * агрегаторов и поставщиков подтягиваются сами, пока открыт кабинет или
 * админка. Ошибочные подключения ретраятся реже (раз в 10 минут), чтобы
 * не долбить чужой сервер.
 *
 * Дальше по плану: серверный cron (Edge Function по расписанию) и
 * MCP-сервер, который отдаёт этот же фид агентам. Формат и адаптеры уже
 * готовы к этому — см. docs/API-INTEGRATIONS.md.
 */
import { useEffect } from "react";

import { getAdapterForOrg } from "./adapters";
import { appendAudit } from "./catalog";
import { getState } from "./store";
import type { OperatorApiConnection } from "./types";

const ERROR_RETRY_MS = 10 * 60 * 1000;
const TICK_MS = 60 * 1000;

/** Когда мы в последний раз пробовали каждое подключение (в памяти вкладки). */
const lastAttemptAt = new Map<string, number>();
let inFlight = false;

export function isConnectionDue(c: OperatorApiConnection, now = Date.now()): boolean {
  if (c.status === "disconnected") return false;
  if (!c.endpoint) return false;
  const attempted = lastAttemptAt.get(c.id) ?? 0;
  if (c.status === "error" && now - attempted < ERROR_RETRY_MS) return false;
  const interval = Math.max(5, c.syncIntervalMin || 60) * 60 * 1000;
  const last = c.lastSyncAt ? new Date(c.lastSyncAt).getTime() : 0;
  return now - Math.max(last, attempted) >= interval;
}

export function dueConnections(orgIds?: string[]): OperatorApiConnection[] {
  const now = Date.now();
  return getState().apiConnections.filter(
    (c) => (!orgIds || orgIds.includes(c.organizationId)) && isConnectionDue(c, now),
  );
}

export type AutoSyncResult = {
  ran: number;
  ok: number;
  failed: number;
};

/**
 * Синхронизирует все «просроченные» подключения (или только указанных
 * организаций). Повторный вызов во время работы — no-op.
 */
export async function syncDueConnections(options?: {
  orgIds?: string[];
  actorId?: string;
  force?: boolean;
}): Promise<AutoSyncResult> {
  if (inFlight) return { ran: 0, ok: 0, failed: 0 };
  inFlight = true;
  try {
    const now = Date.now();
    const targets = options?.force
      ? getState().apiConnections.filter(
          (c) =>
            (!options.orgIds || options.orgIds.includes(c.organizationId)) &&
            c.status !== "disconnected" &&
            Boolean(c.endpoint),
        )
      : dueConnections(options?.orgIds);

    let ok = 0;
    let failed = 0;
    for (const conn of targets) {
      lastAttemptAt.set(conn.id, now);
      try {
        const log = await getAdapterForOrg(conn.organizationId).sync();
        if (log.status === "error") failed += 1;
        else ok += 1;
      } catch {
        failed += 1;
      }
    }
    if (targets.length > 0) {
      appendAudit({
        ...(options?.actorId ? { actorId: options.actorId } : {}),
        action: "api_auto_sync",
        entityType: "api_connection",
        meta: { ran: targets.length, ok, failed, forced: Boolean(options?.force) },
      });
    }
    return { ran: targets.length, ok, failed };
  } finally {
    inFlight = false;
  }
}

/** Активные области автосинка: "*" — все подключения, иначе список org id. */
const activeScopes = new Map<string, number>();
let schedulerTimer: number | null = null;

function tick() {
  if (activeScopes.size === 0) return;
  if (activeScopes.has("*")) {
    void syncDueConnections();
    return;
  }
  const orgIds = [...activeScopes.keys()].flatMap((k) => k.split(",")).filter(Boolean);
  if (orgIds.length) void syncDueConnections({ orgIds });
}

/**
 * Планировщик автосинка, пока смонтирована хотя бы одна страница с хуком.
 * orgIds сужает область: кабинет оператора синхронизирует только свою
 * компанию, админка — всех.
 */
export function useAutoApiSync(orgIds?: string[]) {
  const key = orgIds?.join(",") ?? "*";
  useEffect(() => {
    activeScopes.set(key, (activeScopes.get(key) ?? 0) + 1);
    tick();
    if (schedulerTimer === null && typeof window !== "undefined") {
      schedulerTimer = window.setInterval(tick, TICK_MS);
    }
    return () => {
      const refs = (activeScopes.get(key) ?? 1) - 1;
      if (refs <= 0) activeScopes.delete(key);
      else activeScopes.set(key, refs);
      if (activeScopes.size === 0 && schedulerTimer !== null) {
        window.clearInterval(schedulerTimer);
        schedulerTimer = null;
      }
    };
  }, [key]);
}
