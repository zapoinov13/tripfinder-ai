import { getHotel } from "@/data/demo";
import { getState } from "@/lib/platform/store";

export function userName(userId: string): string {
  const user = getState().users.find((u) => u.id === userId);
  return user?.name ?? userId.slice(0, 8);
}

export function userEmail(userId: string): string {
  return getState().users.find((u) => u.id === userId)?.email ?? "—";
}

export function orgName(orgId: string): string {
  return getState().organizations.find((o) => o.id === orgId)?.name ?? orgId.slice(0, 8);
}

export function tourTitle(tourId: string): string {
  const tour = getState().tours.find((t) => t.id === tourId);
  if (!tour) return tourId;
  try {
    return getHotel(tour.hotelId).name;
  } catch {
    return tourId;
  }
}

export function formatRelativeRu(iso?: string): string {
  if (!iso) return "Ещё не было";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} дн назад`;
}
