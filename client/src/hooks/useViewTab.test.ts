import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@/test/vue";
import { useViewTab } from "./useViewTab";
const VIEW_TAB_KEY = "toban-view-tab";
describe("useViewTab", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });
  it("URL の ?view= が有効なとき localStorage より優先して採用する", () => {
    localStorage.setItem(VIEW_TAB_KEY, "table");
    window.history.replaceState({}, "", "/?view=disc");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("disc");
  });
  it("URL の ?view= が無効な値なら localStorage / デフォルトにフォールバック", () => {
    window.history.replaceState({}, "", "/?view=bogus");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("cards");
  });
  it("localStorageが空のときデフォルト'cards'を返す", () => {
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("cards");
  });
  it("localStorageに保存された値を復元する", () => {
    localStorage.setItem(VIEW_TAB_KEY, "table");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("table");
  });
  it("無効な値のとき'cards'にフォールバック", () => {
    localStorage.setItem(VIEW_TAB_KEY, "invalid");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("cards");
  });
  it("changeTabで状態更新とlocalStorage保存", async () => {
    const { result } = renderHook(() => useViewTab());
    await act(() => result.current.changeTab("calendar"));
    expect(result.current.viewTab).toBe("calendar");
    expect(localStorage.getItem(VIEW_TAB_KEY)).toBe("calendar");
    // 保存した値が次に開いたときに戻る
    expect(renderHook(() => useViewTab()).result.current.viewTab).toBe(
      "calendar"
    );
  });
});
it("keeps manual and tool month navigation in one committed display state", async () => {
  const { result } = renderHook(() => useViewTab());
  await act(() => result.current.changeTabForTool("calendar", "2026-09"));
  expect(result.current.viewTab).toBe("calendar");
  expect(result.current.calendarMonth).toBe("2026-09");
  await act(() => result.current.setCalendarMonth("2026-10"));
  await act(() => result.current.changeTabForTool("table"));
  await act(() => result.current.changeTabForTool("calendar"));
  expect(result.current.calendarMonth).toBe("2026-10");
});
