import { appendAudit, pushNotification, trackEvent } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";
import type { ServiceMessage, ServiceRequest, ServiceRequestStatus } from "./types";

/** Подписи статусов заявки: одни и те же в кабинете, профиле и админке. */
export const serviceRequestStatusLabel: Record<ServiceRequestStatus, string> = {
  NEW: "Новая",
  CONFIRMED: "Подтверждена",
  DECLINED: "Отклонена",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
};

export const serviceRequestStatusClass: Record<ServiceRequestStatus, string> = {
  NEW: "bg-primary/12 text-primary",
  CONFIRMED: "bg-success/12 text-success",
  DECLINED: "bg-destructive/10 text-destructive",
  DONE: "bg-secondary text-muted-foreground",
  CANCELLED: "bg-secondary text-muted-foreground",
};

/** «вт, 15 сентября, 19:00» — дата и время заявки одной строкой. */
export function formatServiceRequestWhen(date: string, time: string) {
  if (!date) return time || "без даты";
  const parsed = new Date(date);
  const label = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
  return time ? `${label}, ${time}` : label;
}

export type ServiceRequestDraft = {
  organizationId: string;
  organizationName: string;
  userId?: string;
  listingId?: string;
  listingName: string;
  contactName: string;
  contactPhone: string;
  date: string;
  time: string;
  people: number;
  comment: string;
};

/** Клиент оставляет заявку бизнесу: запись в зал, бронь квартиры или авто. */
export function createServiceRequest(draft: ServiceRequestDraft): ServiceRequest {
  const request: ServiceRequest = {
    id: uid(),
    organizationId: draft.organizationId,
    ...(draft.userId ? { userId: draft.userId } : {}),
    ...(draft.listingId ? { listingId: draft.listingId } : {}),
    listingName: draft.listingName,
    contactName: draft.contactName.trim(),
    contactPhone: draft.contactPhone.trim(),
    date: draft.date,
    time: draft.time,
    people: Math.max(1, draft.people),
    comment: draft.comment.trim(),
    status: "NEW",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  setState((s) => ({ ...s, serviceRequests: [request, ...s.serviceRequests] }));

  trackEvent("SERVICE_REQUEST_CREATED", draft.userId, {
    companyId: draft.organizationId,
    listingId: draft.listingId ?? "",
  });

  // Уведомляем всех сотрудников компании: заявку увидит тот, кто зайдёт первым.
  // pushNotification сам вызывает setState, поэтому список читаем снаружи.
  const staff = getState().users.filter((u) => u.organizationId === draft.organizationId);
  for (const member of staff) {
    pushNotification(
      member.id,
      "service_request",
      "Новая заявка от клиента",
      `${request.contactName}: ${request.listingName || "запись"} на ${request.date}${
        request.time ? ` в ${request.time}` : ""
      }.`,
      { requestId: request.id, organizationId: draft.organizationId },
    );
  }

  return request;
}

const statusMessage: Record<string, { title: string; body: (name: string) => string }> = {
  CONFIRMED: {
    title: "Заявка подтверждена",
    body: (name) => `${name} подтвердил вашу запись. Ждём вас!`,
  },
  DECLINED: {
    title: "Заявка отклонена",
    body: (name) => `${name} не может принять вас в это время. Попробуйте другую дату.`,
  },
  DONE: {
    title: "Спасибо за визит",
    body: (name) => `${name} отметил вашу заявку выполненной. Оставьте отзыв — это поможет другим.`,
  },
};

/** Компания меняет статус заявки и, при желании, пишет ответ клиенту. */
export function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequestStatus,
  options: { actorId: string; organizationName: string; replyComment?: string } = {
    actorId: "",
    organizationName: "",
  },
) {
  let target: ServiceRequest | null = null;
  setState((s) => ({
    ...s,
    serviceRequests: s.serviceRequests.map((r) => {
      if (r.id !== requestId) return r;
      target = {
        ...r,
        status,
        ...(options.replyComment !== undefined ? { replyComment: options.replyComment } : {}),
        updatedAt: nowIso(),
      };
      return target;
    }),
  }));

  if (!target) return null;
  const request: ServiceRequest = target;

  const message = statusMessage[status];
  if (message && request.userId) {
    pushNotification(
      request.userId,
      "service_request_status",
      message.title,
      message.body(options.organizationName || "Компания"),
      { requestId: request.id, organizationId: request.organizationId },
    );
  }

  if (options.actorId) {
    appendAudit({
      actorId: options.actorId,
      action: `service_request_${status.toLowerCase()}`,
      entityType: "service_request",
      entityId: request.id,
      meta: { organizationId: request.organizationId },
    });
  }

  return request;
}

/** Клиент отменяет свою заявку. */
export function cancelServiceRequest(requestId: string, userId: string) {
  setState((s) => ({
    ...s,
    serviceRequests: s.serviceRequests.map((r) =>
      r.id === requestId && r.userId === userId
        ? { ...r, status: "CANCELLED" as const, updatedAt: nowIso() }
        : r,
    ),
  }));
}

// ---------------------------------------------------------------------------
// Переписка по заявке: «заявка = тред». Отдельного инбокса у бизнеса нет,
// сообщения живут внутри карточки записи у обеих сторон.
// ---------------------------------------------------------------------------

export function serviceThread(requestId: string): ServiceMessage[] {
  return getState()
    .serviceMessages.filter((m) => m.requestId === requestId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Непрочитанные сообщения в треде для указанной стороны. */
export function unreadServiceMessages(requestId: string, side: "CLIENT" | "COMPANY") {
  return getState().serviceMessages.filter(
    (m) =>
      m.requestId === requestId &&
      m.authorSide !== side &&
      (side === "CLIENT" ? !m.readByClient : !m.readByCompany),
  ).length;
}

export function sendServiceMessage(input: {
  request: ServiceRequest;
  authorId: string;
  authorName: string;
  authorSide: "CLIENT" | "COMPANY";
  text: string;
  organizationName: string;
}) {
  const text = input.text.trim();
  if (!text) return null;

  const message: ServiceMessage = {
    id: uid(),
    requestId: input.request.id,
    organizationId: input.request.organizationId,
    userId: input.authorId,
    authorSide: input.authorSide,
    authorName: input.authorName,
    text,
    // Своя сторона читает сразу, вторая — когда откроет тред.
    readByClient: input.authorSide === "CLIENT",
    readByCompany: input.authorSide === "COMPANY",
    createdAt: nowIso(),
  };

  setState((s) => ({ ...s, serviceMessages: [...s.serviceMessages, message] }));

  // pushNotification сам вызывает setState, поэтому получателей читаем снаружи.
  if (input.authorSide === "CLIENT") {
    const staff = getState().users.filter((u) => u.organizationId === input.request.organizationId);
    for (const member of staff) {
      pushNotification(
        member.id,
        "service_message",
        `Сообщение от ${input.authorName}`,
        text.slice(0, 120),
        { requestId: input.request.id, organizationId: input.request.organizationId },
      );
    }
  } else if (input.request.userId) {
    pushNotification(
      input.request.userId,
      "service_message",
      `Ответ от ${input.organizationName}`,
      text.slice(0, 120),
      { requestId: input.request.id, organizationId: input.request.organizationId },
    );
  }

  return message;
}

/** Отметить чужие сообщения треда прочитанными для своей стороны. */
export function markServiceThreadRead(requestId: string, side: "CLIENT" | "COMPANY") {
  const hasUnread = getState().serviceMessages.some(
    (m) =>
      m.requestId === requestId &&
      m.authorSide !== side &&
      (side === "CLIENT" ? !m.readByClient : !m.readByCompany),
  );
  if (!hasUnread) return;

  setState((s) => ({
    ...s,
    serviceMessages: s.serviceMessages.map((m) =>
      m.requestId === requestId && m.authorSide !== side
        ? side === "CLIENT"
          ? { ...m, readByClient: true }
          : { ...m, readByCompany: true }
        : m,
    ),
  }));
}
