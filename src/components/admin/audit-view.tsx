import {
  Building2,
  KeyRound,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sparkles,
  Ticket,
  Trash2,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { formatPrice } from "@/data/demo";
import { getHotel } from "@/data/demo";
import { getState } from "@/lib/platform/store";
import type { AuditLog } from "@/lib/platform/types";

import { auditActionLabel } from "./admin-labels";

/**
 * Запись аудита человеческим языком.
 *
 * В журнале было видно `migrate_anonymous_state · пользователь ·
 * 071224f9-7dd7-4243-a676-9d1e604b9e3c` — строка, которую невозможно прочитать
 * и по которой нечего решать. Здесь каждая запись превращается в предложение:
 * что случилось, с кем или с чем, кто это сделал. Технический id показываем
 * только если объект не нашёлся: это уже след удаления, а не адрес.
 */

export type AuditTone = "neutral" | "danger" | "money" | "success" | "routine";

/**
 * Рутина входов и переносов гостевых данных.
 *
 * Пишем её в журнал — иногда нужно доказать, кто и когда заходил, — но в
 * обзоре и в режиме «только важное» прячем: между двумя такими строками
 * теряется единственная запись про удалённую компанию.
 */
export const ROUTINE_ACTIONS = new Set(["login", "logout", "migrate_anonymous_state"]);

const DANGER = new Set([
  "user_delete",
  "user_suspend",
  "organization_delete",
  "tour_delete",
  "tour_block",
  "delete_account",
  "store_reset",
  "operator_status",
  "promotion_deactivate",
  "company_claim_declined",
  "service_request_declined",
  "service_request_cancelled",
]);

const MONEY = new Set([
  "promotion_purchased",
  "promotion_granted_by_admin",
  "promotion_balance_topup_admin",
  "promotion_prices_update",
  "premium_price_update",
  "operator_plan_admin",
  "operator_plan_change",
]);

const SUCCESS = new Set([
  "company_claim_approved",
  "company_review_added",
  "booking_confirm",
  "booking_confirmed",
  "offer_chosen",
  "tour_published",
  "tour_restore",
  "user_restore",
  "user_to_partner",
  "service_request_confirmed",
  "service_request_done",
]);

const ICONS: { match: (action: string) => boolean; icon: LucideIcon }[] = [
  { match: (a) => DANGER.has(a), icon: Trash2 },
  { match: (a) => MONEY.has(a), icon: Wallet },
  { match: (a) => a.startsWith("promotion"), icon: Megaphone },
  { match: (a) => a.startsWith("api_") || a === "supplier_feed_applied", icon: RefreshCw },
  { match: (a) => a.startsWith("user_") || a === "delete_account", icon: UserCog },
  { match: (a) => a.startsWith("company") || a === "organization_delete", icon: Building2 },
  { match: (a) => a.startsWith("tour_"), icon: Ticket },
  { match: (a) => a.startsWith("service_request") || a.startsWith("booking"), icon: Ticket },
  {
    match: (a) => a.includes("message") || a.includes("review") || a.includes("offer"),
    icon: MessageSquare,
  },
  {
    match: (a) => a === "login" || a === "logout" || a === "migrate_anonymous_state",
    icon: KeyRound,
  },
  { match: (a) => a.includes("config") || a.includes("settings"), icon: Settings2 },
  { match: (a) => a === "seed", icon: Sparkles },
];

/** Имя объекта или undefined — сырой id в интерфейс не пускаем. */
function resolveTarget(log: AuditLog): string | undefined {
  const meta = log.meta ?? {};
  const pick = (key: string) => {
    const v = meta[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const named = pick("name") ?? pick("email") ?? pick("companyName") ?? pick("title");
  if (named) return named;

  const state = getState();
  const id = log.entityId;
  if (!id) return undefined;
  if (log.entityType === "user") return state.users.find((u) => u.id === id)?.name;
  if (log.entityType === "organization") return state.organizations.find((o) => o.id === id)?.name;
  if (log.entityType === "tour") {
    const tour = state.tours.find((t) => t.id === id);
    if (!tour) return undefined;
    try {
      return getHotel(tour.hotelId).name;
    } catch {
      return undefined;
    }
  }
  if (log.entityType === "promotion") {
    const orgId = meta["organizationId"];
    if (typeof orgId === "string") return state.organizations.find((o) => o.id === orgId)?.name;
  }
  return undefined;
}

/** Подробности: деньги, сроки, тариф — то, ради чего запись вообще открывают. */
function resolveExtra(log: AuditLog): string | undefined {
  const meta = log.meta ?? {};
  const parts: string[] = [];
  const amount = meta["amount"] ?? meta["price"];
  if (typeof amount === "number" && amount > 0) parts.push(formatPrice(amount));
  if (typeof meta["days"] === "number") parts.push(`${meta["days"]} дн.`);
  const plan = meta["plan"] ?? meta["planId"];
  if (typeof plan === "string" && plan) parts.push(`тариф ${plan}`);
  const status = meta["status"];
  if (typeof status === "string" && status) parts.push(status);
  return parts.length ? parts.join(" · ") : undefined;
}

export type AuditView = {
  title: string;
  target: string | undefined;
  /** Хвост id, когда объекта уже нет: удалённую компанию иначе не отличить. */
  trace: string | undefined;
  actor: string;
  extra: string | undefined;
  tone: AuditTone;
  icon: LucideIcon;
  routine: boolean;
};

export function auditView(log: AuditLog): AuditView {
  const routine = ROUTINE_ACTIONS.has(log.action);
  const target = resolveTarget(log);
  const actorId = log.actorId;
  const actor = actorId
    ? (getState().users.find((u) => u.id === actorId)?.name ?? "удалённый аккаунт")
    : "система";

  return {
    title: auditActionLabel[log.action] ?? log.action,
    target,
    trace: !target && log.entityId ? log.entityId.slice(0, 8) : undefined,
    actor,
    extra: resolveExtra(log),
    tone: routine
      ? "routine"
      : DANGER.has(log.action)
        ? "danger"
        : MONEY.has(log.action)
          ? "money"
          : SUCCESS.has(log.action)
            ? "success"
            : "neutral",
    icon: ICONS.find((rule) => rule.match(log.action))?.icon ?? ShieldAlert,
    routine,
  };
}

/** Классы кружка с иконкой — один и тот же язык цвета в обзоре и в журнале. */
export const auditToneClass: Record<AuditTone, string> = {
  danger: "bg-destructive/10 text-destructive",
  money: "bg-premium/15 text-premium",
  success: "bg-success/12 text-success",
  neutral: "bg-primary-soft text-primary",
  routine: "bg-secondary text-muted-foreground",
};
