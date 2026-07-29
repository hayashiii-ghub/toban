import React, { createContext, useEffect, useMemo, useState } from "react";
import { safeGetItem, safeSetItem } from "@/lib/storage";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = safeGetItem("theme");
      if (stored === "light" || stored === "dark") return stored;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      safeSetItem("theme", theme);
    }
  }, [theme, switchable]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      toggleTheme: switchable
        ? () => setTheme(prev => (prev === "light" ? "dark" : "light"))
        : undefined,
      switchable,
    }),
    [theme, switchable]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
