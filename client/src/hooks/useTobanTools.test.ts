import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { buildTobanTools, useTobanTools } from "./useTobanTools";
import type { useHomeState } from "@/hooks/useHomeState";
import { LIMITS } from "@shared/limits";
import type {
  AppState,
  Assignment,
  Member,
  Schedule,
  TaskGroup,
} from "@/rotation/types";
import type { ViewTabValue } from "@/features/home/viewTabsConfig";
import { getSchedule } from "@/lib/api";

vi.mock("@/lib/api", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getSchedule: vi.fn(),
}));

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

type GetState = (() => HomeState) & { getSaved: () => Schedule | null };

function makeGet(over: Partial<HomeState> = {}): GetState {
  const schedules = over.state?.schedules ?? [sched()];
  const active = "activeSchedule" in over ? over.activeSchedule : schedules[0];
  let current: AppState = over.state ?? {
    schedules,
    activeScheduleId: active?.id ?? "",
  };
  let saved: Schedule | null = null;
  const base = {
    state: current,
    activeSchedule: active,
    assignments: [] as Assignment[],
    effectiveRotation: 0,
    groups: active?.groups ?? [],
    members: active?.members ?? [],
    modal: { type: null },
    showShare: false,
    isSharing: false,
    localSaveStatus: "saved",
    syncStatus: "idle",
    viewTab: "cards",
    changeTabForTool: (view: ViewTabValue) => {
      base.viewTab = view;
      return true;
    },
    handlePrint: vi.fn(),
    ...over,
    getToolState: () => current,
    commitToolState: async (updater: (state: AppState) => AppState) => {
      current = updater(current);
      saved =
        current.schedules.find(
          schedule => schedule.id === current.activeScheduleId
        ) ?? null;
      base.state = current;
      if (saved) base.activeSchedule = saved;
      return { state: current, local: "saved", applied: true };
    },
  } as unknown as HomeState;
  return Object.assign(() => base, { getSaved: () => saved });
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

    expect(JSON.parse(text)).toMatchObject({
      items: [
        {
          schedule_id: "s1",
          name: "掃除当番",
          active: false,
          member_count: 1,
          task_group_count: 1,
        },
        {
          schedule_id: "s2",
          name: "給食当番",
          active: true,
          member_count: 3,
          task_group_count: 2,
        },
      ],
    });
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
      rotation: 2,
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

    expect(JSON.parse(text)).toMatchObject({
      schedule_id: "s1",
      rotation: 2,
      items: [
        { group_id: "g1", member_id: "m1", member_name: "佐藤" },
        { group_id: "g2", member_id: "m2", member_name: "鈴木" },
      ],
    });
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
    expect(JSON.parse(text)).toMatchObject({
      rotation: 0,
      items: [{ group_id: "g1", member_id: "m1" }],
    });
  });

  it("当番表が無いときはその旨を返す", async () => {
    const get = makeGet({
      state: { schedules: [], activeScheduleId: "" },
      activeSchedule: undefined,
    });
    const text = (await toolNamed("get_current_assignments", get).execute({}))
      .content[0].text;
    expect(JSON.parse(text)).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
      applied: false,
    });
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

    expect(JSON.parse(text)).toMatchObject({
      rotation: { mode: "date", start_date: "2026-01-01", cycle_days: 7 },
    });
    const members = await toolNamed("get_schedule_details", get).execute({
      section: "members",
    });
    expect(JSON.parse(members.content[0].text)).toMatchObject({
      items: [{ name: "佐藤" }, { name: "鈴木" }],
    });
    const groups = await toolNamed("get_schedule_details", get).execute({
      section: "groups",
    });
    expect(JSON.parse(groups.content[0].text)).toMatchObject({
      items: [{ task: "床" }, { task: "窓" }],
    });
  });

  it("manual モードは手動と表示する", async () => {
    const a = sched({ rotationConfig: { mode: "manual" } });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });
    const text = (await toolNamed("get_schedule_details", get).execute({}))
      .content[0].text;
    expect(JSON.parse(text)).toMatchObject({ rotation: { mode: "manual" } });
  });
});

describe("switch_schedule", () => {
  it("名前が一致する当番表に切り替える", async () => {
    const a = sched({ id: "s1", name: "掃除当番" });
    const b = sched({ id: "s2", name: "給食当番" });
    const get = makeGet({
      state: { schedules: [a, b], activeScheduleId: "s1" },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("switch_schedule", get).execute({ name: "給食当番" })
    ).content[0].text;

    expect(get().state.activeScheduleId).toBe("s2");
    expect(JSON.parse(text)).toMatchObject({
      ok: true,
      schedule_id: "s2",
      applied: true,
    });
  });

  it("一致しない名前は切り替えず候補を添えて返す", async () => {
    const a = sched({ id: "s1", name: "掃除当番" });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: "s1" },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("switch_schedule", get).execute({ name: "存在しない表" })
    ).content[0].text;

    expect(get().state.activeScheduleId).toBe("s1");
    expect(JSON.parse(text)).toMatchObject({
      code: "NOT_FOUND",
      applied: false,
    });
    const candidates = await toolNamed("list_schedules", get).execute({});
    expect(JSON.parse(candidates.content[0].text)).toMatchObject({
      items: [{ name: "掃除当番" }],
    });
  });
});

describe("advance_rotation", () => {
  it("manual モードでは指定方向に回転する", async () => {
    const a = sched({
      rotationConfig: { mode: "manual" },
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("advance_rotation", get).execute({ direction: "forward" })
    ).content[0].text;

    expect(get.getSaved()!.rotation).toBe(1);
    expect(JSON.parse(text)).toMatchObject({ ok: true, applied: true });
  });

  it("date モードでは回転せず日付管理であることを伝える", async () => {
    const a = sched({
      rotationConfig: { mode: "date", startDate: "2026-01-01", cycleDays: 7 },
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("advance_rotation", get).execute({ direction: "forward" })
    ).content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(text).toContain("日付");
  });

  it("不正な direction はエラーを返す", async () => {
    const a = sched({ rotationConfig: { mode: "manual" } });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("advance_rotation", get).execute({
        direction: "sideways",
      })
    ).content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(text).toMatch(/forward|backward/);
  });
});

describe("change_view", () => {
  it("有効なビューに切り替える", async () => {
    let view: string | null = null;
    const get = makeGet({
      changeTabForTool: (t: ViewTabValue) => {
        view = t;
        return true;
      },
    });

    const text = (
      await toolNamed("change_view", get).execute({ view: "calendar" })
    ).content[0].text;

    expect(view).toBe("calendar");
    expect(JSON.parse(text)).toMatchObject({ ok: true, view: "calendar" });
  });

  it("disc（円盤）に切り替えられる", async () => {
    let view: string | null = null;
    const get = makeGet({
      changeTabForTool: (t: "cards" | "table" | "calendar" | "disc") => {
        view = t;
        return true;
      },
    });

    const text = (await toolNamed("change_view", get).execute({ view: "disc" }))
      .content[0].text;

    expect(view).toBe("disc");
    expect(JSON.parse(text)).toMatchObject({ ok: true, view: "disc" });
  });

  it("無効なビューは切り替えずエラーを返す", async () => {
    let view: string | null = null;
    const get = makeGet({
      changeTabForTool: (t: ViewTabValue) => {
        view = t;
        return true;
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
    const get = makeGet({});

    const text = (
      await toolNamed("create_schedule", get).execute({ template: "給食当番" })
    ).content[0].text;

    expect(get.getSaved()!.name).toBe("給食当番");
    expect(get().state.schedules).toHaveLength(2);
    expect(JSON.parse(text)).toMatchObject({ ok: true, applied: true });
  });

  it("未知のテンプレートは作らず候補を添えて返す", async () => {
    const get = makeGet({});

    const text = (
      await toolNamed("create_schedule", get).execute({
        template: "絶対に存在しない名前",
      })
    ).content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(text).toContain("給食当番");
  });
});

describe("add_member", () => {
  it("名前を指定してメンバーを追加する（色は preset 割当）", async () => {
    const a = sched({
      name: "掃除当番",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (await toolNamed("add_member", get).execute({ name: "田中" }))
      .content[0].text;

    expect(JSON.parse(text)).toMatchObject({ ok: true, applied: true });
    const members = get.getSaved()!.members;
    expect(members.map(m => m.name)).toEqual(["佐藤", "鈴木", "田中"]);
    const added = members[2];
    expect(added.color).toBeTruthy();
    expect(added.bgColor).toBeTruthy();
    expect(added.textColor).toBeTruthy();
    expect(get.getSaved()!.name).toBe("掃除当番");
  });

  it("member モード（担当者ごと）では対応するグループも同時に追加する", async () => {
    const a = sched({
      assignmentMode: "member",
      members: [member("m1", "佐藤")],
      groups: [group("g1", "🧹", ["床そうじ"])],
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    await toolNamed("add_member", get).execute({ name: "田中" });

    expect(get.getSaved()!.members.map(m => m.name)).toEqual(["佐藤", "田中"]);
    expect(get.getSaved()!.groups).toHaveLength(2);
  });
});

describe("add_member のメンバー数上限", () => {
  it("上限人数に達していると追加せず上限を伝えるエラーを返す", async () => {
    const full = Array.from({ length: LIMITS.members }, (_, i) =>
      member(`m${i}`, `名前${i}`)
    );
    const a = sched({ members: full });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (await toolNamed("add_member", get).execute({ name: "田中" }))
      .content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(JSON.parse(text)).toMatchObject({
      code: "INVALID_INPUT",
      applied: false,
    });
    expect(get().state.schedules[0].members).toHaveLength(LIMITS.members);
  });
});

describe("保存系 name フィールドの文字数上限", () => {
  const setup = () => {
    const a = sched({
      name: "掃除当番",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });
    return { get, getSaved: get.getSaved };
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
      expect(JSON.parse(text)).toMatchObject({
        code: "INVALID_INPUT",
        issues: [{ code: "too_big" }],
      });
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
      expect(JSON.parse(text)).toMatchObject({
        code: "INVALID_INPUT",
        issues: [{ code: "too_big" }],
      });
    }
    // update_schedule: name 51文字 → 保存されず上限エラー
    {
      const { get, getSaved } = setup();
      const text = (
        await toolNamed("update_schedule", get).execute({ name: over })
      ).content[0].text;
      expect(getSaved()).toBeNull();
      expect(JSON.parse(text)).toMatchObject({
        code: "INVALID_INPUT",
        issues: [{ code: "too_big" }],
      });
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
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("remove_member", get).execute({ name: "鈴木" })
    ).content[0].text;

    expect(JSON.parse(text)).toMatchObject({ ok: true, applied: true });
    expect(get.getSaved()!.members.map(m => m.name)).toEqual(["佐藤"]);
    expect(get.getSaved()!.groups[0].memberIds).toEqual(["m1"]);
  });

  it("最後の1人は削除できない", async () => {
    const a = sched({ members: [member("m1", "佐藤")] });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("remove_member", get).execute({ name: "佐藤" })
    ).content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(text).toMatch(/最後|削除できません/);
  });

  it("該当しない名前は候補付きで知らせる", async () => {
    const a = sched({ members: [member("m1", "佐藤"), member("m2", "鈴木")] });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("remove_member", get).execute({ name: "田中" })
    ).content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(JSON.parse(text)).toMatchObject({
      code: "NOT_FOUND",
      applied: false,
    });
    const candidates = await toolNamed("get_schedule_details", get).execute({
      section: "members",
    });
    expect(JSON.parse(candidates.content[0].text)).toMatchObject({
      items: [{ name: "佐藤" }, { name: "鈴木" }],
    });
  });

  it("member モード（担当者ごと）では対応するグループも同時に削除する", async () => {
    const a = sched({
      assignmentMode: "member",
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
      groups: [group("g1", "🧹", ["床そうじ"]), group("g2", "🍚", ["配膳"])],
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    await toolNamed("remove_member", get).execute({ name: "佐藤" });

    expect(get.getSaved()!.members.map(m => m.name)).toEqual(["鈴木"]);
    expect(get.getSaved()!.groups.map(g => g.id)).toEqual(["g2"]);
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
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (await toolNamed("set_rotation", get).execute({ rotation: 2 }))
      .content[0].text;

    expect(get.getSaved()!.rotation).toBe(2);
    expect(JSON.parse(text)).toMatchObject({ ok: true, applied: true });
  });

  it("メンバー数で正規化する", async () => {
    const a = sched({
      rotationConfig: { mode: "manual" },
      members: [member("m1", "佐藤"), member("m2", "鈴木")],
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    await toolNamed("set_rotation", get).execute({ rotation: 5 });

    expect(get.getSaved()!.rotation).toBe(1);
  });

  it("date モードでは設定せず日付管理を伝える", async () => {
    const a = sched({
      rotationConfig: { mode: "date", startDate: "2026-01-01", cycleDays: 7 },
    });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (await toolNamed("set_rotation", get).execute({ rotation: 2 }))
      .content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(text).toContain("日付");
  });

  it("負の数や非整数は拒否する", async () => {
    const a = sched({ rotationConfig: { mode: "manual" } });
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });

    const text = (
      await toolNamed("set_rotation", get).execute({ rotation: -1 })
    ).content[0].text;

    expect(get.getSaved()).toBeNull();
    expect(JSON.parse(text)).toMatchObject({
      code: "INVALID_INPUT",
      issues: [{ path: "rotation" }],
    });
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
    vi.mocked(getSchedule).mockResolvedValueOnce({
      ...a,
      slug: "abc123",
      createdAt: "2026-09-01",
      updatedAt: "2026-09-01",
    });
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
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });
    return { a, get, getSaved: get.getSaved };
  };

  it("名前を変更し他は保持する", async () => {
    const { get, getSaved } = setup();
    const text = (
      await toolNamed("update_schedule", get).execute({ name: "新・掃除当番" })
    ).content[0].text;
    expect(getSaved()!.name).toBe("新・掃除当番");
    expect(getSaved()!.assignmentMode).toBe("member");
    expect(JSON.parse(text)).toMatchObject({ ok: true, applied: true });
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
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });
    return { a, get, getSaved: get.getSaved };
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
    expect(JSON.parse(text)).toMatchObject({
      code: "NOT_FOUND",
      applied: false,
    });
    const candidates = await toolNamed("get_schedule_details", get).execute({
      section: "members",
    });
    expect(JSON.parse(candidates.content[0].text)).toMatchObject({
      items: [{ name: "佐藤" }, { name: "鈴木" }],
    });
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
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });
    return { a, get, getSaved: get.getSaved };
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
    const get = makeGet({
      state: { schedules: [a], activeScheduleId: a.id },
      activeSchedule: a,
    });
    const text = (await toolNamed("duplicate_schedule", get).execute({}))
      .content[0].text;
    expect(get().state.schedules).toHaveLength(2);
    expect(get.getSaved()!.id).not.toBe(a.id);
    expect(get.getSaved()!.groups).toEqual(a.groups);
    expect(text).toContain("複製");
  });
});

describe("出力の文字数予算", () => {
  // 大きな当番表でも 1 tool の出力が Chrome 推奨の 1,500 字を超えないこと。
  // メンバー・グループ・タスクを上限まで積んだ表を 10 件用意する。
  const bigGet = () => {
    const members = Array.from({ length: LIMITS.members }, (_, i) =>
      member(`m${i}`, `山田花子${i}`)
    );
    const groups = Array.from({ length: LIMITS.groups }, (_, i) =>
      group(
        `g${i}`,
        "🧹",
        Array.from({ length: LIMITS.tasksPerGroup }, (_, j) => `ゴミ出し${j}`)
      )
    );
    const schedules = Array.from({ length: 10 }, (_, i) =>
      sched({ id: `s${i}`, name: `フロア${i}当番表`, members, groups })
    );
    return makeGet({
      state: { schedules, activeScheduleId: "s0" },
      activeSchedule: schedules[0],
      assignments: groups.map((g, i) => ({ group: g, member: members[i] })),
      // 出力長だけを見たいので、副作用のあるハンドラは黙って受ける
      selectSchedule: vi.fn(),
      changeTab: vi.fn(),
      handleRotate: vi.fn(),
      handlePrint: vi.fn(),
      onAddSchedule: vi.fn(),
      onSaveSettings: vi.fn(),
      onDuplicateSchedule: vi.fn(),
      updateActiveSchedule: vi.fn(),
    } as Partial<HomeState>);
  };

  it("全 tool の出力が 1,500 字以内に収まる", async () => {
    const get = bigGet();
    for (const tool of buildTobanTools(get)) {
      const { content } = await tool.execute({}, undefined);
      const text = content.map(c => c.text).join("");
      expect(text.length, `${tool.name} の出力が長すぎる`).toBeLessThanOrEqual(
        1500
      );
    }
  });

  it("収まらない詳細は有効なJSONの次ページで続きを知らせる", async () => {
    const { content } = await toolNamed(
      "get_schedule_details",
      bigGet()
    ).execute({ section: "groups" }, undefined);
    expect(content[0].text.length).toBeLessThanOrEqual(1500);
    expect(JSON.parse(content[0].text)).toMatchObject({
      total: LIMITS.groups * LIMITS.tasksPerGroup,
      next_cursor: expect.any(Number),
    });
  });

  it("収まる出力には省略の注記を付けない", async () => {
    const { content } = await toolNamed("list_schedules", makeGet()).execute(
      {},
      undefined
    );
    expect(content[0].text).not.toContain("以降を省略しました");
  });
});

describe("annotations", () => {
  // ユーザ入力（当番表名・メンバー名）を出力に含む tool は、間接プロンプト
  // インジェクションの持ち込み口として untrustedContentHint を付ける。
  const UNTRUSTED = [
    "list_schedules",
    "get_current_assignments",
    "get_schedule_details",
    "get_share_link",
    "switch_schedule",
    "remove_member",
    "update_member",
  ];

  it("ユーザ入力を返す tool に untrustedContentHint を付けている", () => {
    const tools = buildTobanTools(makeGet());
    for (const name of UNTRUSTED) {
      const tool = tools.find(t => t.name === name);
      expect(tool?.annotations?.untrustedContentHint, name).toBe(true);
    }
  });

  it("状態を変えない tool にだけ readOnlyHint を付けている", () => {
    const readOnly = buildTobanTools(makeGet())
      .filter(t => t.annotations?.readOnlyHint)
      .map(t => t.name)
      .sort();
    expect(readOnly).toEqual([
      "get_current_assignments",
      "get_schedule_details",
      "get_share_link",
      "list_schedules",
    ]);
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
