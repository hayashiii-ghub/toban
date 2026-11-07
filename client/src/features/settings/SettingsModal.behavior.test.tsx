import { defineComponent, shallowRef } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@/test/vue";
import { SettingsModal } from "./SettingsModal";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { createScheduleSchema } from "../../../../server/schemas/schedule";
type SettingsProps = InstanceType<typeof SettingsModal>["$props"];
type ExitAction = "close" | "duplicate" | "delete";
const exits = [
  ["close", "閉じる"],
  ["duplicate", "複製"],
  ["delete", "削除"],
] as const;
function createProps() {
  return {
    scheduleName: "掃除当番",
    groups: [
      { id: "g1", tasks: ["掃除"], emoji: "🧹" },
      { id: "g2", tasks: ["配膳"], emoji: "🍽️" },
    ],
    members: [
      {
        id: "m1",
        name: "田中",
        color: "#EF4444",
        bgColor: "#FEE2E2",
        textColor: "#7F1D1D",
      },
      {
        id: "m2",
        name: "鈴木",
        color: "#3B82F6",
        bgColor: "#DBEAFE",
        textColor: "#1E3A5F",
      },
    ],
    rotationConfig: { mode: "manual" as const },
    pinned: false,
    assignmentMode: "member" as const,
    designThemeId: "whiteboard",
    fontId: "handwriting" as const,
    canDelete: true,
    onSave: vi.fn<SettingsProps["onSave"]>(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  } satisfies SettingsProps;
}
function readRootAppearance() {
  const style = document.documentElement.style;
  return {
    page: style.getPropertyValue("--dt-page-bg"),
    card: style.getPropertyValue("--dt-card-bg"),
    toolbar: style.getPropertyValue("--dt-control-bar-bg"),
    texture: style.getPropertyValue("--dt-surface-texture"),
    font: style.getPropertyValue("--dt-font-family"),
    fontWeight: style.getPropertyValue("--dt-font-weight-bold"),
  };
}
function renderEditor(props = createProps()) {
  const view = render(
    <DesignThemeProvider themeId={props.designThemeId} fontId={props.fontId}>
      <SettingsModal {...props} />
    </DesignThemeProvider>
  );
  return { ...view, props, savedAppearance: readRootAppearance() };
}
type EditorView = ReturnType<typeof renderEditor>;
async function previewAppearance(view: Pick<EditorView, "getByRole">) {
  await fireEvent.click(view.getByRole("tab", { name: "見た目" }));
  await fireEvent.click(
    view.getByRole("button", { name: "こくばんテーマを選択" })
  );
  await fireEvent.click(
    view.getByRole("button", { name: "エレガントの文字を選択" })
  );
}
async function clickExit(
  view: Pick<EditorView, "getByRole">,
  action: ExitAction,
  label: string
) {
  if (action !== "close") {
    await fireEvent.click(view.getByRole("tab", { name: "くわしい設定" }));
  }
  await fireEvent.click(view.getByRole("button", { name: label }));
}
let originalRootStyle: string | null;
beforeEach(() => {
  originalRootStyle = document.documentElement.getAttribute("style");
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalRootStyle === null) {
    document.documentElement.removeAttribute("style");
  } else {
    document.documentElement.setAttribute("style", originalRootStyle);
  }
});
describe("SettingsModal の下書きと保存", () => {
  it.each([
    ["仕事", "掃除", "窓ふき"],
    ["名前", "田中", "高橋"],
  ])(
    "対になった行の%sを空にしても、ほかの行へ担当をずらして保存しない",
    async (_field, original, corrected) => {
      const view = renderEditor();
      const input = view.getByDisplayValue(original);
      await fireEvent.input(input, { target: { value: "   " } });
      await fireEvent.click(view.getByRole("button", { name: "保存する" }));
      expect(view.props.onSave).not.toHaveBeenCalled();
      await waitFor(() => expect(view.getByRole("alert")).toBeVisible());
      expect(input).toHaveValue("   ");
      expect(view.getByDisplayValue("配膳")).toHaveValue("配膳");
      expect(view.getByDisplayValue("鈴木")).toHaveValue("鈴木");
      await fireEvent.input(input, { target: { value: corrected } });
      await fireEvent.click(view.getByRole("button", { name: "保存する" }));
      expect(view.props.onSave).toHaveBeenCalledOnce();
      expect(view.queryByRole("alert")).not.toBeInTheDocument();
      const saved = view.props.onSave.mock.calls[0][0];
      expect(saved.groups).toEqual([
        {
          id: "g1",
          tasks: [original === "掃除" ? corrected : "掃除"],
          emoji: "🧹",
        },
        view.props.groups[1],
      ]);
      expect(saved.members).toEqual([
        {
          ...view.props.members[0],
          name: original === "田中" ? corrected : "田中",
        },
        view.props.members[1],
      ]);
      expect(
        createScheduleSchema.safeParse({ ...saved, rotation: 0 }).success
      ).toBe(true);
    }
  );
});
describe("SettingsModal の見た目プレビューを終了するとき", () => {
  it.each(exits)(
    "%sでは、親が編集画面を消す前に保存済みの色と文字に戻る",
    async (action, label) => {
      const props = createProps();
      const appearanceAtExit = vi.fn();
      const Parent = defineComponent(() => {
        const open = shallowRef(true);
        const exit = (next: ExitAction) => {
          appearanceAtExit(next, readRootAppearance());
          if (next === "close") props.onClose();
          else if (next === "duplicate") props.onDuplicate();
          else props.onDelete();
          open.value = false;
        };
        return () => (
          <DesignThemeProvider
            themeId={props.designThemeId}
            fontId={props.fontId}
          >
            {open.value && (
              <SettingsModal
                {...props}
                onClose={() => exit("close")}
                onDuplicate={() => exit("duplicate")}
                onDelete={() => exit("delete")}
              />
            )}
          </DesignThemeProvider>
        );
      });
      const view = render(<Parent />);
      const savedAppearance = readRootAppearance();
      await previewAppearance(view);
      expect(readRootAppearance().page).not.toBe(savedAppearance.page);
      expect(readRootAppearance().font).not.toBe(savedAppearance.font);
      await clickExit(view, action, label);
      expect(window.confirm).toHaveBeenCalledOnce();
      expect(appearanceAtExit).toHaveBeenCalledOnce();
      expect(appearanceAtExit).toHaveBeenCalledWith(action, savedAppearance);
      expect(view.queryByRole("dialog")).not.toBeInTheDocument();
      expect(readRootAppearance()).toEqual(savedAppearance);
      expect(props.onSave).not.toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalledTimes(action === "close" ? 1 : 0);
      expect(props.onDuplicate).toHaveBeenCalledTimes(
        action === "duplicate" ? 1 : 0
      );
      expect(props.onDelete).toHaveBeenCalledTimes(action === "delete" ? 1 : 0);
    }
  );
  it.each(exits)(
    "%sの確認を取り消すと、下書きとプレビューを残して終了しない",
    async (action, label) => {
      const view = renderEditor();
      await fireEvent.input(view.getByLabelText("当番表の名前"), {
        target: { value: "書きかけの当番表" },
      });
      await previewAppearance(view);
      const preview = readRootAppearance();
      vi.mocked(window.confirm).mockReturnValue(false);
      await clickExit(view, action, label);
      expect(window.confirm).toHaveBeenCalledOnce();
      expect(view.props.onClose).not.toHaveBeenCalled();
      expect(view.props.onDuplicate).not.toHaveBeenCalled();
      expect(view.props.onDelete).not.toHaveBeenCalled();
      expect(view.props.onSave).not.toHaveBeenCalled();
      expect(view.getByRole("dialog")).toBeInTheDocument();
      expect(view.getByLabelText("当番表の名前")).toHaveValue(
        "書きかけの当番表"
      );
      expect(readRootAppearance()).toEqual(preview);
      await fireEvent.click(view.getByRole("tab", { name: "見た目" }));
      expect(
        view.getByRole("button", { name: "こくばんテーマを選択" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        view.getByRole("button", { name: "エレガントの文字を選択" })
      ).toHaveAttribute("aria-pressed", "true");
    }
  );
});
