import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import { AssignmentsGrid } from "./AssignmentsGrid";
import type { Assignment, AssignmentMode, Member, TaskGroup } from "@shared/types";

vi.mock("framer-motion", () => {
  const React = require("react");
  const motionProxy = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) =>
        React.forwardRef((props: any, ref: any) => {
          const {
            initial, animate, exit, transition, variants,
            whileHover, whileTap, layout, ...rest
          } = props;
          return React.createElement(prop, { ...rest, ref });
        }),
    },
  );
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock("@/rotation/utils", () => ({
  getGridCols: () => "grid-cols-2",
}));

afterEach(cleanup);

const makeMember = (id: string, name: string): Member => ({
  id,
  name,
  color: "#4F46E5",
  bgColor: "#EEF2FF",
  textColor: "#312E81",
});

const makeGroup = (id: string, tasks: string[], emoji = "🧹"): TaskGroup => ({
  id,
  tasks,
  emoji,
});

const baseProps = {
  direction: "forward" as const,
  rotation: 0,
  scheduleId: "schedule-1",
  stagger: false,
  assignmentMode: "member" as AssignmentMode,
};

const sampleAssignments: Assignment[] = [
  { group: makeGroup("g1", ["掃除", "ゴミ捨て"], "🧹"), member: makeMember("m1", "田中太郎") },
  { group: makeGroup("g2", ["配膳"], "🍽️"), member: makeMember("m2", "鈴木花子") },
  { group: makeGroup("g3", ["日直"], "📋"), member: makeMember("m3", "佐藤次郎") },
];

describe("AssignmentsGrid", () => {
  it("正しい数のカードが表示される", () => {
    const { container } = render(
      <AssignmentsGrid {...baseProps} assignments={sampleAssignments} />,
    );
    const cards = container.querySelectorAll(".rotation-print-card");
    expect(cards).toHaveLength(sampleAssignments.length);
  });

  it("各カードにメンバー名が表示される", () => {
    const { container } = render(
      <AssignmentsGrid {...baseProps} assignments={sampleAssignments} />,
    );
    const view = within(container);
    expect(view.getByText("田中太郎")).toBeInTheDocument();
    expect(view.getByText("鈴木花子")).toBeInTheDocument();
    expect(view.getByText("佐藤次郎")).toBeInTheDocument();
  });

  it("各カードにタスク名が表示される", () => {
    const { container } = render(
      <AssignmentsGrid {...baseProps} assignments={sampleAssignments} />,
    );
    const view = within(container);
    expect(view.getByText("掃除")).toBeInTheDocument();
    expect(view.getByText("ゴミ捨て")).toBeInTheDocument();
    expect(view.getByText("配膳")).toBeInTheDocument();
    expect(view.getByText("日直")).toBeInTheDocument();
  });

  it("空のassignments配列で空の状態が表示される", () => {
    const { container } = render(
      <AssignmentsGrid {...baseProps} assignments={[]} />,
    );
    const grid = container.querySelector(".rotation-print-card-grid");
    expect(grid).toBeInTheDocument();
    expect(grid!.children).toHaveLength(0);
  });
});
