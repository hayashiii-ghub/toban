import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@/test/vue";
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
  onSelectSchedule: vi.fn(),
  onAddSchedule: vi.fn(),
  onMoveTab: vi.fn(),
  onReorderTab: vi.fn(),
  onTogglePin: vi.fn(),
  onDuplicate: vi.fn(),
  onRequestDelete: vi.fn(),
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tab = (name: string) =>
  screen.getByRole("tab", { name: new RegExp(`^${name}タブ`) });

describe("ScheduleTabs", () => {
  it("スケジュール数分のタブが表示される", async () => {
    const { unmount } = render(<ScheduleTabs {...defaultProps()} />);
    expect(screen.getByText("掃除当番")).toBeInTheDocument();
    expect(screen.getByText("給食当番")).toBeInTheDocument();
    expect(screen.getByText("日直")).toBeInTheDocument();
    unmount();
  });

  it("タブクリックでonSelectScheduleが呼ばれる", async () => {
    const props = defaultProps();
    const { unmount } = render(<ScheduleTabs {...props} />);
    await fireEvent.click(
      screen.getByLabelText("給食当番タブ（Alt+矢印キーで並び替え）")
    );
    expect(props.onSelectSchedule).toHaveBeenCalledWith("s2");
    unmount();
  });

  it("追加ボタンでonAddScheduleが呼ばれる", async () => {
    const props = defaultProps();
    const { unmount } = render(<ScheduleTabs {...props} />);
    await fireEvent.click(screen.getByLabelText("新しい当番表を追加"));
    expect(props.onAddSchedule).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("アクティブなタブが視覚的に区別される", async () => {
    const { unmount } = render(<ScheduleTabs {...defaultProps()} />);
    const activeTab = screen.getByLabelText(
      "掃除当番タブ（Alt+矢印キーで並び替え）"
    );
    const inactiveTab = screen.getByLabelText(
      "給食当番タブ（Alt+矢印キーで並び替え）"
    );
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
    unmount();
  });

  it("Alt+右矢印でonReorderTabが呼ばれる", async () => {
    const props = defaultProps();
    const { unmount } = render(<ScheduleTabs {...props} />);
    const activeTab = screen.getByLabelText(
      "掃除当番タブ（Alt+矢印キーで並び替え）"
    );
    await fireEvent.keyDown(activeTab, { key: "ArrowRight", altKey: true });
    expect(props.onReorderTab).toHaveBeenCalledWith("s1", "right");
    unmount();
  });

  it("Alt+左矢印でonReorderTabが呼ばれる", async () => {
    const props = defaultProps();
    const { unmount } = render(
      <ScheduleTabs {...props} activeScheduleId="s2" />
    );
    const tab = screen.getByLabelText("給食当番タブ（Alt+矢印キーで並び替え）");
    await fireEvent.keyDown(tab, { key: "ArrowLeft", altKey: true });
    expect(props.onReorderTab).toHaveBeenCalledWith("s2", "left");
    unmount();
  });

  describe("タブの並べ替え", () => {
    // jsdom には elementFromPoint が無いので、指の下にあるタブを差し替えて動かす
    const dragTab = async (
      from: HTMLElement,
      to: HTMLElement,
      pointerType: "mouse" | "touch",
      beforeMove?: () => void | Promise<void>
    ) => {
      const original = document.elementFromPoint;
      document.elementFromPoint = () => to;
      const at = (x: number) => ({
        pointerId: 1,
        pointerType,
        clientX: x,
        clientY: 10,
      });
      await fireEvent.pointerDown(from, { ...at(200), button: 0 });
      await beforeMove?.();
      await fireEvent.pointerMove(from, at(20));
      await fireEvent.pointerUp(from, at(20));
      document.elementFromPoint = original;
    };

    it("マウスでタブを動かし、別のタブの上で離すと、その位置へ移す", async () => {
      const props = defaultProps();
      render(<ScheduleTabs {...props} />);
      await dragTab(tab("日直"), tab("掃除当番"), "mouse");
      expect(props.onMoveTab).toHaveBeenCalledWith("s3", "s1");
    });

    it("指では長押しでメニューが開き、そのまま動かすとメニューを閉じて動かせる", async () => {
      vi.useFakeTimers();
      const props = defaultProps();
      render(<ScheduleTabs {...props} />);
      await dragTab(tab("日直"), tab("掃除当番"), "touch", async () => {
        await act(() => vi.advanceTimersByTime(600));
        expect(screen.getByRole("menu")).toBeInTheDocument();
      });
      expect(screen.queryByRole("menu")).toBeNull();
      expect(props.onMoveTab).toHaveBeenCalledWith("s3", "s1");
    });

    it("指で長押しせずに動かすのはスクロールなので、並べ替えない", async () => {
      const props = defaultProps();
      render(<ScheduleTabs {...props} />);
      await dragTab(tab("日直"), tab("掃除当番"), "touch");
      expect(props.onMoveTab).not.toHaveBeenCalled();
    });

    it("ピン留めしたタブは動かせない", async () => {
      const props = defaultProps();
      render(
        <ScheduleTabs
          {...props}
          schedules={[
            makeSchedule("p1", "固定", true),
            makeSchedule("s1", "掃除当番"),
          ]}
        />
      );
      await dragTab(tab("固定"), tab("掃除当番"), "mouse");
      expect(props.onMoveTab).not.toHaveBeenCalled();
    });
  });

  describe("タブのメニュー", () => {
    it("右クリックでそのタブを選び、ピン留め・左右へ移動・複製・削除を出す", async () => {
      const props = defaultProps();
      render(<ScheduleTabs {...props} />);
      await fireEvent.contextMenu(tab("給食当番"));
      expect(props.onSelectSchedule).toHaveBeenCalledWith("s2");
      const menu = screen.getByRole("menu", { name: "「給食当番」の操作" });
      expect(
        within(menu)
          .getAllByRole("menuitem")
          .map(item => item.textContent)
      ).toEqual(["ピン留めする", "左へ移動", "右へ移動", "複製", "削除"]);
      expect(within(menu).getAllByRole("menuitem")[0]).toHaveFocus();
    });

    it("選んだ操作を、開いたタブに対して行う", async () => {
      const props = defaultProps();
      render(<ScheduleTabs {...props} />);
      await fireEvent.contextMenu(tab("給食当番"));
      await fireEvent.click(
        screen.getByRole("menuitem", { name: "ピン留めする" })
      );
      expect(props.onTogglePin).toHaveBeenCalledWith("s2");
      expect(screen.queryByRole("menu")).toBeNull();

      await fireEvent.contextMenu(tab("給食当番"));
      await fireEvent.click(screen.getByRole("menuitem", { name: "右へ移動" }));
      expect(props.onReorderTab).toHaveBeenCalledWith("s2", "right");

      await fireEvent.contextMenu(tab("給食当番"));
      await fireEvent.click(screen.getByRole("menuitem", { name: "複製" }));
      expect(props.onDuplicate).toHaveBeenCalledTimes(1);

      await fireEvent.contextMenu(tab("給食当番"));
      await fireEvent.click(screen.getByRole("menuitem", { name: "削除" }));
      expect(props.onRequestDelete).toHaveBeenCalledWith("s2");
    });

    it("端のタブは外側へ動かせず、ピン留めしたタブは並べ替えの項目を出さない", async () => {
      const props = defaultProps();
      render(
        <ScheduleTabs
          {...props}
          schedules={[
            makeSchedule("p1", "固定", true),
            makeSchedule("s1", "掃除当番"),
            makeSchedule("s2", "給食当番"),
          ]}
        />
      );
      await fireEvent.contextMenu(tab("掃除当番"));
      // 左隣はピン留めしたタブなので、左へは動かせない
      expect(screen.getByRole("menuitem", { name: "左へ移動" })).toBeDisabled();
      expect(screen.getByRole("menuitem", { name: "右へ移動" })).toBeEnabled();
      await fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

      await fireEvent.contextMenu(tab("固定"));
      expect(
        screen.getByRole("menuitem", { name: "ピン留めを外す" })
      ).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "左へ移動" })).toBeNull();
    });

    it("当番表が 1 つしかないときは削除を出さない", async () => {
      render(
        <ScheduleTabs
          {...defaultProps()}
          schedules={[makeSchedule("s1", "掃除当番")]}
        />
      );
      await fireEvent.contextMenu(tab("掃除当番"));
      expect(screen.queryByRole("menuitem", { name: "削除" })).toBeNull();
    });

    it("長押しで開き、途中で指が動いたら開かない", async () => {
      vi.useFakeTimers();
      const props = defaultProps();
      render(<ScheduleTabs {...props} />);
      const target = tab("日直");

      await fireEvent.pointerDown(target, {
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
      });
      await fireEvent.pointerMove(target, {
        pointerType: "touch",
        clientX: 40,
        clientY: 10,
      });
      await act(() => vi.advanceTimersByTime(600));
      expect(screen.queryByRole("menu")).toBeNull();

      await fireEvent.pointerDown(target, {
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
      });
      await act(() => vi.advanceTimersByTime(600));
      expect(
        screen.getByRole("menu", { name: "「日直」の操作" })
      ).toBeInTheDocument();
    });

    it("ダブルクリックと Shift+F10 でも開き、Esc で閉じるとタブに戻る", async () => {
      render(<ScheduleTabs {...defaultProps()} />);
      await fireEvent.doubleClick(tab("掃除当番"));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      await fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
      expect(screen.queryByRole("menu")).toBeNull();
      expect(tab("掃除当番")).toHaveFocus();

      await fireEvent.keyDown(tab("掃除当番"), { key: "F10", shiftKey: true });
      expect(screen.getByRole("menu")).toBeInTheDocument();
      await fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
      expect(screen.getByRole("menuitem", { name: "左へ移動" })).toBeDisabled();
      // 動かせない項目は飛ばす
      expect(screen.getByRole("menuitem", { name: "右へ移動" })).toHaveFocus();
    });

    it("メニューの外を押すと閉じる", async () => {
      render(<ScheduleTabs {...defaultProps()} />);
      await fireEvent.contextMenu(tab("掃除当番"));
      await fireEvent.pointerDown(document.body);
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });
});
