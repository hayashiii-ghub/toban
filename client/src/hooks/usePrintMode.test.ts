import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrintMode } from "./usePrintMode";

describe("usePrintMode", () => {
  afterEach(() => {
    delete document.body.dataset.printMode;
    document.getElementById("print-orientation")?.remove();
  });

  it("handlePrint('cards')でbody.dataset.printModeが'cards'になる", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    expect(document.body.dataset.printMode).toBe("cards");
  });

  it("handlePrint('cards')でlandscape orientationのstyle要素が作成される", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    const style = document.getElementById("print-orientation");
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain("landscape");
  });

  it("handlePrint('calendar')でportrait orientationのstyle要素が作成される", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("calendar"));
    const style = document.getElementById("print-orientation");
    expect(style!.textContent).toContain("portrait");
  });

  it("window.printが呼ばれる", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    expect(window.print).toHaveBeenCalled();
  });

  it("afterprintイベントでdatasetとstyle要素がクリーンアップされる", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    act(() => { window.dispatchEvent(new Event("afterprint")); });
    expect(document.body.dataset.printMode).toBeUndefined();
    expect(document.getElementById("print-orientation")).toBeNull();
  });
});
