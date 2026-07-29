import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { buildPrintFilename, usePrintMode } from "./usePrintMode";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

describe("usePrintMode", () => {
  afterEach(() => {
    document.getElementById("print-orientation")?.remove();
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

  it("handlePrint('disc')でportrait orientationのstyle要素が作成される", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("disc"));
    const style = document.getElementById("print-orientation");
    expect(style!.textContent).toContain("portrait");
  });

  it("window.printが呼ばれる", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    expect(window.print).toHaveBeenCalled();
  });

  it("window.printが未実装の場合はtoast.errorを表示し印刷を行わない", async () => {
    const { toast } = await import("sonner");
    const original = window.print;
    Object.defineProperty(window, "print", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    expect(toast.error).toHaveBeenCalledWith(
      "このブラウザでは印刷できません。SafariまたはChromeで開いてください"
    );
    expect(document.getElementById("print-orientation")).toBeNull();
    Object.defineProperty(window, "print", {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it("afterprintイベントでstyle要素がクリーンアップされる", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(document.getElementById("print-orientation")).toBeNull();
  });

  it("当番表名を渡すとdocument.titleがPDF名に差し替わり、afterprintで元に戻る", () => {
    window.print = vi.fn();
    const original = "元のタイトル";
    document.title = original;
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards", "そうじ当番表", "初期"));
    expect(document.title).toContain("そうじ当番表");
    expect(document.title).toContain("初期");
    expect(document.title).not.toBe(original);
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(document.title).toBe(original);
  });

  it("afterprint前に再度印刷しても、復元先は最初の元タイトルを保つ", () => {
    window.print = vi.fn();
    const original = "元のタイトル";
    document.title = original;
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards", "当番表A", "初期"));
    act(() => result.current.handlePrint("cards", "当番表B", "初期"));
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(document.title).toBe(original);
  });

  it("当番表名が無ければdocument.titleを差し替えない", () => {
    window.print = vi.fn();
    const original = "元のタイトル";
    document.title = original;
    const { result } = renderHook(() => usePrintMode());
    act(() => result.current.handlePrint("cards"));
    expect(document.title).toBe(original);
  });
});

describe("buildPrintFilename", () => {
  it("当番表名・順番・日付を _ で結合してPDF名にする", () => {
    expect(
      buildPrintFilename("そうじ当番表", "初期", "2026年7月23日(木)")
    ).toBe("そうじ当番表_初期_2026年7月23日(木)");
  });

  it("順番・日付が無ければ当番表名だけを使う", () => {
    expect(buildPrintFilename("そうじ当番表")).toBe("そうじ当番表");
  });

  it("空の要素は結合対象から外す", () => {
    expect(buildPrintFilename("そうじ当番表", "", "2026年7月23日")).toBe(
      "そうじ当番表_2026年7月23日"
    );
  });

  it("当番表名が無ければ null を返す（title を差し替えない）", () => {
    expect(buildPrintFilename(undefined, "初期", "2026年7月23日")).toBeNull();
    expect(buildPrintFilename("", "初期", "2026年7月23日")).toBeNull();
  });

  it("ファイル名に使えない文字を除去する", () => {
    expect(buildPrintFilename('A/B\\C:D*E?F"G<H>I|J', "初期")).toBe(
      "ABCDEFGHIJ_初期"
    );
  });

  it("除去後に中身が空なら null を返す", () => {
    expect(buildPrintFilename("/////")).toBeNull();
  });
});
