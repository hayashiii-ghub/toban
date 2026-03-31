import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { RotationQuickTable } from "./RotationQuickTable";
import type { Member, TaskGroup } from "@shared/types";

vi.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMod = require("react");
  const motionProxy = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) =>
        ReactMod.forwardRef((props: Record<string, unknown>, ref: unknown) => {
          const {
            initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants,
            whileHover: _whileHover, whileTap: _whileTap, layout: _layout, ...rest
          } = props;
          return ReactMod.createElement(prop, { ...rest, ref });
        }),
    },
  );
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// jsdom doesn't have ResizeObserver
vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

afterEach(cleanup);

function makeMember(id: string, name: string): Member {
  return { id, name, color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" };
}

function makeGroup(id: string, emoji: string, tasks: string[]): TaskGroup {
  return { id, emoji, tasks };
}

describe("RotationQuickTable", () => {
  const members = [makeMember("m1", "田中"), makeMember("m2", "山田"), makeMember("m3", "佐藤")];
  const groups = [makeGroup("g1", "🧹", ["掃除"]), makeGroup("g2", "🍽", ["給食"])];

  it("renders correct number of group rows", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />,
    );
    const table = container.querySelector('table[aria-label="ローテーション早見表"]')!;
    // tbody rows: 1 spacer + 2 groups = 3
    const bodyRows = table.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(3); // 1 spacer + 2 data rows
  });

  it("renders one column per active member plus header column", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />,
    );
    const headerCells = container.querySelectorAll("thead th");
    // 1 header ("担当") + 3 member rotation columns
    expect(headerCells.length).toBe(4);
  });

  it("shows ◀ indicator on current rotation column", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={1} />,
    );
    const headerCells = container.querySelectorAll("thead th");
    // headerCells[0] = "担当", [1] = "初期", [2] = "1回目 ◀", [3] = "2回目"
    expect(headerCells[2].textContent).toContain("1回目");
    expect(headerCells[2].textContent).toContain("◀");
    expect(headerCells[1].textContent).not.toContain("◀");
  });

  it("excludes skipped members from columns", () => {
    const membersWithSkip = [
      ...members,
      { ...makeMember("m4", "鈴木"), skipped: true },
    ];
    const { container } = render(
      <RotationQuickTable groups={groups} members={membersWithSkip} rotation={0} />,
    );
    const headerCells = container.querySelectorAll("thead th");
    // 1 header + 3 active (m4 skipped)
    expect(headerCells.length).toBe(4);
  });

  it("has correct aria-label on table", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />,
    );
    const table = container.querySelector("table");
    expect(table?.getAttribute("aria-label")).toBe("ローテーション早見表");
  });

  it("displays group emoji and task names in row headers", () => {
    const { container } = render(
      <RotationQuickTable groups={groups} members={members} rotation={0} />,
    );
    const rowHeaders = container.querySelectorAll("tbody th[scope='row']");
    expect(rowHeaders[0].textContent).toContain("🧹");
    expect(rowHeaders[0].textContent).toContain("掃除");
    expect(rowHeaders[1].textContent).toContain("🍽");
    expect(rowHeaders[1].textContent).toContain("給食");
  });
});
