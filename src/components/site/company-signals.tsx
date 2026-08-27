import { Star } from "lucide-react";

import { openState, scheduleActive } from "@/lib/platform/booking-slots";
import { getCompanyRating } from "@/lib/platform/messages";
import type { Organization } from "@/lib/platform/types";

/**
 * Сигналы компании на карточке витрины: рейтинг и «открыто сейчас».
 * Данные уже есть в платформе — без них карточка выглядит безликой.
 */
export function CompanySignals({ company }: { company: Organization | undefined }) {
  if (!company) return null;

  const rating = getCompanyRating(company.id);
  const state = scheduleActive(company) ? openState(company.bookingSchedule) : null;
  if (!rating && !state) return null;

  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {rating ? (
        <span className="inline-flex items-center gap-1 font-medium">
          <Star className="size-3.5 fill-premium text-premium" />
          {rating.average.toFixed(1)}
          <span className="text-foreground/50">({rating.count})</span>
        </span>
      ) : null}
      {state?.open ? (
        <span className="inline-flex items-center gap-1 font-medium text-success">
          <span className="size-1.5 rounded-full bg-success" />
          Открыто до {state.closesAt}
        </span>
      ) : state?.opensLabel ? (
        <span className="text-foreground/50">Откроется {state.opensLabel}</span>
      ) : null}
    </span>
  );
}
