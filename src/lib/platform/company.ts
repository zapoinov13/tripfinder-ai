import { appendAudit } from "./catalog";
import { getState, nowIso, setState } from "./store";
import type { Organization } from "./types";
import { verificationDocumentLabel } from "./verification-documents";

export {
  verificationDocumentLabel,
  verificationDocumentTypes,
  verificationDocumentTypesFor,
} from "./verification-documents";
export type { VerificationDocumentId } from "./types";
import type { VerificationDocumentId } from "./types";

export { companyCategories, categoriesOfServices } from "./company-categories";
import { companyCategories as categoriesCatalog } from "./company-categories";

/** Группы услуг для кабинета компании: по категориям деятельности. */
export const companyServiceGroups = categoriesCatalog.map((category) => ({
  id: category.id,
  label: category.label,
  options: category.services,
}));

/**
 * Услуги только своей категории.
 *
 * Спортзалу нечего делать в списках «Пакетные туры», «Сафари» и «Квартиры
 * посуточно»: он их не продаёт, а видеть чужие поля — значит каждый раз
 * проверять, туда ли попал. Хуже того, случайно отмеченная чужая услуга меняет
 * и то, какие заявки ему приходят.
 *
 * Пока категория не проставлена (компании, заведённые до её появления),
 * показываем всё: отнять разделы у того, кто ими уже пользуется, хуже, чем
 * показать лишнее.
 */
export function serviceGroupsForCategory(category: string | undefined) {
  const own = companyServiceGroups.filter((group) => group.id === category);
  return own.length ? own : companyServiceGroups;
}

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

/**
 * Компания отправила документы: платформа увидит их в очереди на проверку.
 *
 * Сами файлы уже лежат на сервере — здесь только отметка «отправлено» и
 * названия для кабинета. Статус компании при этом не трогаем: кабинет
 * открывается сразу, а знак «Проверена» даёт отдельная отметка
 * documents_verified_at, которую ставит человек.
 */
export function submitForVerification(
  orgId: string,
  documents: { docType: VerificationDocumentId }[],
) {
  updateCompanyProfile(orgId, {
    documents: documents.map((doc) => verificationDocumentLabel(doc.docType)),
    verificationSubmittedAt: nowIso(),
  });
  appendAudit({
    action: "company_verification_submitted",
    entityType: "organization",
    entityId: orgId,
    meta: { documents: documents.length },
  });
}
