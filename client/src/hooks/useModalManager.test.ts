import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModalManager } from "./useModalManager";

describe("useModalManager", () => {
  it("初期状態ではモーダルが閉じている", () => {
    const { result } = renderHook(() => useModalManager());
    expect(result.current.modal).toEqual({ type: null, deleteTargetId: null });
  });

  it("openSettings で設定モーダルを開く", () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.openSettings());
    expect(result.current.modal).toEqual({ type: "settings", deleteTargetId: null });
  });

  it("openNewSchedule で新規スケジュールモーダルを開く", () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.openNewSchedule());
    expect(result.current.modal).toEqual({ type: "newSchedule", deleteTargetId: null });
  });

  it("openConfirmDelete で削除確認モーダルを開き対象IDを保持する", () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.openConfirmDelete("schedule-123"));
    expect(result.current.modal).toEqual({ type: "confirmDelete", deleteTargetId: "schedule-123" });
  });

  it("closeModal でモーダルを閉じて状態をリセットする", () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.openConfirmDelete("schedule-123"));
    act(() => result.current.closeModal());
    expect(result.current.modal).toEqual({ type: null, deleteTargetId: null });
  });
});
