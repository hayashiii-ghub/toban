// i18n の純ロジック（副作用なし）。
// React 層・辞書の中身・localStorage 永続化・document.lang 同期は index.ts 側で扱う。

export type Locale = "ja" | "en";

const LOCALES: readonly Locale[] = ["ja", "en"];
export const DEFAULT_LOCALE: Locale = "ja";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

// 検出順: 保存済みの正しい locale > ブラウザ言語が en 始まり > ja。
export function detectLocale(
  stored: string | null,
  navigatorLanguage?: string
): Locale {
  if (isLocale(stored)) return stored;
  if (navigatorLanguage?.toLowerCase().startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

// {key} を params[key] で置換する。params に無いキーはそのまま残す。
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

// 引いた辞書で translate。locale に無ければ ja、ja にも無ければ key 自体を返す。
export function translate(
  dicts: Record<Locale, Record<string, string>>,
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const message = dicts[locale]?.[key] ?? dicts[DEFAULT_LOCALE]?.[key] ?? key;
  return interpolate(message, params);
}
