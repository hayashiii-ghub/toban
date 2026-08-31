import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { useViewTab } from "./useViewTab";

vi.mock("@/lib/storage", () => ({
  safeGetItem: vi.fn(),
  safeSetItem: vi.fn(),
}));

describe("useViewTab", () => {
  beforeEach(() => {
    vi.mocked(safeGetItem).mockReset();
    vi.mocked(safeSetItem).mockReset();
    window.history.replaceState({}, "", "/");
  });

  it("URL の ?view= が有効なとき localStorage より優先して採用する（/junban からの着地）", () => {
    vi.mocked(safeGetItem).mockReturnValue("table");
    window.history.replaceState({}, "", "/?view=disc");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("disc");
  });

  it("URL の ?view= が無効な値なら localStorage / デフォルトにフォールバック", () => {
    vi.mocked(safeGetItem).mockReturnValue(null);
    window.history.replaceState({}, "", "/?view=bogus");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("cards");
  });

  it("localStorageが空のときデフォルト'cards'を返す", () => {
    vi.mocked(safeGetItem).mockReturnValue(null);
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("cards");
  });

  it("localStorageに保存された値を復元する", () => {
    vi.mocked(safeGetItem).mockReturnValue("table");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("table");
  });

  it("無効な値のとき'cards'にフォールバック", () => {
    vi.mocked(safeGetItem).mockReturnValue("invalid");
    const { result } = renderHook(() => useViewTab());
    expect(result.current.viewTab).toBe("cards");
  });

  it("changeTabで状態更新とlocalStorage保存", () => {
    vi.mocked(safeGetItem).mockReturnValue(null);
    const { result } = renderHook(() => useViewTab());
    act(() => result.current.changeTab("calendar"));
    expect(result.current.viewTab).toBe("calendar");
    expect(safeSetItem).toHaveBeenCalledWith("toban-view-tab", "calendar");
  });
});

it("keeps manual and tool month navigation in one committed display state", () => {
  vi.mocked(safeGetItem).mockReturnValue(null);
  vi.mocked(safeSetItem).mockReturnValue(true);
  const { result } = renderHook(() => useViewTab());
  act(() => result.current.changeTabForTool("calendar", "2026-09"));
  expect(result.current.viewTab).toBe("calendar");
  expect(result.current.calendarMonth).toBe("2026-09");
  act(() => result.current.setCalendarMonth("2026-10"));
  act(() => result.current.changeTabForTool("table"));
  act(() => result.current.changeTabForTool("calendar"));
  expect(result.current.calendarMonth).toBe("2026-10");
});
