import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSync } from "./useAutoSync";
import type { Schedule } from "@/rotation/types";

vi.mock("@/lib/api", () => ({
  createSchedule: vi.fn(),
}));

vi.mock("@/lib/syncManager", () => ({
  scheduleSyncDebounced: vi.fn(),
  setSyncStatusCallback: vi.fn(),
  flushPendingSync: vi.fn(),
  isScheduleSyncPaused: vi.fn(() => false),
}));

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s1",
    name: "テスト当番表",
    rotation: 0,
    groups: [{ id: "g1", emoji: "🧹", tasks: ["掃除"] }],
    members: [{ id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" }],
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
      { initialProps: { schedule: makeSchedule({ id: "s1" }) } },
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
    const { rerender } = renderHook(
      ({ s }) => useAutoSync(s),
      { initialProps: { s: schedule } },
    );

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
    mockedCreate.mockResolvedValue({ slug: "new-slug", editToken: "new-token" });

    const onUpdate = vi.fn();
    const schedule = makeSchedule(); // no slug

    const { rerender } = renderHook(
      ({ s }) => useAutoSync(s, onUpdate),
      { initialProps: { s: schedule } },
    );

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
