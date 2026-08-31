import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { renderHook, act, cleanup } from "@testing-library/react";
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
  cleanup();
  vi.useRealTimers();
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useAutoSync の作成・編集競合", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("初回の見本は送らず、その後に一括作成した表は変更なしでもバックアップする", async () => {
    vi.useFakeTimers();
    const { createSchedule } = await import("@/lib/api");
    vi.mocked(createSchedule).mockClear().mockResolvedValue({
      slug: "created",
      editToken: "token",
    });
    const onUpdate = vi.fn();
    const { rerender } = renderHook(({ s }) => useAutoSync(s, onUpdate), {
      initialProps: { s: makeSchedule({ id: "seed" }) },
    });
    await act(async () => vi.advanceTimersByTime(6000));
    expect(createSchedule).not.toHaveBeenCalled();

    rerender({ s: makeSchedule({ id: "created", name: "完成した当番表" }) });
    await act(async () => vi.advanceTimersByTime(6000));
    expect(createSchedule).toHaveBeenCalledOnce();
    expect(createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ name: "完成した当番表" })
    );
  });

  it("バックアップの応答は最新の内容を保持し、別の表へ資格情報を付けない", async () => {
    const { createSchedule } = await import("@/lib/api");
    const request = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule).mockReturnValue(request.promise);
    const onUpdate = vi.fn();
    const initial = makeSchedule();
    const { rerender } = renderHook(({ s }) => useAutoSync(s, onUpdate), {
      initialProps: { s: initial },
    });
    await act(async () => window.dispatchEvent(new Event("online")));
    const edited = { ...initial, name: "続けて編集した名前" };
    rerender({ s: edited });
    await act(async () =>
      request.resolve({ slug: "saved", editToken: "token" })
    );

    const apply = onUpdate.mock.calls[0][0] as (s: Schedule) => Schedule;
    expect(apply(edited)).toEqual({
      ...edited,
      slug: "saved",
      editToken: "token",
    });
    const other = makeSchedule({ id: "other" });
    expect(apply(other)).toBe(other);
    const alreadySaved = {
      ...edited,
      slug: "manual",
      editToken: "manual-token",
    };
    expect(apply(alreadySaved)).toBe(alreadySaved);
  });

  it("手動保存は進行中バックアップの古い本文ではなく最新本文と資格情報を返す", async () => {
    const { createSchedule } = await import("@/lib/api");
    const request = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule).mockReturnValue(request.promise);
    const initial = makeSchedule();
    const { result, rerender } = renderHook(
      ({ s }) => useAutoSync(s, vi.fn()),
      {
        initialProps: { s: initial },
      }
    );
    await act(async () => window.dispatchEvent(new Event("online")));
    const edited = { ...initial, name: "公開前の最新名" };
    rerender({ s: edited });
    let prepared!: Promise<Schedule | undefined>;
    act(() => {
      prepared = result.current.prepareForManualSave();
    });
    await act(async () =>
      request.resolve({ slug: "saved", editToken: "token" })
    );
    expect(await prepared).toEqual({
      ...edited,
      slug: "saved",
      editToken: "token",
    });
  });

  it("手動保存の待機中に別の表へ切り替わったら保存対象をすり替えない", async () => {
    const { createSchedule } = await import("@/lib/api");
    const request = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule).mockReturnValue(request.promise);
    const { result, rerender } = renderHook(
      ({ s }) => useAutoSync(s, vi.fn()),
      {
        initialProps: { s: makeSchedule() },
      }
    );
    await act(async () => window.dispatchEvent(new Event("online")));
    let prepared!: Promise<Schedule | undefined>;
    act(() => {
      prepared = result.current.prepareForManualSave();
    });
    const outcome = prepared.then(
      value => ({ value }),
      error => ({ error })
    );
    rerender({ s: makeSchedule({ id: "other" }) });
    await act(async () =>
      request.resolve({ slug: "saved", editToken: "token" })
    );
    expect(await outcome).toHaveProperty("error");
  });

  it("別の表のバックアップが進行中でも同じPromiseを使い回さない", async () => {
    const { createSchedule } = await import("@/lib/api");
    const first = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    const second = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule)
      .mockReset()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { rerender } = renderHook(({ s }) => useAutoSync(s, vi.fn()), {
      initialProps: { s: makeSchedule() },
    });
    await act(async () => window.dispatchEvent(new Event("online")));
    rerender({ s: makeSchedule({ id: "other" }) });
    await act(async () => window.dispatchEvent(new Event("online")));
    expect(createSchedule).toHaveBeenCalledTimes(2);
    await act(async () => {
      first.resolve({ slug: "first", editToken: "first-token" });
      second.resolve({ slug: "second", editToken: "second-token" });
    });
  });

  it("実際のReact更新でもバックアップ待機中の編集を保持し、更新分を同期する", async () => {
    const { createSchedule, getScheduleForEdit } = await import("@/lib/api");
    const { scheduleSyncDebounced } = await import("@/lib/syncManager");
    const request = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule).mockReturnValue(request.promise);
    vi.mocked(getScheduleForEdit).mockRejectedValue(new Error("offline"));
    vi.mocked(scheduleSyncDebounced).mockClear();
    const { result } = renderHook(() => {
      const [schedule, setSchedule] = useState(makeSchedule());
      const sync = useAutoSync(schedule, setSchedule);
      return { schedule, setSchedule, sync };
    });
    await act(async () => window.dispatchEvent(new Event("online")));
    act(() =>
      result.current.setSchedule(current => ({ ...current, name: "最新" }))
    );
    await act(async () =>
      request.resolve({ slug: "saved", editToken: "token" })
    );
    expect(result.current.schedule.name).toBe("最新");
    expect(result.current.schedule.slug).toBe("saved");
    expect(scheduleSyncDebounced).toHaveBeenCalledWith(result.current.schedule);
  });

  it("切替後の応答も元の表の最新本文へ資格情報を付け、元の表だけを同期する", async () => {
    const { createSchedule } = await import("@/lib/api");
    const { scheduleSyncDebounced } = await import("@/lib/syncManager");
    const request = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule).mockReturnValue(request.promise);
    vi.mocked(scheduleSyncDebounced).mockClear();
    const first = makeSchedule();
    const other = makeSchedule({ id: "other" });
    const schedules = new Map([
      [first.id, first],
      [other.id, other],
    ]);
    const lookup = (id: string) => schedules.get(id);
    const { result, rerender } = renderHook(
      ({ id }) =>
        useAutoSync(
          lookup(id),
          updater => schedules.set(id, updater(schedules.get(id)!)),
          { getScheduleById: lookup }
        ),
      { initialProps: { id: first.id } }
    );
    await act(async () => window.dispatchEvent(new Event("online")));
    rerender({ id: other.id });
    schedules.set(first.id, { ...first, name: "別表を表示中に更新した最新名" });
    await act(async () =>
      request.resolve({ slug: "saved", editToken: "token" })
    );
    expect(schedules.get(first.id)).toEqual({
      ...first,
      name: "別表を表示中に更新した最新名",
      slug: "saved",
      editToken: "token",
    });
    expect(schedules.get(other.id)).toBe(other);
    expect(scheduleSyncDebounced).toHaveBeenCalledWith(schedules.get(first.id));
    expect(result.current.syncStatus).toBe("idle");
  });

  it("先行バックアップの失敗後も手動保存には最新本文を返す", async () => {
    const { createSchedule } = await import("@/lib/api");
    const request = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule).mockReturnValue(request.promise);
    const { result, rerender } = renderHook(
      ({ s }) => useAutoSync(s, vi.fn()),
      {
        initialProps: { s: makeSchedule() },
      }
    );
    await act(async () => window.dispatchEvent(new Event("online")));
    const latest = makeSchedule({ name: "通信中の編集" });
    rerender({ s: latest });
    let prepared!: Promise<Schedule | undefined>;
    act(() => {
      prepared = result.current.prepareForManualSave();
    });
    await act(async () => request.reject(new Error("offline")));
    expect(await prepared).toEqual(latest);
  });

  it("アンマウント後のバックアップ応答から更新しない", async () => {
    const { createSchedule } = await import("@/lib/api");
    const request = deferred<Awaited<ReturnType<typeof createSchedule>>>();
    vi.mocked(createSchedule).mockReturnValue(request.promise);
    const onUpdate = vi.fn();
    const { unmount } = renderHook(() => useAutoSync(makeSchedule(), onUpdate));
    await act(async () => window.dispatchEvent(new Event("online")));
    unmount();
    await act(async () =>
      request.resolve({ slug: "saved", editToken: "token" })
    );
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe("useAutoSync の取得中の競合", () => {
  const cloud = () => makeSchedule({ slug: "abc", editToken: "token" });

  async function pendingPull() {
    const { getScheduleForEdit } = await import("@/lib/api");
    const request = deferred<Awaited<ReturnType<typeof getScheduleForEdit>>>();
    vi.mocked(getScheduleForEdit).mockReturnValue(request.promise);
    const server = {
      ...cloud(),
      name: "サーバの名前",
      slug: "abc",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    return { request, server };
  }

  it("取得中にローカルが変わったら、未送信フラグが解消していても反映しない", async () => {
    const { request, server } = await pendingPull();
    const onUpdate = vi.fn();
    const { rerender } = renderHook(({ s }) => useAutoSync(s, onUpdate), {
      initialProps: { s: cloud() },
    });
    rerender({ s: { ...cloud(), name: "手元の最新名" } });
    await act(async () => request.resolve(server));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("取得後のReact適用待ちに変わった本文・対象・資格情報を上書きしない", async () => {
    const { request, server } = await pendingPull();
    const onUpdate = vi.fn();
    await act(async () => {
      renderHook(() => useAutoSync(cloud(), onUpdate));
      request.resolve(server);
    });
    const apply = onUpdate.mock.calls[0][0] as (s: Schedule) => Schedule;
    const edited = { ...cloud(), name: "適用直前の名前" };
    const switched = { ...cloud(), id: "other" };
    const newCredentials = { ...cloud(), editToken: "replacement" };
    expect(apply(edited)).toBe(edited);
    expect(apply(switched)).toBe(switched);
    expect(apply(newCredentials)).toBe(newCredentials);
  });

  it("取得後のReact適用待ちに編集を開いたら反映しない", async () => {
    const { request, server } = await pendingPull();
    const onUpdate = vi.fn();
    const { rerender } = renderHook(
      ({ isEditing }) => useAutoSync(cloud(), onUpdate, { isEditing }),
      { initialProps: { isEditing: false } }
    );
    await act(async () => request.resolve(server));
    const apply = onUpdate.mock.calls[0][0] as (s: Schedule) => Schedule;
    rerender({ isEditing: true });
    const original = cloud();
    expect(apply(original)).toBe(original);
  });

  it("前の表のバックアップ待機タイマーが切替先の取得を妨げない", async () => {
    vi.useFakeTimers();
    const { request, server } = await pendingPull();
    const { getScheduleForEdit } = await import("@/lib/api");
    vi.mocked(getScheduleForEdit).mockClear();
    const onUpdate = vi.fn();
    const { rerender } = renderHook(({ s }) => useAutoSync(s, onUpdate), {
      initialProps: { s: makeSchedule() },
    });
    rerender({ s: makeSchedule({ name: "バックアップ待ち" }) });
    const next = { ...cloud(), id: "cloud" };
    rerender({ s: next });
    expect(getScheduleForEdit).toHaveBeenCalledWith(next.slug, next.editToken);
    await act(async () => request.resolve(server));
    vi.useRealTimers();
  });

  it("アンマウント後に完了した取得は反映しない", async () => {
    const { request, server } = await pendingPull();
    const onUpdate = vi.fn();
    const { unmount } = renderHook(() => useAutoSync(cloud(), onUpdate));
    unmount();
    await act(async () => request.resolve(server));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
