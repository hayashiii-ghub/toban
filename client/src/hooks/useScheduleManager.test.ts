import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  deleteSchedule: vi.fn(() => Promise.resolve()),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/lib/storage", () => ({
  safeGetItem: vi.fn(() => null),
  safeSetItem: vi.fn(),
}));

import { useScheduleManager } from "./useScheduleManager";
import type { Schedule, ScheduleTemplate } from "@/rotation/types";

const makeTemplate = (name = "テスト"): ScheduleTemplate => ({
  name,
  emoji: "🧹",
  groups: [{ id: "g1", tasks: ["タスクA"], emoji: "🧹" }],
  members: [
    { id: "m1", name: "太郎", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
    { id: "m2", name: "花子", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
  ],
});

describe("useScheduleManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("localStorageが空のときデフォルト状態を返す", () => {
    const { result } = renderHook(() => useScheduleManager());
    expect(result.current.state.schedules.length).toBeGreaterThanOrEqual(1);
    expect(result.current.activeSchedule).toBeDefined();
    expect(result.current.state.activeScheduleId).toBe(result.current.state.schedules[0].id);
  });

  it("handleAddScheduleでスケジュールを追加しアクティブにする", () => {
    const { result } = renderHook(() => useScheduleManager());
    const initialCount = result.current.state.schedules.length;

    let newSchedule: Schedule | undefined;
    act(() => {
      newSchedule = result.current.handleAddSchedule(makeTemplate("新規当番"));
    });

    expect(result.current.state.schedules.length).toBe(initialCount + 1);
    expect(result.current.state.activeScheduleId).toBe(newSchedule!.id);
    expect(result.current.activeSchedule?.name).toBe("新規当番");
  });

  it("handleDeleteScheduleでスケジュールを削除する（最後の1つは削除しない）", () => {
    const { result } = renderHook(() => useScheduleManager());

    // 2つ目を追加
    let second: Schedule | undefined;
    act(() => {
      second = result.current.handleAddSchedule(makeTemplate("削除用"));
    });
    const countBefore = result.current.state.schedules.length;

    // 2つ目を削除
    act(() => {
      result.current.handleDeleteSchedule(second!.id);
    });
    expect(result.current.state.schedules.length).toBe(countBefore - 1);
    expect(result.current.state.schedules.find((s) => s.id === second!.id)).toBeUndefined();

    // 最後の1つは削除できない
    const lastId = result.current.state.schedules[0].id;
    const countAfterLast = result.current.state.schedules.length;
    act(() => {
      result.current.handleDeleteSchedule(lastId);
    });
    expect(result.current.state.schedules.length).toBe(countAfterLast);
  });

  it("selectScheduleでactiveScheduleIdを切り替える", () => {
    const { result } = renderHook(() => useScheduleManager());

    let second: Schedule | undefined;
    act(() => {
      second = result.current.handleAddSchedule(makeTemplate("2番目"));
    });

    // 最初のスケジュールに切り替え
    const firstId = result.current.state.schedules[0].id;
    act(() => {
      result.current.selectSchedule(firstId);
    });
    expect(result.current.state.activeScheduleId).toBe(firstId);

    // 2番目に戻す
    act(() => {
      result.current.selectSchedule(second!.id);
    });
    expect(result.current.state.activeScheduleId).toBe(second!.id);
  });

  it("handleTabDropでスケジュールの並び順を変更する", () => {
    const { result } = renderHook(() => useScheduleManager());

    let s2: Schedule | undefined;
    let s3: Schedule | undefined;
    act(() => {
      s2 = result.current.handleAddSchedule(makeTemplate("B"));
    });
    act(() => {
      s3 = result.current.handleAddSchedule(makeTemplate("C"));
    });

    const firstId = result.current.state.schedules[0].id;

    // s3をfirstIdの位置にドロップ
    act(() => {
      result.current.handleTabDrop(s3!.id, firstId);
    });

    const ids = result.current.state.schedules.map((s) => s.id);
    expect(ids.indexOf(s3!.id)).toBeLessThan(ids.indexOf(firstId));
  });

  it("handleDuplicateScheduleでアクティブスケジュールをコピーする", () => {
    const { result } = renderHook(() => useScheduleManager());
    const originalName = result.current.activeSchedule!.name;
    const countBefore = result.current.state.schedules.length;

    act(() => {
      result.current.handleDuplicateSchedule();
    });

    expect(result.current.state.schedules.length).toBe(countBefore + 1);
    expect(result.current.activeSchedule?.name).toBe(`${originalName}（コピー）`);
    // コピーには新しいIDが割り当てられる
    const ids = result.current.state.schedules.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handleSaveSettingsでアクティブスケジュールのフィールドを更新する", () => {
    const { result } = renderHook(() => useScheduleManager());

    const newGroups = [{ id: "g_new", tasks: ["新タスク"], emoji: "🎯" }];
    const newMembers = [
      { id: "m_new", name: "新メンバー", color: "#F00", bgColor: "#FEE", textColor: "#900" },
    ];

    act(() => {
      result.current.handleSaveSettings(
        "更新後の名前",
        newGroups,
        newMembers,
        { mode: "date", startDate: "2026-04-01", cycleDays: 1 },
        true,
        "task",
        "chalkboard",
      );
    });

    const active = result.current.activeSchedule!;
    expect(active.name).toBe("更新後の名前");
    expect(active.groups).toEqual(newGroups);
    expect(active.members).toEqual(newMembers);
    expect(active.rotationConfig?.mode).toBe("date");
    expect(active.pinned).toBe(true);
    expect(active.assignmentMode).toBe("task");
    expect(active.designThemeId).toBe("chalkboard");
  });
});
