import { reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@/test/vue";
import { LanguageProvider } from "@/i18n";
import { STORAGE_KEY } from "@/rotation/constants";
import { DEFAULT_APP_STATE } from "@/rotation/defaultState";
import type { Schedule } from "@/rotation/types";
import { useHomeState } from "./useHomeState";
import { useTurnLabel } from "./useTurnLabel";
import { usePrintDateString } from "./usePrintDateString";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("同じ保存済み表を引き直しても、画面復帰で今日の担当・期間・印刷日へ更新する", async () => {
  vi.stubEnv("TZ", "Asia/Tokyo");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 1, 23, 59));
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  window.history.replaceState({}, "", "/");
  localStorage.setItem("toban-lang", "ja");
  const schedule: Schedule = {
    ...structuredClone(DEFAULT_APP_STATE.schedules[0]),
    id: "daily-roster",
    name: "毎日の当番",
    slug: "daily-roster",
    editToken: "daily-edit-token",
    groups: [{ id: "g1", emoji: "🧹", tasks: ["掃除"] }],
    members: DEFAULT_APP_STATE.schedules[0].members.slice(0, 2),
    rotationConfig: { mode: "date", startDate: "2026-10-01", cycleDays: 1 },
  };
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ schedules: [schedule], activeScheduleId: schedule.id })
  );
  const fetchMock = vi.fn<typeof fetch>(async () =>
    Response.json({
      ...schedule,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(
    () => {
      const home = useHomeState();
      return reactive({
        home,
        turn: useTurnLabel(
          () => home.activeSchedule?.rotationConfig,
          () => home.members,
          () => home.effectiveRotation
        ),
        printDate: usePrintDateString(),
      });
    },
    { wrapper: LanguageProvider }
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  const before = result.current.home.activeSchedule;
  const saved = localStorage.getItem(STORAGE_KEY);
  expect(result.current.home.assignments[0].member.name).toBe("佐藤");
  expect(result.current.turn.label).toBe("10/1(木)の当番");
  await act(async () => {
    vi.setSystemTime(new Date(2026, 9, 2, 0, 1));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(result.current.home.activeSchedule).toBe(before);
  expect(result.current.home.effectiveRotation).toBe(1);
  expect(result.current.home.assignments[0].member.name).toBe("鈴木");
  expect(result.current.turn.label).toBe("10/2(金)の当番");
  expect(result.current.turn.fileLabel).toBe("2026-10-02");
  expect(result.current.printDate).toContain("10月2日");
  expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
  expect(fetchMock.mock.calls.every(([, init]) => !init?.method)).toBe(true);
});
