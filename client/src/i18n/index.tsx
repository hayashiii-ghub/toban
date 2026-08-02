import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isLocale,
  translate,
  type Locale,
} from "./core";
import { ja } from "./locales/ja";
import { en } from "./locales/en";

const LANG_STORAGE_KEY = "toban-lang";

const dicts: Record<Locale, Record<string, string>> = { ja, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    detectLocale(
      safeGetItem(LANG_STORAGE_KEY),
      typeof navigator !== "undefined" ? navigator.language : undefined
    )
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    safeSetItem(LANG_STORAGE_KEY, locale);
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(dicts, locale, key, params),
    [locale]
  );

  const value = useMemo<I18nContextType>(
    () => ({ locale, setLocale, t }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Provider 未提供時の fallback（既定言語 ja・setLocale は no-op）。
// アプリ root は常に LanguageProvider で包むため、これが効くのは
// 単体テストでコンポーネントを isolation render したときだけ。
const FALLBACK_CONTEXT: I18nContextType = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, params) => translate(dicts, DEFAULT_LOCALE, key, params),
};

function useI18n(): I18nContextType {
  return useContext(I18nContext) ?? FALLBACK_CONTEXT;
}

export function useLocale(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
} {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}

export function useT(): I18nContextType["t"] {
  return useI18n().t;
}

// 日付整形用の BCP47 タグ（Intl 系 API に渡す）。
export function useDateLocale(): string {
  return useI18n().locale === "ja" ? "ja-JP" : "en-US";
}

// hook を使えない場所（class component の ErrorBoundary、純関数の lib）向けの翻訳。
// Provider が document.documentElement.lang を同期しているのでそこから locale を読む。
export function tStandalone(
  key: string,
  params?: Record<string, string | number>
): string {
  const lang =
    typeof document !== "undefined" ? document.documentElement.lang : "";
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return translate(dicts, locale, key, params);
}
