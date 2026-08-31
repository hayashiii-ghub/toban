import type { AppState } from "@/rotation/types";
import { STORAGE_KEY } from "@/rotation/constants";
import { getTemplates } from "@shared/template-localization";
import {
  DEFAULT_APP_STATE,
  DEFAULT_APP_STATE_EN,
} from "@/rotation/defaultState";
import { createScheduleFromTemplate, sanitizeAppState } from "@/rotation/utils";
import { detectLocale } from "@/i18n/core";
import { safeGetItem, safeSetItem } from "@/lib/storage";

export function loadState(): AppState {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (raw) {
      const parsedState = sanitizeAppState(JSON.parse(raw));
      if (parsedState) {
        return parsedState;
      }
    }
  } catch {
    /* ignore corrupted data */
  }

  // 初回（保存データなし）は locale に合わせた default を seed する。
  // key は i18n の LANG_STORAGE_KEY と同じ "toban-lang"（Provider 初回 effect 前でも
  // navigator から英語を拾えるよう detectLocale に navigator.language も渡す）。
  const locale = detectLocale(
    safeGetItem("toban-lang"),
    typeof navigator !== "undefined" ? navigator.language : undefined
  );
  const defaultState = sanitizeAppState(
    locale === "en" ? DEFAULT_APP_STATE_EN : DEFAULT_APP_STATE
  );
  if (defaultState) {
    return defaultState;
  }

  const templates = getTemplates(locale);
  const customSchedule = createScheduleFromTemplate(
    templates[templates.length - 1]
  );
  return { schedules: [customSchedule], activeScheduleId: customSchedule.id };
}

export function saveState(state: AppState): boolean {
  try {
    return safeSetItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[storage] 当番表の保存データを作成できませんでした:", error);
    return false;
  }
}
