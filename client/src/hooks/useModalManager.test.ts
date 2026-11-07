import { describe, it, expect } from "vitest";
import { renderHook, act } from "@/test/vue";
import { useModalManager } from "./useModalManager";
describe("useModalManager", () => {
  it("初期状態ではモーダルが閉じている", () => {
    const { result } = renderHook(() => useModalManager());
    expect(result.current.modal).toEqual({ type: null, deleteTargetId: null });
  });
  it("openSettings で設定モーダルを開く", async () => {
    const { result } = renderHook(() => useModalManager());
    await act(() => result.current.openSettings());
    expect(result.current.modal).toEqual({
      type: "settings",
      deleteTargetId: null,
    });
  });
  it("openNewSchedule で新規スケジュールモーダルを開く", async () => {
    const { result } = renderHook(() => useModalManager());
    await act(() => result.current.openNewSchedule());
    expect(result.current.modal).toEqual({
      type: "newSchedule",
      deleteTargetId: null,
    });
  });
  it("openConfirmDelete で削除確認モーダルを開き対象IDを保持する", async () => {
    const { result } = renderHook(() => useModalManager());
    await act(() => result.current.openConfirmDelete("schedule-123"));
    expect(result.current.modal).toEqual({
      type: "confirmDelete",
      deleteTargetId: "schedule-123",
    });
  });
  it("closeModal でモーダルを閉じて状態をリセットする", async () => {
    const { result } = renderHook(() => useModalManager());
    await act(() => result.current.openConfirmDelete("schedule-123"));
    await act(() => result.current.closeModal());
    expect(result.current.modal).toEqual({ type: null, deleteTargetId: null });
  });
});
