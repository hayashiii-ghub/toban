import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";
import { Sentry } from "@/lib/sentry";
import { tStandalone } from "@/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] キャッチされたエラー:", error);
    console.error(
      "[ErrorBoundary] コンポーネントスタック:",
      errorInfo.componentStack
    );
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack ?? "" } },
    });
  }

  render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message || tStandalone("error.unknown");
      const errorStack = this.state.error?.stack;

      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <div
            className="theme-border theme-shadow w-full max-w-xl p-8 flex flex-col items-center"
            style={{
              borderRadius: "var(--dt-border-radius)",
              backgroundColor: "var(--dt-card-bg)",
            }}
          >
            {/* クラッシュ画面でも警告は注意系のアンバー（ShareModal の注意チップと同系統）。赤は破壊操作専用 */}
            <div
              className="theme-border size-14 flex items-center justify-center mb-6"
              style={{ borderRadius: "50%", backgroundColor: "#FEF3C7" }}
            >
              <AlertTriangle
                className="size-7"
                style={{ color: "#D97706" }}
                aria-hidden="true"
              />
            </div>

            <h2
              className="text-xl font-extrabold mb-2"
              style={{ color: "var(--dt-text)" }}
            >
              {tStandalone("error.unexpected")}
            </h2>

            <p
              className="text-sm mb-6 text-center"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {errorMessage}
            </p>

            {errorStack && (
              <div className="w-full mb-6">
                <button
                  type="button"
                  onClick={() =>
                    this.setState(s => ({ showDetails: !s.showDetails }))
                  }
                  className="text-xs font-medium mb-2 underline underline-offset-2"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {this.state.showDetails
                    ? tStandalone("error.hideDetails")
                    : tStandalone("error.showDetails")}
                </button>
                {this.state.showDetails && (
                  <div
                    className="w-full p-4 overflow-auto text-left text-xs font-medium rounded-lg"
                    style={{
                      backgroundColor: "#F5F5F5",
                      color: "#555",
                      maxHeight: "200px",
                    }}
                  >
                    <pre className="whitespace-pre-wrap break-all">
                      {errorStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <a
                href="/"
                className="theme-border theme-shadow-sm inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                style={{
                  borderRadius: "10px",
                  backgroundColor: "var(--dt-card-bg)",
                  color: "var(--dt-text)",
                }}
              >
                <Home className="size-4" aria-hidden="true" />
                {tStandalone("error.backHome")}
              </a>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="theme-border theme-shadow-sm inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
                style={{ borderRadius: "10px", backgroundColor: "#1a1a1a" }}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {tStandalone("error.reload")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
