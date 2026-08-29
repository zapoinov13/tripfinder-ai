import type { Organization } from "@/lib/platform/types";

/**
 * Чего не хватает карточке компании.
 *
 * Правила живут отдельно от экрана нарочно: их спрашивают трое — кабинет
 * (показать список), уведомление (написать партнёру) и разбор AI (не выдумывать
 * пункты заново, а судить по тем же самым). Разъедься они по трём местам —
 * партнёр получал бы три разных ответа на один вопрос «что ещё сделать».
 *
 * Обязательное отделено от желательного по одному признаку: без обязательного
 * карточка не работает как карточка. Не «выглядит бедно», а именно не работает:
 * без телефона не позвонить, без услуг нечего купить, без города не найти.
 */
export type CompanyGap = {
  id: string;
  /** Короткое имя пункта — для списка в кабинете. */
  label: string;
  /** Что именно сделать. Человеку, а не разработчику. */
  hint: string;
  /** Без этого карточка не работает. */
  required: boolean;
};

const MIN_ABOUT = 80;

export type CompletenessInput = {
  company: Pick<
    Organization,
    | "name"
    | "city"
    | "address"
    | "phone"
    | "whatsapp"
    | "about"
    | "logoUrl"
    | "coverUrl"
    | "photos"
    | "services"
    | "workingHours"
  >;
  /** Сколько активных предложений у компании: туры, экскурсии, аренда, спорт. */
  listingsCount: number;
};

export function companyGaps({ company, listingsCount }: CompletenessInput): CompanyGap[] {
  const has = (v: string | undefined) => Boolean(v && v.trim());
  const gaps: CompanyGap[] = [];

  const add = (id: string, label: string, hint: string, required: boolean, ok: boolean) => {
    if (!ok) gaps.push({ id, label, hint, required });
  };

  add("name", "Название", "Как компания называется для туриста.", true, has(company.name));
  add("city", "Город", "Без города компанию не найдут в поиске по месту.", true, has(company.city));
  add(
    "contact",
    "Телефон или WhatsApp",
    "Хотя бы один способ связаться. Иначе заявка упирается в тишину.",
    true,
    has(company.phone) || has(company.whatsapp),
  );
  add(
    "listings",
    "Хотя бы одно предложение",
    "Добавьте услугу или активность с ценой — иначе на карточке нечего купить.",
    true,
    listingsCount > 0,
  );
  add(
    "about",
    "Описание",
    `Расскажите о компании хотя бы в ${MIN_ABOUT} символах: чем занимаетесь и чем отличаетесь.`,
    true,
    (company.about ?? "").trim().length >= MIN_ABOUT,
  );

  add(
    "address",
    "Адрес",
    "Улица и дом: по ним турист поймёт, как до вас добраться.",
    false,
    has(company.address),
  );
  add(
    "workingHours",
    "Часы работы",
    "Когда вы отвечаете. Без них не понятно, ждать ли ответа сегодня.",
    false,
    has(company.workingHours),
  );
  add("logo", "Логотип", "Лицо компании в списке предложений.", false, has(company.logoUrl));
  add(
    "cover",
    "Обложка",
    "Широкая картинка вверху страницы компании.",
    false,
    has(company.coverUrl),
  );
  add(
    "photos",
    "Фотографии",
    "Хотя бы одно фото: карточки с фото выбирают заметно чаще.",
    false,
    (company.photos ?? []).length > 0,
  );
  add(
    "services",
    "Чем занимаетесь",
    "Отметьте направления — по ним вам будут приходить подходящие заявки.",
    false,
    (company.services ?? []).length > 0,
  );

  return gaps;
}

/** Насколько карточка готова: для полосы прогресса и коротких подписей. */
export function companyReadiness(input: CompletenessInput) {
  const gaps = companyGaps(input);
  const required = gaps.filter((g) => g.required);
  // Всего пунктов в правилах — считаем по пустой компании, чтобы проценты не
  // прыгали от того, сколько уже заполнено.
  const total = companyGaps({
    company: { name: "", city: "", address: "", phone: "" },
    listingsCount: 0,
  }).length;
  const done = total - gaps.length;
  return {
    gaps,
    required,
    done,
    total,
    percent: total === 0 ? 100 : Math.round((done / total) * 100),
    /** Карточка работает как карточка: обязательное заполнено. */
    usable: required.length === 0,
  };
}
