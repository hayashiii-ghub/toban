import { AlertTriangle, Home, RotateCcw } from "@lucide/vue";
import { onErrorCaptured, reactive } from "vue";
import { defineView } from "@/lib/vue";
import { resetAdsAfterError } from "@/lib/articleAds";
import { tStandalone } from "@/i18n";

const ErrorBoundary = defineView<object>([], (_props, { slots }) => {
  const state = reactive({
    hasError: false,
    error: null as Error | null,
    showDetails: false,
  });
  onErrorCaptured((error, _instance, info) => {
    resetAdsAfterError();
    state.error = error instanceof Error ? error : new Error(String(error));
    state.hasError = true;
    console.error("[ErrorBoundary] キャッチされたエラー:", error);
    console.error("[ErrorBoundary] コンポーネントスタック:", info);
    return false;
  });
  return () => {
    if (state.hasError) {
      const errorMessage = state.error?.message || tStandalone("error.unknown");
      const errorStack = state.error?.stack;

      return (
        <div
          class="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <div
            class="theme-border theme-shadow w-full max-w-xl p-8 flex flex-col items-center"
            style={{
              borderRadius: "var(--dt-border-radius)",
              backgroundColor: "var(--dt-card-bg)",
            }}
          >
            {/* クラッシュ画面でも警告は注意系のアンバー（ShareModal の注意チップと同系統）。赤は破壊操作専用 */}
            <div
              class="theme-border size-14 flex items-center justify-center mb-6"
              style={{ borderRadius: "50%", backgroundColor: "#FEF3C7" }}
            >
              <AlertTriangle
                class="size-7"
                style={{ color: "#D97706" }}
                aria-hidden="true"
              />
            </div>

            <h2
              class="text-xl font-extrabold mb-2"
              style={{ color: "var(--dt-text)" }}
            >
              {tStandalone("error.unexpected")}
            </h2>

            <p
              class="text-sm mb-6 text-center"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {errorMessage}
            </p>

            {errorStack && (
              <div class="w-full mb-6">
                <button
                  type="button"
                  onClick={() => (state.showDetails = !state.showDetails)}
                  class="text-xs font-medium mb-2 underline underline-offset-2"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {state.showDetails
                    ? tStandalone("error.hideDetails")
                    : tStandalone("error.showDetails")}
                </button>
                {state.showDetails && (
                  <div
                    class="w-full p-4 overflow-auto text-left text-xs font-medium rounded-lg"
                    style={{
                      backgroundColor: "#F5F5F5",
                      color: "#555",
                      maxHeight: "200px",
                    }}
                  >
                    <pre class="whitespace-pre-wrap break-all">
                      {errorStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div class="flex gap-3">
              <a
                href="/"
                class="theme-border theme-shadow-sm inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                style={{
                  borderRadius: "10px",
                  backgroundColor: "var(--dt-card-bg)",
                  color: "var(--dt-text)",
                }}
              >
                <Home class="size-4" aria-hidden="true" />
                {tStandalone("error.backHome")}
              </a>
              <button
                type="button"
                onClick={() => window.location.reload()}
                class="theme-border theme-shadow-sm inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                style={{
                  borderRadius: "10px",
                  backgroundColor: "var(--dt-control-bar-bg)",
                  color: "var(--dt-control-bar-text)",
                }}
              >
                <RotateCcw class="size-4" aria-hidden="true" />
                {tStandalone("error.reload")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return slots.default?.();
  };
});
export default ErrorBoundary;
