import {
  computed,
  inject,
  provide,
  ref,
  watch,
  type InjectionKey,
  type Ref,
} from "vue";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { defineView } from "@/lib/vue";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isLocale,
  translate,
  type Locale,
} from "./core";
import { ja, type MessageKey } from "./locales/ja";
import { en } from "./locales/en";

export type { MessageKey };
const LANG_STORAGE_KEY = "toban-lang";
const dicts: Record<Locale, Record<string, string>> = { ja, en };
interface I18nContextType {
  locale: Ref<Locale>;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}
const I18nContext: InjectionKey<I18nContextType> = Symbol("toban-language");

export const LanguageProvider = defineView<object>([], (_props, { slots }) => {
  const locale = ref<Locale>(
    detectLocale(
      safeGetItem(LANG_STORAGE_KEY),
      typeof navigator !== "undefined" ? navigator.language : undefined
    )
  );
  const value: I18nContextType = {
    locale,
    setLocale: next => {
      locale.value = next;
    },
    t: (key, params) => translate(dicts, locale.value, key, params),
  };
  provide(I18nContext, value);
  watch(
    locale,
    next => {
      document.documentElement.lang = next;
      safeSetItem(LANG_STORAGE_KEY, next);
    },
    { immediate: true, flush: "sync" }
  );
  return () => slots.default?.();
});

const fallback: I18nContextType = {
  locale: ref(DEFAULT_LOCALE),
  setLocale: () => {},
  t: (key, params) => translate(dicts, DEFAULT_LOCALE, key, params),
};
function useI18n(): I18nContextType {
  return inject(I18nContext, fallback);
}
export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
export function useT(): I18nContextType["t"] {
  return useI18n().t;
}
export function useDateLocale() {
  const { locale } = useI18n();
  return computed(() => (locale.value === "ja" ? "ja-JP" : "en-US"));
}
export function tStandalone(
  key: MessageKey,
  params?: Record<string, string | number>
): string {
  const lang =
    typeof document !== "undefined" ? document.documentElement.lang : "";
  return translate(dicts, isLocale(lang) ? lang : DEFAULT_LOCALE, key, params);
}
