import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShareFlow } from "./useShareFlow";
import type { Schedule } from "@/rotation/types";

vi.mock("@/lib/api", async (importOriginal) => {
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
    members: [{ id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" }],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useShareFlow", () => {
  it("returns initial state: isSharing=false, showShare=false", () => {
    const { result } = renderHook(() => useShareFlow({
      activeSchedule: makeSchedule(),
      prepareForManualSave: vi.fn(async () => makeSchedule()),
      updateActiveSchedule: vi.fn(),
    }));

    expect(result.current.isSharing).toBe(false);
    expect(result.current.showShare).toBe(false);
  });

  it("happy path with existing slug: update + publish → showShare=true", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { pauseScheduleSync, resumeScheduleSync, clearPendingSync } = await import("@/lib/syncManager");
    vi.mocked(updateSchedule).mockResolvedValue(undefined as never);
    vi.mocked(publishSchedule).mockResolvedValue(undefined as never);

    const schedule = makeSchedule({ slug: "abc", editToken: "tok123" });
    const prepareForManualSave = vi.fn(async () => schedule);
    const updateActiveSchedule = vi.fn();

    const { result } = renderHook(() => useShareFlow({
      activeSchedule: schedule,
      prepareForManualSave,
      updateActiveSchedule,
    }));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(pauseScheduleSync)).toHaveBeenCalledWith("s1");
    expect(vi.mocked(updateSchedule)).toHaveBeenCalled();
    expect(vi.mocked(publishSchedule)).toHaveBeenCalledWith("abc", "tok123");
    expect(vi.mocked(clearPendingSync)).toHaveBeenCalledWith("s1");
    expect(vi.mocked(resumeScheduleSync)).toHaveBeenCalledWith("s1");
    expect(result.current.showShare).toBe(true);
    expect(result.current.isSharing).toBe(false);
  });

  it("happy path without slug: create + publish → updates schedule", async () => {
    const { createSchedule, publishSchedule } = await import("@/lib/api");
    vi.mocked(createSchedule).mockResolvedValue({ slug: "new-slug", editToken: "new-token" });
    vi.mocked(publishSchedule).mockResolvedValue(undefined as never);

    const schedule = makeSchedule(); // no slug
    const prepareForManualSave = vi.fn(async () => schedule);
    const updateActiveSchedule = vi.fn();

    const { result } = renderHook(() => useShareFlow({
      activeSchedule: schedule,
      prepareForManualSave,
      updateActiveSchedule,
    }));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(createSchedule)).toHaveBeenCalled();
    expect(updateActiveSchedule).toHaveBeenCalledWith(expect.any(Function));
    expect(vi.mocked(publishSchedule)).toHaveBeenCalledWith("new-slug", "new-token");
    expect(result.current.showShare).toBe(true);
  });

  it("save stage failure: shows toast error, showShare stays false", async () => {
    const { updateSchedule } = await import("@/lib/api");
    const { toast } = await import("sonner");
    vi.mocked(updateSchedule).mockRejectedValue(new Error("Network error"));

    const schedule = makeSchedule({ slug: "abc", editToken: "tok123" });
    const { result } = renderHook(() => useShareFlow({
      activeSchedule: schedule,
      prepareForManualSave: vi.fn(async () => schedule),
      updateActiveSchedule: vi.fn(),
    }));

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
    const { result } = renderHook(() => useShareFlow({
      activeSchedule: schedule,
      prepareForManualSave: vi.fn(async () => schedule),
      updateActiveSchedule: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(toast.error)).toHaveBeenCalled();
    expect(result.current.showShare).toBe(false);
  });

  it("does nothing when activeSchedule is undefined", async () => {
    const { pauseScheduleSync } = await import("@/lib/syncManager");

    const { result } = renderHook(() => useShareFlow({
      activeSchedule: undefined,
      prepareForManualSave: vi.fn(async () => undefined),
      updateActiveSchedule: vi.fn(),
    }));

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
    const { result } = renderHook(() => useShareFlow({
      activeSchedule: schedule,
      prepareForManualSave: vi.fn(async () => schedule),
      updateActiveSchedule: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(vi.mocked(resumeScheduleSync)).toHaveBeenCalledWith("s1");
  });
});
