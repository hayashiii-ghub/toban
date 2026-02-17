import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: "#FFF8E7" }}
        >
          <div
            className="brutal-border brutal-shadow w-full max-w-xl p-8 flex flex-col items-center"
            style={{ borderRadius: "16px", backgroundColor: "#fff" }}
          >
            <div
              className="brutal-border w-14 h-14 flex items-center justify-center mb-6"
              style={{ borderRadius: "50%", backgroundColor: "#FEE2E2" }}
            >
              <AlertTriangle className="w-7 h-7" style={{ color: "#DC2626" }} aria-hidden="true" />
            </div>

            <h2 className="text-xl font-extrabold mb-4" style={{ color: "#1a1a1a" }}>
              予期しないエラーが発生しました
            </h2>

            {this.state.error && (
              <div
                className="w-full p-4 mb-6 overflow-auto text-left text-xs font-medium rounded-lg"
                style={{ backgroundColor: "#F5F5F5", color: "#555" }}
              >
                <pre className="whitespace-pre-wrap break-all">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="brutal-border brutal-shadow-sm inline-flex items-center gap-2 px-5 py-2.5 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{ borderRadius: "10px", backgroundColor: "#1a1a1a" }}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
