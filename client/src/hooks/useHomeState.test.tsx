import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useHomeState } from "./useHomeState";
import { STORAGE_KEY, TEMPLATES } from "@/rotation/constants";
import { DEFAULT_APP_STATE } from "@/rotation/defaultState";

afterEach(cleanup);

// 自動バックアップ・引き直しがテスト中に走らないよう、解決しない Promise を返す
vi.mock("@/lib/api", () => ({
  createSchedule: vi.fn(() => new Promise(() => {})),
  updateSchedule: vi.fn(() => new Promise(() => {})),
  deleteSchedule: vi.fn(() => Promise.resolve()),
  getScheduleForEdit: vi.fn(() => new Promise(() => {})),
  publishSchedule: vi.fn(() => new Promise(() => {})),
  toScheduleData: (s: unknown) => s,
  ApiError: class extends Error {},
}));

/** 保存データが無い＝初回訪問。日本語の default が seed される状態にする */
function asFirstVisitInJapanese() {
  localStorage.setItem("toban-lang", "ja");
  window.history.replaceState({}, "", "/");
}

describe("初回訪問（保存データなし）", () => {
  it("「はじめてガイド」が seed され、モーダルは開かない", () => {
    asFirstVisitInJapanese();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const { result } = renderHook(() => useHomeState());

    expect(result.current.activeSchedule?.name).toBe(
      DEFAULT_APP_STATE.schedules[0].name
    );
    // ガイドを読ませたいので、テンプレート選択モーダルは出さない
    // （出すと useOnboarding のツアーが isModalOpen で抑制される）
    expect(result.current.modal.type).toBeNull();
  });

  it("seed した内容が localStorage へ保存される", () => {
    asFirstVisitInJapanese();

    const { result } = renderHook(() => useHomeState());

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!)).toEqual(result.current.state);
  });
});

describe("?template=N での着地", () => {
  it("指定されたテンプレートから当番表を作り、それを表示する", () => {
    localStorage.setItem("toban-lang", "ja");
    window.history.replaceState({}, "", "/?template=0");

    const { result } = renderHook(() => useHomeState());

    expect(result.current.activeSchedule?.name).toBe(TEMPLATES[0].name);
    expect(result.current.modal.type).toBeNull();
    // クエリは履歴から消す（リロードで作り直さないため）
    expect(window.location.search).toBe("");
  });

  it("範囲外の番号は無視して、通常の初回訪問と同じ状態にする", () => {
    localStorage.setItem("toban-lang", "ja");
    window.history.replaceState({}, "", "/?template=999");

    const { result } = renderHook(() => useHomeState());

    expect(result.current.activeSchedule?.name).toBe(
      DEFAULT_APP_STATE.schedules[0].name
    );
    expect(result.current.state.schedules).toHaveLength(1);
  });
});

describe("WebMCPと手編集の境界", () => {
  it("設定画面を開いた直後の書き込みを拒否し、編集画面を閉じない", async () => {
    asFirstVisitInJapanese();
    const { result } = renderHook(() => useHomeState());
    const before = result.current.state;
    const updater = vi.fn(state => ({ ...state, schedules: [] }));

    await act(async () => {
      result.current.openSettings();
      expect(await result.current.commitToolState(updater)).toMatchObject({
        applied: false,
        code: "EDIT_IN_PROGRESS",
      });
    });

    expect(updater).not.toHaveBeenCalled();
    expect(result.current.modal.type).toBe("settings");
    expect(result.current.state).toBe(before);
  });

  it("共有画面を保護し、閉じた後に書き込みを再開する", async () => {
    asFirstVisitInJapanese();
    const { result } = renderHook(() => useHomeState());
    const before = result.current.state;

    await act(async () => {
      result.current.setShowShare(true);
      expect(
        await result.current.commitToolState(state => state)
      ).toMatchObject({
        applied: false,
        code: "EDIT_IN_PROGRESS",
      });
    });
    expect(result.current.showShare).toBe(true);
    expect(result.current.state).toBe(before);

    act(() => result.current.setShowShare(false));
    await act(async () => {
      expect(
        await result.current.commitToolState(state => state)
      ).toMatchObject({
        applied: true,
        local: "saved",
      });
    });
    expect(result.current.showShare).toBe(false);
  });
});
