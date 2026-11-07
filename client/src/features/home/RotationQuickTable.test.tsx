import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, cleanup } from "@/test/vue";
import { RotationQuickTable } from "./RotationQuickTable";
import type { Member, RotationConfig, TaskGroup } from "@shared/types";

// jsdom doesn't have ResizeObserver
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function makeMember(id: string, name: string): Member {
  return {
    id,
    name,
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    textColor: "#1E3A5F",
  };
}

function makeGroup(id: string, emoji: string, tasks: string[]): TaskGroup {
  return { id, emoji, tasks };
}

describe("RotationQuickTable", () => {
  const members = [
    makeMember("m1", "田中"),
    makeMember("m2", "山田"),
    makeMember("m3", "佐藤"),
  ];
  const groups = [
    makeGroup("g1", "🧹", ["掃除"]),
    makeGroup("g2", "🍽", ["給食"]),
  ];

  it("日付で交代するときは、今の順番から日付の順に並べる", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 15)); // 3/15(日)
    const config: RotationConfig = {
      mode: "date",
      startDate: "2026-03-02",
      cycleDays: 7,
    };
    const { container } = render(
      <RotationQuickTable
        groups={groups}
        members={members}
        rotation={1}
        rotationConfig={config}
      />
    );
    const headers = [...container.querySelectorAll("thead th")]
      .slice(1)
      .map(th => th.textContent?.replace("◀", "").trim());
    expect(headers).toEqual(["3/9〜", "3/16〜", "3/23〜"]);
    expect(container.querySelector("th[aria-current]")?.textContent).toContain(
      "3/9〜"
    );
    vi.useRealTimers();
  });

  it("renders correct number of group rows", async () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const table = container.querySelector(
      'table[aria-label="ローテーション早見表"]'
    )!;
    const bodyRows = table.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(2);
  });

  it("同じ表を表示したまま画面に戻ると、早見表の日付を更新する", async () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 23, 59));
    const { container } = render(
      <RotationQuickTable
        groups={groups}
        members={members}
        rotation={0}
        rotationConfig={{ mode: "date", startDate: "2026-10-01", cycleDays: 1 }}
      />
    );
    const headings = () =>
      [...container.querySelectorAll("thead th")]
        .slice(1)
        .map(th => th.textContent?.replace("◀", "").trim());
    expect(headings()).toEqual(["10/1(木)", "10/2(金)", "10/3(土)"]);

    await act(() => {
      vi.setSystemTime(new Date(2026, 9, 2, 0, 1));
      window.dispatchEvent(new Event("focus"));
    });
    expect(headings()).toEqual(["10/2(金)", "10/3(土)", "10/4(日)"]);
  });

  it("renders one column per active member plus header column", async () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const headerCells = container.querySelectorAll("thead th");
    // 1 header ("担当") + 3 member rotation columns
    expect(headerCells.length).toBe(4);
  });

  it("shows ◀ indicator on current rotation column", async () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={1} />
    );
    const headerCells = container.querySelectorAll("thead th");
    // headerCells[0] = "担当", [1] = "初期", [2] = "1回目 ◀", [3] = "2回目"
    // ◀ は列幅予約のため全ヘッダに存在し、現在列だけ visible + aria-current
    expect(headerCells[2].textContent).toContain("1回目");
    expect(headerCells[2].getAttribute("aria-current")).toBe("true");
    expect(headerCells[1].getAttribute("aria-current")).toBeNull();
    const marker = (cell: Element) =>
      cell.querySelector("span[aria-hidden]") as HTMLElement;
    expect(marker(headerCells[2]).style.visibility).toBe("visible");
    expect(marker(headerCells[1]).style.visibility).toBe("hidden");
  });

  it("keeps column borders reserved on non-current cells (layout stability)", async () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={1} />
    );
    const firstRowCells = container.querySelectorAll<HTMLElement>(
      "tbody tr:first-child td"
    );
    // 現在列（rotation=1 → 2番目の td）は着色、それ以外も同幅の透明 border が常時確保される
    expect(firstRowCells[1].style.borderLeft).toContain("2.5px solid");
    expect(firstRowCells[0].style.borderLeft).toBe("2.5px solid transparent");
    expect(firstRowCells[2].style.borderLeft).toBe("2.5px solid transparent");
  });

  it("excludes skipped members from columns", async () => {
    const membersWithSkip = [
      ...members,
      { ...makeMember("m4", "鈴木"), skipped: true },
    ];
    const { container } = render(
      <RotationQuickTable
        groups={groups}
        members={membersWithSkip}
        rotation={0}
      />
    );
    const headerCells = container.querySelectorAll("thead th");
    // 1 header + 3 active (m4 skipped)
    expect(headerCells.length).toBe(4);
  });

  it("scrolls current column into view when rotation changes and table overflows", async () => {
    const { container, rerender } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const scroller = container.querySelector<HTMLElement>(".overflow-x-auto")!;
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
    Object.defineProperty(scroller, "scrollWidth", {
      value: 600,
      configurable: true,
    });
    Object.defineProperty(scroller, "clientWidth", {
      value: 300,
      configurable: true,
    });

    await rerender(
      <RotationQuickTable groups={groups} members={members} rotation={2} />
    );

    const cell = scroller.querySelector<HTMLElement>("th[aria-current]")!;
    Object.defineProperty(cell, "offsetLeft", {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(cell, "offsetWidth", {
      value: 100,
      configurable: true,
    });
    await rerender(
      <RotationQuickTable groups={groups} members={members} rotation={1} />
    );

    expect(scrollTo).toHaveBeenCalled();
    const lastCall = scrollTo.mock.calls.at(-1)![0] as ScrollToOptions;
    expect(lastCall.left).toBeGreaterThanOrEqual(0);
  });

  it("does not scroll when table fits without overflow", async () => {
    const { container, rerender } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const scroller = container.querySelector<HTMLElement>(".overflow-x-auto")!;
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
    Object.defineProperty(scroller, "scrollWidth", {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(scroller, "clientWidth", {
      value: 300,
      configurable: true,
    });

    await rerender(
      <RotationQuickTable groups={groups} members={members} rotation={1} />
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("has correct aria-label on table", async () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const table = container.querySelector("table");
    expect(table?.getAttribute("aria-label")).toBe("ローテーション早見表");
  });

  it("displays group emoji and task names in row headers", async () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const rowHeaders = container.querySelectorAll("tbody th[scope='row']");
    expect(rowHeaders[0].textContent).toContain("🧹");
    expect(rowHeaders[0].textContent).toContain("掃除");
    expect(rowHeaders[1].textContent).toContain("🍽");
    expect(rowHeaders[1].textContent).toContain("給食");
  });
});
