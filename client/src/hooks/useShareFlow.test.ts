import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useShareFlow } from "./useShareFlow";
import type { Schedule } from "@/rotation/types";

vi.mock("@/lib/api", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    publishSchedule: vi.fn(),
  };
});

vi.mock("@/lib/syncManager", () => ({
  pauseScheduleSync: vi.fn(),
  resumeScheduleSync: vi.fn(),
  clearPendingSync: vi.fn(),
  waitForScheduleSync: vi.fn(async () => {}),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
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
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useShareFlow", () => {
  it("returns initial state: isSharing=false, showShare=false", () => {
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: makeSchedule(),
        prepareForManualSave: vi.fn(async () => makeSchedule()),
        updateActiveSchedule: vi.fn(),
      })
    );

    expect(result.current.isSharing).toBe(false);
    expect(result.current.showShare).toBe(false);
  });

  it("happy path with existing slug: update + publish → showShare=true", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { pauseScheduleSync, resumeScheduleSync, clearPendingSync } =
      await import("@/lib/syncManager");
    vi.mocked(updateSchedule).mockResolvedValue(undefined as never);
    vi.mocked(publishSchedule).mockResolvedValue(undefined as never);

    const schedule = makeSchedule({ slug: "abc", editToken: "tok123" });
    const prepareForManualSave = vi.fn(async () => schedule);
    const updateActiveSchedule = vi.fn();

    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave,
        updateActiveSchedule,
      })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(pauseScheduleSync)).toHaveBeenCalledWith("s1");
    expect(vi.mocked(updateSchedule)).toHaveBeenCalled();
    expect(vi.mocked(publishSchedule)).toHaveBeenCalledWith("abc", "tok123");
    expect(vi.mocked(clearPendingSync)).toHaveBeenCalledWith("s1", schedule);
    expect(vi.mocked(resumeScheduleSync)).toHaveBeenCalledWith("s1");
    expect(result.current.showShare).toBe(true);
    expect(result.current.isSharing).toBe(false);
  });

  it("happy path without slug: create + publish → updates schedule", async () => {
    const { createSchedule, publishSchedule } = await import("@/lib/api");
    vi.mocked(createSchedule).mockResolvedValue({
      slug: "new-slug",
      editToken: "new-token",
    });
    vi.mocked(publishSchedule).mockResolvedValue(undefined as never);

    const schedule = makeSchedule(); // no slug
    const prepareForManualSave = vi.fn(async () => schedule);
    const updateActiveSchedule = vi.fn();

    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave,
        updateActiveSchedule,
      })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(createSchedule)).toHaveBeenCalled();
    expect(updateActiveSchedule).toHaveBeenCalledWith(expect.any(Function));
    expect(vi.mocked(publishSchedule)).toHaveBeenCalledWith(
      "new-slug",
      "new-token"
    );
    expect(result.current.showShare).toBe(true);
  });

  it("save stage failure: shows toast error, showShare stays false", async () => {
    const { updateSchedule } = await import("@/lib/api");
    const { toast } = await import("sonner");
    vi.mocked(updateSchedule).mockRejectedValue(new Error("Network error"));

    const schedule = makeSchedule({ slug: "abc", editToken: "tok123" });
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave: vi.fn(async () => schedule),
        updateActiveSchedule: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(toast.error)).toHaveBeenCalled();
    expect(result.current.showShare).toBe(false);
    expect(result.current.isSharing).toBe(false);
  });

  it("publish stage failure: shows toast error", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { toast } = await import("sonner");
    vi.mocked(updateSchedule).mockResolvedValue(undefined as never);
    vi.mocked(publishSchedule).mockRejectedValue(new Error("Publish failed"));

    const schedule = makeSchedule({ slug: "abc", editToken: "tok123" });
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave: vi.fn(async () => schedule),
        updateActiveSchedule: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(toast.error)).toHaveBeenCalled();
    expect(result.current.showShare).toBe(false);
  });

  it("does nothing when activeSchedule is undefined", async () => {
    const { pauseScheduleSync } = await import("@/lib/syncManager");

    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: undefined,
        prepareForManualSave: vi.fn(async () => undefined),
        updateActiveSchedule: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(pauseScheduleSync)).not.toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });

  it("always resumes sync in finally block even on error", async () => {
    const { updateSchedule } = await import("@/lib/api");
    const { resumeScheduleSync } = await import("@/lib/syncManager");
    vi.mocked(updateSchedule).mockRejectedValue(new Error("fail"));

    const schedule = makeSchedule({ slug: "abc", editToken: "tok123" });
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave: vi.fn(async () => schedule),
        updateActiveSchedule: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(resumeScheduleSync)).toHaveBeenCalledWith("s1");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useShareFlow の同期競合", () => {
  it("自動PUTが完了してから最新本文を準備し、手動保存して公開する", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { waitForScheduleSync } = await import("@/lib/syncManager");
    const priorSave = deferred<void>();
    vi.mocked(waitForScheduleSync).mockReturnValueOnce(priorSave.promise);
    vi.mocked(updateSchedule).mockResolvedValue();
    vi.mocked(publishSchedule).mockResolvedValue();
    const initial = makeSchedule({ slug: "abc", editToken: "token" });
    let latest = initial;
    const prepare = vi.fn(async () => latest);
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: initial,
        prepareForManualSave: prepare,
        updateActiveSchedule: vi.fn(),
      })
    );
    let sharing!: Promise<void>;
    act(() => {
      sharing = result.current.handleShare();
    });
    await act(async () => {});
    expect(waitForScheduleSync).toHaveBeenCalledWith(initial.id);
    expect(prepare).not.toHaveBeenCalled();
    expect(updateSchedule).not.toHaveBeenCalled();
    expect(publishSchedule).not.toHaveBeenCalled();
    latest = { ...initial, name: "先行保存の完了前に編集した名前" };
    await act(async () => {
      priorSave.resolve();
      await sharing;
    });
    expect(updateSchedule).toHaveBeenCalledWith(
      initial.slug,
      initial.editToken,
      expect.objectContaining({ name: latest.name })
    );
    expect(publishSchedule).toHaveBeenCalledWith(
      initial.slug,
      initial.editToken
    );
  });

  it("保存済みのスナップショットだけをpending解除の対象にする", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { clearPendingSync } = await import("@/lib/syncManager");
    vi.mocked(updateSchedule).mockResolvedValue();
    vi.mocked(publishSchedule).mockResolvedValue();
    const schedule = makeSchedule({ slug: "abc", editToken: "token" });
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave: async () => schedule,
        updateActiveSchedule: vi.fn(),
      })
    );
    await act(async () => result.current.handleShare());
    expect(clearPendingSync).toHaveBeenCalledWith(schedule.id, schedule);
  });

  it("待機後に別の表が返ってきたら作成・保存・公開しない", async () => {
    const { createSchedule, updateSchedule, publishSchedule } =
      await import("@/lib/api");
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: makeSchedule(),
        prepareForManualSave: async () => makeSchedule({ id: "other" }),
        updateActiveSchedule: vi.fn(),
      })
    );
    await act(async () => result.current.handleShare());
    expect(createSchedule).not.toHaveBeenCalled();
    expect(updateSchedule).not.toHaveBeenCalled();
    expect(publishSchedule).not.toHaveBeenCalled();
    expect(result.current.showShare).toBe(false);
  });
});
