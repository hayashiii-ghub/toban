import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScheduleTabs } from "./ScheduleTabs";
import type { Schedule } from "@/rotation/types";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const makeSchedule = (id: string, name: string, pinned = false): Schedule => ({
  id,
  name,
  rotation: 0,
  groups: [],
  members: [],
  pinned,
});

const schedules: Schedule[] = [
  makeSchedule("s1", "掃除当番"),
  makeSchedule("s2", "給食当番"),
  makeSchedule("s3", "日直"),
];

const defaultProps = () => ({
  schedules,
  activeScheduleId: "s1",
  draggedTabId: null,
  dragOverTabId: null,
  onSelectSchedule: vi.fn(),
  onAddSchedule: vi.fn(),
  onDragStart: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
  onDragEnd: vi.fn(),
});

describe("ScheduleTabs", () => {
  it("スケジュール数分のタブが表示される", () => {
    const { unmount } = render(<ScheduleTabs {...defaultProps()} />);
    expect(screen.getByText("掃除当番")).toBeInTheDocument();
    expect(screen.getByText("給食当番")).toBeInTheDocument();
    expect(screen.getByText("日直")).toBeInTheDocument();
    unmount();
  });

  it("タブクリックでonSelectScheduleが呼ばれる", () => {
    const props = defaultProps();
    const { unmount } = render(<ScheduleTabs {...props} />);
    fireEvent.click(screen.getByLabelText("給食当番タブ"));
    expect(props.onSelectSchedule).toHaveBeenCalledWith("s2");
    unmount();
  });

  it("追加ボタンでonAddScheduleが呼ばれる", () => {
    const props = defaultProps();
    const { unmount } = render(<ScheduleTabs {...props} />);
    fireEvent.click(screen.getByLabelText("新しい当番表を追加"));
    expect(props.onAddSchedule).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("アクティブなタブが視覚的に区別される", () => {
    const { unmount } = render(<ScheduleTabs {...defaultProps()} />);
    const activeTab = screen.getByLabelText("掃除当番タブ");
    const inactiveTab = screen.getByLabelText("給食当番タブ");
    expect(activeTab).toHaveAttribute("aria-pressed", "true");
    expect(inactiveTab).toHaveAttribute("aria-pressed", "false");
    unmount();
  });
});
