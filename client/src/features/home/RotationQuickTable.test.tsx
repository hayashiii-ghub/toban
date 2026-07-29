import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { RotationQuickTable } from "./RotationQuickTable";
import type { Member, TaskGroup } from "@shared/types";

vi.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMod = require("react");
  // コンポーネント identity をキャッシュで安定させる。get のたびに新規生成すると
  // React が毎レンダーで subtree を remount し、rerender をまたぐ DOM 参照が無効になる
  const componentCache = new Map<string, unknown>();
  const motionProxy = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) => {
        if (!componentCache.has(prop)) {
          componentCache.set(
            prop,
            ReactMod.forwardRef(
              (props: Record<string, unknown>, ref: unknown) => {
                const {
                  initial: _initial,
                  animate: _animate,
                  exit: _exit,
                  transition: _transition,
                  variants: _variants,
                  whileHover: _whileHover,
                  whileTap: _whileTap,
                  layout: _layout,
                  ...rest
                } = props;
                return ReactMod.createElement(prop, { ...rest, ref });
              }
            )
          );
        }
        return componentCache.get(prop);
      },
    }
  );
  return {
    motion: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// jsdom doesn't have ResizeObserver
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

afterEach(cleanup);

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

  it("renders correct number of group rows", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const table = container.querySelector(
      'table[aria-label="ローテーション早見表"]'
    )!;
    const bodyRows = table.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(2);
  });

  it("renders one column per active member plus header column", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const headerCells = container.querySelectorAll("thead th");
    // 1 header ("担当") + 3 member rotation columns
    expect(headerCells.length).toBe(4);
  });

  it("shows ◀ indicator on current rotation column", () => {
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

  it("keeps column borders reserved on non-current cells (layout stability)", () => {
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

  it("excludes skipped members from columns", () => {
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

  it("scrolls current column into view when rotation changes and table overflows", () => {
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

    rerender(
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
    rerender(
      <RotationQuickTable groups={groups} members={members} rotation={1} />
    );

    expect(scrollTo).toHaveBeenCalled();
    const lastCall = scrollTo.mock.calls.at(-1)![0] as ScrollToOptions;
    expect(lastCall.left).toBeGreaterThanOrEqual(0);
  });

  it("does not scroll when table fits without overflow", () => {
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

    rerender(
      <RotationQuickTable groups={groups} members={members} rotation={1} />
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("has correct aria-label on table", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />
    );
    const table = container.querySelector("table");
    expect(table?.getAttribute("aria-label")).toBe("ローテーション早見表");
  });

  it("displays group emoji and task names in row headers", () => {
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
