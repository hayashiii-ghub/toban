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
