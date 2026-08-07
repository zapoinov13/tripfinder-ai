import { getState, nowIso, setState, uid } from "./store";
import type {
  AnalyticsEvent,
  AuditLog,
  PlatformNotification,
  PlatformTour,
} from "./types";

export function getTour(id: string): PlatformTour | undefined {
  return getState().tours.find((t) => t.id === id);
}

export function getHotel(id: string) {
  return getState().hotels.find((h) => h.id === id)!;
}

export function getOperator(id: string) {
  return getState().operators.find((o) => o.id === id)!;
}

export function getDestination(id: string) {
  return getState().destinations.find((d) => d.id === id);
}

export function getActiveTours() {
  return getState().tours.filter((t) => t.status === "active");
}

export function appendAudit(input: Omit<AuditLog, "id" | "createdAt">) {
  setState((s) => ({
    ...s,
    auditLogs: [
      { ...input, id: uid("audit"), createdAt: nowIso() },
      ...s.auditLogs,
    ].slice(0, 500),
  }));
}

export function trackEvent(type: string, userId?: string, payload?: Record<string, unknown>) {
  const event: AnalyticsEvent = {
    id: uid("evt"),
    type,
    createdAt: nowIso(),
    ...(userId ? { userId } : {}),
    ...(payload ? { payload } : {}),
  };
  setState((s) => ({
    ...s,
    analyticsEvents: [event, ...s.analyticsEvents].slice(0, 1000),
  }));
}

export function pushNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  payload?: Record<string, unknown>,
) {
  const n: PlatformNotification = {
    id: uid("notif"),
    userId,
    type,
    title,
    body,
    read: false,
    createdAt: nowIso(),
    ...(payload ? { payload } : {}),
  };
  setState((s) => ({
    ...s,
    notifications: [n, ...s.notifications],
  }));
  return n;
}
