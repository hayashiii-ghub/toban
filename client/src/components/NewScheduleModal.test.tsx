import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@/test/vue";
import { NewScheduleModal } from "./NewScheduleModal";
afterEach(cleanup);
async function renderPicker() {
  const onSelect = vi.fn();
  render(<NewScheduleModal onSelect={onSelect} onClose={vi.fn()} />);
  const dialog = screen.getByRole("dialog");
  // フェードインが終わってから見え方を確かめる
  await waitFor(() => expect(dialog).toBeVisible());
  return { onSelect, dialog };
}
describe("NewScheduleModal", () => {
  it("選択したボタンがクリック中に消えても閉じず、背景を押したときだけ閉じる", async () => {
    const onClose = vi.fn();
    render(<NewScheduleModal onSelect={vi.fn()} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog).toBeVisible());
    await fireEvent.input(
      within(dialog).getByRole("searchbox", { name: "テンプレートを探す" }),
      { target: { value: "教室" } }
    );
    const template = within(dialog).getAllByRole("button", { name: /教室/ })[0];
    // ブラウザでは Vue の更新がバブリング中に反映されることがある。
    // 実際のクリック経路を保ったまま、選択元が外れた状態を再現する。
    template.addEventListener("click", () => template.remove(), { once: true });
    await fireEvent.click(template);
    expect(onClose).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole("button", { name: "この内容で作る" })
    ).toBeVisible();
    await fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("名前・仕事・カテゴリ名で探せる（全角と半角を区別しない）", async () => {
    const { dialog, onSelect } = await renderPicker();
    const search = within(dialog).getByRole("searchbox", {
      name: "テンプレートを探す",
    });
    await fireEvent.input(search, { target: { value: "給食" } });
    expect(
      within(dialog).getByRole("button", { name: /^給食当番/ })
    ).toBeVisible();
    // 探している間は、カテゴリの一覧を出さない
    expect(
      within(dialog).queryByRole("button", { name: /小中学校（クラス用）/ })
    ).toBeNull();
    // 仕事の名前でも見つかる（家事ローテーションの「お風呂掃除」）
    await fireEvent.input(search, { target: { value: "お風呂" } });
    expect(
      within(dialog).getByRole("button", { name: /^家事ローテーション/ })
    ).toBeVisible();
    // カテゴリ名（介護施設）でも見つかる
    await fireEvent.input(search, { target: { value: "介護" } });
    expect(
      within(dialog).getByRole("button", { name: /^夜勤当番/ })
    ).toBeVisible();
    await fireEvent.input(search, { target: { value: "ＰＴＡ" } });
    await fireEvent.click(
      within(dialog).getByRole("button", { name: /^PTA行事準備当番/ })
    );
    // 選んだら、すぐには作らず名前を入れる画面に進む
    expect(onSelect).not.toHaveBeenCalled();
    await fireEvent.click(
      within(dialog).getByRole("button", { name: "この内容で作る" })
    );
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "PTA行事準備当番" })
    );
  });
  it("名前と交代のしかたを入れて作る。戻ると選び直せる", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 30, 10)); // 9/30(水)
    const { dialog, onSelect } = await renderPicker();
    await fireEvent.input(
      within(dialog).getByRole("searchbox", { name: "テンプレートを探す" }),
      { target: { value: "事務室の掃除" } }
    );
    await fireEvent.click(
      within(dialog).getByRole("button", { name: /^事務室の掃除当番/ })
    );
    const names = within(dialog).getByRole("textbox", {
      name: "メンバーの名前（1行に1人）",
    });
    expect(names).toHaveFocus();
    // 見本は 4 人・仕事 4 つ。6 人にすると 2 人が休む
    await fireEvent.input(names, {
      target: { value: "山田\n中村\n小林, 加藤、木村\t吉田" },
    });
    expect(
      within(dialog).getByText(
        "6人で回します。仕事は4つなので、毎回2人がお休みです。"
      )
    ).toBeVisible();
    await fireEvent.click(
      within(dialog).getByRole("radio", { name: /毎週月曜に交代/ })
    );
    await fireEvent.input(
      within(dialog).getByRole("textbox", { name: "当番表の名前" }),
      {
        target: { value: "2階の掃除" },
      }
    );
    await fireEvent.click(
      within(dialog).getByRole("button", { name: "この内容で作る" })
    );
    const created = onSelect.mock.calls[0][0];
    expect(created.name).toBe("2階の掃除");
    expect(created.members.map((m: { name: string }) => m.name)).toEqual([
      "山田",
      "中村",
      "小林",
      "加藤",
      "木村",
      "吉田",
    ]);
    expect(created.rotationConfig).toEqual({
      mode: "date",
      startDate: "2026-09-28",
      cycleDays: 7,
    });
    vi.useRealTimers();
  });
  it("名前が空なら見本の名前のまま、手で送る形で作る", async () => {
    const { dialog, onSelect } = await renderPicker();
    await fireEvent.input(
      within(dialog).getByRole("searchbox", { name: "テンプレートを探す" }),
      { target: { value: "給食" } }
    );
    await fireEvent.click(
      within(dialog).getByRole("button", { name: /^給食当番/ })
    );
    expect(
      within(dialog).getByText(
        "空のままなら、見本の名前（1班、2班、3班…）で作ります。あとで編集できます。"
      )
    ).toBeVisible();
    await fireEvent.click(
      within(dialog).getByRole("button", { name: "テンプレートを選び直す" })
    );
    expect(
      within(dialog).getByRole("searchbox", { name: "テンプレートを探す" })
    ).toHaveValue("給食");
    await fireEvent.click(
      within(dialog).getByRole("button", { name: /^給食当番/ })
    );
    await fireEvent.click(
      within(dialog).getByRole("button", { name: "この内容で作る" })
    );
    const created = onSelect.mock.calls[0][0];
    expect(created.members.map((m: { name: string }) => m.name)).toEqual([
      "1班",
      "2班",
      "3班",
      "4班",
    ]);
    expect(created.rotationConfig).toBeUndefined();
  });
  it("「新しくつくる」はすぐに作る", async () => {
    const { dialog, onSelect } = await renderPicker();
    await fireEvent.click(
      within(dialog).getByRole("button", { name: /新しくつくる/ })
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
  it("見つからないときは、そう伝える", async () => {
    const { dialog } = await renderPicker();
    await fireEvent.input(
      within(dialog).getByRole("searchbox", { name: "テンプレートを探す" }),
      { target: { value: "宇宙旅行" } }
    );
    expect(
      within(dialog).getByText("「宇宙旅行」に合うテンプレートはありません")
    ).toBeVisible();
  });
});
