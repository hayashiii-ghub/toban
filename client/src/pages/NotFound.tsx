import { defineView } from "@/lib/vue";
import { Home, LayoutTemplate } from "@lucide/vue";
import { useLocation } from "@/lib/router";
import { useT } from "@/i18n";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { DEFAULT_THEME_ID } from "@/rotation/defaultState";

const NotFound = defineView<object>([], () => {
  const [, setLocation] = useLocation();
  const t = useT();

  return () => (
    <DesignThemeProvider themeId={DEFAULT_THEME_ID}>
      <div
        class="rotation-page min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
      >
        <div
          class="theme-border theme-shadow w-full max-w-md p-8 text-center"
          style={{
            borderRadius: "var(--dt-border-radius)",
            backgroundColor: "var(--dt-card-bg)",
          }}
        >
          <div class="flex justify-center mb-6">
            {/* 404 はユーザーの過失ではないので警告色を使わない（赤は破壊操作専用） */}
            <div
              class="theme-border size-16 flex items-center justify-center"
              style={{
                borderRadius: "50%",
                backgroundColor: "var(--dt-current-highlight)",
              }}
            >
              <span class="text-3xl" aria-hidden="true">
                🔍
              </span>
            </div>
          </div>

          <h1
            class="text-3xl font-extrabold mb-2"
            style={{ color: "var(--dt-text)" }}
          >
            404
          </h1>
          <h2
            class="text-lg font-bold mb-4"
            style={{ color: "var(--dt-text)" }}
          >
            {t("notFound.title")}
          </h2>
          <p class="text-sm mb-8" style={{ color: "var(--dt-text-secondary)" }}>
            {t("notFound.message")}
          </p>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => setLocation("/")}
              class="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
              style={{
                backgroundColor: "var(--dt-control-bar-bg)",
                color: "var(--dt-control-bar-text)",
                borderRadius: "10px",
              }}
            >
              <Home class="size-4" aria-hidden="true" />
              {t("notFound.home")}
            </button>
            <button
              type="button"
              onClick={() => setLocation("/templates")}
              class="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
              style={{
                backgroundColor: "var(--dt-card-bg)",
                color: "var(--dt-text)",
                borderRadius: "10px",
              }}
            >
              <LayoutTemplate class="size-4" aria-hidden="true" />
              {t("notFound.templates")}
            </button>
          </div>
        </div>
      </div>
    </DesignThemeProvider>
  );
});
export default NotFound;
