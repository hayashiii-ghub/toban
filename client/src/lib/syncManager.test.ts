import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// api モジュールをモック
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    updateSchedule: vi.fn(() => Promise.resolve()),
  };
});

import {
  scheduleSyncDebounced,
  flushPendingSync,
  pauseScheduleSync,
  resumeScheduleSync,
  clearPendingSync,
  isScheduleSyncPaused,
  setSyncStatusCallback,
} from "./syncManager";
import { updateSchedule } from "./api";
import type { Schedule } from "@shared/types";

const mockSchedule: Schedule = {
  id: "s1",
  name: "テスト",
  rotation: 0,
  groups: [{ id: "g1", tasks: ["掃除"], emoji: "🧹" }],
  members: [{ id: "m1", name: "太郎", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" }],
  slug: "test-slug-1",
  editToken: "token123",
};

beforeEach(() => {
  vi.useFakeTimers();
  // syncManager.ts が window.setTimeout/clearTimeout を使うため stub
  vi.stubGlobal("window", {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  });
  vi.mocked(updateSchedule).mockClear();
  clearPendingSync(mockSchedule.id);
  setSyncStatusCallback(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("scheduleSyncDebounced", () => {
  it("デバウンス後にupdateScheduleを呼ぶ", async () => {
    scheduleSyncDebounced(mockSchedule);

    // デバウンス前は呼ばれない
    expect(updateSchedule).not.toHaveBeenCalled();

    // 3秒後に呼ばれる
    await vi.advanceTimersByTimeAsync(3000);

    expect(updateSchedule).toHaveBeenCalledTimes(1);
    expect(updateSchedule).toHaveBeenCalledWith(
      mockSchedule.slug,
      mockSchedule.editToken,
      expect.objectContaining({ name: "テスト" }),
      undefined,
    );
  });

  it("連続呼び出し時は最後のデータのみ同期する", async () => {
    scheduleSyncDebounced(mockSchedule);
    scheduleSyncDebounced({ ...mockSchedule, name: "更新後" });

    await vi.advanceTimersByTimeAsync(3000);

    expect(updateSchedule).toHaveBeenCalledTimes(1);
    expect(updateSchedule).toHaveBeenCalledWith(
      mockSchedule.slug,
      mockSchedule.editToken,
      expect.objectContaining({ name: "更新後" }),
      undefined,
    );
  });

  it("slug がない場合は同期しない", async () => {
    scheduleSyncDebounced({ ...mockSchedule, slug: undefined, editToken: undefined });

    await vi.advanceTimersByTimeAsync(3000);

    expect(updateSchedule).not.toHaveBeenCalled();
  });
});

describe("flushPendingSync", () => {
  it("保留中のデータを即座に同期する", async () => {
    scheduleSyncDebounced(mockSchedule);

    // デバウンスタイマーを待たずに即 flush
    await flushPendingSync(mockSchedule.id);

    expect(updateSchedule).toHaveBeenCalledTimes(1);
  });

  it("保留データがなければ何もしない", async () => {
    await flushPendingSync("nonexistent");

    expect(updateSchedule).not.toHaveBeenCalled();
  });

  it("keepalive オプションを渡せる", async () => {
    scheduleSyncDebounced(mockSchedule);
    await flushPendingSync(mockSchedule.id, { keepalive: true });

    expect(updateSchedule).toHaveBeenCalledWith(
      mockSchedule.slug,
      mockSchedule.editToken,
      expect.any(Object),
      { keepalive: true },
    );
  });
});

describe("pauseScheduleSync / resumeScheduleSync", () => {
  it("pause 中はデバウンスタイマーが発火しない", async () => {
    scheduleSyncDebounced(mockSchedule);
    pauseScheduleSync(mockSchedule.id);

    await vi.advanceTimersByTimeAsync(5000);

    expect(updateSchedule).not.toHaveBeenCalled();
    expect(isScheduleSyncPaused(mockSchedule.id)).toBe(true);
  });

  it("resume 後に保留データが同期される", async () => {
    scheduleSyncDebounced(mockSchedule);
    pauseScheduleSync(mockSchedule.id);

    await vi.advanceTimersByTimeAsync(5000);
    expect(updateSchedule).not.toHaveBeenCalled();

    resumeScheduleSync(mockSchedule.id);
    expect(isScheduleSyncPaused(mockSchedule.id)).toBe(false);

    await vi.advanceTimersByTimeAsync(3000);
    expect(updateSchedule).toHaveBeenCalledTimes(1);
  });
});

describe("clearPendingSync", () => {
  it("保留データとタイマーをクリアする", async () => {
    scheduleSyncDebounced(mockSchedule);
    clearPendingSync(mockSchedule.id);

    await vi.advanceTimersByTimeAsync(5000);

    expect(updateSchedule).not.toHaveBeenCalled();
  });
});

describe("setSyncStatusCallback", () => {
  it("同期ステータスの変化をコールバックで通知する", async () => {
    const callback = vi.fn();
    setSyncStatusCallback(callback);

    scheduleSyncDebounced(mockSchedule);
    await vi.advanceTimersByTimeAsync(3000);

    expect(callback).toHaveBeenCalledWith(mockSchedule.id, "syncing");
    expect(callback).toHaveBeenCalledWith(mockSchedule.id, "synced");
  });

  it("同期失敗時に error ステータスを通知する", async () => {
    vi.mocked(updateSchedule).mockRejectedValueOnce(new Error("Network error"));
    const callback = vi.fn();
    setSyncStatusCallback(callback);

    scheduleSyncDebounced(mockSchedule);
    await vi.advanceTimersByTimeAsync(3000);

    expect(callback).toHaveBeenCalledWith(mockSchedule.id, "syncing");
    expect(callback).toHaveBeenCalledWith(mockSchedule.id, "error");
  });
});
