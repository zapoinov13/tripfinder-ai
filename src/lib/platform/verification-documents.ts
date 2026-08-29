import { categoriesOfServices, travelCategoryIds } from "./company-categories";
import type { VerificationDocumentId } from "./types";

export type VerificationDocumentType = {
  id: VerificationDocumentId;
  label: string;
  description: string;
  required: boolean;
};

export const verificationDocumentTypes: VerificationDocumentType[] = [
  {
    id: "registration",
    label: "Свидетельство о регистрации",
    description: "ТОО, ИП или выписка из госреестра с БИН / регистрационным номером",
    required: true,
  },
  {
    id: "tourism_license",
    label: "Лицензия на туристскую деятельность",
    description: "Если по законам вашей страны турагент обязан иметь лицензию",
    required: false,
  },
  {
    id: "liability_insurance",
    label: "Страхование ответственности",
    description: "Полис страхования туроператора или турагента перед туристами",
    required: false,
  },
  {
    id: "commercial_license",
    label: "Коммерческая лицензия / разрешение",
    description: "Лицензия или разрешение на вашу деятельность (зал, корт, прокат), если требуется",
    required: false,
  },
];

/**
 * Какие документы показывать компании: зависит от категорий её услуг.
 * Спорт-залу и прокату авто не нужна турлицензия, турагенту — коммерческая.
 */
export function verificationDocumentTypesFor(services: string[]): VerificationDocumentType[] {
  const categories = categoriesOfServices(services);
  const isTravel = [...categories].some((id) => travelCategoryIds.has(id));
  const isCommercial = [...categories].some((id) => !travelCategoryIds.has(id));
  return verificationDocumentTypes.filter((doc) => {
    if (doc.id === "registration") return true;
    if (doc.id === "tourism_license" || doc.id === "liability_insurance") {
      return isTravel || categories.size === 0;
    }
    return isCommercial;
  });
}

export function verificationDocumentLabel(type: VerificationDocumentId) {
  return verificationDocumentTypes.find((item) => item.id === type)?.label ?? type;
}
