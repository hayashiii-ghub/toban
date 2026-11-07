import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test/vue";
import { ShareConfirmationDialog } from "./ShareConfirmationDialog";
afterEach(cleanup);
function props() {
  return {
    scheduleName: "オフィス掃除当番",
    isSharing: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
}
describe("ShareConfirmationDialog", () => {
  it("確認の対象と公開範囲を示し、キャンセルやEscapeで確定しない", async () => {
    const callbacks = props();
    render(<ShareConfirmationDialog {...callbacks} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "「オフィス掃除当番」をリンクから閲覧できるようにします。メンバー名と当番の内容も共有されます。"
    );
    expect(callbacks.onConfirm).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await fireEvent.keyDown(document, { key: "Escape" });
    expect(callbacks.onCancel).toHaveBeenCalledTimes(2);
    expect(callbacks.onConfirm).not.toHaveBeenCalled();
  });
  it("共有するボタンを押したときだけ確定する", async () => {
    const callbacks = props();
    render(<ShareConfirmationDialog {...callbacks} />);
    await fireEvent.click(screen.getByRole("button", { name: /^共有する$/ }));
    expect(callbacks.onConfirm).toHaveBeenCalledTimes(1);
    expect(callbacks.onCancel).not.toHaveBeenCalled();
  });
  it("共有中は確定・取消・Escapeを無効にして処理を二重に走らせない", async () => {
    const callbacks = props();
    render(<ShareConfirmationDialog {...callbacks} isSharing />);
    expect(
      screen.getByRole("button", { name: "共有しています…" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
    await fireEvent.click(
      screen.getByRole("button", { name: "共有しています…" })
    );
    await fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await fireEvent.keyDown(document, { key: "Escape" });
    expect(callbacks.onConfirm).not.toHaveBeenCalled();
    expect(callbacks.onCancel).not.toHaveBeenCalled();
  });
});
