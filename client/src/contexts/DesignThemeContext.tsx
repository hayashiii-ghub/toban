import { createContext, useEffect, useMemo } from "react";
import { getThemeById, type DesignTheme } from "@/rotation/designThemes";

interface DesignThemeContextType {
  theme: DesignTheme;
}

const DesignThemeContext = createContext<DesignThemeContextType | undefined>(
  undefined
);

// フォント（--dt-font-family と太字トークン）は色テーマから独立したアプリ全体設定で、
// client/src/fonts.ts が単独で所有・適用する。ここでは触らない（テーマ切替でフォントが
// 巻き戻らないようにするため）。theme.typography は現状未使用。
export function applyThemeToRoot(theme: DesignTheme) {
  const root = document.documentElement;
  const { colors, borders, shadows, effects } = theme;

  root.style.setProperty("--dt-page-bg", colors.pageBg);
  root.style.setProperty("--dt-card-bg", colors.cardBg);
  root.style.setProperty("--dt-control-bar-bg", colors.controlBarBg);
  root.style.setProperty("--dt-control-bar-text", colors.controlBarText);
  root.style.setProperty("--dt-control-bar-subtext", colors.controlBarSubtext);
  root.style.setProperty("--dt-button-bg", colors.buttonBg);
  root.style.setProperty("--dt-tab-active-bg", colors.tabActiveBg);
  root.style.setProperty("--dt-tab-active-text", colors.tabActiveText);
  root.style.setProperty("--dt-tab-inactive-bg", colors.tabInactiveBg);
  root.style.setProperty("--dt-tab-inactive-text", colors.tabInactiveText);
  root.style.setProperty("--dt-text", colors.text);
  root.style.setProperty("--dt-text-secondary", colors.textSecondary);
  root.style.setProperty("--dt-text-muted", colors.textMuted);
  root.style.setProperty("--dt-border-color", colors.borderColor);
  root.style.setProperty("--dt-table-border-strong", colors.tableBorderStrong);
  root.style.setProperty("--dt-table-border-light", colors.tableBorderLight);
  root.style.setProperty("--dt-focus-ring", colors.focusRing);
  root.style.setProperty("--dt-current-highlight", colors.currentHighlight);

  root.style.setProperty("--dt-border-width", borders.width);
  root.style.setProperty("--dt-border-radius", borders.radius);
  root.style.setProperty("--dt-border-radius-sm", borders.radiusSm);

  root.style.setProperty("--dt-shadow-card", shadows.card);
  root.style.setProperty("--dt-shadow-card-sm", shadows.cardSm);
  root.style.setProperty("--dt-shadow-card-hover", shadows.cardHover);
  root.style.setProperty("--dt-shadow-card-lg", shadows.cardLg);

  root.style.setProperty("--dt-hover-translate", effects.hoverTranslate);
}

interface DesignThemeProviderProps {
  themeId: string | undefined;
  children: React.ReactNode;
}

export function DesignThemeProvider({
  themeId,
  children,
}: DesignThemeProviderProps) {
  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  useEffect(() => {
    applyThemeToRoot(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme }), [theme]);

  return (
    <DesignThemeContext.Provider value={value}>
      {children}
    </DesignThemeContext.Provider>
  );
}
