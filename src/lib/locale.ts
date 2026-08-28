import { useSyncExternalStore } from "react";

export type AppLocale = "ru" | "kk";

const STORAGE_KEY = "tourgo.locale";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getAppLocale(): AppLocale {
  if (typeof window === "undefined") return "ru";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "kk" ? "kk" : "ru";
}

export function setAppLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale === "kk" ? "kk" : "ru";
  emit();
}

export function subscribeLocale(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAppLocale() {
  const locale = useSyncExternalStore(subscribeLocale, getAppLocale, () => "ru" as AppLocale);
  return {
    locale,
    setLocale: setAppLocale,
    isKk: locale === "kk",
  };
}

/** Compact UI strings for tourist cabinet (ru / kk). */
export const profileCopy = {
  ru: {
    cabinet: "Личный кабинет",
    bonuses: "Доступные бонусы",
    bonusesHint: "Баллы и скидки на поездки",
    promo: "Активировать промокод",
    promoHint: "Введите код из рассылки или партнёра",
    history: "История путешествий",
    historyHint: "Поездки и бронирования",
    myRequests: "Мои заявки и записи",
    myRequestsHint: "Что ответили компании",
    myMessages: "Сообщения",
    myMessagesHint: "Переписка по заявкам",
    gift: "Подарочный сертификат",
    giftHint: "Купить или активировать сертификат",
    data: "Данные туриста",
    dataHint: "Имя, город, уведомления",
    contact: "Связаться с нами",
    contactHint: "Поддержка TourGo",
    language: "Язык",
    logout: "Выйти",
    bonusBalance: "Бонусный баланс",
    points: "баллов",
    activate: "Активировать",
    promoPlaceholder: "Например TOURGO500",
    promoOk: "Промокод принят",
    promoBad: "Промокод не найден",
    giftTitle: "Подарочный сертификат",
    giftText: "Скоро: покупка и активация сертификата на оплату тура. Пока напишите в поддержку.",
    writeSupport: "Написать в поддержку",
  },
  kk: {
    cabinet: "Жеке кабинет",
    bonuses: "Қолжетімді бонустар",
    bonusesHint: "Сапарға ұпайлар мен жеңілдіктер",
    promo: "Промокодты белсендіру",
    promoHint: "Жіберілімнен немесе серіктестен код",
    history: "Саяхат тарихы",
    historyHint: "Броньдар мен сапарлар",
    myRequests: "Менің өтінімдерім",
    myRequestsHint: "Компаниялар не жауап берді",
    myMessages: "Хабарламалар",
    myMessagesHint: "Өтінімдер бойынша жазысу",
    gift: "Сыйлық сертификаты",
    giftHint: "Сатып алу немесе белсендіру",
    data: "Турист деректері",
    dataHint: "Аты, қала, хабарламалар",
    contact: "Бізбен байланысу",
    contactHint: "TourGo қолдау қызметі",
    language: "Тіл",
    logout: "Шығу",
    bonusBalance: "Бонус балансы",
    points: "ұпай",
    activate: "Белсендіру",
    promoPlaceholder: "Мысалы TOURGO500",
    promoOk: "Промокод қабылданды",
    promoBad: "Промокод табылмады",
    giftTitle: "Сыйлық сертификаты",
    giftText: "Жақында: турға сертификат. Қазір қолдауға жазыңыз.",
    writeSupport: "Қолдауға жазу",
  },
} as const;

export function tProfile(locale: AppLocale) {
  return profileCopy[locale];
}
