import React from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, fireEvent, within } from "@testing-library/react";
import { LIMITS } from "@shared/limits";
import { SettingsModal } from "./SettingsModal";
import type { TaskGroup, Member } from "@shared/types";

afterEach(cleanup);

const testGroups: TaskGroup[] = [{ id: "g1", tasks: ["掃除"], emoji: "🧹" }];

const testMembers: Member[] = [
  {
    id: "m1",
    name: "田中",
    color: "#F87171",
    bgColor: "#FEE2E2",
    textColor: "#991B1B",
  },
  {
    id: "m2",
    name: "鈴木",
    color: "#60A5FA",
    bgColor: "#DBEAFE",
    textColor: "#1E3A8A",
  },
];

const createProps = (overrides: Record<string, unknown> = {}) => ({
  scheduleName: "掃除当番",
  groups: testGroups,
  members: testMembers,
  rotationConfig: { mode: "manual" as const },
  pinned: false,
  assignmentMode: "member" as const,
  designThemeId: "whiteboard",
  fontId: "handwriting" as const,
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
      Array.from(dialog.querySelectorAll("button")).find(el =>
        el.textContent?.includes(text)
      ) as HTMLElement | undefined,
    queryByText: (text: string) =>
      Array.from(dialog.querySelectorAll("button")).find(el =>
        el.textContent?.includes(text)
      ) ?? null,
  };
}

describe("SettingsModal", () => {
  it("最初に開く「名前と仕事」に、当番表の名前が入っている", () => {
    const { getByLabelText } = render(<SettingsModal {...createProps()} />);
    expect(getByLabelText("当番表の名前")).toHaveValue("掃除当番");
  });

  it("4 つの項目をタブで並べ、閉じなくても移れる。移っても書きかけは残る", () => {
    const { container } = render(<SettingsModal {...createProps()} />);
    const { getByRole, getByLabelText } = within(container);
    const tabs = ["名前と仕事", "交代のしかた", "見た目", "くわしい設定"].map(
      name => getByRole("tab", { name })
    );
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.change(getByLabelText("当番表の名前"), {
      target: { value: "書きかけ" },
    });
    fireEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    // 選んだ項目だけを出し、ほかは隠す
    expect(getByRole("tabpanel", { name: "見た目" })).not.toHaveAttribute(
      "hidden"
    );
    expect(
      getByLabelText("当番表の名前").closest("[role=tabpanel]")
    ).toHaveAttribute("hidden");

    // 矢印キーで隣の項目へ
    fireEvent.keyDown(tabs[2], { key: "ArrowRight" });
    expect(tabs[3]).toHaveAttribute("aria-selected", "true");
    expect(tabs[3]).toHaveFocus();
    fireEvent.keyDown(tabs[3], { key: "ArrowRight" });
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    expect(getByLabelText("当番表の名前")).toHaveValue("書きかけ");
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
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fontId: "handwriting" })
    );
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

  it("このアプリの案内は、書きかけを消さないよう新しいタブで開く", () => {
    const { container } = render(<SettingsModal {...createProps()} />);
    const links = within(
      queryDialog(container).dialog as HTMLElement
    ).getAllByRole("link", { hidden: true });
    expect(links.map(link => link.getAttribute("href"))).toEqual([
      "/about",
      "/privacy",
      "https://shigoto.dev/works/toban",
    ]);
    for (const link of links) expect(link).toHaveAttribute("target", "_blank");
  });

  it.each([
    [
      "タスク",
      {
        groups: [
          {
            id: "g1",
            tasks: Array.from(
              { length: LIMITS.tasksPerGroup + 1 },
              (_, index) => `仕事${index}`
            ),
            emoji: "🧹",
          },
        ],
      },
      `タスクは1グループ最大${LIMITS.tasksPerGroup}個までです。`,
    ],
    [
      "グループ",
      {
        groups: Array.from({ length: LIMITS.groups + 1 }, (_, index) => ({
          id: `g${index}`,
          tasks: ["掃除"],
          emoji: "🧹",
        })),
        assignmentMode: "task" as const,
      },
      `グループは最大${LIMITS.groups}個までです。`,
    ],
    [
      "メンバー",
      {
        members: Array.from({ length: LIMITS.members + 1 }, (_, index) => ({
          id: `m${index}`,
          name: `人${index}`,
          color: "#F87171",
          bgColor: "#FEE2E2",
          textColor: "#991B1B",
        })),
        assignmentMode: "task" as const,
      },
      `メンバーは最大${LIMITS.members}人までです。`,
    ],
  ] as const)(
    "%sが上限を超えると保存せず、日本語で知らせる",
    (_label, overrides, message) => {
      const props = createProps(overrides);
      const { container } = render(<SettingsModal {...props} />);
      fireEvent.click(queryDialog(container).getByText("保存する")!);
      expect(props.onSave).not.toHaveBeenCalled();
      const dialog = queryDialog(container).dialog as HTMLElement;
      expect(within(dialog).getByRole("alert")).toHaveTextContent(message);
      expect(within(dialog).queryByText(/Too big/)).toBeNull();
    }
  );

  // 保存内容がサーバの検証を通らないと、PUT が 400 になって同期が黙って止まる
  // （syncManager が 400 を破棄するため、画面上は正常に見えたまま）。
  describe("保存内容がサーバの検証を通ること", () => {
    const parseAsServer = async (payload: Record<string, unknown>) => {
      const { createScheduleSchema } =
        await import("../../../../server/schemas/schedule");
      return createScheduleSchema.safeParse({ ...payload, rotation: 0 });
    };

    it("絵文字が空のグループは既定の絵文字で保存される", async () => {
      const props = createProps({
        groups: [{ id: "g1", tasks: ["掃除"], emoji: "" }],
      });
      const { container } = render(<SettingsModal {...props} />);
      fireEvent.click(queryDialog(container).getByText("保存する")!);

      const saved = props.onSave.mock.calls[0][0];
      expect(saved.groups[0].emoji).not.toBe("");

      const parsed = await parseAsServer(saved);
      expect(parsed.success).toBe(true);
    });

    it("空白だけの絵文字も既定の絵文字に戻す", async () => {
      const props = createProps({
        groups: [{ id: "g1", tasks: ["掃除"], emoji: "   " }],
      });
      const { container } = render(<SettingsModal {...props} />);
      fireEvent.click(queryDialog(container).getByText("保存する")!);

      const parsed = await parseAsServer(props.onSave.mock.calls[0][0]);
      expect(parsed.success).toBe(true);
    });
  });
});
