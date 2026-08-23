import { getState, nowIso, setState, uid } from "./store";
import type { AnalyticsEvent, AuditLog, PlatformNotification, PlatformTour } from "./types";
import { dispatchPushNotification } from "@/lib/push/dispatch";

export function getTour(id: string): PlatformTour | undefined {
  return getState().tours.find((t) => t.id === id);
}

export function getHotel(id: string) {
  return getState().hotels.find((h) => h.id === id) ?? getState().hotels[0]!;
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
    auditLogs: [{ ...input, id: uid(), createdAt: nowIso() }, ...s.auditLogs].slice(0, 500),
  }));
}

export function trackEvent(type: string, userId?: string, payload?: Record<string, unknown>) {
  const event: AnalyticsEvent = {
    id: uid(),
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
    id: uid(),
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
  void dispatchPushNotification({
    userId,
    title,
    body,
    type,
    ...(payload ? { data: payload } : {}),
  });
  return n;
}
