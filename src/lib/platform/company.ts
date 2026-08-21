import { appendAudit } from "./catalog";
import { getState, nowIso, setState } from "./store";
import type { Organization } from "./types";

export const companyServiceOptions = [
  "Туры",
  "Отели",
  "Экскурсии",
  "Трансферы",
  "Индивидуальные поездки",
  "Помощь туристам на месте",
];

export const companyCountryOptions = [
  "ОАЭ",
  "Турция",
  "Таиланд",
  "Мальдивы",
  "Вьетнам",
  "Египет",
  "Грузия",
];

export const clientCountryOptions = ["Казахстан", "Узбекистан", "Кыргызстан", "Россия"];

export const languageOptions = ["Русский", "Казахский", "Английский", "Узбекский", "Арабский"];

export function updateCompanyProfile(orgId: string, patch: Partial<Organization>) {
  setState((s) => ({
    ...s,
    organizations: s.organizations.map((o) => (o.id === orgId ? { ...o, ...patch } : o)),
  }));
}

export function findOrgByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return getState()
    .organizations.filter((o) => o.email.trim().toLowerCase() === normalized)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** Компания отправила документы: платформа увидит её в очереди на проверку. */
export function submitForVerification(orgId: string, documents: string[]) {
  updateCompanyProfile(orgId, {
    documents,
    verificationSubmittedAt: nowIso(),
    status: "PENDING_APPROVAL",
  });
  appendAudit({
    action: "company_verification_submitted",
    entityType: "organization",
    entityId: orgId,
    meta: { documents: documents.length },
  });
}
