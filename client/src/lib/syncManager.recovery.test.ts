import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedule } from "@shared/types";

const { update } = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("./api", async importOriginal => ({
  ...(await importOriginal<typeof import("./api")>()),
  updateSchedule: update,
}));

const schedule: Schedule = {
  id: "recovery-schedule",
  name: "保存前",
  rotation: 0,
  groups: [{ id: "g1", tasks: ["掃除"], emoji: "🧹" }],
  members: [
    { id: "m1", name: "葵", color: "#000", bgColor: "#fff", textColor: "#000" },
  ],
  slug: "recovery-slug",
  editToken: "private-edit-token",
};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.clear();
  update.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ページを閉じた後の未同期変更", () => {
  it("通常PUT待ちで離脱しても、次回起動はローカルの最新本文を先に同期する", async () => {
    const firstPage = await import("./syncManager");
    update.mockReturnValueOnce(new Promise<void>(() => {}));
    firstPage.scheduleSyncDebounced(schedule);
    void firstPage.flushPendingSync(schedule.id);
    const latest = { ...schedule, name: "離脱直前の編集" };
    firstPage.scheduleSyncDebounced(latest);
    void firstPage.flushPendingSync(schedule.id, { keepalive: true });
    expect(update).toHaveBeenCalledTimes(1);

    // Navigation destroys this page's timers/promise continuations, but not storage.
    vi.clearAllTimers();
    vi.resetModules();
    const nextPage = await import("./syncManager");
    expect(nextPage.hasPendingSync(schedule.id)).toBe(true);
    expect(nextPage.restorePendingScheduleSync(latest)).toBe(true);
    await nextPage.flushPendingSync(schedule.id);
    expect(update).toHaveBeenLastCalledWith(
      schedule.slug,
      schedule.editToken,
      expect.objectContaining({ name: latest.name }),
      undefined
    );
    expect(nextPage.hasPendingSync(schedule.id)).toBe(false);
  });

  it.each([400, 403, 413])(
    "status=%iで再送を止めても、再起動後の古いGETからローカルを保護する",
    async status => {
      const firstPage = await import("./syncManager");
      const { ApiError } = await import("./api");
      update.mockRejectedValueOnce(new ApiError("Rejected", status));
      firstPage.scheduleSyncDebounced(schedule);
      await firstPage.flushPendingSync(schedule.id);
      expect(firstPage.hasPendingSync(schedule.id)).toBe(true);
      vi.clearAllTimers();
      vi.resetModules();
      const nextPage = await import("./syncManager");
      expect(nextPage.hasPendingSync(schedule.id)).toBe(true);
      expect(nextPage.restorePendingScheduleSync(schedule)).toBe(false);
      await nextPage.flushPendingSync(schedule.id);
      expect(update).toHaveBeenCalledTimes(1);

      // An explicit later edit can retry; successful sync removes the protection.
      nextPage.scheduleSyncDebounced({ ...schedule, name: "修正した内容" });
      await nextPage.flushPendingSync(schedule.id);
      expect(update).toHaveBeenCalledTimes(2);
      expect(nextPage.hasPendingSync(schedule.id)).toBe(false);
    }
  );

  it("耐久マーカーに当番表本文や編集トークンを重複保存しない", async () => {
    const manager = await import("./syncManager");
    manager.scheduleSyncDebounced(schedule);
    const stored = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.getItem(localStorage.key(index)!)
    ).join("");
    expect(stored).toContain(schedule.id);
    expect(stored).not.toContain(schedule.name);
    expect(stored).not.toContain(schedule.editToken);
    manager.clearPendingSync(schedule.id, schedule);
    vi.resetModules();
    expect((await import("./syncManager")).hasPendingSync(schedule.id)).toBe(
      false
    );
  });

  it("容量超過でも同期処理をクラッシュさせない", async () => {
    const manager = await import("./syncManager");
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Quota full", "QuotaExceededError");
    });
    expect(() => manager.scheduleSyncDebounced(schedule)).not.toThrow();
    expect(manager.hasPendingSync(schedule.id)).toBe(true);
    await expect(
      manager.flushPendingSync(schedule.id)
    ).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledOnce();
  });
});
