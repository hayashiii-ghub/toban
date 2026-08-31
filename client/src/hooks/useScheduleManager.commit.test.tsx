import { StrictMode, useLayoutEffect, type ReactNode } from "react";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScheduleManager } from "./useScheduleManager";
import { STORAGE_KEY } from "@/rotation/constants";
import { loadState } from "@/lib/appState";
import type { AppState } from "@/rotation/types";

vi.mock("@/lib/api", () => ({
  deleteSchedule: vi.fn(() => Promise.resolve()),
}));

afterEach(cleanup);

const renameActive =
  (name: string) =>
  (state: AppState): AppState => ({
    ...state,
    schedules: state.schedules.map(schedule =>
      schedule.id === state.activeScheduleId ? { ...schedule, name } : schedule
    ),
  });

describe("WebMCP state commits", () => {
  it("shows the completed table name in the DOM before the command resolves", async () => {
    let manager: ReturnType<typeof useScheduleManager> | undefined;
    function SchedulePage() {
      const current = useScheduleManager();
      useLayoutEffect(() => {
        manager = current;
      });
      return <output>{current.activeSchedule?.name}</output>;
    }
    render(<SchedulePage />);

    await act(async () => {
      await manager!.commitToolState(renameActive("机拭き当番"));
      expect(screen.getByRole("status")).toHaveTextContent("机拭き当番");
    });
  });

  it("resolves only after the rendered state and storage contain the change", async () => {
    const { result } = renderHook(() => useScheduleManager());
    let observed: { name?: string; saved: AppState } | undefined;

    await act(async () => {
      const saved = await result.current.commitToolState(
        renameActive("掃除当番")
      );
      observed = {
        name: result.current.activeSchedule?.name,
        saved: JSON.parse(localStorage.getItem(STORAGE_KEY)!),
      };
      expect(saved).toMatchObject({ applied: true, local: "saved" });
      expect(saved.state).toEqual(result.current.getToolState());
    });

    expect(observed?.name).toBe("掃除当番");
    expect(observed?.saved).toEqual(result.current.state);
    expect(result.current.localSaveStatus).toBe("saved");
  });

  it("preserves rapid partial updates and reloads the same completed result", async () => {
    const { result } = renderHook(() => useScheduleManager());
    const initialId = result.current.state.activeScheduleId;

    await act(async () => {
      await result.current.commitToolState(renameActive("オフィス"));
      await result.current.commitToolState(state => ({
        ...state,
        schedules: state.schedules.map(schedule =>
          schedule.id === initialId ? { ...schedule, pinned: true } : schedule
        ),
      }));
    });

    expect(result.current.activeSchedule).toMatchObject({
      name: "オフィス",
      pinned: true,
    });
    expect(loadState()).toEqual(result.current.state);
  });

  it("reports an applied but unsaved update when localStorage rejects the write", async () => {
    const { result } = renderHook(() => useScheduleManager());
    const oldSaved = localStorage.getItem(STORAGE_KEY);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const write = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });

    try {
      await act(async () => {
        const saved = await result.current.commitToolState(
          renameActive("未保存")
        );
        expect(saved).toMatchObject({ applied: true, local: "failed" });
      });
      expect(result.current.activeSchedule?.name).toBe("未保存");
      expect(result.current.localSaveStatus).toBe("failed");
      expect(localStorage.getItem(STORAGE_KEY)).toBe(oldSaved);
    } finally {
      write.mockRestore();
      warning.mockRestore();
    }
  });

  it("checks the edit guard again before applying a queued command", async () => {
    const { result } = renderHook(() => useScheduleManager());
    const before = result.current.state;
    let editing = false;

    await act(async () => {
      const pending = result.current.commitToolState(
        renameActive("変更しない"),
        () => editing
      );
      editing = true;
      expect(await pending).toMatchObject({
        applied: false,
        code: "EDIT_IN_PROGRESS",
      });
    });

    expect(result.current.state).toBe(before);
    expect(loadState()).toEqual(before);
  });

  it("leaves state and storage untouched when a latest-state updater rejects", async () => {
    const { result } = renderHook(() => useScheduleManager());
    const before = result.current.state;
    const saved = localStorage.getItem(STORAGE_KEY);

    await act(async () => {
      await expect(
        result.current.commitToolState(() => {
          throw new Error("Target was removed");
        })
      ).rejects.toThrow("Target was removed");
    });

    expect(result.current.state).toBe(before);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
  });

  it("settles a command without applying it when its page unmounts", async () => {
    const { result, unmount } = renderHook(() => useScheduleManager());
    const before = result.current.state;
    const pending = result.current.commitToolState(renameActive("離脱後"));
    unmount();

    expect(await pending).toMatchObject({ applied: false, code: "UNMOUNTED" });
    expect(loadState()).toEqual(before);
  });

  it("does not invoke a creation updater twice under StrictMode", async () => {
    const { result } = renderHook(() => useScheduleManager(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <StrictMode>{children}</StrictMode>
      ),
    });
    const initialCount = result.current.state.schedules.length;
    const create = vi.fn((state: AppState): AppState => ({
      schedules: [
        ...state.schedules,
        { ...state.schedules[0], id: "new-schedule", name: "一度だけ" },
      ],
      activeScheduleId: "new-schedule",
    }));

    await act(async () => {
      await result.current.commitToolState(create);
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.current.state.schedules).toHaveLength(initialCount + 1);
    expect(loadState()).toEqual(result.current.state);
  });

  it("uses the latest state for batched manual updates and explicit targets", () => {
    const { result } = renderHook(() => useScheduleManager());
    const originalId = result.current.state.activeScheduleId;

    act(() => {
      result.current.setState(state => ({
        schedules: [
          ...state.schedules,
          { ...state.schedules[0], id: "second", name: "別の表" },
        ],
        activeScheduleId: state.activeScheduleId,
      }));
      result.current.updateActiveSchedule(schedule => ({
        ...schedule,
        name: "元の表",
      }));
      result.current.selectSchedule("second");
      result.current.updateScheduleById(originalId, schedule => ({
        ...schedule,
        pinned: true,
      }));
    });

    expect(
      result.current.state.schedules.find(s => s.id === originalId)
    ).toMatchObject({ name: "元の表", pinned: true });
    expect(result.current.activeSchedule).toMatchObject({
      id: "second",
      name: "別の表",
    });
    expect(loadState()).toEqual(result.current.state);
  });
});

it("削除した当番表の未同期データと耐久マーカーを取り除く", async () => {
  const { scheduleSyncDebounced, hasPendingSync, flushPendingSync } =
    await import("@/lib/syncManager");
  const { result } = renderHook(() => useScheduleManager());
  const source = result.current.activeSchedule!;
  const doomed = {
    ...source,
    id: "delete-pending",
    slug: "delete-slug",
    editToken: "delete-token",
  };
  act(() => {
    result.current.setState(current => ({
      ...current,
      schedules: [...current.schedules, doomed],
    }));
  });
  scheduleSyncDebounced(doomed);
  expect(hasPendingSync(doomed.id)).toBe(true);
  act(() => {
    result.current.handleDeleteSchedule(doomed.id);
  });
  expect(hasPendingSync(doomed.id)).toBe(false);
  expect(localStorage.getItem("toban-sync-recovery-v1")).not.toContain(
    doomed.id
  );
  await expect(flushPendingSync(doomed.id)).resolves.toBeUndefined();
  expect(
    result.current.state.schedules.some(item => item.id === doomed.id)
  ).toBe(false);
});
