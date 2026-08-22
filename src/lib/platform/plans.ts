import type { OperatorPlanCode } from "./types";

/** What each operator plan unlocks for catalog ingest. */
export const planFeatures = {
  START: {
    manual: true,
    urlImport: true,
    telegramDraft: true,
    apiFeed: false,
    livePrice: false,
    priorityPlacement: false,
  },
  BUSINESS: {
    manual: true,
    urlImport: true,
    telegramDraft: true,
    apiFeed: true,
    livePrice: false,
    priorityPlacement: false,
  },
  PRO: {
    manual: true,
    urlImport: true,
    telegramDraft: true,
    apiFeed: true,
    livePrice: true,
    priorityPlacement: true,
  },
} as const satisfies Record<
  OperatorPlanCode,
  {
    manual: boolean;
    urlImport: boolean;
    telegramDraft: boolean;
    apiFeed: boolean;
    livePrice: boolean;
    priorityPlacement: boolean;
  }
>;

export function planAllowsApiFeed(plan: OperatorPlanCode | undefined | null) {
  return planFeatures[plan ?? "START"].apiFeed;
}

export function planAllowsLivePrice(plan: OperatorPlanCode | undefined | null) {
  return planFeatures[plan ?? "START"].livePrice;
}

export function planTitle(plan: OperatorPlanCode) {
  return ({ START: "Старт", BUSINESS: "Бизнес", PRO: "Про" } as const)[plan];
}

export function apiFeedUpgradeHint(plan: OperatorPlanCode | undefined | null) {
  if (planAllowsApiFeed(plan)) return null;
  return "Автозагрузка каталога по API доступна на тарифах «Бизнес» и «Про».";
}
