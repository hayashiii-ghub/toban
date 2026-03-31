import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { RotationCalendar } from "./RotationCalendar";
import type { Member, RotationConfig, TaskGroup } from "@shared/types";

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

afterEach(cleanup);

function makeMember(id: string, name: string): Member {
  return { id, name, color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" };
}

function makeGroup(id: string, emoji: string, tasks: string[]): TaskGroup {
  return { id, emoji, tasks };
}

const members = [makeMember("m1", "田中"), makeMember("m2", "山田"), makeMember("m3", "佐藤")];
const groups = [makeGroup("g1", "🧹", ["掃除"]), makeGroup("g2", "🍽", ["給食"])];

describe("RotationCalendar", () => {
  beforeEach(() => {
    // Fix the "today" date for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // March 15, 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders current month in header", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );
    expect(container.textContent).toContain("2026年3月");
  });

  it("renders weekday headers", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );
    const text = container.textContent!;
    expect(text).toContain("日");
    expect(text).toContain("月");
    expect(text).toContain("土");
  });

  it("navigates to next and previous months", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );

    const getBtn = (label: string) => Array.from(container.querySelectorAll("button")).find(b => b.textContent === label)!;

    // Go to next month
    fireEvent.click(getBtn("▶"));
    expect(container.textContent).toContain("2026年4月");

    // Go back two months (re-query after each render)
    fireEvent.click(getBtn("◀"));
    expect(container.textContent).toContain("2026年3月");
    fireEvent.click(getBtn("◀"));
    expect(container.textContent).toContain("2026年2月");
  });

  it("shows 今月 button when not on current month and navigates back", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );

    // Initially no 今月 button
    let todayBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent === "今月");
    expect(todayBtn).toBeUndefined();

    // Navigate away
    const nextBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent === "▶")!;
    fireEvent.click(nextBtn);

    // Now 今月 button should appear
    todayBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent === "今月");
    expect(todayBtn).toBeDefined();

    // Click it to go back
    fireEvent.click(todayBtn!);
    expect(container.textContent).toContain("2026年3月");
  });

  it("shows manual mode badge when not in date mode", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );
    expect(container.textContent).toContain("手動切り替え：当番は固定です");
  });

  it("does not show manual mode badge in date mode", () => {
    const config: RotationConfig = { mode: "date", startDate: "2026-03-01", cycleDays: 1 };
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} rotationConfig={config} />,
    );
    expect(container.textContent).not.toContain("手動切り替え：当番は固定です");
  });

  it("renders legend with group emojis and task names", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );
    expect(container.textContent).toContain("🧹");
    expect(container.textContent).toContain("掃除");
    expect(container.textContent).toContain("🍽");
    expect(container.textContent).toContain("給食");
  });

  it("displays member names in calendar day cells", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );
    // In manual mode, all days show the same assignments
    expect(container.textContent).toContain("田中");
  });

  it("shows holiday names (春分の日 on March 20, 2026)", () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />,
    );
    // March 20, 2026 is 春分の日
    expect(container.textContent).toContain("春分の日");
  });
});
