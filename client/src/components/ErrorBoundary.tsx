import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

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
    console.error("[ErrorBoundary] コンポーネントスタック:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "不明なエラー";
      const errorStack = this.state.error?.stack;

      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <div
            className="theme-border theme-shadow w-full max-w-xl p-8 flex flex-col items-center"
            style={{ borderRadius: "var(--dt-border-radius)", backgroundColor: "var(--dt-card-bg)" }}
          >
            <div
              className="theme-border w-14 h-14 flex items-center justify-center mb-6"
              style={{ borderRadius: "50%", backgroundColor: "#FEE2E2" }}
            >
              <AlertTriangle className="w-7 h-7" style={{ color: "#DC2626" }} aria-hidden="true" />
            </div>

            <h2 className="text-xl font-extrabold mb-2" style={{ color: "var(--dt-text)" }}>
              予期しないエラーが発生しました
            </h2>

            <p className="text-sm mb-6 text-center" style={{ color: "#777" }}>
              {errorMessage}
            </p>

            {errorStack && (
              <div className="w-full mb-6">
                <button
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  className="text-xs font-medium mb-2 underline underline-offset-2"
                  style={{ color: "#888" }}
                >
                  {this.state.showDetails ? "詳細を隠す" : "詳細を表示"}
                </button>
                {this.state.showDetails && (
                  <div
                    className="w-full p-4 overflow-auto text-left text-xs font-medium rounded-lg"
                    style={{ backgroundColor: "#F5F5F5", color: "#555", maxHeight: "200px" }}
                  >
                    <pre className="whitespace-pre-wrap break-all">{errorStack}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <a
                href="/"
                className="theme-border theme-shadow-sm inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                style={{ borderRadius: "10px", backgroundColor: "#fff", color: "#1a1a1a" }}
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                ホームに戻る
              </a>
              <button
                onClick={() => window.location.reload()}
                className="theme-border theme-shadow-sm inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
                style={{ borderRadius: "10px", backgroundColor: "#1a1a1a" }}
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                再読み込み
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
