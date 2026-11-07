import { defineComponent, shallowRef } from "vue";
import { stateSetter } from "@/lib/vue";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@/test/vue";
import { LIMITS } from "@shared/limits";
import type { AssignmentMode, Member, TaskGroup } from "@/rotation/types";
import { TaskGroupEditor } from "./TaskGroupEditor";
afterEach(cleanup);
const member = (id: string, name: string): Member => ({
  id,
  name,
  color: "#3B82F6",
  bgColor: "#DBEAFE",
  textColor: "#1E3A5F",
});
const members = [member("m1", "あおい"), member("m2", "そら")];
const groups: TaskGroup[] = [
  { id: "g1", tasks: ["黒板"], emoji: "🧽" },
  { id: "g2", tasks: ["床はき"], emoji: "🧹" },
];
/** 親（SettingsModal）の代わりに状態を持ち、最新の値を外から読めるようにする */
function renderEditor(
  initial: {
    groups?: TaskGroup[];
    members?: Member[];
    assignmentMode?: AssignmentMode;
  } = {}
) {
  const latest = {
    groups: initial.groups ?? groups,
    members: initial.members ?? members,
    replaceGroups: (_: TaskGroup[]) => {},
  };
  const Harness = defineComponent(() => {
    const g = shallowRef(latest.groups);
    const m = shallowRef(latest.members);
    const setG = stateSetter(g);
    const setM = stateSetter(m);
    latest.replaceGroups = setG;
    return () => {
      latest.groups = g.value;
      latest.members = m.value;
      return (
        <TaskGroupEditor
          groups={g.value}
          members={m.value}
          onGroupsChange={setG}
          onMembersChange={setM}
          assignmentMode={initial.assignmentMode}
        />
      );
    };
  });
  render(<Harness />);
  return latest;
}
describe("TaskGroupEditor（担当者から見る）", () => {
  it("仕事より人が多いとき、余った人も「ほかのメンバー」に出て、名前を直したり外したりできる", async () => {
    const state = renderEditor({
      members: [...members, member("m3", "ひなた"), member("m4", "りく")],
    });
    const extra = screen.getByRole("region", { name: "ほかのメンバー" });
    expect(extra).toHaveTextContent(
      "仕事より人が2人多いので、毎回2人がお休みになります"
    );
    const names = extra.querySelectorAll("input");
    expect([...names].map(input => input.value)).toEqual(["ひなた", "りく"]);
    await fireEvent.input(names[0], { target: { value: "ひなた2" } });
    expect(state.members[2].name).toBe("ひなた2");
    await fireEvent.click(screen.getByRole("button", { name: "りくを外す" }));
    expect(state.members.map(m => m.name)).toEqual([
      "あおい",
      "そら",
      "ひなた2",
    ]);
    // 外しても仕事の数は変わらない
    expect(state.groups).toHaveLength(2);
  });
  it("担当者を追加すると、担当者とグループが対で増える", async () => {
    const state = renderEditor();
    await fireEvent.click(screen.getByRole("button", { name: "担当者を追加" }));
    expect(state.members).toHaveLength(3);
    expect(state.groups).toHaveLength(3);
  });
  it("グループを消すと対の担当者も消え、最後の1つは消せない", async () => {
    const state = renderEditor();
    await fireEvent.click(
      screen.getByRole("button", { name: "グループ1を削除" })
    );
    expect(state.groups.map(g => g.id)).toEqual(["g2"]);
    expect(state.members.map(m => m.name)).toEqual(["そら"]);
    expect(
      screen.getByRole("button", { name: "グループ1を削除" })
    ).toBeDisabled();
  });
  it("下に移動すると、グループと担当者の順番が一緒に入れ替わる", async () => {
    const state = renderEditor();
    await fireEvent.click(
      screen.getAllByRole("button", { name: "グループを下に移動" })[0]
    );
    expect(state.groups.map(g => g.id)).toEqual(["g2", "g1"]);
    expect(state.members.map(m => m.name)).toEqual(["そら", "あおい"]);
  });
  it("担当者の名前を書き換えられる", async () => {
    const state = renderEditor();
    await fireEvent.input(
      screen.getByRole("textbox", { name: "担当者2の名前" }),
      {
        target: { value: "そらまめ" },
      }
    );
    expect(state.members.map(m => m.name)).toEqual(["あおい", "そらまめ"]);
  });
  it("担当者が上限に達していると、担当者もグループも増やさない", async () => {
    const full = Array.from({ length: LIMITS.members }, (_, i) =>
      member(`m${i}`, `メンバー${i}`)
    );
    const state = renderEditor({ members: full });
    await fireEvent.click(screen.getByRole("button", { name: "担当者を追加" }));
    expect(state.members).toHaveLength(LIMITS.members);
    expect(state.groups).toHaveLength(2);
  });
});
describe("TaskGroupEditor（タスクから見る）", () => {
  it("グループを消しても担当者は残る", async () => {
    const state = renderEditor({ assignmentMode: "task" });
    await fireEvent.click(
      screen.getByRole("button", { name: "グループ2を削除" })
    );
    expect(state.groups.map(g => g.id)).toEqual(["g1"]);
    expect(state.members).toHaveLength(2);
  });
  it("担当者をえらぶ → 1人外す → 全員にもどす で、グループ専用の担当者が切り替わる", async () => {
    const state = renderEditor({ assignmentMode: "task" });
    await fireEvent.click(
      screen.getAllByRole("button", { name: "担当者をえらぶ" })[0]
    );
    expect(state.groups[0].memberIds).toEqual(["m1", "m2"]);
    await fireEvent.click(screen.getByRole("button", { name: "あおいを除外" }));
    expect(state.groups[0].memberIds).toEqual(["m2"]);
    // 担当者が0人のグループは作れない
    expect(screen.getByRole("button", { name: "そらを除外" })).toBeDisabled();
    await fireEvent.click(screen.getByRole("button", { name: "全員にもどす" }));
    expect(state.groups[0].memberIds).toBeUndefined();
  });
  it("仕事の名前を書き換えられる", async () => {
    const state = renderEditor({ assignmentMode: "task" });
    await fireEvent.input(
      screen.getByRole("textbox", { name: "タスク1の名前" }),
      {
        target: { value: "黒板けし" },
      }
    );
    expect(state.groups[0].tasks).toEqual(["黒板けし"]);
  });
});
// 並べ替えは、つまむ印を pointer で動かす（usePointerDrag）。jsdom には elementFromPoint が無いので、
// 指の下にあるものを to に差し替えてから、印を押して動かして離す
async function drag(
  from: Element,
  to: Element,
  whileDragging?: () => void | Promise<void>
) {
  const grip = from
    .closest("[data-drag-item]")!
    .querySelector("[data-drag-grip]")!;
  const original = document.elementFromPoint;
  document.elementFromPoint = () => to;
  const at = (y: number) => ({ pointerId: 1, clientX: 10, clientY: y });
  try {
    await fireEvent.pointerDown(grip, {
      ...at(0),
      pointerType: "mouse",
      button: 0,
    });
    await fireEvent.pointerMove(grip, at(40));
    await whileDragging?.();
    await fireEvent.pointerUp(grip, at(40));
  } finally {
    document.elementFromPoint = original;
  }
}
describe("TaskGroupEditor のドラッグ", () => {
  it("仕事を別のグループの行に落とすと、その位置へ移る", async () => {
    const state = renderEditor({
      groups: [
        { id: "g1", tasks: ["黒板", "窓"], emoji: "🧽" },
        { id: "g2", tasks: ["床はき"], emoji: "🧹" },
      ],
    });
    await drag(
      screen.getByRole("textbox", { name: "グループ1のタスク1" }),
      screen.getByRole("textbox", { name: "グループ2のタスク1" })
    );
    expect(state.groups.map(g => g.tasks)).toEqual([
      ["窓"],
      ["黒板", "床はき"],
    ]);
  });
  it.each(["行", "余白"] as const)(
    "上限に達したグループの%sには落とす印を出さず、仕事を移さない",
    async targetKind => {
      const fullTasks = Array.from(
        { length: LIMITS.tasksPerGroup },
        (_, i) => `仕事${i + 1}`
      );
      const initialGroups = [
        { id: "g1", tasks: ["黒板"], emoji: "🧽" },
        { id: "g2", tasks: fullTasks, emoji: "🧹" },
      ];
      const state = renderEditor({ groups: initialGroups });
      const row = screen
        .getByRole("textbox", { name: "グループ2のタスク1" })
        .closest("[data-drop-task]")!;
      const target =
        targetKind === "行" ? row : row.closest("[data-drop-zone]")!;
      await drag(
        screen.getByRole("textbox", { name: "グループ1のタスク1" }),
        target,
        () => expect(target.querySelector(".absolute")).toBeNull()
      );
      // 移動元の最後の仕事も失わず、両方のグループをそのまま残す。
      expect(state.groups).toEqual(initialGroups);
    }
  );
  it("指を離す直前に移動先が上限になっても、移動元の仕事を抜かない", async () => {
    const destinationTasks = Array.from(
      { length: LIMITS.tasksPerGroup - 1 },
      (_, i) => `仕事${i + 1}`
    );
    const state = renderEditor({
      groups: [
        { id: "g1", tasks: ["黒板"], emoji: "🧽" },
        { id: "g2", tasks: destinationTasks, emoji: "🧹" },
      ],
    });
    const target = screen.getByRole("textbox", {
      name: "グループ2のタスク1",
    });
    const fullGroups = [
      state.groups[0],
      { ...state.groups[1], tasks: [...destinationTasks, "追加した仕事"] },
    ];
    await drag(
      screen.getByRole("textbox", { name: "グループ1のタスク1" }),
      target,
      async () => {
        expect(
          target.closest("[data-drop-task]")!.querySelector(".absolute")
        ).not.toBeNull();
        await act(() => state.replaceGroups(fullGroups));
      }
    );
    expect(state.groups).toEqual(fullGroups);
  });
  it("上限に達していても、同じグループ内の仕事は並べ替えられる", async () => {
    const fullTasks = Array.from(
      { length: LIMITS.tasksPerGroup },
      (_, i) => `仕事${i + 1}`
    );
    const state = renderEditor({
      groups: [{ id: "g1", tasks: fullTasks, emoji: "🧽" }],
    });
    await drag(
      screen.getByRole("textbox", { name: "グループ1のタスク1" }),
      screen.getByRole("textbox", {
        name: `グループ1のタスク${LIMITS.tasksPerGroup}`,
      })
    );
    expect(state.groups[0].tasks).toEqual([
      ...fullTasks.slice(1),
      fullTasks[0],
    ]);
  });
  it("グループを並べ替えると、担当者の順番も一緒に動く", async () => {
    const state = renderEditor();
    const header = (n: number) =>
      screen.getByRole("textbox", { name: `担当者${n}の名前` });
    // 見出しの印でグループ全体を動かし、2 つ目のグループの上に落とす
    await drag(header(1).closest("[data-drop-group]")!, header(2));
    expect(state.groups.map(g => g.id)).toEqual(["g2", "g1"]);
    expect(state.members.map(m => m.name)).toEqual(["そら", "あおい"]);
  });
  it("タスクモードでは、グループの中で担当者を並べ替えられる", async () => {
    const state = renderEditor({
      assignmentMode: "task",
      groups: [
        { id: "g1", tasks: ["黒板"], emoji: "🧽", memberIds: ["m1", "m2"] },
        { id: "g2", tasks: ["床はき"], emoji: "🧹" },
      ],
    });
    const [aoi, sora] = screen.getAllByRole("textbox", {
      name: "メンバーの名前",
    });
    await drag(aoi, sora);
    expect(state.groups[0].memberIds).toEqual(["m2", "m1"]);
  });
});
