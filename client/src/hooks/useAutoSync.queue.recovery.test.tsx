import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@/test/vue";
import { useScheduleManager } from "./useScheduleManager";
import { useAutoSync } from "./useAutoSync";
import {
  clearPendingSync,
  flushAllPendingSync,
  hasPendingSync,
  pauseScheduleSync,
  resumeScheduleSync,
  scheduleSyncDebounced,
} from "@/lib/syncManager";
import { toScheduleData } from "@/lib/api";
import { STORAGE_KEY } from "@/rotation/constants";
import type { Schedule } from "@/rotation/types";

const makeSchedule = (id: string): Schedule => ({
  id,
  name: id,
  rotation: 0,
  groups: [{ id: `${id}-group`, tasks: ["掃除"], emoji: "🧹" }],
  members: [
    {
      id: `${id}-member`,
      name: "検証用",
      color: "#000",
      bgColor: "#fff",
      textColor: "#000",
    },
  ],
  slug: `${id}-slug`,
  editToken: `${id}-token`,
});
const a = makeSchedule("queue-a");
const b = makeSchedule("queue-b");
const paused = makeSchedule("queue-paused");

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  for (const schedule of [a, b, paused]) {
    clearPendingSync(schedule.id);
    resumeScheduleSync(schedule.id);
  }
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("選択中の当番表に依存しない未同期キューの復旧", () => {
  it.each(["online", "visibilitychange", "beforeunload"])(
    "%s で別の表の通信失敗も再送し、再選択後も最新本文を保つ",
    async event => {
      localStorage.setItem("toban-lang", "ja");
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ schedules: [a, b], activeScheduleId: a.id })
      );
      const server = new Map([a, b].map(schedule => [schedule.slug, schedule]));
      let offline = true;
      const putRequests: { slug: string; keepalive?: boolean }[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const parts = String(input).split("/");
          const slug = parts[3];
          if (init?.method === "PUT") {
            putRequests.push({ slug, keepalive: init.keepalive });
            if (offline) throw new TypeError("Offline");
            server.set(slug, {
              ...server.get(slug)!,
              ...JSON.parse(String(init.body)),
            });
            return new Response(null, { status: 204 });
          }
          return new Response(
            JSON.stringify({
              ...toScheduleData(server.get(slug)!),
              slug,
              createdAt: "2026-11-07T00:00:00.000Z",
              updatedAt: "2026-11-07T00:00:00.000Z",
            }),
            { status: 200 }
          );
        })
      );
      const { result } = renderHook(() => {
        const manager = useScheduleManager();
        useAutoSync(
          () => manager.activeSchedule,
          (updater, id) =>
            manager.updateScheduleById(
              id ?? manager.activeSchedule!.id,
              updater
            ),
          {
            getScheduleById: id =>
              manager
                .getToolState()
                .schedules.find(schedule => schedule.id === id),
          }
        );
        return manager;
      });
      await act(async () => {});
      await act(() =>
        result.current.updateScheduleById(a.id, schedule => ({
          ...schedule,
          name: "オフラインで編集したA",
        }))
      );
      await act(async () => vi.advanceTimersByTimeAsync(10_000));
      expect(putRequests).toHaveLength(3);
      expect(hasPendingSync(a.id)).toBe(true);
      await act(() => result.current.selectSchedule(b.id));
      offline = false;
      await act(() => {
        if (event === "visibilitychange")
          document.dispatchEvent(new Event(event));
        else window.dispatchEvent(new Event(event));
      });
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(putRequests).toHaveLength(4);
      expect(putRequests[3]).toEqual({
        slug: a.slug,
        keepalive: event === "beforeunload" ? true : undefined,
      });
      expect(hasPendingSync(a.id)).toBe(false);
      await act(() => result.current.selectSchedule(a.id));
      await act(async () => vi.advanceTimersByTimeAsync(10_000));
      expect(result.current.activeSchedule?.name).toBe("オフラインで編集したA");
      expect(putRequests).toHaveLength(4);
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).schedules[0].name
      ).toBe("オフラインで編集したA");
    }
  );

  it.each([400, 401, 403, 413])(
    "全キューの再送でも停止中とstatus=%iの表を送らず、他の表は同期する",
    async status => {
      const putSlugs: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const slug = String(input).split("/")[3];
          putSlugs.push(slug);
          return new Response(null, { status: slug === a.slug ? status : 204 });
        })
      );
      scheduleSyncDebounced(a);
      await flushAllPendingSync();
      expect(putSlugs).toEqual([a.slug]);
      expect(hasPendingSync(a.id)).toBe(true);
      scheduleSyncDebounced(b);
      scheduleSyncDebounced(paused);
      pauseScheduleSync(paused.id);
      await flushAllPendingSync();
      expect(putSlugs).toEqual([a.slug, b.slug]);
      expect(hasPendingSync(b.id)).toBe(false);
      expect(hasPendingSync(paused.id)).toBe(true);
      resumeScheduleSync(paused.id);
      await flushAllPendingSync();
      expect(putSlugs).toEqual([a.slug, b.slug, paused.slug]);
      expect(hasPendingSync(paused.id)).toBe(false);
    }
  );

  it("全キューを同時に再送しても表ごとのPUTを直列化し、途中の最新編集を送る", async () => {
    const firstResponse = deferred<Response>();
    const putRequests: { slug: string; name: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const slug = String(input).split("/")[3];
        putRequests.push({ slug, name: JSON.parse(String(init?.body)).name });
        return putRequests.length === 1
          ? firstResponse.promise
          : Promise.resolve(new Response(null, { status: 204 }));
      })
    );
    scheduleSyncDebounced(a);
    scheduleSyncDebounced(b);
    const firstFlush = flushAllPendingSync();
    expect(putRequests).toEqual([
      { slug: a.slug, name: a.name },
      { slug: b.slug, name: b.name },
    ]);
    scheduleSyncDebounced({ ...a, name: "送信中の追加編集" });
    const secondFlush = flushAllPendingSync();
    expect(putRequests).toHaveLength(2);
    firstResponse.resolve(new Response(null, { status: 204 }));
    await Promise.all([firstFlush, secondFlush]);
    expect(putRequests).toEqual([
      { slug: a.slug, name: a.name },
      { slug: b.slug, name: b.name },
      { slug: a.slug, name: "送信中の追加編集" },
    ]);
    expect(hasPendingSync(a.id)).toBe(false);
    expect(hasPendingSync(b.id)).toBe(false);
  });
});
