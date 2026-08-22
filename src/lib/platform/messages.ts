import { appendAudit, pushNotification, trackEvent } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";
import type { CompanyReview, RequestMessage } from "./types";

/** Диалог турист ↔ турфирма всегда привязан к заявке: без заявки писать не о чем. */
export type MessageThread = {
  requestId: string;
  organizationId: string;
  companyName: string;
  touristId: string;
  touristName: string;
  destinationLabel: string;
  messages: RequestMessage[];
  lastAt: string;
  unreadForCompany: number;
  unreadForTourist: number;
};

function threadKey(requestId: string, organizationId: string) {
  return `${requestId}::${organizationId}`;
}

function buildThreads(messages: RequestMessage[]): MessageThread[] {
  const state = getState();
  const groups = new Map<string, RequestMessage[]>();
  for (const m of messages) {
    const key = threadKey(m.requestId, m.organizationId);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }

  return Array.from(groups.values())
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const first = sorted[0]!;
      const request = state.tripRequests.find((r) => r.id === first.requestId);
      const tourist = state.users.find((u) => u.id === first.userId);
      return {
        requestId: first.requestId,
        organizationId: first.organizationId,
        companyName:
          state.organizations.find((o) => o.id === first.organizationId)?.name ?? "Турфирма",
        touristId: first.userId,
        touristName: request?.contactName || tourist?.name || "Турист",
        destinationLabel: request
          ? `${request.fromCity} → ${request.destinationLabel}`
          : "Заявка удалена",
        messages: sorted,
        lastAt: sorted[sorted.length - 1]!.createdAt,
        unreadForCompany: sorted.filter((m) => m.authorSide === "TOURIST" && !m.readByCompany)
          .length,
        unreadForTourist: sorted.filter((m) => m.authorSide === "COMPANY" && !m.readByTourist)
          .length,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export function getCompanyThreads(orgId: string) {
  return buildThreads(getState().requestMessages.filter((m) => m.organizationId === orgId));
}

export function getTouristThreads(userId: string) {
  return buildThreads(getState().requestMessages.filter((m) => m.userId === userId));
}

export function getThread(requestId: string, organizationId: string) {
  return getState()
    .requestMessages.filter((m) => m.requestId === requestId && m.organizationId === organizationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function countUnreadForCompany(orgId: string) {
  return getState().requestMessages.filter(
    (m) => m.organizationId === orgId && m.authorSide === "TOURIST" && !m.readByCompany,
  ).length;
}

export function countUnreadForTourist(userId: string) {
  return getState().requestMessages.filter(
    (m) => m.userId === userId && m.authorSide === "COMPANY" && !m.readByTourist,
  ).length;
}

export function sendMessage(input: {
  requestId: string;
  organizationId: string;
  touristId: string;
  authorSide: RequestMessage["authorSide"];
  authorName: string;
  text: string;
}) {
  const text = input.text.trim();
  if (!text) return null;

  const message: RequestMessage = {
    id: uid(),
    requestId: input.requestId,
    organizationId: input.organizationId,
    userId: input.touristId,
    authorSide: input.authorSide,
    authorName: input.authorName,
    text,
    readByTourist: input.authorSide === "TOURIST",
    readByCompany: input.authorSide === "COMPANY",
    createdAt: nowIso(),
  };

  setState((s) => ({ ...s, requestMessages: [...s.requestMessages, message] }));

  const state = getState();
  const companyName =
    state.organizations.find((o) => o.id === input.organizationId)?.name ?? "Турфирма";

  if (input.authorSide === "TOURIST") {
    state.users
      .filter((u) => u.organizationId === input.organizationId)
      .forEach((u) =>
        pushNotification(u.id, "new_message", `Сообщение от туриста`, text.slice(0, 120), {
          requestId: input.requestId,
        }),
      );
  } else {
    pushNotification(
      input.touristId,
      "new_message",
      `Сообщение от ${companyName}`,
      text.slice(0, 120),
      { requestId: input.requestId },
    );
  }

  trackEvent("MESSAGE_SENT", input.authorSide === "TOURIST" ? input.touristId : undefined, {
    requestId: input.requestId,
  });

  return message;
}

export function markThreadRead(
  requestId: string,
  organizationId: string,
  side: RequestMessage["authorSide"],
) {
  const needsUpdate = getState().requestMessages.some(
    (m) =>
      m.requestId === requestId &&
      m.organizationId === organizationId &&
      (side === "COMPANY" ? !m.readByCompany : !m.readByTourist),
  );
  if (!needsUpdate) return;

  setState((s) => ({
    ...s,
    requestMessages: s.requestMessages.map((m) =>
      m.requestId === requestId && m.organizationId === organizationId
        ? side === "COMPANY"
          ? { ...m, readByCompany: true }
          : { ...m, readByTourist: true }
        : m,
    ),
  }));
}

// ── Отзывы о турфирме ─────────────────────────────────────────────────────────

export function getCompanyReviews(orgId: string) {
  return getState()
    .companyReviews.filter((r) => r.organizationId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCompanyRating(orgId: string) {
  const reviews = getCompanyReviews(orgId);
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function hasReviewed(orgId: string, userId: string, requestId?: string) {
  return getState().companyReviews.some(
    (r) =>
      r.organizationId === orgId &&
      r.userId === userId &&
      (requestId ? r.requestId === requestId : true),
  );
}

export function addCompanyReview(input: {
  organizationId: string;
  userId: string;
  authorName: string;
  requestId?: string;
  rating: number;
  text: string;
}) {
  const review: CompanyReview = {
    id: uid(),
    organizationId: input.organizationId,
    userId: input.userId,
    authorName: input.authorName,
    ...(input.requestId ? { requestId: input.requestId } : {}),
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    text: input.text.trim(),
    createdAt: nowIso(),
  };

  setState((s) => ({ ...s, companyReviews: [review, ...s.companyReviews] }));

  getState()
    .users.filter((u) => u.organizationId === input.organizationId)
    .forEach((u) =>
      pushNotification(
        u.id,
        "new_review",
        "Новый отзыв о вашей компании",
        `${review.rating} из 5: ${review.text.slice(0, 100)}`,
        { reviewId: review.id },
      ),
    );

  appendAudit({
    actorId: input.userId,
    action: "company_review_added",
    entityType: "company_review",
    entityId: review.id,
    meta: { organizationId: input.organizationId, rating: review.rating },
  });

  return review;
}

export function replyToCompanyReview(input: {
  reviewId: string;
  organizationId: string;
  reply: string;
  actorId: string;
  actorName: string;
}) {
  const reply = input.reply.trim();
  if (!reply) return null;

  const existing = getState().companyReviews.find((r) => r.id === input.reviewId);
  if (!existing || existing.organizationId !== input.organizationId) return null;

  const replyAt = nowIso();
  setState((s) => ({
    ...s,
    companyReviews: s.companyReviews.map((r) =>
      r.id === input.reviewId
        ? {
            ...r,
            reply,
            replyAt,
            replyByUserId: input.actorId,
            replyByName: input.actorName,
          }
        : r,
    ),
  }));

  pushNotification(
    existing.userId,
    "review_reply",
    `${input.actorName} ответил на ваш отзыв`,
    reply.slice(0, 120),
    { reviewId: input.reviewId, organizationId: input.organizationId },
  );

  appendAudit({
    actorId: input.actorId,
    action: "company_review_replied",
    entityType: "company_review",
    entityId: input.reviewId,
    meta: { organizationId: input.organizationId },
  });

  return getState().companyReviews.find((r) => r.id === input.reviewId) ?? null;
}
