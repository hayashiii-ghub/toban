import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// api モジュールをモック
vi.mock("./api", async importOriginal => {
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
  hasPendingSync,
  waitForScheduleSync,
} from "./syncManager";
import { updateSchedule } from "./api";
import type { Schedule } from "@shared/types";

const mockSchedule: Schedule = {
  id: "s1",
  name: "テスト",
  rotation: 0,
  groups: [{ id: "g1", tasks: ["掃除"], emoji: "🧹" }],
  members: [
    {
      id: "m1",
      name: "太郎",
      color: "#3B82F6",
      bgColor: "#DBEAFE",
      textColor: "#1E3A5F",
    },
  ],
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
  resumeScheduleSync(mockSchedule.id);
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
      undefined
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
      undefined
    );
  });

  it("slug がない場合は同期しない", async () => {
    scheduleSyncDebounced({
      ...mockSchedule,
      slug: undefined,
      editToken: undefined,
    });

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
      { keepalive: true }
    );
  });
});

describe("再送しても直らないエラーの扱い", () => {
  // 同じ内容を送り直せば必ず同じ結果になる 400 / 413 を保持し続けると、
  // 復帰イベント（online / visibilitychange）のたびに無駄な再送が走る。
  it.each([400, 413])("status=%i は保留を破棄して再送しない", async status => {
    const { ApiError } = await import("./api");
    vi.mocked(updateSchedule).mockRejectedValueOnce(
      new ApiError("Rejected", status)
    );

    scheduleSyncDebounced(mockSchedule);
    await flushPendingSync(mockSchedule.id);
    expect(updateSchedule).toHaveBeenCalledTimes(1);

    // 2度目の flush では保留が残っていないので送信されない
    await flushPendingSync(mockSchedule.id);
    expect(updateSchedule).toHaveBeenCalledTimes(1);
  });

  it("status=429 は保留を残し、復帰時に再送する", async () => {
    const { ApiError } = await import("./api");
    vi.mocked(updateSchedule).mockRejectedValueOnce(
      new ApiError("Too many requests", 429)
    );

    scheduleSyncDebounced(mockSchedule);
    await flushPendingSync(mockSchedule.id);
    expect(updateSchedule).toHaveBeenCalledTimes(1);

    await flushPendingSync(mockSchedule.id);
    expect(updateSchedule).toHaveBeenCalledTimes(2);
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("進行中PUTと新しい変更", () => {
  it("同じ表のPUTは前の応答を待ち、最新本文だけを次に送る", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(updateSchedule)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    scheduleSyncDebounced(mockSchedule);
    await vi.advanceTimersByTimeAsync(3000);
    scheduleSyncDebounced({ ...mockSchedule, name: "新しい本文" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(updateSchedule).toHaveBeenCalledTimes(1);
    first.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(updateSchedule).toHaveBeenCalledTimes(2);
    expect(updateSchedule).toHaveBeenLastCalledWith(
      mockSchedule.slug,
      mockSchedule.editToken,
      expect.objectContaining({ name: "新しい本文" }),
      undefined
    );
    second.resolve();
    await flushPendingSync(mockSchedule.id);
    expect(hasPendingSync(mockSchedule.id)).toBe(false);
  });

  it("古い本文の400エラーで、その後に修正済みのpendingを消さない", async () => {
    const { ApiError } = await import("./api");
    const first = deferred<void>();
    vi.mocked(updateSchedule).mockReturnValueOnce(first.promise);
    scheduleSyncDebounced(mockSchedule);
    const flushing = flushPendingSync(mockSchedule.id);
    scheduleSyncDebounced({ ...mockSchedule, name: "修正済み" });
    first.reject(new ApiError("Rejected", 400));
    await flushing;
    expect(hasPendingSync(mockSchedule.id)).toBe(true);
    await flushPendingSync(mockSchedule.id);
    expect(updateSchedule).toHaveBeenLastCalledWith(
      mockSchedule.slug,
      mockSchedule.editToken,
      expect.objectContaining({ name: "修正済み" }),
      undefined
    );
  });

  it("古いPUT成功の後も新しいpendingを保持し、keepalive付きflushで送れる", async () => {
    const first = deferred<void>();
    vi.mocked(updateSchedule).mockReturnValueOnce(first.promise);
    scheduleSyncDebounced(mockSchedule);
    const firstFlush = flushPendingSync(mockSchedule.id);
    scheduleSyncDebounced({ ...mockSchedule, name: "最新" });
    const nextFlush = flushPendingSync(mockSchedule.id, { keepalive: true });
    expect(updateSchedule).toHaveBeenCalledTimes(1);
    first.resolve();
    await Promise.all([firstFlush, nextFlush]);
    expect(updateSchedule).toHaveBeenLastCalledWith(
      mockSchedule.slug,
      mockSchedule.editToken,
      expect.objectContaining({ name: "最新" }),
      { keepalive: true }
    );
    expect(hasPendingSync(mockSchedule.id)).toBe(false);
  });

  it("異なる表のPUTは互いの完了を待たない", async () => {
    const first = deferred<void>();
    const other = { ...mockSchedule, id: "other", slug: "other-slug" };
    vi.mocked(updateSchedule).mockReturnValueOnce(first.promise);
    scheduleSyncDebounced(mockSchedule);
    const firstFlush = flushPendingSync(mockSchedule.id);
    scheduleSyncDebounced(other);
    await flushPendingSync(other.id);
    expect(updateSchedule).toHaveBeenCalledTimes(2);
    first.resolve();
    await firstFlush;
  });
});

describe("手動共有前の同期待機", () => {
  it("pause後は既に送ったPUTだけを待ち、新しいpendingは送らない", async () => {
    const first = deferred<void>();
    vi.mocked(updateSchedule).mockReturnValueOnce(first.promise);
    scheduleSyncDebounced(mockSchedule);
    const firstFlush = flushPendingSync(mockSchedule.id);
    scheduleSyncDebounced({ ...mockSchedule, name: "手動で保存する最新本文" });
    const queuedFlush = flushPendingSync(mockSchedule.id);
    pauseScheduleSync(mockSchedule.id);
    const settled = vi.fn();
    const waiting = waitForScheduleSync(mockSchedule.id).then(settled);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    first.resolve();
    await Promise.all([firstFlush, queuedFlush, waiting]);
    expect(settled).toHaveBeenCalledOnce();
    expect(updateSchedule).toHaveBeenCalledTimes(1);
    expect(hasPendingSync(mockSchedule.id)).toBe(true);
    await flushPendingSync(mockSchedule.id, { keepalive: true });
    expect(updateSchedule).toHaveBeenCalledTimes(1);
  });

  it("手動保存開始後の新しいpendingを完了処理で消さず、再開後に送る", async () => {
    pauseScheduleSync(mockSchedule.id);
    const newer = { ...mockSchedule, name: "手動保存中の追加編集" };
    scheduleSyncDebounced(newer);
    clearPendingSync(mockSchedule.id, mockSchedule);
    expect(hasPendingSync(mockSchedule.id)).toBe(true);
    resumeScheduleSync(mockSchedule.id);
    await vi.advanceTimersByTimeAsync(3000);
    expect(updateSchedule).toHaveBeenCalledWith(
      newer.slug,
      newer.editToken,
      expect.objectContaining({ name: newer.name }),
      undefined
    );
    expect(hasPendingSync(mockSchedule.id)).toBe(false);
  });

  it("手動保存した内容と同じpendingだけを解除する", () => {
    pauseScheduleSync(mockSchedule.id);
    scheduleSyncDebounced(mockSchedule);
    clearPendingSync(mockSchedule.id, { ...mockSchedule });
    expect(hasPendingSync(mockSchedule.id)).toBe(false);
  });
});
