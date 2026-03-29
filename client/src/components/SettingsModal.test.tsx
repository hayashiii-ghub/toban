import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SettingsModal } from "./SettingsModal";
import type { TaskGroup, Member } from "@shared/types";

vi.mock("framer-motion", () => {
  const React = require("react");
  const createMotionComponent = (tag: string) =>
    React.forwardRef((props: any, ref: any) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, layout, onAnimationComplete,
        ...rest
      } = props;
      return React.createElement(tag, { ref, ...rest });
    });
  return {
    motion: {
      div: createMotionComponent("div"),
      span: createMotionComponent("span"),
      button: createMotionComponent("button"),
      li: createMotionComponent("li"),
      ul: createMotionComponent("ul"),
      section: createMotionComponent("section"),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock("./settings/TaskGroupEditor", () => ({
  TaskGroupEditor: () => <div data-testid="task-group-editor" />,
}));
vi.mock("./settings/DesignThemePicker", () => ({
  DesignThemePicker: () => <div data-testid="design-theme-picker" />,
}));
vi.mock("./settings/RotationConfigEditor", () => ({
  RotationConfigEditor: () => <div data-testid="rotation-config-editor" />,
}));

const testGroups: TaskGroup[] = [
  { id: "g1", tasks: ["掃除"], emoji: "🧹" },
];

const testMembers: Member[] = [
  { id: "m1", name: "田中", color: "#F87171", bgColor: "#FEE2E2", textColor: "#991B1B" },
  { id: "m2", name: "鈴木", color: "#60A5FA", bgColor: "#DBEAFE", textColor: "#1E3A8A" },
];

const createProps = (overrides: Record<string, unknown> = {}) => ({
  scheduleName: "掃除当番",
  groups: testGroups,
  members: testMembers,
  rotationConfig: { mode: "manual" as const },
  pinned: false,
  assignmentMode: "member" as const,
  designThemeId: "whiteboard",
  canDelete: true,
  onSave: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

/** role="dialog" の中から要素を取得するヘルパー */
function queryDialog(container: HTMLElement) {
  const dialog = container.querySelector('[role="dialog"]')!;
  return {
    dialog,
    getByLabel: (label: string) =>
      dialog.querySelector(`[aria-label="${label}"]`) as HTMLElement,
    getByText: (text: string) =>
      Array.from(dialog.querySelectorAll("button")).find(
        (el) => el.textContent?.includes(text)
      ) as HTMLElement | undefined,
    queryByText: (text: string) =>
      Array.from(dialog.querySelectorAll("button")).find(
        (el) => el.textContent?.includes(text)
      ) ?? null,
  };
}

describe("SettingsModal", () => {
  it("初期値が表示される（スケジュール名がサマリーに含まれる）", () => {
    const { container } = render(<SettingsModal {...createProps()} />);
    expect(container.textContent).toContain("掃除当番");
  });

  it("閉じるボタンでonCloseが呼ばれる", () => {
    const props = createProps();
    const { container } = render(<SettingsModal {...props} />);
    const { getByLabel } = queryDialog(container);
    fireEvent.click(getByLabel("閉じる"));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("保存ボタンでonSaveが呼ばれる", () => {
    const props = createProps();
    const { container } = render(<SettingsModal {...props} />);
    const { getByText } = queryDialog(container);
    fireEvent.click(getByText("保存する")!);
    expect(props.onSave).toHaveBeenCalledOnce();
  });

  it("複製ボタンでonDuplicateが呼ばれる", () => {
    const props = createProps();
    const { container } = render(<SettingsModal {...props} />);
    const { getByText } = queryDialog(container);
    fireEvent.click(getByText("複製")!);
    expect(props.onDuplicate).toHaveBeenCalledOnce();
  });

  it("canDelete=false のとき削除ボタンが非表示", () => {
    const props = createProps({ canDelete: false });
    const { container } = render(<SettingsModal {...props} />);
    const { queryByText } = queryDialog(container);
    expect(queryByText("削除")).toBeNull();
  });
});
