import { appendAudit } from "./catalog";
import { getState, nowIso, setState } from "./store";
import type { CompanyVerificationFile, Organization } from "./types";
import { verificationDocumentLabel } from "./verification-documents";

export {
  hasRequiredVerificationDocuments,
  readVerificationFile,
  removeVerificationFile,
  upsertVerificationFile,
  verificationDocumentTypes,
  verificationDocumentTypesFor,
} from "./verification-documents";
export type { VerificationDocumentId } from "./types";

/** Туристические услуги: для них действуют турлицензия и страховка. */
export const travelServiceOptions = [
  "Туры",
  "Отели",
  "Экскурсии",
  "Трансферы",
  "Аренда авто",
  "Индивидуальные поездки",
  "Помощь туристам на месте",
];

/** Спорт-услуги: подтверждаются коммерческой лицензией, а не турдокументами. */
export const sportServiceOptions = [
  "Тренажёрный зал",
  "Падел и теннис",
  "Групповые тренировки",
  "Аренда спортплощадок",
];

export const companyServiceGroups = [
  { label: "Путешествия", options: travelServiceOptions },
  { label: "Спорт и активности", options: sportServiceOptions },
];

export const companyServiceOptions = companyServiceGroups.flatMap((g) => g.options);

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
export function submitForVerification(orgId: string, files: CompanyVerificationFile[]) {
  updateCompanyProfile(orgId, {
    verificationFiles: files,
    documents: files.map((file) => verificationDocumentLabel(file.type)),
    verificationSubmittedAt: nowIso(),
    status: "PENDING_APPROVAL",
  });
  appendAudit({
    action: "company_verification_submitted",
    entityType: "organization",
    entityId: orgId,
    meta: { documents: files.length },
  });
}
