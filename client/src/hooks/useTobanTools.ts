import { useEffect, useRef } from "react";
import { z } from "zod";
import { LIMITS } from "@shared/limits";
import type { useHomeState } from "@/hooks/useHomeState";
import type { AssignmentMode, RotationConfig } from "@/rotation/types";
import { MEMBER_PRESETS, TEMPLATES } from "@/rotation/constants";
import {
  addMemberToSchedule,
  generateId,
  normalizeRotation,
  removeMemberFromSchedule,
} from "@/rotation/utils";
import {
  VIEW_VALUES,
  isViewTab,
  viewMcpLabel,
} from "@/features/home/viewTabsConfig";

/** useHomeState() の戻り値。tool はこの派生値/ハンドラだけを介して動く。 */
type HomeState = ReturnType<typeof useHomeState>;

function result(text: string): WebMCPToolResult {
  return { content: [{ type: "text", text }] };
}

function rotationLabel(rotation: number): string {
  return rotation === 0 ? "初期" : `${rotation}回目`;
}

/**
 * WebMCP の inputSchema には強制力が無いので、実行時の input はここで検証する。
 * 既存挙動どおり欠落・型違いはエラーにせず空値（"" / null / undefined）に落とし、
 * 入力エラーのメッセージは各 tool が組み立てる（lenient = .catch() で吸収）。
 */
const lenientStr = z.string().trim().catch("");
const lenientOptStr = z.string().trim().optional().catch(undefined);
const lenientOptBool = z.boolean().optional().catch(undefined);
const lenientOptNum = z.number().optional().catch(undefined);

/** 保存系の名前（メンバー名・表名）の上限。lookup 専用フィールドには適用しない */
const MAX_NAME_LENGTH = LIMITS.memberName;

const nameInputSchema = z.object({ name: lenientStr }).catch({ name: "" });
const directionInputSchema = z
  .object({ direction: lenientStr })
  .catch({ direction: "" });
const viewInputSchema = z.object({ view: lenientStr }).catch({ view: "" });
const templateInputSchema = z
  .object({ template: lenientStr })
  .catch({ template: "" });
const rotationInputSchema = z
  .object({ rotation: z.number().nullable().catch(null) })
  .catch({ rotation: null });
const updateScheduleInputSchema = z
  .object({
    name: lenientOptStr,
    pinned: lenientOptBool,
    assignment_mode: lenientOptStr,
  })
  .catch({});
const updateMemberInputSchema = z
  .object({ name: lenientStr, new_name: lenientOptStr, skip: lenientOptBool })
  .catch({ name: "" });
const configureRotationInputSchema = z
  .object({
    mode: lenientOptStr,
    start_date: lenientOptStr,
    cycle_days: lenientOptNum,
    skip_saturday: lenientOptBool,
    skip_sunday: lenientOptBool,
    skip_holidays: lenientOptBool,
  })
  .catch({});

/**
 * activeSchedule の現値をベースに patch だけ差し替えて onSaveSettings(full) を呼ぶ。
 * onSaveSettings は設定全体の置換なので、未指定フィールドの現値埋めをここに閉じ込める。
 */
function saveEdit(
  active: NonNullable<HomeState["activeSchedule"]>,
  onSaveSettings: HomeState["onSaveSettings"],
  patch: Partial<NonNullable<HomeState["activeSchedule"]>>
): void {
  onSaveSettings({
    name: patch.name ?? active.name,
    groups: patch.groups ?? active.groups,
    members: patch.members ?? active.members,
    rotationConfig: patch.rotationConfig ?? active.rotationConfig,
    pinned: patch.pinned ?? active.pinned,
    assignmentMode: patch.assignmentMode ?? active.assignmentMode,
    designThemeId: patch.designThemeId ?? active.designThemeId,
  });
}

function listSchedulesTool(get: () => HomeState): WebMCPTool {
  return {
    name: "list_schedules",
    description:
      "List all duty rosters (当番表) the user has. Returns each roster's name, member count, and group count; the currently displayed roster is marked. Use to see what rosters exist or before switching rosters.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async execute() {
      const { state, activeSchedule } = get();
      const { schedules } = state;
      if (schedules.length === 0) return result("当番表がありません。");
      const lines = schedules.map(s => {
        const active = s.id === activeSchedule?.id ? "（表示中）" : "";
        return `- ${s.name}${active}: メンバー${s.members.length}人 / グループ${s.groups.length}組`;
      });
      return result(
        `当番表が${schedules.length}件あります。\n${lines.join("\n")}`
      );
    },
  };
}

function currentAssignmentsTool(get: () => HomeState): WebMCPTool {
  return {
    name: "get_current_assignments",
    description:
      "Get who is currently on duty for the active duty roster: each task group paired with its assigned member, plus the current rotation step. Use when the user asks who is on duty now.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async execute() {
      const { activeSchedule, assignments, effectiveRotation } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      if (assignments.length === 0) {
        return result(
          `「${activeSchedule.name}」には担当できるメンバーがいません。`
        );
      }
      const lines = assignments.map(
        ({ group, member }) =>
          `- ${group.emoji} ${group.tasks.join("・")} → ${member.name}`
      );
      return result(
        `「${activeSchedule.name}」の現在の担当（${rotationLabel(effectiveRotation)}）:\n${lines.join("\n")}`
      );
    },
  };
}

function scheduleDetailsTool(get: () => HomeState): WebMCPTool {
  return {
    name: "get_schedule_details",
    description:
      "Get the full setup of the active duty roster: member names, task groups, rotation mode (manual or date-based), and assignment mode. Use before editing or to explain how the roster is configured.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async execute() {
      const { activeSchedule } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      const mode =
        activeSchedule.rotationConfig?.mode === "date" ? "日付ベース" : "手動";
      const assignMode =
        activeSchedule.assignmentMode === "task" ? "タスクごと" : "担当者ごと";
      const members = activeSchedule.members.map(m => m.name).join("、");
      const groups = activeSchedule.groups.map(
        g => `- ${g.emoji} ${g.tasks.join("・")}`
      );
      return result(
        [
          `「${activeSchedule.name}」の設定:`,
          `回転モード: ${mode} / 割り当て: ${assignMode}`,
          `メンバー: ${members}`,
          "グループ:",
          ...groups,
        ].join("\n")
      );
    },
  };
}

function switchScheduleTool(get: () => HomeState): WebMCPTool {
  return {
    name: "switch_schedule",
    description:
      "Switch the active duty roster to the one with the given name. Use the exact roster name as shown by list_schedules.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Exact name of the roster to switch to",
        },
      },
      required: ["name"],
    },
    async execute(input) {
      const { state, selectSchedule } = get();
      const { name } = nameInputSchema.parse(input);
      const target = state.schedules.find(s => s.name === name);
      if (!target) {
        const names = state.schedules.map(s => s.name).join("、");
        return result(
          `「${name}」という当番表は見つかりませんでした。利用できる当番表: ${names}`
        );
      }
      selectSchedule(target.id);
      return result(`「${target.name}」に切り替えました。`);
    },
  };
}

function advanceRotationTool(get: () => HomeState): WebMCPTool {
  return {
    name: "advance_rotation",
    description:
      "Move the active roster's rotation one step forward or backward. Only works for manually-rotated rosters; date-based rosters advance automatically by date and cannot be moved manually.",
    inputSchema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["forward", "backward"],
          description: "forward = next turn, backward = previous turn",
        },
      },
      required: ["direction"],
    },
    async execute(input) {
      const { activeSchedule, handleRotate } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      const { direction } = directionInputSchema.parse(input);
      if (direction !== "forward" && direction !== "backward") {
        return result(
          'direction は "forward" または "backward" を指定してください。'
        );
      }
      if (activeSchedule.rotationConfig?.mode === "date") {
        return result(
          `「${activeSchedule.name}」は日付ベースで自動的に当番が変わる設定のため、手動では回転できません。`
        );
      }
      handleRotate(direction);
      const label =
        direction === "forward" ? "次へ進めました" : "前へ戻しました";
      return result(`「${activeSchedule.name}」の当番を1つ${label}。`);
    },
  };
}

function changeViewTool(get: () => HomeState): WebMCPTool {
  return {
    name: "change_view",
    description:
      "Switch how the active roster is displayed: cards, table, calendar, or disc.",
    inputSchema: {
      type: "object",
      properties: {
        view: {
          type: "string",
          enum: [...VIEW_VALUES],
          description: "Display mode",
        },
      },
      required: ["view"],
    },
    async execute(input) {
      const { changeTab } = get();
      const { view } = viewInputSchema.parse(input);
      if (!isViewTab(view)) {
        return result(
          `view は ${VIEW_VALUES.map(v => `"${v}"`).join(" / ")} のいずれかを指定してください。`
        );
      }
      changeTab(view);
      return result(`表示を「${viewMcpLabel(view)}」に切り替えました。`);
    },
  };
}

function createScheduleTool(get: () => HomeState): WebMCPTool {
  return {
    name: "create_schedule",
    description:
      "Create a new duty roster from a built-in template, identified by the template's name. The new roster becomes the active one.",
    inputSchema: {
      type: "object",
      properties: {
        template: {
          type: "string",
          description: "Name of the template to create from",
        },
      },
      required: ["template"],
    },
    async execute(input) {
      const { onAddSchedule } = get();
      const { template: name } = templateInputSchema.parse(input);
      const template = TEMPLATES.find(t => t.name === name);
      if (!template) {
        const names = TEMPLATES.map(t => t.name).join("、");
        return result(
          `「${name}」というテンプレートはありません。利用できるテンプレート: ${names}`
        );
      }
      onAddSchedule(template);
      return result(
        `テンプレート「${template.name}」から新しい当番表を作成しました。`
      );
    },
  };
}

function addMemberTool(get: () => HomeState): WebMCPTool {
  return {
    name: "add_member",
    description:
      "Add a member (a person or team) to the active duty roster by name. A display color is assigned automatically.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the member to add" },
      },
      required: ["name"],
    },
    async execute(input) {
      const { activeSchedule, onSaveSettings } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      const { name } = nameInputSchema.parse(input);
      if (!name) return result("追加するメンバーの名前を指定してください。");
      if (name.length > MAX_NAME_LENGTH)
        return result(`名前は${MAX_NAME_LENGTH}文字以内で指定してください。`);
      if (activeSchedule.members.length >= LIMITS.members) {
        return result(`メンバーは最大${LIMITS.members}人までです。`);
      }
      if (
        activeSchedule.assignmentMode !== "task" &&
        activeSchedule.groups.length >= LIMITS.groups
      ) {
        return result(`グループは最大${LIMITS.groups}件までです。`);
      }
      const preset =
        MEMBER_PRESETS[activeSchedule.members.length % MEMBER_PRESETS.length];
      const newMember = { id: generateId("m"), name, ...preset };
      const updated = addMemberToSchedule(
        activeSchedule,
        newMember,
        "新しいタスク"
      );
      saveEdit(activeSchedule, onSaveSettings, {
        members: updated.members,
        groups: updated.groups,
      });
      return result(`「${name}」をメンバーに追加しました。`);
    },
  };
}

function removeMemberTool(get: () => HomeState): WebMCPTool {
  return {
    name: "remove_member",
    description: "Remove a member from the active duty roster by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the member to remove" },
      },
      required: ["name"],
    },
    async execute(input) {
      const { activeSchedule, onSaveSettings } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      const { name } = nameInputSchema.parse(input);
      const target = activeSchedule.members.find(m => m.name === name);
      if (!target) {
        const names = activeSchedule.members.map(m => m.name).join("、");
        return result(
          `「${name}」というメンバーは見つかりませんでした。現在のメンバー: ${names}`
        );
      }
      if (activeSchedule.members.length <= 1) {
        return result("最後のメンバーは削除できません。");
      }
      const updated = removeMemberFromSchedule(activeSchedule, target.id);
      saveEdit(activeSchedule, onSaveSettings, {
        groups: updated.groups,
        members: updated.members,
      });
      return result(`「${target.name}」をメンバーから削除しました。`);
    },
  };
}

function setRotationTool(get: () => HomeState): WebMCPTool {
  return {
    name: "set_rotation",
    description:
      "Set the active roster's rotation to a specific turn number (0 = initial). Only for manually-rotated rosters; date-based rosters advance automatically.",
    inputSchema: {
      type: "object",
      properties: {
        rotation: { type: "number", description: "Turn number, 0 or greater" },
      },
      required: ["rotation"],
    },
    async execute(input) {
      const { activeSchedule, updateActiveSchedule } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      if (activeSchedule.rotationConfig?.mode === "date") {
        return result(
          `「${activeSchedule.name}」は日付ベースで自動的に当番が変わる設定のため、回数を手動で設定できません。`
        );
      }
      const { rotation } = rotationInputSchema.parse(input);
      if (rotation === null || !Number.isInteger(rotation) || rotation < 0) {
        return result("rotation は 0 以上の整数で指定してください。");
      }
      const activeCount = activeSchedule.members.filter(m => !m.skipped).length;
      const normalized = normalizeRotation(rotation, activeCount);
      updateActiveSchedule(s => ({ ...s, rotation: normalized }));
      return result(
        `回転を${normalized === 0 ? "初期" : `${normalized}回目`}に設定しました。`
      );
    },
  };
}

function printScheduleTool(get: () => HomeState): WebMCPTool {
  return {
    name: "print_schedule",
    description:
      "Open the browser print dialog for the active roster in its current view (cards / table / calendar).",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      const { handlePrint, viewTab, activeSchedule, effectiveRotation } = get();
      handlePrint(
        viewTab,
        activeSchedule?.name,
        rotationLabel(effectiveRotation)
      );
      return result(
        `印刷ダイアログを開きました（${viewMcpLabel(viewTab)}表示）。`
      );
    },
  };
}

function shareLinkTool(get: () => HomeState): WebMCPTool {
  return {
    name: "get_share_link",
    description:
      "Get the public share URL of the active roster if it has already been shared. Does NOT create or publish a new link — sharing must be done by the user via the share button.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async execute() {
      const { activeSchedule } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      if (activeSchedule.slug) {
        return result(
          `「${activeSchedule.name}」の共有リンク: ${window.location.origin}/s/${activeSchedule.slug}`
        );
      }
      return result(
        `「${activeSchedule.name}」はまだ共有されていません。画面の共有ボタンから共有リンクを作成できます。`
      );
    },
  };
}

function updateScheduleTool(get: () => HomeState): WebMCPTool {
  return {
    name: "update_schedule",
    description:
      "Update the active roster's settings: name, pinned state, and/or assignment mode (member = one person per group, task = one person per task). Provide only the fields you want to change.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New roster name" },
        pinned: { type: "boolean", description: "Pin or unpin the roster" },
        assignment_mode: {
          type: "string",
          enum: ["member", "task"],
          description: "Assignment mode",
        },
      },
    },
    async execute(input) {
      const { activeSchedule, onSaveSettings } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      const {
        name,
        pinned,
        assignment_mode: mode,
      } = updateScheduleInputSchema.parse(input);
      if (name === undefined && pinned === undefined && mode === undefined) {
        return result(
          "更新する項目（name / pinned / assignment_mode）を指定してください。"
        );
      }
      if (name === "") return result("name は空にできません。");
      if (name !== undefined && name.length > MAX_NAME_LENGTH) {
        return result(`name は${MAX_NAME_LENGTH}文字以内で指定してください。`);
      }
      if (mode !== undefined && mode !== "member" && mode !== "task") {
        return result(
          'assignment_mode は "member" または "task" を指定してください。'
        );
      }
      saveEdit(activeSchedule, onSaveSettings, {
        name,
        pinned,
        assignmentMode: mode as AssignmentMode | undefined,
      });
      const changed = [
        name !== undefined ? `名前を「${name}」に` : null,
        pinned !== undefined ? `ピン留めを${pinned ? "オン" : "オフ"}に` : null,
        mode !== undefined
          ? `割り当てを${mode === "task" ? "タスクごと" : "担当者ごと"}に`
          : null,
      ]
        .filter(Boolean)
        .join("、");
      return result(`当番表の設定を更新しました（${changed}）。`);
    },
  };
}

function updateMemberTool(get: () => HomeState): WebMCPTool {
  return {
    name: "update_member",
    description:
      "Update a member of the active roster by name: rename and/or mark them as resting (skip = excluded from rotation) or active. Provide name plus the fields to change.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Current name of the member" },
        new_name: { type: "string", description: "New name (rename)" },
        skip: {
          type: "boolean",
          description: "true = rest (exclude from rotation), false = active",
        },
      },
      required: ["name"],
    },
    async execute(input) {
      const { activeSchedule, onSaveSettings } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      const {
        name,
        new_name: newName,
        skip,
      } = updateMemberInputSchema.parse(input);
      const target = activeSchedule.members.find(m => m.name === name);
      if (!target) {
        const names = activeSchedule.members.map(m => m.name).join("、");
        return result(
          `「${name}」というメンバーは見つかりませんでした。現在のメンバー: ${names}`
        );
      }
      if (newName === undefined && skip === undefined) {
        return result("変更内容（new_name / skip）を指定してください。");
      }
      if (newName === "") return result("new_name は空にできません。");
      if (newName !== undefined && newName.length > MAX_NAME_LENGTH) {
        return result(
          `new_name は${MAX_NAME_LENGTH}文字以内で指定してください。`
        );
      }
      const nextMembers = activeSchedule.members.map(m =>
        m.id === target.id
          ? { ...m, name: newName ?? m.name, skipped: skip ?? m.skipped }
          : m
      );
      saveEdit(activeSchedule, onSaveSettings, { members: nextMembers });
      const changed = [
        newName !== undefined ? `「${newName}」に改名` : null,
        skip !== undefined ? (skip ? "休みに設定" : "復帰") : null,
      ]
        .filter(Boolean)
        .join("、");
      return result(`「${target.name}」を${changed}しました。`);
    },
  };
}

function configureRotationTool(get: () => HomeState): WebMCPTool {
  return {
    name: "configure_rotation",
    description:
      "Configure how the active roster rotates. mode 'manual' = advance by hand; mode 'date' = auto-advance by date (requires start_date as YYYY-MM-DD and cycle_days). Optionally skip Saturdays / Sundays / Japanese holidays. Provide only the fields you want to change.",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["manual", "date"],
          description: "Rotation mode",
        },
        start_date: {
          type: "string",
          description: "Start date YYYY-MM-DD (date mode)",
        },
        cycle_days: {
          type: "number",
          description: "Days per rotation, positive integer (date mode)",
        },
        skip_saturday: { type: "boolean" },
        skip_sunday: { type: "boolean" },
        skip_holidays: { type: "boolean" },
      },
    },
    async execute(input) {
      const { activeSchedule, onSaveSettings } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      const {
        mode,
        start_date: startDate,
        cycle_days: cycleDays,
        skip_saturday: skipSat,
        skip_sunday: skipSun,
        skip_holidays: skipHol,
      } = configureRotationInputSchema.parse(input);
      if (
        mode === undefined &&
        startDate === undefined &&
        cycleDays === undefined &&
        skipSat === undefined &&
        skipSun === undefined &&
        skipHol === undefined
      ) {
        return result("変更する項目を指定してください。");
      }
      if (mode !== undefined && mode !== "manual" && mode !== "date") {
        return result('mode は "manual" または "date" を指定してください。');
      }
      if (
        cycleDays !== undefined &&
        (!Number.isInteger(cycleDays) || cycleDays <= 0)
      ) {
        return result("cycle_days（周期）は 1 以上の整数で指定してください。");
      }
      if (startDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return result(
          "start_date（開始日）は YYYY-MM-DD 形式で指定してください。"
        );
      }
      const current: RotationConfig = activeSchedule.rotationConfig ?? {
        mode: "manual",
      };
      const merged: RotationConfig = { ...current };
      if (mode !== undefined) merged.mode = mode as "manual" | "date";
      if (startDate !== undefined) merged.startDate = startDate;
      if (cycleDays !== undefined) merged.cycleDays = cycleDays;
      if (skipSat !== undefined) merged.skipSaturday = skipSat;
      if (skipSun !== undefined) merged.skipSunday = skipSun;
      if (skipHol !== undefined) merged.skipHolidays = skipHol;
      if (merged.mode === "date" && (!merged.startDate || !merged.cycleDays)) {
        return result(
          "日付モードには開始日(start_date)と周期(cycle_days)が必要です。"
        );
      }
      saveEdit(activeSchedule, onSaveSettings, { rotationConfig: merged });
      const label =
        merged.mode === "date"
          ? `日付ベース（${merged.startDate} 起点 / ${merged.cycleDays}日ごと）`
          : "手動";
      return result(`回転設定を更新しました（${label}）。`);
    },
  };
}

function duplicateScheduleTool(get: () => HomeState): WebMCPTool {
  return {
    name: "duplicate_schedule",
    description:
      "Duplicate the active roster as a new copy (members, groups, and settings are copied; the copy becomes active).",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      const { activeSchedule, onDuplicateSchedule } = get();
      if (!activeSchedule)
        return result("現在選択されている当番表がありません。");
      onDuplicateSchedule();
      return result(`「${activeSchedule.name}」を複製しました。`);
    },
  };
}

/** 登録する全 tool を組み立てる。get() は常に最新の HomeState を返すこと。 */
export function buildTobanTools(get: () => HomeState): WebMCPTool[] {
  return [
    listSchedulesTool(get),
    currentAssignmentsTool(get),
    scheduleDetailsTool(get),
    shareLinkTool(get),
    switchScheduleTool(get),
    advanceRotationTool(get),
    changeViewTool(get),
    createScheduleTool(get),
    updateScheduleTool(get),
    duplicateScheduleTool(get),
    addMemberTool(get),
    removeMemberTool(get),
    updateMemberTool(get),
    setRotationTool(get),
    configureRotationTool(get),
    printScheduleTool(get),
  ];
}

/**
 * Home 画面で WebMCP tool を登録する。
 * - navigator.modelContext (Chrome 実装) / document.modelContext (spec draft) を feature-detect
 * - 非対応ブラウザでは完全に no-op（既存挙動に影響なし）
 * - state は ref 経由で常に最新を参照（再登録の churn を避ける）
 */
export function useTobanTools(s: HomeState): void {
  const ref = useRef(s);
  useEffect(() => {
    ref.current = s;
  });

  useEffect(() => {
    const mc = navigator.modelContext ?? document.modelContext;
    if (!mc) return;
    const controller = new AbortController();
    for (const tool of buildTobanTools(() => ref.current)) {
      // registerTool は spec 上 throw しうる（permissions policy 等）。
      // 実験的 API の失敗で Home（= アプリ全体）を巻き込まないよう握りつぶす。
      try {
        mc.registerTool(tool, { signal: controller.signal });
      } catch (error) {
        console.warn(`[webmcp] registerTool failed: ${tool.name}`, error);
      }
    }
    return () => controller.abort();
  }, []);
}
