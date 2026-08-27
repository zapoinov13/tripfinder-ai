import { appendAudit, pushNotification } from "./catalog";
import { getState, setState } from "./store";
import type { CompanyClaim } from "./types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `claim-${Date.now().toString(36)}`;

const nowIso = () => new Date().toISOString();

/**
 * Передача карточки владельцу.
 *
 * Карточки в витрине платформа завела сама, по открытым данным. Владелец
 * бизнеса должен получить свой кабинет — но не любой желающий: заявку
 * подтверждает админ, он и проверяет, что человек действительно из этой
 * компании. До подтверждения ничего не меняется.
 */
export function claimCompany(input: {
  organizationId: string;
  userId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  proof: string;
}): { ok: true; claim: CompanyClaim } | { ok: false; reason: string } {
  const state = getState();
  const org = state.organizations.find((o) => o.id === input.organizationId);
  if (!org) return { ok: false, reason: "Компания не найдена" };
  if (!org.listedByPlatform) {
    return { ok: false, reason: "У этой компании уже есть владелец" };
  }
  if (!input.contactName.trim() || !input.contactPhone.trim()) {
    return { ok: false, reason: "Нужны имя и телефон для связи" };
  }
  // Один аккаунт — одна компания: иначе одобрение увело бы человека из его
  // прежнего кабинета и тот остался бы без владельца.
  const applicant = state.users.find((u) => u.id === input.userId);
  if (applicant?.organizationId) {
    return { ok: false, reason: "К вашему аккаунту уже привязана компания. Напишите в поддержку." };
  }
  const pending = state.companyClaims.find(
    (c) =>
      c.organizationId === input.organizationId && c.userId === input.userId && c.status === "NEW",
  );
  if (pending) return { ok: false, reason: "Заявка уже отправлена, ждём ответа платформы" };

  const claim: CompanyClaim = {
    id: uid(),
    organizationId: input.organizationId,
    userId: input.userId,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    proof: input.proof.trim(),
    status: "NEW",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  setState((s) => ({ ...s, companyClaims: [claim, ...s.companyClaims] }));

  // Админам платформы: заявка ждёт решения.
  for (const admin of state.users.filter(
    (u) => u.role === "PLATFORM_ADMIN" || u.role === "PLATFORM_MANAGER",
  )) {
    pushNotification(
      admin.id,
      "company_claim",
      "Заявка на компанию",
      `${input.contactName.trim()} просит передать «${org.name}»`,
      { organizationId: org.id, claimId: claim.id },
    );
  }

  appendAudit({
    actorId: input.userId,
    action: "company_claim_created",
    entityType: "organization",
    entityId: org.id,
    meta: { claimId: claim.id },
  });

  return { ok: true, claim };
}

/**
 * Админ подтвердил передачу: человек становится владельцем кабинета,
 * а карточка перестаёт быть «собранной платформой».
 */
export function approveCompanyClaim(claimId: string, actorId: string) {
  const state = getState();
  const claim = state.companyClaims.find((c) => c.id === claimId);
  if (!claim || claim.status !== "NEW") return { ok: false as const, reason: "Заявка не найдена" };
  const org = state.organizations.find((o) => o.id === claim.organizationId);
  if (!org) return { ok: false as const, reason: "Компания не найдена" };

  setState((s) => ({
    ...s,
    companyClaims: s.companyClaims.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: "APPROVED" as const,
            decidedBy: actorId,
            decidedAt: nowIso(),
            updatedAt: nowIso(),
          }
        : // Остальные открытые заявки на эту компанию теряют смысл.
          c.organizationId === claim.organizationId && c.status === "NEW"
          ? {
              ...c,
              status: "DECLINED" as const,
              declineReason: "Компанию забрал другой владелец",
              decidedBy: actorId,
              decidedAt: nowIso(),
              updatedAt: nowIso(),
            }
          : c,
    ),
    organizations: s.organizations.map((o) =>
      o.id === claim.organizationId
        ? {
            ...o,
            listedByPlatform: false,
            phone: o.phone || claim.contactPhone,
            email: o.email || claim.contactEmail,
            contactPerson: o.contactPerson || claim.contactName,
          }
        : o,
    ),
    users: s.users.map((u) =>
      u.id === claim.userId
        ? { ...u, role: "OPERATOR_ADMIN" as const, organizationId: claim.organizationId }
        : u,
    ),
  }));

  pushNotification(
    claim.userId,
    "company_claim_status",
    "Компания передана вам",
    `«${org.name}» теперь ваша: кабинет открыт, можно заполнить страницу и принимать записи.`,
    { organizationId: org.id, claimId },
  );

  appendAudit({
    actorId,
    action: "company_claim_approved",
    entityType: "organization",
    entityId: org.id,
    meta: { claimId, newOwner: claim.userId },
  });

  return { ok: true as const };
}

/** Заявка отклонена: карточка остаётся за платформой. */
export function declineCompanyClaim(claimId: string, actorId: string, reason: string) {
  const state = getState();
  const claim = state.companyClaims.find((c) => c.id === claimId);
  if (!claim || claim.status !== "NEW") return { ok: false as const, reason: "Заявка не найдена" };
  const org = state.organizations.find((o) => o.id === claim.organizationId);

  setState((s) => ({
    ...s,
    companyClaims: s.companyClaims.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: "DECLINED" as const,
            declineReason: reason,
            decidedBy: actorId,
            decidedAt: nowIso(),
            updatedAt: nowIso(),
          }
        : c,
    ),
  }));

  pushNotification(
    claim.userId,
    "company_claim_status",
    "Заявка на компанию отклонена",
    reason ||
      `Не удалось подтвердить, что «${org?.name ?? "компания"}» ваша. Напишите в поддержку.`,
    { organizationId: claim.organizationId, claimId },
  );

  appendAudit({
    actorId,
    action: "company_claim_declined",
    entityType: "organization",
    entityId: claim.organizationId,
    meta: { claimId, reason },
  });

  return { ok: true as const };
}

/** Заявки, ждущие решения платформы. */
export function pendingCompanyClaims(): CompanyClaim[] {
  return getState()
    .companyClaims.filter((c) => c.status === "NEW")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Открытая заявка этого человека на эту компанию. */
export function myOpenClaim(organizationId: string, userId: string): CompanyClaim | undefined {
  return getState().companyClaims.find(
    (c) => c.organizationId === organizationId && c.userId === userId && c.status === "NEW",
  );
}
