import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { buildTobanTools, useTobanTools } from "./useTobanTools";
import type { useHomeState } from "@/hooks/useHomeState";
import type { ScheduleSettings } from "@/hooks/useScheduleManager";
import { LIMITS } from "@shared/limits";
import type { Assignment, Member, Schedule, TaskGroup } from "@/rotation/types";
import type { ViewTabValue } from "@/features/home/viewTabsConfig";

type HomeState = ReturnType<typeof useHomeState>;

const member = (id: string, name: string): Member => ({
  id,
  name,
  color: "#3B82F6",
  bgColor: "#DBEAFE",
  textColor: "#1E3A5F",
});

const group = (id: string, emoji: string, tasks: string[]): TaskGroup => ({
  id,
  emoji,
  tasks,
});

const sched = (over: Partial<Schedule> = {}): Schedule => ({
  id: "s1",
  name: "掃除当番",
  rotation: 0,
  groups: [group("g1", "🧹", ["床そうじ"])],
  members: [member("m1", "佐藤")],
  ...over,
});

function makeGet(over: Partial<HomeState> = {}): () => HomeState {
  const schedules = over.state?.schedules ?? [sched()];
  const active = "activeSchedule" in over ? over.activeSchedule : schedules[0];
  const base = {
    state: { schedules, activeScheduleId: active?.id ?? "" },
    activeSchedule: active,
    assignments: [] as Assignment[],
    effectiveRotation: 0,
    groups: active?.groups ?? [],
    members: active?.members ?? [],
    ...over,
  } as unknown as HomeState;
  return () => base;
}

const toolNamed = (name: string, get: () => HomeState): WebMCPTool => {
  const found = buildTobanTools(get).find(t => t.name === name);
  if (!found) throw new Error(`tool not found: ${name}`);
  return found;
};

describe("list_schedules", () => {
  it("全当番表の名前・メンバー数・グループ数を返し、表示中を明示する", async () => {
    const a = sched({
      id: "s1",
      name: "掃除当番",
      members: [member("m1", "佐藤")],
    });
    const b = sched({
      id: "s2",
      name: "給食当番",
      members: [
        member("m1", "佐藤"),
        member("m2", "鈴木"),
        member("m3", "高橋"),
      ],
      groups: [group("g1", "🍚", ["配膳"]), group("g2", "🧽", ["片付け"])],
    });
    const get = makeGet({
      state: { schedules: [a, b], activeScheduleId: "s2" },
      activeSchedule: b,
    });

    const text = (await toolNamed("list_schedules", get).execute({})).content[0]
      .text;

    expect(text).toContain("掃除当番");
    expect(text).toContain("給食当番（表示中）");
    expect(text).toContain("メンバー3人");
    expect(text).toContain("グループ2組");
  });

  it("read-only であることを annotations で宣言する", () => {
    expect(
      toolNamed("list_schedules", makeGet()).annotations?.readOnlyHint
    ).toBe(true);
  });
});

describe("get_current_assignments", () => {
  it("グループと担当メンバーの対応と回転ラベルを返す", async () => {
    const a = sched({
      name: "掃除当番",
      groups: [
        group("g1", "🧹", ["床そうじ"]),
        group("g2", "🚮", ["ゴミ出し"]),
      ],
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    const assignments: Assignment[] = [
      { group: a.groups[0], member: a.members[0] },
      { group: a.groups[1], member: a.members[1] },
    ];
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      assignments,
      effectiveRotation: 2,
    });

    const text = (await toolNamed("get_current_assignments", get).execute({}))
      .content[0].text;

    expect(text).toContain("掃除当番");
    expect(text).toContain("2回目");
    expect(text).toContain("床そうじ → 佐藤");
    expect(text).toContain("ゴミ出し → 鈴木");
  });

  it("回転 0 は初期と表示する", async () => {
    const a = sched();
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      assignments: [{ group: a.groups[0], member: a.members[0] }],
      effectiveRotation: 0,
    });
    const text = (await toolNamed("get_current_assignments", get).execute({}))
      .content[0].text;
    expect(text).toContain("初期");
  });

  it("当番表が無いときはその旨を返す", async () => {
    const get = makeGet({
      state: { schedules: [], activeScheduleId: "" },
      activeSchedule: undefined,
    });
    const text = (await toolNamed("get_current_assignments", get).execute({}))
      .content[0].text;
    expect(text).toContain("ありません");
  });
});

describe("get_schedule_details", () => {
  it("メンバー・グループ・回転モードを返す", async () => {
    const a = sched({
      name: "掃除当番",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
      groups: [group("g1", "🧹", ["床", "窓"])],
      rotationConfig: { mode: "date", startDate: "2026-01-01", cycleDays: 7 },
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (await toolNamed("get_schedule_details", get).execute({}))
      .content[0].text;

    expect(text).toContain("佐藤");
    expect(text).toContain("鈴木");
    expect(text).toContain("床");
    expect(text).toContain("窓");
    expect(text).toContain("日付");
  });

  it("manual モードは手動と表示する", async () => {
    const a = sched({ rotationConfig: { mode: "manual" } });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });
    const text = (await toolNamed("get_schedule_details", get).execute({}))
      .content[0].text;
    expect(text).toContain("手動");
  });
});

describe("switch_schedule", () => {
  it("名前が一致する当番表に切り替える", async () => {
    const a = sched({ id: "s1", name: "掃除当番" });
    const b = sched({ id: "s2", name: "給食当番" });
    let switched: string | null = null;
    const get = makeGet({
      state: { schedules: [a, b], activeScheduleId: "s1" },
      activeSchedule: a,
      selectSchedule: (id: string) => {
        switched = id;
      },
    });

    const text = (
      await toolNamed("switch_schedule", get).execute({ name: "給食当番" })
    ).content[0].text;

    expect(switched).toBe("s2");
    expect(text).toContain("給食当番");
  });

  it("一致しない名前は切り替えず候補を添えて返す", async () => {
    const a = sched({ id: "s1", name: "掃除当番" });
    let switched: string | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: "s1" },
      activeSchedule: a,
      selectSchedule: (id: string) => {
        switched = id;
      },
    });

    const text = (
      await toolNamed("switch_schedule", get).execute({ name: "存在しない表" })
    ).content[0].text;

    expect(switched).toBeNull();
    expect(text).toContain("掃除当番");
  });
});

describe("advance_rotation", () => {
  it("manual モードでは指定方向に回転する", async () => {
    const a = sched({ rotationConfig: { mode: "manual" } });
    let dir: string | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      handleRotate: (d: "forward" | "backward") => {
        dir = d;
      },
    });

    const text = (
      await toolNamed("advance_rotation", get).execute({ direction: "forward" })
    ).content[0].text;

    expect(dir).toBe("forward");
    expect(text).toContain("進め");
  });

  it("date モードでは回転せず日付管理であることを伝える", async () => {
    const a = sched({
      rotationConfig: { mode: "date", startDate: "2026-01-01", cycleDays: 7 },
    });
    let dir: string | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      handleRotate: (d: "forward" | "backward") => {
        dir = d;
      },
    });

    const text = (
      await toolNamed("advance_rotation", get).execute({ direction: "forward" })
    ).content[0].text;

    expect(dir).toBeNull();
    expect(text).toContain("日付");
  });

  it("不正な direction はエラーを返す", async () => {
    const a = sched({ rotationConfig: { mode: "manual" } });
    let dir: string | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      handleRotate: (d: "forward" | "backward") => {
        dir = d;
      },
    });

    const text = (
      await toolNamed("advance_rotation", get).execute({
        direction: "sideways",
      })
    ).content[0].text;

    expect(dir).toBeNull();
    expect(text).toMatch(/forward|backward/);
  });
});

describe("change_view", () => {
  it("有効なビューに切り替える", async () => {
    let view: string | null = null;
    const get = makeGet({
      changeTab: (t: ViewTabValue) => {
        view = t;
      },
    });

    const text = (
      await toolNamed("change_view", get).execute({ view: "calendar" })
    ).content[0].text;

    expect(view).toBe("calendar");
    expect(text).toContain("カレンダー");
  });

  it("disc（円盤）に切り替えられる", async () => {
    let view: string | null = null;
    const get = makeGet({
      changeTab: (t: "cards" | "table" | "calendar" | "disc") => {
        view = t;
      },
    });

    const text = (await toolNamed("change_view", get).execute({ view: "disc" }))
      .content[0].text;

    expect(view).toBe("disc");
    expect(text).toContain("円盤");
  });

  it("無効なビューは切り替えずエラーを返す", async () => {
    let view: string | null = null;
    const get = makeGet({
      changeTab: (t: ViewTabValue) => {
        view = t;
      },
    });

    const text = (
      await toolNamed("change_view", get).execute({ view: "timeline" })
    ).content[0].text;

    expect(view).toBeNull();
    expect(text).toMatch(/cards|table|calendar/);
  });
});

describe("create_schedule", () => {
  it("テンプレート名から新しい当番表を作る", async () => {
    let created: { name: string } | null = null;
    const get = makeGet({
      onAddSchedule: (t: { name: string }) => {
        created = t;
      },
    });

    const text = (
      await toolNamed("create_schedule", get).execute({ template: "給食当番" })
    ).content[0].text;

    // created はコールバック内で代入されるが、TS の制御フロー解析はそれを追えず
    // null に絞り込む。宣言時の型へ戻して読む
    expect((created as { name: string } | null)?.name).toBe("給食当番");
    expect(text).toContain("給食当番");
  });

  it("未知のテンプレートは作らず候補を添えて返す", async () => {
    let created: { name: string } | null = null;
    const get = makeGet({
      onAddSchedule: (t: { name: string }) => {
        created = t;
      },
    });

    const text = (
      await toolNamed("create_schedule", get).execute({
        template: "絶対に存在しない名前",
      })
    ).content[0].text;

    expect(created).toBeNull();
    expect(text).toContain("給食当番");
  });
});

describe("add_member", () => {
  it("名前を指定してメンバーを追加する（色は preset 割当）", async () => {
    const a = sched({
      name: "掃除当番",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });

    const text = (await toolNamed("add_member", get).execute({ name: "田中" }))
      .content[0].text;

    expect(text).toContain("田中");
    const members = saved!.members;
    expect(members.map(m => m.name)).toEqual(["佐藤", "鈴木", "田中"]);
    const added = members[2];
    expect(added.color).toBeTruthy();
    expect(added.bgColor).toBeTruthy();
    expect(added.textColor).toBeTruthy();
    expect(saved!.name).toBe("掃除当番");
  });

  it("member モード（担当者ごと）では対応するグループも同時に追加する", async () => {
    const a = sched({
      assignmentMode: "member",
      members: [member("m1", "佐藤")],
      groups: [group("g1", "🧹", ["床そうじ"])],
    });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });

    await toolNamed("add_member", get).execute({ name: "田中" });

    expect(saved!.members.map(m => m.name)).toEqual(["佐藤", "田中"]);
    expect(saved!.groups).toHaveLength(2);
  });
});

describe("add_member のメンバー数上限", () => {
  it("上限人数に達していると追加せず上限を伝えるエラーを返す", async () => {
    const full = Array.from({ length: LIMITS.members }, (_, i) =>
      member(`m${i}`, `名前${i}`)
    );
    const a = sched({ members: full });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });

    const text = (await toolNamed("add_member", get).execute({ name: "田中" }))
      .content[0].text;

    expect(saved).toBeNull();
    expect(text).toContain(`${LIMITS.members}人`);
  });
});

describe("保存系 name フィールドの文字数上限", () => {
  const setup = () => {
    const a = sched({
      name: "掃除当番",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });
    return { get, getSaved: () => saved };
  };

  it("上限文字数超の名前は保存せず上限を伝えるエラーを返し、上限ちょうどは通る", async () => {
    const over = "あ".repeat(LIMITS.memberName + 1);
    const exact = "い".repeat(LIMITS.memberName);

    // add_member: 51文字 → 保存されず上限エラー
    {
      const { get, getSaved } = setup();
      const text = (await toolNamed("add_member", get).execute({ name: over }))
        .content[0].text;
      expect(getSaved()).toBeNull();
      expect(text).toContain(`文字以内`);
    }
    // add_member: 50文字ちょうど → 通る
    {
      const { get, getSaved } = setup();
      await toolNamed("add_member", get).execute({ name: exact });
      expect(getSaved()!.members.map(m => m.name)).toContain(exact);
    }
    // update_member: new_name 51文字 → 保存されず上限エラー
    {
      const { get, getSaved } = setup();
      const text = (
        await toolNamed("update_member", get).execute({
          name: "佐藤",
          new_name: over,
        })
      ).content[0].text;
      expect(getSaved()).toBeNull();
      expect(text).toContain(`文字以内`);
    }
    // update_schedule: name 51文字 → 保存されず上限エラー
    {
      const { get, getSaved } = setup();
      const text = (
        await toolNamed("update_schedule", get).execute({ name: over })
      ).content[0].text;
      expect(getSaved()).toBeNull();
      expect(text).toContain(`文字以内`);
    }
  });
});

describe("remove_member", () => {
  it("名前一致のメンバーを削除し group.memberIds からも除去する", async () => {
    const a = sched({
      assignmentMode: "task",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
      groups: [
        { id: "g1", emoji: "🧹", tasks: ["床"], memberIds: ["m1", "m2"] },
      ],
    });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });

    const text = (
      await toolNamed("remove_member", get).execute({ name: "鈴木" })
    ).content[0].text;

    expect(text).toContain("鈴木");
    expect(saved!.members.map(m => m.name)).toEqual(["佐藤"]);
    expect(saved!.groups[0].memberIds).toEqual(["m1"]);
  });

  it("最後の1人は削除できない", async () => {
    const a = sched({ members: [member("m1", "佐藤")] });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });

    const text = (
      await toolNamed("remove_member", get).execute({ name: "佐藤" })
    ).content[0].text;

    expect(saved).toBeNull();
    expect(text).toMatch(/最後|削除できません/);
  });

  it("該当しない名前は候補付きで知らせる", async () => {
    const a = sched({ members: [member("m1", "佐藤"), member("m2", "鈴木")] });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });

    const text = (
      await toolNamed("remove_member", get).execute({ name: "田中" })
    ).content[0].text;

    expect(saved).toBeNull();
    expect(text).toContain("佐藤");
  });

  it("member モード（担当者ごと）では対応するグループも同時に削除する", async () => {
    const a = sched({
      assignmentMode: "member",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
      groups: [group("g1", "🧹", ["床そうじ"]), group("g2", "🍚", ["配膳"])],
    });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });

    await toolNamed("remove_member", get).execute({ name: "佐藤" });

    expect(saved!.members.map(m => m.name)).toEqual(["鈴木"]);
    expect(saved!.groups.map(g => g.id)).toEqual(["g2"]);
  });
});

describe("set_rotation", () => {
  it("回転を指定の回数に設定する", async () => {
    const a = sched({
      rotationConfig: { mode: "manual" },
      members: [
        member("m1", "佐藤"),
        member("m2", "鈴木"),
        member("m3", "高橋"),
      ],
    });
    let updater: ((s: Schedule) => Schedule) | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      updateActiveSchedule: (fn: (s: Schedule) => Schedule) => {
        updater = fn;
      },
    });

    const text = (await toolNamed("set_rotation", get).execute({ rotation: 2 }))
      .content[0].text;

    expect(updater).not.toBeNull();
    expect(updater!(a).rotation).toBe(2);
    expect(text).toContain("2回目");
  });

  it("メンバー数で正規化する", async () => {
    const a = sched({
      rotationConfig: { mode: "manual" },
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    let updater: ((s: Schedule) => Schedule) | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      updateActiveSchedule: (fn: (s: Schedule) => Schedule) => {
        updater = fn;
      },
    });

    await toolNamed("set_rotation", get).execute({ rotation: 5 });

    expect(updater!(a).rotation).toBe(1);
  });

  it("date モードでは設定せず日付管理を伝える", async () => {
    const a = sched({
      rotationConfig: { mode: "date", startDate: "2026-01-01", cycleDays: 7 },
    });
    let updater: ((s: Schedule) => Schedule) | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      updateActiveSchedule: (fn: (s: Schedule) => Schedule) => {
        updater = fn;
      },
    });

    const text = (await toolNamed("set_rotation", get).execute({ rotation: 2 }))
      .content[0].text;

    expect(updater).toBeNull();
    expect(text).toContain("日付");
  });

  it("負の数や非整数は拒否する", async () => {
    const a = sched({ rotationConfig: { mode: "manual" } });
    let updater: ((s: Schedule) => Schedule) | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      updateActiveSchedule: (fn: (s: Schedule) => Schedule) => {
        updater = fn;
      },
    });

    const text = (
      await toolNamed("set_rotation", get).execute({ rotation: -1 })
    ).content[0].text;

    expect(updater).toBeNull();
    expect(text).toMatch(/0以上|整数/);
  });
});

describe("print_schedule", () => {
  it("現在の表示形式で印刷ダイアログを開く", async () => {
    let printed: string | null = null;
    const get = makeGet({
      viewTab: "calendar",
      handlePrint: (v: string) => {
        printed = v;
      },
    });

    const text = (await toolNamed("print_schedule", get).execute({})).content[0]
      .text;

    expect(printed).toBe("calendar");
    expect(text).toContain("印刷");
  });
});

describe("get_share_link", () => {
  it("共有済みなら共有 URL を返す", async () => {
    const a = sched({ slug: "abc123" });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (await toolNamed("get_share_link", get).execute({})).content[0]
      .text;

    expect(text).toContain("/s/abc123");
  });

  it("未共有なら共有方法を案内する", async () => {
    const a = sched({});
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (await toolNamed("get_share_link", get).execute({})).content[0]
      .text;

    expect(text).toContain("共有");
    expect(text).not.toContain("/s/");
  });

  it("read-only を宣言する", () => {
    expect(
      toolNamed("get_share_link", makeGet()).annotations?.readOnlyHint
    ).toBe(true);
  });
});

describe("update_schedule", () => {
  const setup = () => {
    const a = sched({
      name: "掃除当番",
      assignmentMode: "member",
      pinned: false,
    });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });
    return { a, get, getSaved: () => saved };
  };

  it("名前を変更し他は保持する", async () => {
    const { get, getSaved } = setup();
    const text = (
      await toolNamed("update_schedule", get).execute({ name: "新・掃除当番" })
    ).content[0].text;
    expect(getSaved()!.name).toBe("新・掃除当番");
    expect(getSaved()!.assignmentMode).toBe("member");
    expect(text).toContain("新・掃除当番");
  });

  it("担当者⇄タスクモードを切り替える", async () => {
    const { get, getSaved } = setup();
    await toolNamed("update_schedule", get).execute({
      assignment_mode: "task",
    });
    expect(getSaved()!.assignmentMode).toBe("task");
    expect(getSaved()!.name).toBe("掃除当番");
  });

  it("ピン留めを設定する", async () => {
    const { get, getSaved } = setup();
    await toolNamed("update_schedule", get).execute({ pinned: true });
    expect(getSaved()!.pinned).toBe(true);
  });

  it("何も指定しないとエラー", async () => {
    const { get, getSaved } = setup();
    const text = (await toolNamed("update_schedule", get).execute({}))
      .content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toMatch(/指定/);
  });

  it("不正な assignment_mode はエラー", async () => {
    const { get, getSaved } = setup();
    const text = (
      await toolNamed("update_schedule", get).execute({ assignment_mode: "x" })
    ).content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toMatch(/member|task/);
  });
});

describe("update_member", () => {
  const setup = () => {
    const a = sched({ members: [member("m1", "佐藤"), member("m2", "鈴木")] });
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });
    return { a, get, getSaved: () => saved };
  };

  it("メンバーを休みにする", async () => {
    const { get, getSaved } = setup();
    await toolNamed("update_member", get).execute({ name: "佐藤", skip: true });
    const m = getSaved()!.members.find(x => x.name === "佐藤");
    expect(m?.skipped).toBe(true);
  });

  it("メンバーを改名する", async () => {
    const { get, getSaved } = setup();
    await toolNamed("update_member", get).execute({
      name: "佐藤",
      new_name: "佐藤太郎",
    });
    const names = getSaved()!.members.map(x => x.name);
    expect(names).toContain("佐藤太郎");
    expect(names).not.toContain("佐藤");
  });

  it("該当しない名前は候補付きエラー", async () => {
    const { get, getSaved } = setup();
    const text = (
      await toolNamed("update_member", get).execute({
        name: "田中",
        skip: true,
      })
    ).content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toContain("佐藤");
  });

  it("変更内容がなければエラー", async () => {
    const { get, getSaved } = setup();
    const text = (
      await toolNamed("update_member", get).execute({ name: "佐藤" })
    ).content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toMatch(/変更|指定/);
  });
});

describe("configure_rotation", () => {
  const setup = (
    rotationConfig?: import("@/rotation/types").RotationConfig
  ) => {
    const a = sched(rotationConfig ? { rotationConfig } : {});
    let saved: ScheduleSettings | null = null;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onSaveSettings: ((settings: ScheduleSettings) => {
        saved = settings;
      }) as HomeState["onSaveSettings"],
    });
    return { a, get, getSaved: () => saved };
  };

  it("日付モードに設定する", async () => {
    const { get, getSaved } = setup({ mode: "manual" });
    await toolNamed("configure_rotation", get).execute({
      mode: "date",
      start_date: "2026-04-01",
      cycle_days: 7,
    });
    const rc = getSaved()!.rotationConfig!;
    expect(rc.mode).toBe("date");
    expect(rc.startDate).toBe("2026-04-01");
    expect(rc.cycleDays).toBe(7);
  });

  it("日付モードで開始日/周期が無ければエラー", async () => {
    const { get, getSaved } = setup({ mode: "manual" });
    const text = (
      await toolNamed("configure_rotation", get).execute({ mode: "date" })
    ).content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toMatch(/開始日|周期/);
  });

  it("手動モードに戻す", async () => {
    const { get, getSaved } = setup({
      mode: "date",
      startDate: "2026-01-01",
      cycleDays: 7,
    });
    await toolNamed("configure_rotation", get).execute({ mode: "manual" });
    expect(getSaved()!.rotationConfig!.mode).toBe("manual");
  });

  it("既存の日付設定に土曜スキップをマージする", async () => {
    const { get, getSaved } = setup({
      mode: "date",
      startDate: "2026-01-01",
      cycleDays: 7,
    });
    await toolNamed("configure_rotation", get).execute({ skip_saturday: true });
    const rc = getSaved()!.rotationConfig!;
    expect(rc.skipSaturday).toBe(true);
    expect(rc.mode).toBe("date");
    expect(rc.startDate).toBe("2026-01-01");
  });

  it("cycle_days が非整数や0以下はエラー", async () => {
    const { get, getSaved } = setup({ mode: "manual" });
    // 1.5 は date guard をすり抜けるため、cycle 検証行そのものを verify できる
    const text = (
      await toolNamed("configure_rotation", get).execute({
        mode: "date",
        start_date: "2026-04-01",
        cycle_days: 1.5,
      })
    ).content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toMatch(/周期|cycle/);
  });

  it("start_date の形式が不正ならエラー", async () => {
    const { get, getSaved } = setup({ mode: "manual" });
    const text = (
      await toolNamed("configure_rotation", get).execute({
        mode: "date",
        start_date: "2026/04/01",
        cycle_days: 7,
      })
    ).content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toMatch(/開始日|日付|YYYY/);
  });

  it("何も指定しないとエラー", async () => {
    const { get, getSaved } = setup({ mode: "manual" });
    const text = (await toolNamed("configure_rotation", get).execute({}))
      .content[0].text;
    expect(getSaved()).toBeNull();
    expect(text).toMatch(/指定/);
  });
});

describe("duplicate_schedule", () => {
  it("表示中の当番表を複製する", async () => {
    const a = sched({ name: "掃除当番" });
    let dup = false;
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
      onDuplicateSchedule: () => {
        dup = true;
      },
    });
    const text = (await toolNamed("duplicate_schedule", get).execute({}))
      .content[0].text;
    expect(dup).toBe(true);
    expect(text).toContain("複製");
  });
});

describe("useTobanTools (登録フック)", () => {
  it("registerTool が throw してもフックはクラッシュしない", () => {
    const nav = navigator as unknown as { modelContext?: unknown };
    const original = nav.modelContext;
    nav.modelContext = {
      registerTool: () => {
        throw new Error("boom");
      },
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useTobanTools(makeGet()()))).not.toThrow();
    } finally {
      warn.mockRestore();
      nav.modelContext = original;
    }
  });
});
