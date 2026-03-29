import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RotationControls } from "./RotationControls";

// framer-motion v12 は jsdom 環境で子要素を二重レンダリングするため、
// data-onboarding 属性を持つ最初の実DOMノードを基点に検索する
function renderControls(props: Parameters<typeof RotationControls>[0]) {
  const result = render(<RotationControls {...props} />);
  // motion.div が二重レンダリングするため、data-onboarding を目印に実体を取得
  const root = result.container.querySelector("[data-onboarding='rotation-controls']")!.closest(".px-3")!;
  return { ...result, scope: within(root as HTMLElement) };
}

const baseProps = () => ({
  rotation: 3,
  rotationLabel: "Aグループ",
  isSharing: false,
  isDateMode: false,
  isAnimating: false,
  syncStatus: "idle" as const,
  hasSlug: false,
  onPrint: vi.fn(),
  onOpenSettings: vi.fn(),
  onShare: vi.fn(),
  onRotateForward: vi.fn(),
  onRotateBackward: vi.fn(),
});

describe("RotationControls", () => {
  it("ローテーションラベルが表示される", () => {
    const { scope } = renderControls(baseProps());
    expect(scope.getByText("Aグループ")).toBeInTheDocument();
    expect(scope.getByText("現在の順番")).toBeInTheDocument();
  });

  it("進むボタンでonRotateForwardが呼ばれる", () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    fireEvent.click(scope.getByLabelText("次の当番に進める"));
    expect(props.onRotateForward).toHaveBeenCalledOnce();
  });

  it("戻るボタンでonRotateBackwardが呼ばれる", () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    fireEvent.click(scope.getByLabelText("前の当番に戻す"));
    expect(props.onRotateBackward).toHaveBeenCalledOnce();
  });

  it("設定ボタンでonOpenSettingsが呼ばれる", () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    fireEvent.click(scope.getByLabelText("当番表を編集する"));
    expect(props.onOpenSettings).toHaveBeenCalledOnce();
  });

  it("共有ボタンでonShareが呼ばれる", () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    fireEvent.click(scope.getByLabelText("共有する"));
    expect(props.onShare).toHaveBeenCalledOnce();
  });

  it("dateモード時にローテーションボタンが非表示", () => {
    const props = baseProps();
    const { scope } = renderControls({ ...props, isDateMode: true });
    expect(scope.queryByLabelText("次の当番に進める")).toBeNull();
    expect(scope.queryByLabelText("前の当番に戻す")).toBeNull();
    expect(scope.getByText("日付で自動切り替え")).toBeInTheDocument();
  });
});
