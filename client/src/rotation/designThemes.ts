export interface DesignThemeColors {
  pageBg: string;
  cardBg: string;
  controlBarBg: string;
  controlBarText: string;
  controlBarSubtext: string;
  buttonBg: string;
  tabActiveBg: string;
  tabActiveText: string;
  tabInactiveBg: string;
  tabInactiveText: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  tableBorderStrong: string;
  tableBorderLight: string;
  focusRing: string;
  currentHighlight: string;
}

export interface DesignThemeBorders {
  width: string;
  radius: string;
  radiusSm: string;
}

export interface DesignThemeShadows {
  card: string;
  cardSm: string;
  cardHover: string;
  cardLg: string;
}

export interface DesignThemeTypography {
  fontFamily: string;
  fontWeightNormal: string;
  fontWeightBold: string;
  fontWeightExtra: string;
}

export interface DesignThemeEffects {
  hoverTranslate: string;
}

/**
 * 質感が持つ、色に依存しない見た目。省略時は applyThemeToRoot が既定値を入れるので、
 * 旧テーマ（下の DESIGN_THEMES）は未指定のままで今までどおり描画される。
 */
export interface DesignThemeSurface {
  /** メンバー/タスクチップの枠の太さ。色は member.color 側が持つ */
  chipBorderWidth: string;
  chipShadow: string;
  /** 印刷時に残す影。既定は none（紙に影を落とさない） */
  printShadow: string;
  /** 印刷時の枠の太さ。画面で枠を持たない質感でも、紙では輪郭が要る */
  printBorderWidth: string;
  /** カード面の background-image。和紙のテクスチャや、ねんどの陰影用 */
  texture: string;
  /** 紙面（ページ背景）の background-image。カード面とは粒の粗さを変える */
  pageTexture: string;
  /** カード見出しの背景。ねんどのように面を透かせたい質感が上書きする */
  headerBg: string;
}

export interface DesignTheme {
  id: string;
  name: string;
  description: string;
  preview: {
    primaryColor: string;
    secondaryColor: string;
    bgColor: string;
  };
  colors: DesignThemeColors;
  borders: DesignThemeBorders;
  shadows: DesignThemeShadows;
  typography: DesignThemeTypography;
  effects: DesignThemeEffects;
  surface?: DesignThemeSurface;
}

// ── テーマ定義 ──

// 全テーマで同一。フォントは client/src/fonts.ts が独立して所有しており、
// DesignThemeContext は typography を適用しない（テーマ切替でフォントが巻き戻らないようにするため）。
const SHARED_TYPOGRAPHY: DesignThemeTypography = {
  fontFamily: "'Kiwi Maru', serif",
  fontWeightNormal: "400",
  fontWeightBold: "500",
  fontWeightExtra: "500",
};

const sunflower: DesignTheme = {
  id: "sunflower",
  name: "ひまわり",
  description: "明るく温かいひまわり色",
  preview: {
    primaryColor: "#F0A830",
    secondaryColor: "#FFF4D8",
    bgColor: "#FFFCF0",
  },
  colors: {
    pageBg: "#FFFCF0",
    cardBg: "#ffffff",
    controlBarBg: "#F0A830",
    controlBarText: "#3D2800",
    controlBarSubtext: "#6B4E10",
    buttonBg: "#ffffff",
    tabActiveBg: "#F0A830",
    tabActiveText: "#3D2800",
    tabInactiveBg: "#ffffff",
    tabInactiveText: "#908060",
    text: "#2C2410",
    textSecondary: "#6B5E40",
    textMuted: "#908060",
    borderColor: "#C6A24E",
    tableBorderStrong: "#B08E3A",
    tableBorderLight: "#ECE0C0",
    focusRing: "#F0A830",
    currentHighlight: "#F2C64E",
  },
  borders: {
    width: "1.5px",
    radius: "12px",
    radiusSm: "8px",
  },
  shadows: {
    card: "0 2px 8px rgba(212, 168, 48, 0.12)",
    cardSm: "0 1px 4px rgba(212, 168, 48, 0.08)",
    cardHover: "0 4px 16px rgba(212, 168, 48, 0.2)",
    cardLg: "0 4px 12px rgba(212, 168, 48, 0.15)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

const crayon: DesignTheme = {
  id: "crayon",
  name: "クレヨン",
  description: "クレヨンで描いたようなデザイン",
  preview: {
    primaryColor: "#E86830",
    secondaryColor: "#FFE4CC",
    bgColor: "#FFF6EC",
  },
  colors: {
    pageBg: "#FFF6EC",
    cardBg: "#FFFEFA",
    controlBarBg: "#E86830",
    controlBarText: "#ffffff",
    controlBarSubtext: "#FFE4D0",
    buttonBg: "#FFFEFA",
    tabActiveBg: "#E86830",
    tabActiveText: "#ffffff",
    tabInactiveBg: "#FFFEFA",
    tabInactiveText: "#907868",
    text: "#3A2518",
    textSecondary: "#6B5040",
    textMuted: "#907868",
    borderColor: "#5C3A1E",
    tableBorderStrong: "#5C3A1E",
    tableBorderLight: "#F0D8C4",
    focusRing: "#E86830",
    currentHighlight: "#FFB870",
  },
  borders: {
    width: "2.5px",
    radius: "16px",
    radiusSm: "10px",
  },
  shadows: {
    card: "0 2px 8px rgba(92, 58, 30, 0.14)",
    cardSm: "0 1px 4px rgba(92, 58, 30, 0.10)",
    cardHover: "0 4px 14px rgba(92, 58, 30, 0.22)",
    cardLg: "0 3px 10px rgba(92, 58, 30, 0.16)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "-1px",
  },
};

const lavender: DesignTheme = {
  id: "lavender",
  name: "ラベンダー",
  description: "上品なラベンダーカラー",
  preview: {
    primaryColor: "#9B85CC",
    secondaryColor: "#EDE6F8",
    bgColor: "#F8F5FC",
  },
  colors: {
    pageBg: "#F8F5FC",
    cardBg: "#ffffff",
    controlBarBg: "#9B85CC",
    controlBarText: "#2A1E48",
    controlBarSubtext: "#4A3870",
    buttonBg: "#ffffff",
    tabActiveBg: "#9B85CC",
    tabActiveText: "#2A1E48",
    tabInactiveBg: "#ffffff",
    tabInactiveText: "#887898",
    text: "#2A2035",
    textSecondary: "#5A4E6B",
    textMuted: "#887898",
    borderColor: "#AB93D2",
    tableBorderStrong: "#8A72BC",
    tableBorderLight: "#E0D8EE",
    focusRing: "#9B85CC",
    currentHighlight: "#B7A0EA",
  },
  borders: {
    width: "1.5px",
    radius: "16px",
    radiusSm: "10px",
  },
  shadows: {
    card: "0 2px 10px rgba(155, 133, 204, 0.14)",
    cardSm: "0 1px 5px rgba(155, 133, 204, 0.10)",
    cardHover: "0 5px 20px rgba(155, 133, 204, 0.24)",
    cardLg: "0 4px 14px rgba(155, 133, 204, 0.17)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

const whiteboard: DesignTheme = {
  id: "whiteboard",
  name: "ホワイトボード",
  description: "ホワイトボード風のすっきりデザイン",
  preview: {
    primaryColor: "#666666",
    secondaryColor: "#f5f5f5",
    bgColor: "#ffffff",
  },
  colors: {
    pageBg: "#ffffff",
    cardBg: "#ffffff",
    controlBarBg: "#f0f0f0",
    controlBarText: "#333333",
    controlBarSubtext: "#555555",
    buttonBg: "#ffffff",
    tabActiveBg: "#333333",
    tabActiveText: "#ffffff",
    tabInactiveBg: "#f5f5f5",
    tabInactiveText: "#777777",
    text: "#1a1a1a",
    textSecondary: "#666666",
    textMuted: "#888888",
    borderColor: "#a8a8a8",
    tableBorderStrong: "#7e7e7e",
    tableBorderLight: "#d8d8d8",
    focusRing: "#666666",
    currentHighlight: "#e0e0e0",
  },
  borders: {
    width: "1px",
    radius: "8px",
    radiusSm: "4px",
  },
  shadows: {
    card: "0 1px 3px rgba(0, 0, 0, 0.08)",
    cardSm: "0 1px 2px rgba(0, 0, 0, 0.06)",
    cardHover: "0 2px 8px rgba(0, 0, 0, 0.12)",
    cardLg: "0 2px 6px rgba(0, 0, 0, 0.1)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

const nature: DesignTheme = {
  id: "nature",
  name: "わかば",
  description: "フレッシュな若葉のデザイン",
  preview: {
    primaryColor: "#6B9E6B",
    secondaryColor: "#E8F0E4",
    bgColor: "#F5F7F2",
  },
  colors: {
    pageBg: "#F5F7F2",
    cardBg: "#ffffff",
    controlBarBg: "#6B9E6B",
    controlBarText: "#ffffff",
    controlBarSubtext: "#E4F2E4",
    buttonBg: "#ffffff",
    tabActiveBg: "#6B9E6B",
    tabActiveText: "#ffffff",
    tabInactiveBg: "#ffffff",
    tabInactiveText: "#778877",
    text: "#2D3B2D",
    textSecondary: "#5A6B5A",
    textMuted: "#7A8E7A",
    borderColor: "#9BBE88",
    tableBorderStrong: "#79A468",
    tableBorderLight: "#D8E6D0",
    focusRing: "#6B9E6B",
    currentHighlight: "#8FCB8C",
  },
  borders: {
    width: "1.5px",
    radius: "10px",
    radiusSm: "6px",
  },
  shadows: {
    card: "0 2px 8px rgba(45, 91, 39, 0.1)",
    cardSm: "0 1px 4px rgba(45, 91, 39, 0.08)",
    cardHover: "0 4px 16px rgba(45, 91, 39, 0.16)",
    cardLg: "0 4px 12px rgba(45, 91, 39, 0.12)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

const sakura: DesignTheme = {
  id: "sakura",
  name: "さくら",
  description: "やさしい桜色のデザイン",
  preview: {
    primaryColor: "#F9A8B8",
    secondaryColor: "#FFF0F3",
    bgColor: "#FFF5F7",
  },
  colors: {
    pageBg: "#FFF5F7",
    cardBg: "#ffffff",
    controlBarBg: "#F9A8B8",
    controlBarText: "#5C1A2A",
    controlBarSubtext: "#8E3852",
    buttonBg: "#ffffff",
    tabActiveBg: "#F9A8B8",
    tabActiveText: "#5C1A2A",
    tabInactiveBg: "#ffffff",
    tabInactiveText: "#887080",
    text: "#3B2C30",
    textSecondary: "#7A5A62",
    textMuted: "#9A808A",
    borderColor: "#E497AC",
    tableBorderStrong: "#DB89A0",
    tableBorderLight: "#F5E0E5",
    focusRing: "#F9A8B8",
    currentHighlight: "#F7B0CE",
  },
  borders: {
    width: "1.5px",
    radius: "16px",
    radiusSm: "10px",
  },
  shadows: {
    card: "0 2px 10px rgba(249, 168, 184, 0.18)",
    cardSm: "0 1px 5px rgba(249, 168, 184, 0.12)",
    cardHover: "0 5px 20px rgba(249, 168, 184, 0.28)",
    cardLg: "0 4px 14px rgba(249, 168, 184, 0.2)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

const nightsky: DesignTheme = {
  id: "nightsky",
  name: "よぞら",
  description: "落ち着いた夜空のデザイン",
  preview: {
    primaryColor: "#1D2E4E",
    secondaryColor: "#DDE4F0",
    bgColor: "#EAEEF6",
  },
  colors: {
    pageBg: "#EAEEF6",
    cardBg: "#F7F9FD",
    controlBarBg: "#1D2E4E",
    controlBarText: "#EAF0FB",
    controlBarSubtext: "#A9BBD6",
    buttonBg: "#F7F9FD",
    tabActiveBg: "#1D2E4E",
    tabActiveText: "#EAF0FB",
    tabInactiveBg: "#F7F9FD",
    tabInactiveText: "#6E7E9C",
    text: "#17233D",
    textSecondary: "#45577C",
    textMuted: "#6E7E9C",
    borderColor: "#3E568A",
    tableBorderStrong: "#4A6198",
    tableBorderLight: "#C8D2E4",
    focusRing: "#2C4466",
    currentHighlight: "#E6C069",
  },
  borders: {
    width: "1.5px",
    radius: "10px",
    radiusSm: "6px",
  },
  shadows: {
    card: "0 2px 8px rgba(44, 68, 102, 0.1)",
    cardSm: "0 1px 4px rgba(44, 68, 102, 0.07)",
    cardHover: "0 4px 16px rgba(44, 68, 102, 0.18)",
    cardLg: "0 4px 12px rgba(44, 68, 102, 0.13)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

const chalkboard: DesignTheme = {
  id: "chalkboard",
  name: "こくばん",
  description: "教室の黒板をイメージ",
  preview: {
    primaryColor: "#294A3A",
    secondaryColor: "#EFE7D6",
    bgColor: "#EEE7DA",
  },
  colors: {
    pageBg: "#EEE7DA",
    cardBg: "#FBFAF4",
    controlBarBg: "#294A3A",
    controlBarText: "#F3EEDF",
    controlBarSubtext: "#BFD2C4",
    buttonBg: "#FBFAF4",
    tabActiveBg: "#294A3A",
    tabActiveText: "#F3EEDF",
    tabInactiveBg: "#FBFAF4",
    tabInactiveText: "#8A7B68",
    text: "#2A3A30",
    textSecondary: "#4A6050",
    textMuted: "#708878",
    borderColor: "#6B4A2E",
    tableBorderStrong: "#7A5638",
    tableBorderLight: "#DCD2C2",
    focusRing: "#294A3A",
    currentHighlight: "#E7D08A",
  },
  borders: {
    width: "1.5px",
    radius: "6px",
    radiusSm: "4px",
  },
  shadows: {
    card: "0 2px 8px rgba(46, 107, 79, 0.1)",
    cardSm: "0 1px 4px rgba(46, 107, 79, 0.08)",
    cardHover: "0 4px 16px rgba(46, 107, 79, 0.18)",
    cardLg: "0 4px 12px rgba(46, 107, 79, 0.12)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

const ocean: DesignTheme = {
  id: "ocean",
  name: "うみ",
  description: "さわやかな海のデザイン",
  preview: {
    primaryColor: "#50B0E0",
    secondaryColor: "#E0F2FC",
    bgColor: "#F0F8FE",
  },
  colors: {
    pageBg: "#F0F8FE",
    cardBg: "#ffffff",
    controlBarBg: "#50B0E0",
    controlBarText: "#0A3048",
    controlBarSubtext: "#1E5070",
    buttonBg: "#ffffff",
    tabActiveBg: "#50B0E0",
    tabActiveText: "#0A3048",
    tabInactiveBg: "#ffffff",
    tabInactiveText: "#6890A8",
    text: "#1A3050",
    textSecondary: "#3A6888",
    textMuted: "#6890A8",
    borderColor: "#72B8E0",
    tableBorderStrong: "#4E9CCE",
    tableBorderLight: "#D0E8F6",
    focusRing: "#50B0E0",
    currentHighlight: "#7CC7EF",
  },
  borders: {
    width: "1.5px",
    radius: "12px",
    radiusSm: "8px",
  },
  shadows: {
    card: "0 2px 8px rgba(80, 176, 224, 0.12)",
    cardSm: "0 1px 4px rgba(80, 176, 224, 0.08)",
    cardHover: "0 4px 16px rgba(80, 176, 224, 0.2)",
    cardLg: "0 4px 12px rgba(80, 176, 224, 0.15)",
  },
  typography: {
    fontFamily: "'Kiwi Maru', serif",
    fontWeightNormal: "400",
    fontWeightBold: "500",
    fontWeightExtra: "500",
  },
  effects: {
    hoverTranslate: "0px",
  },
};

/**
 * 旧テーマ。`designThemeId` に単体IDで保存済みのスケジュールがあるので、定義を凍結して残す。
 * ピッカーには出さないが、getThemeById は今までどおり解決する（既存の見た目を変えないため）。
 */
export const DESIGN_THEMES: DesignTheme[] = [
  whiteboard,
  chalkboard,
  crayon,
  sunflower,
  lavender,
  sakura,
  nature,
  ocean,
  nightsky,
];

// ── 2軸テーマ（質感 × 色）──
// designThemeId は `<質感>/<色>` の複合IDで保存する。shared/schemas.ts が z.string() で
// 受けているため、スキーマもD1マイグレーションも不要。区切りを含まないIDは旧テーマとして扱う。

export const THEME_ID_SEPARATOR = "/";

/** 影の色は色軸の borderColor から作る。質感側が色を持たないようにするため */
const tint = (pct: number) =>
  `color-mix(in srgb, var(--dt-border-color) ${pct}%, transparent)`;

/** カード見出しの既定。旧テーマが AssignmentsGrid に直書きしていた式と同じ */
const DEFAULT_HEADER_BG =
  "color-mix(in srgb, var(--dt-page-bg) 60%, var(--dt-card-bg))";

/** 見出しの色を残しつつカード面を透かす。既定とほぼ同じ色に見えて、粒やつやが下から出る */
const TRANSLUCENT_HEADER_BG =
  "color-mix(in srgb, var(--dt-page-bg) 60%, transparent)";

export interface DesignTexture {
  id: string;
  /** 日本語名。合成テーマの name を組み立てるのに使う */
  name: string;
  /** 表示名の i18n キー。オノマトペは英訳できないので en はローマ字表記 */
  labelKey: string;
  description: string;
  borders: DesignThemeBorders;
  shadows: DesignThemeShadows;
  effects: DesignThemeEffects;
  surface: DesignThemeSurface;
}

export interface DesignColor {
  id: string;
  /** 日本語名。合成テーマの name を組み立てるのに使う */
  name: string;
  /** 表示名の i18n キー */
  labelKey: string;
  preview: DesignTheme["preview"];
  colors: DesignThemeColors;
}

/**
 * 質感は素材名ではなく手ざわり（オノマトペ）で持つ。素材名にすると「和紙と名乗る以上は
 * 和紙に見えないといけない」という制約が生まれ、実装と名前がずれる。手ざわりなら
 * ざらついていれば「ざらざら」で成立するし、道具（クレヨン）と材料（紙）が
 * 同じ軸に混ざる歪みも起きない。
 *
 * ノイズはすべて feTurbulence の data URI。画像ファイルを増やさないので追加リクエストは0で、
 * 1つあたり260バイト前後。3つは機構ごと分けてあり、並べても互いに混ざらない。
 *   さらさら … 横に伸ばした細かい繊維（X を小さく）
 *   ざらざら … 等方の粗い粒 + 太い枠
 *   もちもち … 陰影で盛り上げる。粒は使わない
 * opacity は 0.15 前後が上限。0.30 まで上げると木目のようになり、白黒印刷で濁る。
 *
 * 紙面（ページ背景）はカード面より粒を粗く薄くする。同じ粒だと画面全体が一枚の板に見え、
 * カードが浮かなくなるため。印刷では home.css がページ背景を白へ落とすので、紙面は画面だけに出る
 * （インク消費と、@page の余白が作る白い額縁を避けるため）。
 */
const noise = (
  baseFrequency: string,
  octaves: number,
  opacity: number,
  id: string
) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='${id}'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${octaves}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23${id})' opacity='${opacity}'/%3E%3C/svg%3E")`;

const SARA_FIBER = noise("0.025 0.7", 3, 0.15, "sf");
const SARA_PAGE = noise("0.015 0.5", 3, 0.1, "sp");
const ZARA_GRAIN = noise("0.45", 3, 0.17, "zg");
const ZARA_PAGE = noise("0.35", 3, 0.12, "zp");
const MOCHI_MOTTLE = noise("0.012", 2, 0.1, "mm");

const sarasara: DesignTexture = {
  id: "sarasara",
  name: "さらさら",
  labelKey: "texture.sarasara",
  description: "細かい繊維の、かわいた手ざわり",
  borders: { width: "1.5px", radius: "12px", radiusSm: "8px" },
  shadows: {
    card: `0 2px 8px ${tint(22)}`,
    cardSm: `0 1px 4px ${tint(16)}`,
    cardHover: `0 4px 16px ${tint(34)}`,
    cardLg: `0 4px 12px ${tint(26)}`,
  },
  effects: { hoverTranslate: "0px" },
  surface: {
    chipBorderWidth: "2px",
    chipShadow: "none",
    printShadow: "none",
    printBorderWidth: "1.5px",
    texture: SARA_FIBER,
    pageTexture: SARA_PAGE,
    // 見出しを不透明にすると、そこだけ粒が隠れて面が途切れる。
    // page-bg 側だけ混ぜて透かし、カード全体をひと続きの面に見せる
    headerBg: TRANSLUCENT_HEADER_BG,
  },
};

// 粘土は画像を使わない。角丸・枠なし・inset shadow・グラデーションだけで出すので追加アセットは0バイト。
// 9パレット中7つが cardBg: #ffffff なので、inset の白いハイライトが白面に埋もれる。
// texture のグラデーションで面に体積を与えて、そのうえで陰影を乗せる。
// 印刷でも inset は残す（printShadow）。外側の落ち影だけ落として紙に影が出ないようにする。
const CLAY_INSET = `inset -3px -3px 8px ${tint(24)}, inset 3px 3px 8px rgba(255, 255, 255, 0.65)`;

const mochimochi: DesignTexture = {
  id: "mochimochi",
  name: "もちもち",
  labelKey: "texture.mochimochi",
  description: "まるく盛り上がった、やわらかい手ざわり",
  borders: { width: "0px", radius: "18px", radiusSm: "12px" },
  shadows: {
    card: `${CLAY_INSET}, 2px 3px 8px ${tint(16)}`,
    cardSm: `inset -1.5px -1.5px 4px ${tint(18)}, inset 1.5px 1.5px 4px rgba(255, 255, 255, 0.6)`,
    cardHover: `${CLAY_INSET}, 3px 5px 12px ${tint(22)}`,
    cardLg: `${CLAY_INSET}, 2px 4px 10px ${tint(18)}`,
  },
  effects: { hoverTranslate: "-1px" },
  surface: {
    chipBorderWidth: "0px",
    chipShadow: `inset -1.5px -1.5px 4px ${tint(24)}, inset 1.5px 1.5px 4px rgba(255, 255, 255, 0.6)`,
    printShadow: CLAY_INSET,
    // 画面では枠なしで丸いかたまりに見せるが、紙では inset の陰影が白黒でほぼ飛ぶ。
    // 輪郭が消えてカードの切れ目が分からなくなるので、印刷のときだけ細い枠を出す
    printBorderWidth: "1px",
    texture: `linear-gradient(145deg, rgba(255, 255, 255, 0.35), ${tint(9)})`,
    // 紙面にカードのグラデーションを引き伸ばすと巨大な斜めグラデになる。
    // 練った粘土板のような低周波のムラにして、紙2種とは周波数帯を分ける
    pageTexture: MOCHI_MOTTLE,
    // 見出しに色を置くとカード面に継ぎ目が出る。透過させてひとかたまりの粘土に見せ、
    // 見出しとメンバーの区別はチップ側の色で付ける
    headerBg: "transparent",
  },
};

// 旧「クレヨン」テーマが持っていた個性は色ではなく線だった（width 2.5px / radius 16px /
// hoverTranslate -1px）。9テーマで唯一パレット以外の特徴を持っていたので、質感軸へ移す。
// 太い枠 + 等方の中目は画用紙そのものなので、道具名ではなく材料名にして
// 和紙・ねんどとカテゴリを揃える。旧クレヨン利用者は選び直しても太枠を失わない。
const zarazara: DesignTexture = {
  id: "zarazara",
  name: "ざらざら",
  labelKey: "texture.zarazara",
  description: "太い線でふちどった、粗い手ざわり",
  borders: { width: "2.5px", radius: "16px", radiusSm: "10px" },
  shadows: {
    card: `0 2px 8px ${tint(14)}`,
    cardSm: `0 1px 4px ${tint(10)}`,
    cardHover: `0 4px 14px ${tint(22)}`,
    cardLg: `0 3px 10px ${tint(16)}`,
  },
  effects: { hoverTranslate: "-1px" },
  surface: {
    chipBorderWidth: "2.5px",
    chipShadow: "none",
    printShadow: "none",
    printBorderWidth: "2.5px",
    texture: ZARA_GRAIN,
    pageTexture: ZARA_PAGE,
    headerBg: TRANSLUCENT_HEADER_BG,
  },
};

export const THEME_TEXTURES: DesignTexture[] = [
  sarasara,
  zarazara,
  mochimochi,
];

/**
 * 色軸は旧テーマのパレットをそのまま流用する。18フィールドがコントラストを見て
 * 手で調整されている（controlBarText がひまわり=濃茶 / わかば=白 と反転しているのがその例）ため、
 * 作り直さず再利用する。素材を指す名前だけ色の名前へ読み替える。
 */
/**
 * 色軸の表示名。IDは据え置きなので、名前を変えても保存データには影響しない。
 */
const COLOR_LABELS: Record<string, { name: string; labelKey: string }> = {
  whiteboard: { name: "いんさつ", labelKey: "themeColor.print" },
  chalkboard: { name: "こくばん", labelKey: "themeColor.blackboard" },
  crayon: { name: "だいだい", labelKey: "themeColor.daidai" },
  sunflower: { name: "ひまわり", labelKey: "themeColor.sunflower" },
  lavender: { name: "あじさい", labelKey: "themeColor.hydrangea" },
  sakura: { name: "さくら", labelKey: "themeColor.sakura" },
  nature: { name: "わかば", labelKey: "themeColor.freshGreen" },
  ocean: { name: "そら", labelKey: "themeColor.sky" },
  nightsky: { name: "よぞら", labelKey: "themeColor.nightSky" },
};

/**
 * 色軸のパレット調整。旧テーマは凍結したままなので、差分だけここに持つ。
 * 名前が指す情景に色を寄せる：あじさいは紫から青紫へ、わかばは深緑から黄緑へ、
 * ひまわりは琥珀から黄へ、だいだいは赤橙から橙へ、そらは海の青から空の青へ。
 * いんさつ・こくばん・さくら・よぞらは名前と色がすでに一致しているので触らない。
 *
 * 明度は動かさずに色相だけ寄せている。18フィールドはコントラストを見て手で決められており、
 * 明度を動かすと controlBarText（白／濃色がパレットごとに反転している）が破綻するため。
 * いちばん弱かった2つは実測で だいだい 3.25→3.37、わかば 3.12→3.37 と改善している。
 */
const COLOR_OVERRIDES: Record<
  string,
  { preview?: Partial<DesignTheme["preview"]>; colors?: Partial<DesignThemeColors> }
> = {
  crayon: {
    preview: {
      primaryColor: "#DF6A24",
      secondaryColor: "#FFE2C4",
      bgColor: "#FFF5E9",
    },
    colors: {
      pageBg: "#FFF5E9",
      controlBarBg: "#DF6A24",
      controlBarSubtext: "#FFE0C6",
      tabActiveBg: "#DF6A24",
      focusRing: "#DF6A24",
      currentHighlight: "#FFB765",
      tableBorderLight: "#F0D6BE",
      // borderColor（#5C3A1E）は据え置き。9色で最も濃い枠なので、印刷の輪郭がいちばん鮮明
    },
  },
  sunflower: {
    preview: { primaryColor: "#F2B52A", secondaryColor: "#FFF2CE" },
    colors: {
      controlBarBg: "#F2B52A",
      tabActiveBg: "#F2B52A",
      focusRing: "#F2B52A",
      currentHighlight: "#F4CE4A",
      borderColor: "#C9AC46",
      tableBorderStrong: "#B49A32",
    },
  },
  lavender: {
    preview: {
      primaryColor: "#8189CE",
      secondaryColor: "#E6E9F8",
      bgColor: "#F5F6FC",
    },
    colors: {
      pageBg: "#F5F6FC",
      controlBarBg: "#8189CE",
      controlBarText: "#1E2148",
      controlBarSubtext: "#363E70",
      tabActiveBg: "#8189CE",
      tabActiveText: "#1E2148",
      tabInactiveText: "#7C82A0",
      text: "#232735",
      textSecondary: "#4E546B",
      textMuted: "#7C82A0",
      borderColor: "#939AD4",
      tableBorderStrong: "#7178BE",
      tableBorderLight: "#D8DBEE",
      focusRing: "#8189CE",
      currentHighlight: "#A0A8EA",
    },
  },
  nature: {
    preview: {
      primaryColor: "#67994B",
      secondaryColor: "#EAF0DF",
      bgColor: "#F6F8F0",
    },
    colors: {
      pageBg: "#F6F8F0",
      controlBarBg: "#67994B",
      controlBarSubtext: "#E8F2DC",
      tabActiveBg: "#67994B",
      tabInactiveText: "#7F8E72",
      text: "#2F3B28",
      textSecondary: "#5D6B52",
      textMuted: "#7F8E72",
      borderColor: "#A3BE7E",
      tableBorderStrong: "#85A45C",
      tableBorderLight: "#DCE6CC",
      focusRing: "#67994B",
      currentHighlight: "#A6CB78",
    },
  },
  ocean: {
    preview: { primaryColor: "#54B2E6" },
    colors: {
      controlBarBg: "#54B2E6",
      tabActiveBg: "#54B2E6",
      focusRing: "#54B2E6",
      borderColor: "#76BAE6",
      currentHighlight: "#82CAF2",
    },
  },
};

export const THEME_COLORS: DesignColor[] = DESIGN_THEMES.map(theme => {
  const override = COLOR_OVERRIDES[theme.id];
  return {
    id: theme.id,
    name: COLOR_LABELS[theme.id].name,
    labelKey: COLOR_LABELS[theme.id].labelKey,
    preview: { ...theme.preview, ...override?.preview },
    colors: { ...theme.colors, ...override?.colors },
  };
});

const DEFAULT_TEXTURE_ID = sarasara.id;
const DEFAULT_COLOR_ID = whiteboard.id;

export function composeThemeId(textureId: string, colorId: string): string {
  return `${textureId}${THEME_ID_SEPARATOR}${colorId}`;
}

/**
 * 旧テーマのうち、対応する質感があるものはそちらへ寄せる。クレヨンは太枠が質感軸へ移ったので、
 * ピッカーで「クレヨン」が選択中と表示され、選び直しても太枠が失われない。
 */
const LEGACY_TEXTURE_OVERRIDES: Record<string, string> = {
  crayon: "zarazara",
};

/** 複合IDを質感・色に分解する。旧テーマの単体IDは既定の質感 × その色として扱う */
export function splitThemeId(id: string | undefined): {
  textureId: string;
  colorId: string;
} {
  if (!id) return { textureId: DEFAULT_TEXTURE_ID, colorId: DEFAULT_COLOR_ID };

  const [rawTexture, rawColor] = id.includes(THEME_ID_SEPARATOR)
    ? id.split(THEME_ID_SEPARATOR)
    : [LEGACY_TEXTURE_OVERRIDES[id] ?? DEFAULT_TEXTURE_ID, id];

  return {
    textureId: THEME_TEXTURES.some(t => t.id === rawTexture)
      ? rawTexture
      : DEFAULT_TEXTURE_ID,
    colorId: THEME_COLORS.some(c => c.id === rawColor)
      ? rawColor
      : DEFAULT_COLOR_ID,
  };
}

export function composeTheme(textureId: string, colorId: string): DesignTheme {
  const texture =
    THEME_TEXTURES.find(t => t.id === textureId) ?? THEME_TEXTURES[0];
  const color = THEME_COLORS.find(c => c.id === colorId) ?? THEME_COLORS[0];

  return {
    id: composeThemeId(texture.id, color.id),
    name:
      texture.id === DEFAULT_TEXTURE_ID
        ? color.name
        : `${color.name}（${texture.name}）`,
    description: texture.description,
    preview: color.preview,
    colors: color.colors,
    borders: texture.borders,
    shadows: texture.shadows,
    typography: SHARED_TYPOGRAPHY,
    effects: texture.effects,
    surface: texture.surface,
  };
}

/**
 * 表示用のテーマ名。合成テーマは質感・色それぞれの i18n キーを引くので、
 * DesignTheme.name（日本語固定）ではなくこちらを画面で使う。
 * 旧テーマは凍結した日本語名をそのまま返す。
 */
export function getThemeLabel(
  id: string | undefined,
  t: (key: string) => string
): string {
  const legacy = id ? DESIGN_THEMES.find(theme => theme.id === id) : undefined;
  if (legacy) return legacy.name;

  const { textureId, colorId } = splitThemeId(id);
  const texture = THEME_TEXTURES.find(tx => tx.id === textureId);
  const color = THEME_COLORS.find(c => c.id === colorId);
  if (!texture || !color) return DESIGN_THEMES[0].name;

  const colorLabel = t(color.labelKey);
  return textureId === DEFAULT_TEXTURE_ID
    ? colorLabel
    : `${colorLabel}（${t(texture.labelKey)}）`;
}

export function getThemeById(id: string | undefined): DesignTheme {
  if (!id) return whiteboard;
  // 旧テーマは凍結した定義で描く。既存スケジュールの見た目を変えないため
  const legacy = DESIGN_THEMES.find(theme => theme.id === id);
  if (legacy) return legacy;
  if (!id.includes(THEME_ID_SEPARATOR)) return whiteboard;

  const { textureId, colorId } = splitThemeId(id);
  return composeTheme(textureId, colorId);
}
