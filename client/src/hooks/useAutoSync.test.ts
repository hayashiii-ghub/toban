import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSync } from "./useAutoSync";
import type { Schedule } from "@/rotation/types";

vi.mock("@/lib/api", async importOriginal => ({
  ...(await importOriginal()),
  createSchedule: vi.fn(),
  getScheduleForEdit: vi.fn(),
}));

vi.mock("@/lib/syncManager", () => ({
  scheduleSyncDebounced: vi.fn(),
  setSyncStatusCallback: vi.fn(),
  flushPendingSync: vi.fn(),
  isScheduleSyncPaused: vi.fn(() => false),
  hasPendingSync: vi.fn(() => false),
}));

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s1",
    name: "テスト当番表",
    rotation: 0,
    groups: [{ id: "g1", emoji: "🧹", tasks: ["掃除"] }],
    members: [
      {
        id: "m1",
        name: "田中",
        color: "#3B82F6",
        bgColor: "#DBEAFE",
        textColor: "#1E3A5F",
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAutoSync", () => {
  it("returns idle syncStatus initially", () => {
    const { result } = renderHook(() => useAutoSync(makeSchedule()));
    expect(result.current.syncStatus).toBe("idle");
  });

  it("returns idle when schedule is undefined", () => {
    const { result } = renderHook(() => useAutoSync(undefined));
    expect(result.current.syncStatus).toBe("idle");
  });

  it("resets syncStatus to idle when schedule ID changes", () => {
    const { result, rerender } = renderHook(
      ({ schedule }) => useAutoSync(schedule),
      { initialProps: { schedule: makeSchedule({ id: "s1" }) } }
    );
    expect(result.current.syncStatus).toBe("idle");

    rerender({ schedule: makeSchedule({ id: "s2" }) });
    expect(result.current.syncStatus).toBe("idle");
  });

  it("registers and unregisters sync status callback", async () => {
    const { setSyncStatusCallback } = await import("@/lib/syncManager");
    const mockedSetCallback = vi.mocked(setSyncStatusCallback);

    const { unmount } = renderHook(() => useAutoSync(makeSchedule()));

    expect(mockedSetCallback).toHaveBeenCalledWith(expect.any(Function));

    unmount();
    expect(mockedSetCallback).toHaveBeenCalledWith(null);
  });

  it("schedules debounced sync when schedule with slug changes", async () => {
    const { scheduleSyncDebounced } = await import("@/lib/syncManager");
    const mockedSync = vi.mocked(scheduleSyncDebounced);

    const schedule = makeSchedule({ slug: "abc", editToken: "tok123" });
    const { rerender } = renderHook(({ s }) => useAutoSync(s), {
      initialProps: { s: schedule },
    });

    // Change schedule data to trigger sync
    const updated = { ...schedule, name: "更新された当番表" };
    rerender({ s: updated });

    expect(mockedSync).toHaveBeenCalledWith(updated);
  });

  it("prepareForManualSave cancels pending backup", async () => {
    const schedule = makeSchedule();
    const { result } = renderHook(() => useAutoSync(schedule));

    let prepared: Schedule | undefined;
    await act(async () => {
      prepared = await result.current.prepareForManualSave();
    });

    expect(prepared).toEqual(schedule);
  });

  it("triggers auto-backup for schedule without slug after debounce", async () => {
    vi.useFakeTimers();
    const { createSchedule } = await import("@/lib/api");
    const mockedCreate = vi.mocked(createSchedule);
    mockedCreate.mockResolvedValue({
      slug: "new-slug",
      editToken: "new-token",
    });

    const onUpdate = vi.fn();
    const schedule = makeSchedule(); // no slug

    const { rerender } = renderHook(({ s }) => useAutoSync(s, onUpdate), {
      initialProps: { s: schedule },
    });

    // Trigger change detection
    const updated = { ...schedule, name: "新しい名前" };
    rerender({ s: updated });

    // Advance past BACKUP_DEBOUNCE_MS (5000ms)
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    // createSchedule should have been called
    expect(mockedCreate).toHaveBeenCalled();

    vi.useRealTimers();
  });
});

/**
 * サーバからの引き直し。クライアントは今まで送るだけで読み直していなかったため、
 * 2台目の端末が古いまま編集して、もう一方の変更を黙って上書きしていた。
 */
describe("useAutoSync の引き直し", () => {
  const cloud = () => makeSchedule({ slug: "abc", editToken: "tok123" });

  /** サーバ側が別端末で更新済み、という状態を作る */
  async function serverHas(overrides: Record<string, unknown> = {}) {
    const { getScheduleForEdit } = await import("@/lib/api");
    const fetched = {
      slug: "abc",
      name: "別端末で変えた名前",
      rotation: 3,
      groups: [{ id: "g1", emoji: "🧹", tasks: ["掃除"] }],
      members: [
        {
          id: "m1",
          name: "田中",
          color: "#3B82F6",
          bgColor: "#DBEAFE",
          textColor: "#1E3A5F",
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      ...overrides,
    };
    vi.mocked(getScheduleForEdit).mockResolvedValue(
      fetched as unknown as Awaited<ReturnType<typeof getScheduleForEdit>>
    );
    return fetched;
  }

  it("開いたときにサーバの内容を取り込む", async () => {
    await serverHas();
    const onUpdate = vi.fn();

    await act(async () => {
      renderHook(() => useAutoSync(cloud(), onUpdate));
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const merged = onUpdate.mock.calls[0][0](cloud());
    expect(merged.name).toBe("別端末で変えた名前");
    // 順番も同期対象。端末をまたいで揃う
    expect(merged.rotation).toBe(3);
    // ローカル固有の値は保つ
    expect(merged.slug).toBe("abc");
    expect(merged.editToken).toBe("tok123");
  });

  it("取り込んだ内容をサーバへ送り返さない", async () => {
    const fetched = await serverHas();
    const { scheduleSyncDebounced } = await import("@/lib/syncManager");
    vi.mocked(scheduleSyncDebounced).mockClear();

    const adopted = {
      ...cloud(),
      name: fetched.name,
      rotation: fetched.rotation,
    };
    const { rerender } = renderHook(({ s }) => useAutoSync(s, vi.fn()), {
      initialProps: { s: cloud() },
    });
    // 取り込みによる state 更新が反映された状態を再現する
    await act(async () => {
      rerender({ s: adopted });
    });

    expect(vi.mocked(scheduleSyncDebounced)).not.toHaveBeenCalled();
  });

  it("未送信の変更があるときは引き直さない", async () => {
    await serverHas();
    const { getScheduleForEdit } = await import("@/lib/api");
    const { hasPendingSync } = await import("@/lib/syncManager");
    vi.mocked(hasPendingSync).mockReturnValue(true);
    vi.mocked(getScheduleForEdit).mockClear();

    await act(async () => {
      renderHook(() => useAutoSync(cloud(), vi.fn()));
    });

    expect(vi.mocked(getScheduleForEdit)).not.toHaveBeenCalled();
    vi.mocked(hasPendingSync).mockReturnValue(false);
  });

  it("編集中は引き直さない", async () => {
    await serverHas();
    const { getScheduleForEdit } = await import("@/lib/api");
    vi.mocked(getScheduleForEdit).mockClear();

    await act(async () => {
      renderHook(() => useAutoSync(cloud(), vi.fn(), { isEditing: true }));
    });

    expect(vi.mocked(getScheduleForEdit)).not.toHaveBeenCalled();
  });

  it("クラウドに載っていないスケジュールは引き直さない", async () => {
    await serverHas();
    const { getScheduleForEdit } = await import("@/lib/api");
    vi.mocked(getScheduleForEdit).mockClear();

    await act(async () => {
      renderHook(() => useAutoSync(makeSchedule(), vi.fn()));
    });

    expect(vi.mocked(getScheduleForEdit)).not.toHaveBeenCalled();
  });

  // 行が消えている(404)・トークンが通らない(403)・通信失敗のいずれでも、
  // ローカルを消したり空にしたりしてはいけない
  it("取得に失敗してもローカルには触らない", async () => {
    const { getScheduleForEdit } = await import("@/lib/api");
    vi.mocked(getScheduleForEdit).mockRejectedValue(new Error("Not found"));
    const onUpdate = vi.fn();

    await act(async () => {
      renderHook(() => useAutoSync(cloud(), onUpdate));
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("サーバと同じ内容なら state を更新しない", async () => {
    const local = cloud();
    await serverHas({ name: local.name, rotation: local.rotation });
    const onUpdate = vi.fn();

    await act(async () => {
      renderHook(() => useAutoSync(local, onUpdate));
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("タブに戻ったときにも引き直す", async () => {
    await serverHas();
    const { getScheduleForEdit } = await import("@/lib/api");

    await act(async () => {
      renderHook(() => useAutoSync(cloud(), vi.fn()));
    });
    const afterMount = vi.mocked(getScheduleForEdit).mock.calls.length;

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(vi.mocked(getScheduleForEdit).mock.calls.length).toBeGreaterThan(
      afterMount
    );
  });
});
