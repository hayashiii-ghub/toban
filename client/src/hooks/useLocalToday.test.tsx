import { act, cleanup, renderHook } from "@/test/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatIsoDateLocal } from "@/rotation/dateUtils";
import { useLocalToday } from "./useLocalToday";
describe("useLocalToday", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T23:59:59+09:00"));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });
  afterEach(() => {
    // unsubscribe が fake timer と実物の listener を解放してから時計を戻す。
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  it("日本時間の深夜に今日を更新し、次の深夜にも更新する", async () => {
    const { result } = renderHook(() => useLocalToday());
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-01");
    await act(() => vi.advanceTimersByTime(999));
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-01");
    await act(() => vi.advanceTimersByTime(1));
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-02");
    expect(result.current.getHours()).toBe(0);
    expect(result.current.getTimezoneOffset()).toBe(-540);
    await act(() => vi.advanceTimersByTime(24 * 60 * 60 * 1000));
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-03");
    expect(vi.getTimerCount()).toBe(1);
  });
  it("日本時間の午前中も UTC の前日ではなく端末の日付を返す", () => {
    vi.setSystemTime(new Date("2026-10-02T00:30:00+09:00"));
    const { result } = renderHook(() => useLocalToday());
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-02");
    expect(result.current.getHours()).toBe(0);
  });
  it("背景で時計が数日進んだ後、visible に戻ると今日を更新する", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get");
    const { result } = renderHook(() => useLocalToday());
    const previous = result.current;
    // 背景で timer が止まった端末を、callback を動かさず時計だけ進めて再現。
    visibility.mockReturnValue("hidden");
    vi.setSystemTime(new Date("2026-10-04T08:00:00+09:00"));
    await act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe(previous);
    visibility.mockReturnValue("visible");
    await act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-04");
    // 復帰時刻からではなく、その日の次の深夜を予約し直す。
    await act(() => vi.advanceTimersByTime(16 * 60 * 60 * 1000 - 1));
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-04");
    await act(() => vi.advanceTimersByTime(1));
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-05");
  });
  it("日付を跨いでウィンドウに focus が戻ると今日を更新する", async () => {
    const { result } = renderHook(() => useLocalToday());
    vi.setSystemTime(new Date("2026-10-02T10:00:00+09:00"));
    await act(() => window.dispatchEvent(new Event("focus")));
    expect(formatIsoDateLocal(result.current)).toBe("2026-10-02");
    expect(vi.getTimerCount()).toBe(1);
  });
  it("同日の再描画と復帰イベントでは Date の参照を保つ", async () => {
    vi.setSystemTime(new Date("2026-10-01T08:00:00+09:00"));
    const render = vi.fn(useLocalToday);
    const { result, rerender } = renderHook(render);
    const previous = result.current;
    vi.setSystemTime(new Date("2026-10-01T16:00:00+09:00"));
    await rerender();
    expect(result.current).toBe(previous);
    const renderCount = render.mock.calls.length;
    await act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe(previous);
    expect(render).toHaveBeenCalledTimes(renderCount);
    expect(vi.getTimerCount()).toBe(1);
  });
  it("複数の表示で timer と listener を共有し、最後の unmount で解放する", async () => {
    const addDocumentListener = vi.spyOn(document, "addEventListener");
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const first = renderHook(() => useLocalToday());
    const second = renderHook(() => useLocalToday());
    const visibilityListeners = addDocumentListener.mock.calls.filter(
      ([type]) => type === "visibilitychange"
    );
    const focusListeners = addWindowListener.mock.calls.filter(
      ([type]) => String(type) === "focus"
    );
    expect(visibilityListeners).toHaveLength(1);
    expect(focusListeners).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    await act(() => vi.advanceTimersByTime(1000));
    expect(formatIsoDateLocal(first.result.current)).toBe("2026-10-02");
    expect(formatIsoDateLocal(second.result.current)).toBe("2026-10-02");
    first.unmount();
    expect(vi.getTimerCount()).toBe(1);
    expect(removeDocumentListener).not.toHaveBeenCalledWith(
      "visibilitychange",
      visibilityListeners[0][1]
    );
    expect(removeWindowListener).not.toHaveBeenCalledWith(
      "focus",
      focusListeners[0][1]
    );
    await act(() => vi.advanceTimersByTime(24 * 60 * 60 * 1000));
    expect(formatIsoDateLocal(second.result.current)).toBe("2026-10-03");
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "visibilitychange",
      visibilityListeners[0][1]
    );
    expect(removeWindowListener).toHaveBeenCalledWith(
      "focus",
      focusListeners[0][1]
    );
    await act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(vi.getTimerCount()).toBe(0);
    const remounted = renderHook(() => useLocalToday());
    expect(formatIsoDateLocal(remounted.result.current)).toBe("2026-10-03");
    expect(vi.getTimerCount()).toBe(1);
  });
});
