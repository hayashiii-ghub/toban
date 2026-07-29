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
}

// ── テーマ定義 ──

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

export function getThemeById(id: string | undefined): DesignTheme {
  if (!id) return whiteboard;
  return DESIGN_THEMES.find(theme => theme.id === id) ?? whiteboard;
}
