import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, within } from "@/test/vue";
import {
  RotationControls,
  type RotationControlsProps,
} from "./RotationControls";

function renderControls(props: RotationControlsProps) {
  const result = render(<RotationControls {...props} />);
  const root = result.container
    .querySelector("[data-onboarding='rotation-controls']")!
    .closest(".rotation-no-print")!;
  return { ...result, scope: within(root as HTMLElement) };
}

const baseProps = () => ({
  rotation: 3,
  rotationLabel: "Aグループ",
  isSharing: false,
  isDateMode: false,
  isAnimating: false,
  syncStatus: "idle" as const,
  onPrint: vi.fn(),
  onOpenSettings: vi.fn(),
  onShare: vi.fn(),
  onRotateForward: vi.fn(),
  onRotateBackward: vi.fn(),
  viewTab: "cards" as const,
  onChangeView: vi.fn(),
});

describe("RotationControls", () => {
  it("順番の箱に今の順番の呼び名を出し、「現在の順番」の文字は出さない", async () => {
    const { scope } = renderControls(baseProps());
    expect(scope.getByLabelText("現在の順番: 3")).toHaveTextContent(
      "Aグループ"
    );
    expect(scope.queryByText("現在の順番")).toBeNull();
  });

  it("進むボタンでonRotateForwardが呼ばれる", async () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    await fireEvent.click(scope.getByLabelText("次の当番に進める"));
    expect(props.onRotateForward).toHaveBeenCalledOnce();
  });

  it("戻るボタンでonRotateBackwardが呼ばれる", async () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    await fireEvent.click(scope.getByLabelText("前の当番に戻す"));
    expect(props.onRotateBackward).toHaveBeenCalledOnce();
  });

  it("設定ボタンでonOpenSettingsが呼ばれる", async () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    await fireEvent.click(scope.getByLabelText("当番表を編集する"));
    expect(props.onOpenSettings).toHaveBeenCalledOnce();
  });

  it("共有ボタンでonShareが呼ばれる", async () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    await fireEvent.click(scope.getByLabelText("共有する"));
    expect(props.onShare).toHaveBeenCalledOnce();
  });

  it("バックアップに失敗したときだけ、共有ボタンに印を出す", async () => {
    const { scope } = renderControls({ ...baseProps(), syncStatus: "error" });
    expect(
      scope.getByLabelText("バックアップに失敗しました")
    ).toBeInTheDocument();
  });

  it("帯の中に表示の切り替えを並べ、今の表示を押された状態にする", async () => {
    const props = baseProps();
    const { scope } = renderControls(props);
    const views = scope.getByRole("group", { name: "表示の切り替え" });
    const cards = within(views).getByRole("button", { name: "カード" });
    expect(cards).toHaveAttribute("aria-pressed", "true");
    await fireEvent.click(
      within(views).getByRole("button", { name: "カレンダー" })
    );
    expect(props.onChangeView).toHaveBeenCalledWith("calendar");
  });

  it("dateモード時にローテーションボタンが非表示", async () => {
    const props = baseProps();
    const { scope } = renderControls({
      ...props,
      isDateMode: true,
      rotationLabel: "9/28(月)〜10/4(日)",
      dateDetail: "7日ごとに交代",
    });
    expect(scope.queryByLabelText("次の当番に進める")).toBeNull();
    expect(scope.queryByLabelText("前の当番に戻す")).toBeNull();
    expect(scope.getByText("9/28(月)〜10/4(日)")).toBeInTheDocument();
    expect(scope.getByText("7日ごとに交代")).toBeInTheDocument();
  });
});
