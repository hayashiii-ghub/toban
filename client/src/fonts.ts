// アプリ全体のフォント設定。色テーマ（designThemes）とは独立した軸で、
// localStorage に保存する個人設定。既定の Kiwi Maru は index.html で先読み済み。
// それ以外は選択時に初めて取得する（遅延ロード）ので、既定ユーザーの負荷は増えない。

export interface AppFont {
  id: string;
  /** i18n キー（表示名） */
  labelKey: string;
  /** CSS font-family 値 */
  family: string;
  /** Google Fonts の CSS URL。未指定＝先読み済み（Kiwi Maru） */
  href?: string;
  /** このフォントで使うウェイト。太字を持つフォントは本物の太字を出す */
  weights: { normal: string; bold: string; extra: string };
}

export const APP_FONTS: AppFont[] = [
  {
    id: "standard",
    labelKey: "font.standard",
    family: "'Kiwi Maru', serif",
    weights: { normal: "400", bold: "500", extra: "500" },
  },
  {
    id: "handwriting",
    labelKey: "font.handwriting",
    family: "'Klee One', 'Kiwi Maru', serif",
    href: "https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap",
    weights: { normal: "400", bold: "600", extra: "600" },
  },
  {
    id: "elegant",
    labelKey: "font.elegant",
    family: "'Shippori Mincho', 'Kiwi Maru', serif",
    href: "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;700&display=swap",
    weights: { normal: "400", bold: "600", extra: "700" },
  },
  {
    id: "print",
    labelKey: "font.print",
    family: "'Zen Kaku Gothic New', 'Kiwi Maru', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap",
    weights: { normal: "400", bold: "500", extra: "700" },
  },
];

export const DEFAULT_FONT_ID = "standard";
const FONT_STORAGE_KEY = "toban-font";

export function getFontById(id: string | null | undefined): AppFont {
  return APP_FONTS.find(f => f.id === id) ?? APP_FONTS[0];
}

export function getSavedFontId(): string {
  try {
    return localStorage.getItem(FONT_STORAGE_KEY) || DEFAULT_FONT_ID;
  } catch {
    return DEFAULT_FONT_ID;
  }
}

export function saveFontId(id: string) {
  try {
    localStorage.setItem(FONT_STORAGE_KEY, id);
  } catch {
    /* localStorage 不可の環境では保存しない（適用だけ行う） */
  }
}

const loadedFontHrefs = new Set<string>();

/** フォントの CSS を <link> で注入する。重複注入はガードする。 */
export function ensureFontLoaded(font: AppFont) {
  if (!font.href || loadedFontHrefs.has(font.href)) return;
  loadedFontHrefs.add(font.href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.href;
  link.dataset.appFont = font.id;
  document.head.appendChild(link);
}

/** フォントを root に適用（font-family と太字トークン）。必要なら遅延ロードする。 */
export function applyFont(font: AppFont) {
  ensureFontLoaded(font);
  const root = document.documentElement;
  root.style.setProperty("--dt-font-family", font.family);
  root.style.setProperty("--dt-font-weight-normal", font.weights.normal);
  root.style.setProperty("--dt-font-weight-bold", font.weights.bold);
  root.style.setProperty("--dt-font-weight-extra", font.weights.extra);
}

/** 起動時に保存済みフォントを適用する。 */
export function applySavedFont() {
  applyFont(getFontById(getSavedFontId()));
}
