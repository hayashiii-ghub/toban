import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  toast: { error: vi.fn(), success: vi.fn() },
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

describe("useShareFlow の共有確認", () => {
  beforeEach(async () => {
    const { createSchedule, updateSchedule, publishSchedule } =
      await import("@/lib/api");
    const { waitForScheduleSync } = await import("@/lib/syncManager");
    vi.mocked(createSchedule).mockReset();
    vi.mocked(updateSchedule).mockReset();
    vi.mocked(publishSchedule).mockReset();
    vi.mocked(waitForScheduleSync).mockReset().mockResolvedValue();
  });
  it("確認を開く・キャンセルするだけでは保存準備もAPI操作も行わない", async () => {
    const { createSchedule, updateSchedule, publishSchedule } =
      await import("@/lib/api");
    const { pauseScheduleSync } = await import("@/lib/syncManager");
    const prepare = vi.fn(async () => makeSchedule());
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: makeSchedule(),
        prepareForManualSave: prepare,
        updateActiveSchedule: vi.fn(),
      })
    );

    act(() => {
      expect(result.current.requestShareConfirmation()).toEqual({
        status: "confirmation_required",
        scheduleId: "s1",
        scheduleName: "テスト当番表",
      });
    });
    expect(result.current.showShareConfirmation).toBe(true);
    expect(result.current.shareConfirmation?.scheduleName).toBe("テスト当番表");
    act(() => result.current.cancelShareConfirmation());
    await act(async () => result.current.confirmShare());

    expect(result.current.showShareConfirmation).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
    expect(pauseScheduleSync).not.toHaveBeenCalled();
    expect(createSchedule).not.toHaveBeenCalled();
    expect(updateSchedule).not.toHaveBeenCalled();
    expect(publishSchedule).not.toHaveBeenCalled();
  });

  it("人が確認したスナップショットだけを保存・公開し二重確定を無視する", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { waitForScheduleSync } = await import("@/lib/syncManager");
    const waiting = deferred<void>();
    vi.mocked(waitForScheduleSync).mockReturnValueOnce(waiting.promise);
    vi.mocked(updateSchedule).mockResolvedValue();
    vi.mocked(publishSchedule).mockResolvedValue();
    const schedule = makeSchedule({ slug: "abc", editToken: "token" });
    const prepare = vi.fn(async () => schedule);
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave: prepare,
        updateActiveSchedule: vi.fn(),
      })
    );
    act(() => {
      result.current.requestShareConfirmation();
    });
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.confirmShare();
      second = result.current.confirmShare();
    });
    expect(result.current.isSharing).toBe(true);
    expect(updateSchedule).not.toHaveBeenCalled();
    await act(async () => {
      waiting.resolve();
      await Promise.all([first, second]);
    });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(updateSchedule).toHaveBeenCalledTimes(1);
    expect(publishSchedule).toHaveBeenCalledTimes(1);
    expect(result.current.showShare).toBe(true);
    expect(result.current.showShareConfirmation).toBe(false);
  });

  it.each([
    { id: "other" },
    { name: "確認後に変更された名前" },
    { groups: [{ id: "g1", emoji: "🧹", tasks: ["非公開にしたい別の仕事"] }] },
  ])("確定前にIDまたは内容が変わったら保存・公開しない %j", async patch => {
    const { createSchedule, updateSchedule, publishSchedule } =
      await import("@/lib/api");
    const { toast } = await import("sonner");
    const schedule = makeSchedule();
    const prepare = vi.fn(async () => schedule);
    const { result, rerender } = renderHook(
      ({ activeSchedule }) =>
        useShareFlow({
          activeSchedule,
          prepareForManualSave: prepare,
          updateActiveSchedule: vi.fn(),
        }),
      { initialProps: { activeSchedule: schedule } }
    );
    act(() => {
      result.current.requestShareConfirmation();
    });
    rerender({ activeSchedule: { ...schedule, ...patch } });
    await act(async () => result.current.confirmShare());
    expect(prepare).not.toHaveBeenCalled();
    expect(createSchedule).not.toHaveBeenCalled();
    expect(updateSchedule).not.toHaveBeenCalled();
    expect(publishSchedule).not.toHaveBeenCalled();
    expect(result.current.showShareConfirmation).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it("同期待ち中に内容が変わったらその後の保存・公開を止める", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { waitForScheduleSync } = await import("@/lib/syncManager");
    const waiting = deferred<void>();
    vi.mocked(waitForScheduleSync).mockReturnValueOnce(waiting.promise);
    const schedule = makeSchedule({ slug: "abc", editToken: "token" });
    const prepare = vi.fn(async () => schedule);
    const { result, rerender } = renderHook(
      ({ activeSchedule }) =>
        useShareFlow({
          activeSchedule,
          prepareForManualSave: prepare,
          updateActiveSchedule: vi.fn(),
        }),
      { initialProps: { activeSchedule: schedule } }
    );
    act(() => {
      result.current.requestShareConfirmation();
    });
    let sharing!: Promise<void>;
    act(() => {
      sharing = result.current.confirmShare();
    });
    rerender({ activeSchedule: { ...schedule, name: "待機中の別内容" } });
    await act(async () => {
      waiting.resolve();
      await sharing;
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(updateSchedule).not.toHaveBeenCalled();
    expect(publishSchedule).not.toHaveBeenCalled();
    expect(result.current.showShare).toBe(false);
  });

  it("保存準備から別の内容が返ったら公開しない", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const schedule = makeSchedule({ slug: "abc", editToken: "token" });
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave: async () => ({
          ...schedule,
          name: "準備中に変更",
        }),
        updateActiveSchedule: vi.fn(),
      })
    );
    act(() => {
      result.current.requestShareConfirmation();
    });
    await act(async () => result.current.confirmShare());
    expect(updateSchedule).not.toHaveBeenCalled();
    expect(publishSchedule).not.toHaveBeenCalled();
  });

  it("保存レスポンス待ち中に内容が変わっても未確認のまま公開しない", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const save = deferred<void>();
    vi.mocked(updateSchedule).mockReturnValueOnce(save.promise);
    const schedule = makeSchedule({ slug: "abc", editToken: "token" });
    const { result, rerender } = renderHook(
      ({ activeSchedule }) =>
        useShareFlow({
          activeSchedule,
          prepareForManualSave: async () => schedule,
          updateActiveSchedule: vi.fn(),
        }),
      { initialProps: { activeSchedule: schedule } }
    );
    act(() => {
      result.current.requestShareConfirmation();
    });
    let sharing!: Promise<void>;
    act(() => {
      sharing = result.current.confirmShare();
    });
    await act(async () => {});
    expect(updateSchedule).toHaveBeenCalledTimes(1);
    rerender({ activeSchedule: { ...schedule, name: "別内容" } });
    await act(async () => {
      save.resolve();
      await sharing;
    });
    expect(publishSchedule).not.toHaveBeenCalled();
    expect(result.current.showShare).toBe(false);
  });

  it("バックアップの資格情報だけが増えても確認した内容を公開できる", async () => {
    const { createSchedule, updateSchedule, publishSchedule } =
      await import("@/lib/api");
    vi.mocked(updateSchedule).mockResolvedValue();
    vi.mocked(publishSchedule).mockResolvedValue();
    const schedule = makeSchedule();
    const backedUp = { ...schedule, slug: "abc", editToken: "token" };
    const { result, rerender } = renderHook(
      ({ activeSchedule }) =>
        useShareFlow({
          activeSchedule,
          prepareForManualSave: async () => backedUp,
          updateActiveSchedule: vi.fn(),
        }),
      { initialProps: { activeSchedule: schedule } }
    );
    act(() => {
      result.current.requestShareConfirmation();
    });
    rerender({ activeSchedule: backedUp });
    await act(async () => result.current.confirmShare());
    expect(createSchedule).not.toHaveBeenCalled();
    expect(updateSchedule).toHaveBeenCalledTimes(1);
    expect(publishSchedule).toHaveBeenCalledWith("abc", "token");
  });

  it("従来の共有ボタンも同期的な二重クリックで二回公開しない", async () => {
    const { updateSchedule, publishSchedule } = await import("@/lib/api");
    const { waitForScheduleSync } = await import("@/lib/syncManager");
    const waiting = deferred<void>();
    vi.mocked(waitForScheduleSync).mockReturnValueOnce(waiting.promise);
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
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.handleShare();
      second = result.current.handleShare();
    });
    await act(async () => {
      waiting.resolve();
      await Promise.all([first, second]);
    });
    expect(updateSchedule).toHaveBeenCalledTimes(1);
    expect(publishSchedule).toHaveBeenCalledTimes(1);
  });
  it("キャンセル前の確定ハンドラを再利用して新しい確認を確定できない", async () => {
    const { createSchedule, publishSchedule } = await import("@/lib/api");
    vi.mocked(createSchedule).mockResolvedValue({
      slug: "fresh",
      editToken: "token",
    });
    vi.mocked(publishSchedule).mockResolvedValue();
    const schedule = makeSchedule();
    const { result } = renderHook(() =>
      useShareFlow({
        activeSchedule: schedule,
        prepareForManualSave: async () => schedule,
        updateActiveSchedule: vi.fn(),
      })
    );
    act(() => {
      result.current.requestShareConfirmation();
    });
    const oldConfirm = result.current.confirmShare;
    act(() => result.current.cancelShareConfirmation());
    act(() => {
      result.current.requestShareConfirmation();
    });
    await act(async () => oldConfirm());
    expect(createSchedule).not.toHaveBeenCalled();
    expect(publishSchedule).not.toHaveBeenCalled();
    expect(result.current.showShareConfirmation).toBe(true);
    await act(async () => result.current.confirmShare());
    expect(createSchedule).toHaveBeenCalledTimes(1);
    expect(publishSchedule).toHaveBeenCalledWith("fresh", "token");
  });

  it.each([{ id: "other" }, { name: "公開中に変わった名前" }])(
    "公開リクエスト成功後の表示変更は公開成功として伝え別内容の共有画面を開かない %j",
    async patch => {
      const { updateSchedule, publishSchedule } = await import("@/lib/api");
      const { toast } = await import("sonner");
      vi.mocked(updateSchedule).mockResolvedValue();
      const publishing = deferred<void>();
      vi.mocked(publishSchedule).mockReturnValueOnce(publishing.promise);
      const schedule = makeSchedule({ slug: "abc", editToken: "token" });
      const { result, rerender } = renderHook(
        ({ activeSchedule }) =>
          useShareFlow({
            activeSchedule,
            prepareForManualSave: async () => schedule,
            updateActiveSchedule: vi.fn(),
          }),
        { initialProps: { activeSchedule: schedule } }
      );
      act(() => {
        result.current.requestShareConfirmation();
      });
      let sharing!: Promise<void>;
      act(() => {
        sharing = result.current.confirmShare();
      });
      await act(async () => {});
      expect(publishSchedule).toHaveBeenCalledWith("abc", "token");
      rerender({ activeSchedule: { ...schedule, ...patch } });
      await act(async () => {
        publishing.resolve();
        await sharing;
      });
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(schedule.name)
      );
      expect(result.current.showShare).toBe(false);
      expect(result.current.showShareConfirmation).toBe(false);
    }
  );
});
