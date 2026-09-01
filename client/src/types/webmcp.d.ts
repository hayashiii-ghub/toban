// WebMCP の ambient 型定義。
// 参照: https://webmachinelearning.github.io/webmcp (spec draft)
//       https://developer.chrome.com/docs/ai/webmcp (Chrome 実装)
//
// 表記揺れ / spec churn をこの 1 ファイルに隔離する:
// - 現行 API / spec draft は document.modelContext
// - 旧 Chrome 実装は navigator.modelContext
// useTobanTools 側で両方を feature-detect するため、どちらも optional で宣言する。

/** execute の戻り値。MCP 互換の content 配列。 */
interface WebMCPToolResult {
  content: { type: "text"; text: string }[];
}

/** registerTool に渡す tool descriptor。spec の ModelContextTool に対応。 */
interface WebMCPTool {
  name: string;
  title?: string;
  description: string;
  /** JSON Schema。緩く宣言し、execute 内で厳格に検証する。 */
  inputSchema?: object;
  execute: (input: unknown, client?: unknown) => Promise<WebMCPToolResult>;
  annotations?: {
    /** 副作用が無い読み取り専用 tool に true。 */
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

/** registerTool の options。signal で unregister する。 */
interface WebMCPRegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

interface WebMCPModelContext {
  registerTool(tool: WebMCPTool, options?: WebMCPRegisterToolOptions): void;
}

interface Navigator {
  readonly modelContext?: WebMCPModelContext;
}

interface Document {
  readonly modelContext?: WebMCPModelContext;
}
