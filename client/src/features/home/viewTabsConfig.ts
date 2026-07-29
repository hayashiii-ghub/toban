// view（表示モード）の単一の真実源。
// ここに 1 行追加すれば 型 / タブ描画 / localStorage 復元 / 印刷向き / WebMCP が追従する。
// 注意: cross-module で同期が要る属性だけを置く（描画固有の値は各 view コンポーネント側に残す）。

export const VIEW_TABS = [
  {
    value: "cards",
    labelKey: "view.cards",
    mcpLabel: "カード",
    orientation: "landscape",
  },
  {
    value: "table",
    labelKey: "view.table",
    mcpLabel: "表",
    orientation: "landscape",
  },
  {
    value: "calendar",
    labelKey: "view.calendar",
    mcpLabel: "カレンダー",
    orientation: "portrait",
  },
  {
    value: "disc",
    labelKey: "view.disc",
    mcpLabel: "円盤",
    orientation: "portrait",
  },
] as const;

export type ViewTabValue = (typeof VIEW_TABS)[number]["value"];

export const VIEW_VALUES: readonly ViewTabValue[] = VIEW_TABS.map(v => v.value);

/** localStorage 復元 / WebMCP 入力検証用の型ガード。 */
export function isViewTab(x: unknown): x is ViewTabValue {
  return typeof x === "string" && VIEW_VALUES.includes(x as ViewTabValue);
}

/** 印刷時の用紙向き。未知の値は landscape にフォールバック。 */
export function viewOrientation(value: string): "portrait" | "landscape" {
  return VIEW_TABS.find(v => v.value === value)?.orientation ?? "landscape";
}

/** WebMCP メッセージ用の静的 JP ラベル（WebMCP 層は i18n 非対応）。未知の値はそのまま返す。 */
export function viewMcpLabel(value: string): string {
  return VIEW_TABS.find(v => v.value === value)?.mcpLabel ?? value;
}
