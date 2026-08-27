import { getOperator } from "@/data/demo";
import type { Tour } from "@/data/demo";

import { getState } from "./store";

export type TourSeller = {
  /** Название, которое видит турист. */
  name: string;
  /** Компания на платформе: если есть, ведём на её страницу. */
  orgId?: string;
  verified: boolean;
};

/**
 * Кто продаёт тур.
 *
 * Исторически тур ссылался на строку каталога поставщиков (operatorId), и
 * туры, выложенные живой компанией, показывали название чужого поставщика:
 * operatorIdForOrg подставляет первого попавшегося, если имя не совпало.
 * Компания у тура одна — organizations[operatorOrgId], её и показываем.
 */
export function tourSeller(tour: Tour & { operatorOrgId?: string }): TourSeller {
  const orgId = tour.operatorOrgId;
  if (orgId) {
    const org = getState().organizations.find((o) => o.id === orgId);
    if (org) return { name: org.name, orgId: org.id, verified: org.status === "APPROVED" };
  }
  const operator = getOperator(tour.operatorId);
  return { name: operator?.name ?? "Компания", verified: true };
}
