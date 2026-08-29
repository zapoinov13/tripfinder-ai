import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { companyGaps, type CompanyGap } from "@/lib/platform/company-completeness";

export type CompanyReview = {
  /** Пункты по правилам: считаются всегда, без всякого AI. */
  gaps: CompanyGap[];
  /** Разбор моделью. null — если ключ не настроен. */
  ai: { ok: true; notes: string[] } | { ok: false; error: string } | null;
  /** Сколько предложений нашлось у компании — чтобы кабинет не считал заново. */
  listingsCount: number;
};

/**
 * Что модели можно доверить, а что нет.
 *
 * Правила заполненности считаются кодом и не спрашивают модель: «есть ли
 * телефон» — вопрос с одним верным ответом, и выдумывать тут нечего. Модели
 * достаётся то, где нужен взгляд: осмысленно ли описание, не противоречат ли
 * данные друг другу, похоже ли это на настоящую компанию.
 *
 * Разбор намеренно не смотрит на тумблер публичного чата. Тумблер решает,
 * впускать ли гостей к модели за деньги владельца; здесь же партнёр проверяет
 * собственную карточку, и упираться в чужую настройку ему незачем. Нужен
 * только ключ.
 */
const SYSTEM_PROMPT = `Ты — редактор карточек компаний на туристической площадке.
Тебе дают данные карточки. Найди в них то, что оттолкнёт туриста или помешает продажам:
пустые общие фразы вместо описания, противоречия между полями, название не по делу,
город и адрес из разных мест, услуги не про то, чем компания занимается, следы копипасты.

Отвечай только списком. Каждая строка — одно замечание, с новой строки, без нумерации и звёздочек.
Пиши по-русски, коротко и по делу: что не так и что сделать. Не хвали, не повторяй то,
что и так заполнено. Если всё в порядке — ответь одной строкой: ОК.
Максимум шесть строк.`;

export const reviewCompanyCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CompanyReview> => {
    // Сгенерированные типы базы отстают от самой базы: в них нет ни колонки
    // whatsapp, ни таблицы активностей. Описываем ровно то, чем пользуемся, —
    // это честнее, чем чинить типы под один запрос.
    type Row = Record<string, unknown>;
    const db = context.supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string,
          ) => {
            maybeSingle: () => Promise<{ data: Row | null }>;
            limit: (n: number) => Promise<{ data: Row[] | null }>;
          };
        };
      };
    };

    const { data: profile } = await db
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();

    const orgId = (profile?.["organization_id"] as string | undefined) ?? "";
    if (!orgId) {
      return { gaps: [], ai: { ok: false, error: "У аккаунта нет компании" }, listingsCount: 0 };
    }

    // Читаем компанию токеном самого партнёра: RLS отдаст только его же
    // организацию, чужую карточку так не разобрать.
    const { data: org } = await db
      .from("organizations")
      .select(
        "name,city,address,phone,whatsapp,about,logo_url,cover_url,photos,services,working_hours,country,website",
      )
      .eq("id", orgId)
      .maybeSingle();

    if (!org) {
      return {
        gaps: [],
        ai: { ok: false, error: "Компания не найдена" },
        listingsCount: 0,
      };
    }

    const row = org;
    const str = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : "");
    const list = (k: string) =>
      Array.isArray(row[k])
        ? (row[k] as unknown[]).filter((v): v is string => typeof v === "string")
        : [];

    // Предложения живут в двух таблицах: активности (спорт, жильё, авто) и
    // туры. Для вопроса «есть ли что покупать» важны обе.
    const [verticals, tours] = await Promise.all([
      db.from("vertical_listings").select("id").eq("organization_id", orgId).limit(200),
      db.from("tour_offers").select("id").eq("operator_org_id", orgId).limit(200),
    ]);
    const listingsCount = (verticals.data?.length ?? 0) + (tours.data?.length ?? 0);

    const company = {
      name: str("name"),
      city: str("city"),
      address: str("address"),
      phone: str("phone"),
      whatsapp: str("whatsapp"),
      about: str("about"),
      logoUrl: str("logo_url"),
      coverUrl: str("cover_url"),
      photos: list("photos"),
      services: list("services"),
      workingHours: str("working_hours"),
    };

    const gaps = companyGaps({ company, listingsCount });

    const { readSettings } = await import("@/lib/ai-settings.server");
    const { callChatCompletion, endpointFor } = await import("@/lib/ai-provider.server");
    const settings = await readSettings();
    if (!endpointFor(settings).key) {
      return { gaps, ai: null, listingsCount };
    }

    const card = [
      `Название: ${company.name || "—"}`,
      `Город: ${company.city || "—"}, страна: ${str("country") || "—"}`,
      `Адрес: ${company.address || "—"}`,
      `Телефон: ${company.phone || "—"}, WhatsApp: ${company.whatsapp || "—"}`,
      `Сайт: ${str("website") || "—"}`,
      `Часы работы: ${company.workingHours || "—"}`,
      `Направления: ${company.services.join(", ") || "—"}`,
      `Предложений в каталоге: ${listingsCount}`,
      `Описание: ${company.about || "—"}`,
    ].join("\n");

    const reply = await callChatCompletion(settings, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: card },
    ]);

    if (!reply.ok) return { gaps, ai: { ok: false, error: reply.error }, listingsCount };

    const notes = reply.text
      .split("\n")
      .map((line) => line.replace(/^[\s*\-–—•\d.)]+/, "").trim())
      .filter(Boolean)
      .filter((line) => line.toUpperCase() !== "ОК" && line.toUpperCase() !== "OK")
      .slice(0, 6);

    return { gaps, ai: { ok: true, notes }, listingsCount };
  });
