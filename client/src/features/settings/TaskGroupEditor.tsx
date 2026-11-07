import { defineView, stateSetter } from "@/lib/vue";
import { computed, shallowRef } from "vue";
import { Plus, Trash2 } from "@lucide/vue";
import type { AssignmentMode, TaskGroup, Member } from "@/rotation/types";
import { MEMBER_PRESETS, colorPresetFromHex } from "@/rotation/constants";
import { generateId, deepClone } from "@/rotation/utils";
import { GroupCard } from "./GroupCard";
import {
  GroupCardProvider,
  type DropMark,
  type EditorDragItem,
} from "./GroupCardContext";
import { BulkMemberAdd } from "./BulkMemberAdd";
import { ColorPalette } from "./ColorPalette";
import { useT } from "@/i18n";
import { usePointerDrag } from "@/hooks/usePointerDrag";
import { toast } from "vue-sonner";
import { LIMITS } from "@shared/limits";
/** list の from 番目を to 番目へ移した新しい配列。隣への移動は入れ替えと同じ結果になる */
function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
/** つかんだ要素そのものを、ドラッグ中の見た目にする */
interface Props {
  groups: TaskGroup[];
  members: Member[];
  onGroupsChange: (groups: TaskGroup[]) => void;
  onMembersChange: (members: Member[]) => void;
  assignmentMode?: AssignmentMode;
}
export const TaskGroupEditor = defineView<Props>(
  ["groups", "members", "onGroupsChange", "onMembersChange", "assignmentMode"],
  (props, _viewContext) => {
    const t = useT();
    const isTaskMode = computed(() => props.assignmentMode === "task");
    const activeMembers = computed(() =>
      props.members.filter(member => member.name.trim() && !member.skipped)
    );
    const activeMemberIds = computed(() =>
      activeMembers.value.map(member => member.id)
    );
    const membersById = computed(
      () => new Map(props.members.map(member => [member.id, member]))
    );
    const openDetailsKey = shallowRef<string | null>(null),
      setOpenDetailsKey = stateSetter(openDetailsKey);
    const handleToggleDetails = (key: string) =>
      setOpenDetailsKey(prev => (prev === key ? null : key));
    const bulkMode = shallowRef(props.members.length <= 1),
      setBulkMode = stateSetter(bulkMode);
    const openColorKey = shallowRef<string | null>(null),
      setOpenColorKey = stateSetter(openColorKey);
    const handleToggleColor = (key: string) =>
      setOpenColorKey(prev => (prev === key ? null : key));
    const updateMemberColor = (memberId: string, presetIdx: number) => {
      const preset = MEMBER_PRESETS[presetIdx];
      props.onMembersChange(
        props.members.map(m => (m.id === memberId ? { ...m, ...preset } : m))
      );
      setOpenColorKey(null);
    };
    const updateMemberColorCustom = (memberId: string, hex: string) => {
      const preset = colorPresetFromHex(hex);
      props.onMembersChange(
        props.members.map(m => (m.id === memberId ? { ...m, ...preset } : m))
      );
    };
    const updateMemberName = (memberId: string, name: string) => {
      props.onMembersChange(
        props.members.map(m => (m.id === memberId ? { ...m, name } : m))
      );
    };
    const dropGroupIdx = shallowRef<number | null>(null),
      setDropGroupIdx = stateSetter(dropGroupIdx);
    const dropTarget = shallowRef<DropMark | null>(null),
      setDropTarget = stateSetter(dropTarget);
    const dropMemberTarget = shallowRef<DropMark | null>(null),
      setDropMemberTarget = stateSetter(dropMemberTarget);
    const pair = (value: string | undefined) => {
      const [a, b] = (value ?? "").split(":").map(Number);
      return { gIdx: a, idx: b };
    };
    const canDropTaskInGroup = (from: number, to: number) =>
      !!props.groups[to] &&
      (from === to || props.groups[to].tasks.length < LIMITS.tasksPerGroup);
    const clearDropMarks = () => {
      setDropGroupIdx(null);
      setDropTarget(null);
      setDropMemberTarget(null);
    };
    const drag = usePointerDrag<EditorDragItem>({
      target: item =>
        item.kind === "group"
          ? "[data-drop-group]"
          : item.kind === "task"
            ? props.groups
                .flatMap((_, gIdx) =>
                  canDropTaskInGroup(item.gIdx, gIdx)
                    ? [
                        `[data-drop-task^="${gIdx}:"]`,
                        `[data-drop-zone="${gIdx}"]`,
                      ]
                    : []
                )
                .join(", ")
            : "[data-drop-member]",
      onOver: (item, el) => {
        const data = (el as HTMLElement | null)?.dataset;
        if (item.kind === "group") {
          setDropGroupIdx(data ? Number(data.dropGroup) : null);
        } else if (item.kind === "task") {
          if (data?.dropTask) {
            const { gIdx, idx } = pair(data.dropTask);
            // 同じ仕事の中で下へ動かすときは、落とした行の後ろに入る
            const after = gIdx === item.gIdx && idx > item.tIdx;
            setDropTarget({ gIdx, idx, after });
          } else if (data?.dropZone) {
            const gIdx = Number(data.dropZone);
            const last = props.groups[gIdx].tasks.length - 1;
            setDropTarget(last >= 0 ? { gIdx, idx: last, after: true } : null);
          } else setDropTarget(null);
        } else {
          const target = pair(data?.dropMember);
          // 担当者は同じ仕事の中でだけ並べ替える（仕事をまたぐのは「追加」で行う）
          setDropMemberTarget(
            data && target.gIdx === item.gIdx
              ? { ...target, after: target.idx > item.mIdx }
              : null
          );
        }
      },
      onDrop: (item, el) => {
        const data = (el as HTMLElement).dataset;
        if (item.kind === "group") {
          const to = Number(data.dropGroup);
          if (to !== item.gIdx) moveGroupTo(item.gIdx, to);
        } else if (item.kind === "task") {
          const to = data.dropTask
            ? pair(data.dropTask).gIdx
            : Number(data.dropZone);
          // 動かしている間に仕事が増えた場合も、元の仕事を抜く前に確かめる。
          if (!canDropTaskInGroup(item.gIdx, to)) return;
          const next = deepClone(props.groups);
          const [moved] = next[item.gIdx].tasks.splice(item.tIdx, 1);
          if (data.dropTask) {
            const { gIdx, idx } = pair(data.dropTask);
            if (gIdx === item.gIdx && idx === item.tIdx) return;
            next[gIdx].tasks.splice(idx, 0, moved);
          } else {
            next[Number(data.dropZone)].tasks.push(moved);
          }
          props.onGroupsChange(next);
        } else {
          const { gIdx, idx } = pair(data.dropMember);
          if (gIdx === item.gIdx && idx !== item.mIdx)
            moveMemberTo(gIdx, item.mIdx, idx);
        }
      },
      onEnd: clearDropMarks,
    });
    const removeMemberFromGroup = (gIdx: number, memberId: string) => {
      const next = deepClone(props.groups);
      const group = next[gIdx];
      const memberIds = group.memberIds ?? activeMemberIds.value;
      group.memberIds = memberIds.filter(id => id !== memberId);
      props.onGroupsChange(next);
    };
    const addMemberToGroup = (gIdx: number, memberId: string) => {
      const next = deepClone(props.groups);
      const group = next[gIdx];
      const memberIds = group.memberIds ?? activeMemberIds.value;
      group.memberIds = [...memberIds, memberId];
      props.onGroupsChange(next);
    };
    const addNewMemberToGroup = (gIdx: number) => {
      if (props.members.length >= LIMITS.members) {
        toast.error(t("settings.maxMembersReached", { n: LIMITS.members }));
        return;
      }
      const preset =
        MEMBER_PRESETS[props.members.length % MEMBER_PRESETS.length];
      const newMember: Member = { id: generateId("m"), name: "", ...preset };
      props.onMembersChange([...props.members, newMember]);
      const next = deepClone(props.groups);
      const group = next[gIdx];
      const memberIds = group.memberIds ?? activeMemberIds.value;
      group.memberIds = [...memberIds, newMember.id];
      props.onGroupsChange(next);
    };
    const setExplicitMembers = (gIdx: number) => {
      const next = [...props.groups];
      next[gIdx] = { ...next[gIdx], memberIds: activeMemberIds.value };
      props.onGroupsChange(next);
    };
    const resetToAllMembers = (gIdx: number) => {
      const next = [...props.groups];
      const { memberIds: _, ...rest } = next[gIdx];
      next[gIdx] = rest as TaskGroup;
      props.onGroupsChange(next);
    };
    const moveMemberTo = (gIdx: number, from: number, to: number) => {
      const next = deepClone(props.groups);
      next[gIdx].memberIds = moveItem(
        next[gIdx].memberIds ?? activeMemberIds.value,
        from,
        to
      );
      props.onGroupsChange(next);
    };
    const reorderMember = (gIdx: number, mIdx: number, direction: -1 | 1) => {
      const newIdx = mIdx + direction;
      const ids = props.groups[gIdx].memberIds ?? activeMemberIds.value;
      if (newIdx < 0 || newIdx >= ids.length) return;
      moveMemberTo(gIdx, mIdx, newIdx);
    };
    // --- グループ操作ヘルパー ---
    // 担当者から見るモードでは、グループと担当者が同じ順番で対になっている
    function moveGroupTo(from: number, to: number) {
      if (!isTaskMode.value)
        props.onMembersChange(moveItem(props.members, from, to));
      props.onGroupsChange(moveItem(props.groups, from, to));
    }
    const moveGroup = (gIdx: number, direction: -1 | 1) => {
      const newIdx = gIdx + direction;
      if (newIdx < 0 || newIdx >= props.groups.length) return;
      moveGroupTo(gIdx, newIdx);
    };
    const moveTask = (gIdx: number, tIdx: number, direction: -1 | 1) => {
      const newIdx = tIdx + direction;
      if (newIdx < 0 || newIdx >= props.groups[gIdx].tasks.length) return;
      props.onGroupsChange(
        props.groups.map((g, i) =>
          i === gIdx ? { ...g, tasks: moveItem(g.tasks, tIdx, newIdx) } : g
        )
      );
    };
    const addGroup = () => {
      if (props.groups.length >= LIMITS.groups) {
        toast.error(t("settings.maxGroupsReached", { n: LIMITS.groups }));
        return;
      }
      if (!isTaskMode.value && props.members.length >= LIMITS.members) {
        toast.error(t("settings.maxMembersReached", { n: LIMITS.members }));
        return;
      }
      if (isTaskMode.value) {
        const newGroup: TaskGroup = {
          id: generateId("g"),
          tasks: [t("settings.newTask")],
          emoji: "✨",
        };
        if (activeMemberIds.value.length > 0)
          newGroup.memberIds = activeMemberIds.value;
        props.onGroupsChange([...props.groups, newGroup]);
      } else {
        const preset =
          MEMBER_PRESETS[props.members.length % MEMBER_PRESETS.length];
        const newMember: Member = { id: generateId("m"), name: "", ...preset };
        const newGroup: TaskGroup = {
          id: generateId("g"),
          tasks: [t("settings.newTask")],
          emoji: "✨",
        };
        props.onMembersChange([...props.members, newMember]);
        props.onGroupsChange([...props.groups, newGroup]);
      }
    };
    const removeGroup = (idx: number) => {
      if (props.groups.length <= 1) return;
      if (!isTaskMode.value) {
        props.onMembersChange(props.members.filter((_, i) => i !== idx));
      }
      props.onGroupsChange(props.groups.filter((_, i) => i !== idx));
    };
    const updateGroupEmoji = (gIdx: number, emoji: string) => {
      props.onGroupsChange(
        props.groups.map((g, i) => (i === gIdx ? { ...g, emoji } : g))
      );
    };
    const addTask = (gIdx: number) => {
      if ((props.groups[gIdx]?.tasks.length ?? 0) >= LIMITS.tasksPerGroup) {
        toast.error(t("settings.maxTasksReached", { n: LIMITS.tasksPerGroup }));
        return;
      }
      props.onGroupsChange(
        props.groups.map((g, i) =>
          i === gIdx ? { ...g, tasks: [...g.tasks, ""] } : g
        )
      );
    };
    const updateTask = (gIdx: number, tIdx: number, value: string) => {
      props.onGroupsChange(
        props.groups.map((g, i) =>
          i === gIdx
            ? { ...g, tasks: g.tasks.map((t, j) => (j === tIdx ? value : t)) }
            : g
        )
      );
    };
    const removeTask = (gIdx: number, tIdx: number) => {
      props.onGroupsChange(
        props.groups.map((g, i) =>
          i === gIdx ? { ...g, tasks: g.tasks.filter((_, j) => j !== tIdx) } : g
        )
      );
    };
    const contextValue = computed(() => ({
      isTaskMode: isTaskMode.value,
      activeMembers: activeMembers.value,
      activeMemberIds: activeMemberIds.value,
      membersById: membersById.value,
      openDetailsKey: openDetailsKey.value,
      onToggleDetails: handleToggleDetails,
      openColorKey: openColorKey.value,
      onToggleColor: handleToggleColor,
      onColorPreset: updateMemberColor,
      onColorCustom: updateMemberColorCustom,
      onMemberNameChange: updateMemberName,
      onMoveGroup: moveGroup,
      onRemoveGroup: removeGroup,
      onUpdateEmoji: updateGroupEmoji,
      onAddTask: addTask,
      onUpdateTask: updateTask,
      onRemoveTask: removeTask,
      onMoveTask: moveTask,
      onRemoveMemberFromGroup: removeMemberFromGroup,
      onAddMemberToGroup: addMemberToGroup,
      onAddNewMemberToGroup: addNewMemberToGroup,
      onSetExplicitMembers: setExplicitMembers,
      onResetToAllMembers: resetToAllMembers,
      onReorderMember: reorderMember,
      dragHandle: drag.bind,
      dragging: drag.dragging,
      dropTarget: dropTarget.value,
      dropMemberTarget: dropMemberTarget.value,
    }));
    return () => (
      <div class="flex flex-col gap-3">
        <GroupCardProvider value={contextValue.value}>
          <div
            class={`flex flex-col gap-3 ${props.groups.length > 8 ? "max-h-[400px] overflow-y-auto pr-1" : ""}`}
          >
            {props.groups.map((group, gIdx) => (
              <GroupCard
                key={group.id}
                group={group}
                gIdx={gIdx}
                groupCount={props.groups.length}
                ownerMember={
                  !isTaskMode.value ? props.members[gIdx] : undefined
                }
                isGroupDropTarget={dropGroupIdx.value === gIdx}
              />
            ))}
          </div>
          {/* 担当者モードで仕事より人が多いとき、余った人は仕事の行に出ない。毎回この人数が休む */}
          {!isTaskMode.value && props.members.length > props.groups.length && (
            <ExtraMembers
              members={props.members.slice(props.groups.length)}
              onNameChange={updateMemberName}
              onColorPreset={updateMemberColor}
              onColorCustom={updateMemberColorCustom}
              onRemove={memberId =>
                props.onMembersChange(
                  props.members.filter(m => m.id !== memberId)
                )
              }
            />
          )}
        </GroupCardProvider>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={addGroup}
            // 行を足すボタンだと分かるよう点線の枠にする
            class="theme-border flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-colors hover:bg-black/5"
            style={{
              borderStyle: "dashed",
              backgroundColor: "transparent",
              color: "var(--dt-text-secondary)",
              borderRadius: "10px",
            }}
          >
            <Plus class="size-4" aria-hidden="true" />{" "}
            {isTaskMode.value ? t("group.addTask") : t("group.addAssignee")}
          </button>
          <button
            type="button"
            onClick={() => setBulkMode(v => !v)}
            class="theme-border theme-shadow-sm flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
            style={{
              backgroundColor: bulkMode.value
                ? "var(--dt-current-highlight)"
                : "var(--dt-button-bg)",
              color: "var(--dt-text)",
              borderRadius: "10px",
            }}
          >
            {t("bulk.bulkAdd")}
          </button>
        </div>

        {bulkMode.value && (
          <BulkMemberAdd
            members={props.members}
            groups={props.groups}
            activeMemberIds={activeMemberIds.value}
            isTaskMode={isTaskMode.value}
            onMembersChange={props.onMembersChange}
            onGroupsChange={props.onGroupsChange}
            onClose={() => setBulkMode(false)}
          />
        )}
      </div>
    );
  }
);
const ExtraMembers = defineView<{
  members: Member[];
  onNameChange: (memberId: string, name: string) => void;
  onColorPreset: (memberId: string, presetIdx: number) => void;
  onColorCustom: (memberId: string, hex: string) => void;
  onRemove: (memberId: string) => void;
}>(
  ["members", "onNameChange", "onColorPreset", "onColorCustom", "onRemove"],
  (props, _viewContext) => {
    const t = useT();
    const openColorId = shallowRef<string | null>(null),
      setOpenColorId = stateSetter(openColorId);
    return () => (
      <section
        class="theme-border px-3 sm:px-4 py-3 flex flex-col gap-2"
        style={{
          borderRadius: "var(--dt-border-radius)",
          backgroundColor:
            "color-mix(in srgb, var(--dt-text) 3%, var(--dt-card-bg))",
        }}
        aria-label={t("group.extraMembers")}
      >
        <div>
          <h3 class="text-sm font-bold" style={{ color: "var(--dt-text)" }}>
            {t("group.extraMembers")}
          </h3>
          <p
            class="text-xs mt-0.5"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {t("group.extraMembersHint", { n: props.members.length })}
          </p>
        </div>
        {props.members.map(member => (
          <div key={member.id} class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenColorId(prev =>
                    prev === member.id ? null : member.id
                  )
                }
                class="size-6 sm:size-7 rounded-full shrink-0 theme-border transition-transform hover:scale-110"
                style={{ backgroundColor: member.color, borderWidth: "2px" }}
                aria-label={t("group.changeColor")}
                aria-expanded={openColorId.value === member.id}
              />
              <input
                type="text"
                value={member.name}
                onInput={e =>
                  props.onNameChange(
                    member.id,
                    (e.target as HTMLInputElement).value
                  )
                }
                maxlength={LIMITS.memberName}
                placeholder={t("group.namePlaceholder")}
                class="flex-1 min-w-0 theme-border px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium"
                style={{
                  borderRadius: "var(--dt-border-radius-sm)",
                  backgroundColor: "var(--dt-button-bg)",
                  color: "var(--dt-text)",
                }}
                aria-label={t("group.memberName")}
              />
              <button
                type="button"
                onClick={() => props.onRemove(member.id)}
                class="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                style={{ color: "#DC2626" }}
                aria-label={t("group.removeMember", { name: member.name })}
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </button>
            </div>
            {openColorId.value === member.id && (
              <div class="pl-8 sm:pl-9">
                <ColorPalette
                  member={member}
                  onPresetSelect={props.onColorPreset}
                  onCustomColor={props.onColorCustom}
                />
              </div>
            )}
          </div>
        ))}
      </section>
    );
  }
);
