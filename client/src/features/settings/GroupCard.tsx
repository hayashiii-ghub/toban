import { defineView } from "@/lib/vue";
import { computed } from "vue";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  X,
} from "@lucide/vue";
import type { Member, TaskGroup } from "@/rotation/types";
import { ColorPalette } from "./ColorPalette";
import { useGroupCardContext } from "./GroupCardContext";
import { LIMITS } from "@shared/limits";
import { useT } from "@/i18n";
interface Props {
  group: TaskGroup;
  gIdx: number;
  groupCount: number;
  ownerMember: Member | undefined;
  isGroupDropTarget: boolean;
}
export const GroupCard = defineView<Props>(
  ["group", "gIdx", "groupCount", "ownerMember", "isGroupDropTarget"],
  (props, _viewContext) => {
    const ctx = useGroupCardContext();
    const t = useT();
    const detailsOpen = computed(
      () => ctx.value.openDetailsKey === `details-${props.gIdx}`
    );
    return () => (
      <div
        class={`theme-border transition-all duration-150 ${props.isGroupDropTarget ? "ring-2 ring-amber-400" : ""}`}
        style={{
          borderRadius: "var(--dt-border-radius)",
          backgroundColor:
            "color-mix(in srgb, var(--dt-text) 3%, var(--dt-card-bg))",
        }}
        data-drag-item
        data-drop-group={props.gIdx}
      >
        {/* グループヘッダー */}
        <div
          class="flex items-center gap-2 px-3 sm:px-4 py-2"
          style={{
            backgroundColor: props.ownerMember
              ? `${props.ownerMember.color}15`
              : "transparent",
            borderBottom: "1px solid var(--dt-table-border-light)",
          }}
        >
          <div class="flex flex-col shrink-0 sm:hidden">
            <button
              type="button"
              onClick={() => ctx.value.onMoveGroup(props.gIdx, -1)}
              disabled={props.gIdx === 0}
              class="p-0.5 disabled:opacity-20"
              style={{ color: "var(--dt-text-muted)" }}
              aria-label={t("group.moveGroupUp")}
            >
              <ArrowUp class="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => ctx.value.onMoveGroup(props.gIdx, 1)}
              disabled={props.gIdx === props.groupCount - 1}
              class="p-0.5 disabled:opacity-20"
              style={{ color: "var(--dt-text-muted)" }}
              aria-label={t("group.moveGroupDown")}
            >
              <ArrowDown class="size-3.5" />
            </button>
          </div>
          <DragGrip
            {...ctx.value.dragHandle({ kind: "group", gIdx: props.gIdx })}
          />
          {/* 絵文字（と担当者の色）を押すと、その下に変える欄が開く */}
          <button
            type="button"
            onClick={() => ctx.value.onToggleDetails(`details-${props.gIdx}`)}
            aria-expanded={detailsOpen.value}
            aria-label={
              ctx.value.isTaskMode
                ? t("group.emojiOf", { n: props.gIdx + 1 })
                : t("group.emojiAndColorOf", { n: props.gIdx + 1 })
            }
            class="relative shrink-0 flex items-center gap-0.5 rounded-lg pl-1 pr-0.5 py-0.5 transition-colors hover:bg-black/5"
          >
            <span class="text-lg leading-none select-none" aria-hidden="true">
              {props.group.emoji}
            </span>
            {!ctx.value.isTaskMode && props.ownerMember && (
              <span
                aria-hidden="true"
                class="absolute left-4 bottom-0 size-2.5 rounded-full border border-white"
                style={{ backgroundColor: props.ownerMember.color }}
              />
            )}
            <ChevronDown
              class="size-3 transition-transform"
              style={{
                color: "var(--dt-text-muted)",
                transform: detailsOpen.value ? "rotate(180deg)" : undefined,
              }}
              aria-hidden="true"
            />
          </button>

          {ctx.value.isTaskMode ? (
            <div class="flex-1 min-w-0">
              <input
                type="text"
                value={props.group.tasks[0] ?? ""}
                onInput={e =>
                  ctx.value.onUpdateTask(
                    props.gIdx,
                    0,
                    (e.target as HTMLInputElement).value
                  )
                }
                maxlength={LIMITS.task}
                placeholder={t("group.taskNamePlaceholder")}
                class="w-full theme-border px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium"
                style={{
                  borderRadius: "var(--dt-border-radius-sm)",
                  backgroundColor: "var(--dt-button-bg)",
                }}
                aria-label={t("group.taskNameOf", { n: props.gIdx + 1 })}
              />
            </div>
          ) : (
            <div class="flex-1 min-w-0 flex items-center gap-2">
              {!props.ownerMember && (
                <span
                  class="text-xs font-bold"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("group.noOwner")}
                </span>
              )}
              {props.ownerMember && (
                <>
                  <input
                    type="text"
                    value={props.ownerMember.name}
                    onInput={e =>
                      ctx.value.onMemberNameChange(
                        props.ownerMember!.id,
                        (e.target as HTMLInputElement).value
                      )
                    }
                    maxlength={LIMITS.memberName}
                    placeholder={t("group.namePlaceholder")}
                    class="flex-1 min-w-0 theme-border px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium"
                    style={{
                      borderRadius: "var(--dt-border-radius-sm)",
                      backgroundColor: "var(--dt-button-bg)",
                    }}
                    aria-label={t("group.memberNameOf", { n: props.gIdx + 1 })}
                  />
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => ctx.value.onRemoveGroup(props.gIdx)}
            class="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 shrink-0"
            style={{ color: "#DC2626" }}
            disabled={props.groupCount <= 1}
            aria-label={t("group.deleteGroup", { n: props.gIdx + 1 })}
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* 詳細設定（絵文字・色変更） */}
        {detailsOpen.value && (
          <div
            class="px-3 sm:px-4 py-2 flex flex-col gap-2"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--dt-text) 5%, var(--dt-card-bg))",
              borderBottom: "1px solid var(--dt-table-border-light)",
            }}
          >
            <div class="flex items-center gap-2">
              <span
                class="text-xs font-bold shrink-0"
                style={{ color: "var(--dt-text-muted)" }}
              >
                {t("group.emoji")}
              </span>
              <input
                type="text"
                value={props.group.emoji}
                onInput={e =>
                  ctx.value.onUpdateEmoji(
                    props.gIdx,
                    (e.target as HTMLInputElement).value
                  )
                }
                maxlength={LIMITS.emoji}
                class="w-12 text-center text-lg theme-border px-1 py-0.5"
                style={{
                  borderRadius: "6px",
                  backgroundColor: "var(--dt-button-bg)",
                }}
                aria-label={t("group.changeEmoji", { n: props.gIdx + 1 })}
              />
            </div>
            {!ctx.value.isTaskMode && props.ownerMember && (
              <div>
                <div
                  class="text-xs font-bold block mb-1"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("group.color")}
                </div>
                <ColorPalette
                  member={props.ownerMember}
                  onPresetSelect={ctx.value.onColorPreset}
                  onCustomColor={ctx.value.onColorCustom}
                />
              </div>
            )}
          </div>
        )}

        {/* タスク一覧 / メンバー一覧 */}
        <div
          class="flex flex-col gap-2 px-3 sm:px-4 pb-3 sm:pb-4 pt-2"
          // 仕事の行を、ほかの仕事の余白に落とすと、その仕事の最後に入る
          data-drop-zone={ctx.value.isTaskMode ? undefined : props.gIdx}
        >
          {ctx.value.isTaskMode ? (
            <TaskModeMembers group={props.group} gIdx={props.gIdx} />
          ) : (
            <AssigneeModeTaskList group={props.group} gIdx={props.gIdx} />
          )}
        </div>
      </div>
    );
  }
);
const TaskModeMembers = defineView<{
  group: TaskGroup;
  gIdx: number;
}>(["group", "gIdx"], (props, _viewContext) => {
  const ctx = useGroupCardContext();
  const t = useT();
  const isImplicitAll = computed(() => !props.group.memberIds);
  const groupMemberIds = computed(
    () => props.group.memberIds ?? ctx.value.activeMemberIds
  );
  const groupMembers = computed(() =>
    groupMemberIds.value
      .map(id => ctx.value.membersById.get(id))
      .filter((m): m is Member => !!m)
  );
  const unassignedMembers = computed(() =>
    ctx.value.activeMembers.filter(
      member => !groupMemberIds.value.includes(member.id)
    )
  );
  return () => (
    <div class="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
      {isImplicitAll.value && ctx.value.activeMembers.length > 0 && (
        <div class="flex items-center gap-2 mb-1">
          <span
            class="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#D1FAE5", color: "#064E3B" }}
          >
            {t("group.everyone")}
          </span>
          <button
            type="button"
            onClick={() => ctx.value.onSetExplicitMembers(props.gIdx)}
            class="text-xs font-bold hover:underline"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("group.chooseMembers")}
          </button>
        </div>
      )}
      {!isImplicitAll.value &&
        groupMembers.value.map((member, mIdx) => {
          const drop =
            ctx.value.dropMemberTarget?.gIdx === props.gIdx &&
            ctx.value.dropMemberTarget.idx === mIdx
              ? ctx.value.dropMemberTarget
              : null;
          const colorKey = `task-${props.gIdx}-${member.id}`;
          return (
            <div key={member.id}>
              <div
                class="relative flex items-center gap-2 transition-all duration-150"
                data-drag-item
                data-drop-member={`${props.gIdx}:${mIdx}`}
              >
                {drop && <DropLine after={drop.after} />}
                <div class="flex flex-col shrink-0 sm:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      ctx.value.onReorderMember(props.gIdx, mIdx, -1)
                    }
                    disabled={mIdx === 0}
                    class="p-0.5 disabled:opacity-20"
                    style={{ color: "var(--dt-text-muted)" }}
                    aria-label={t("group.moveUp")}
                  >
                    <ChevronUp class="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ctx.value.onReorderMember(props.gIdx, mIdx, 1)
                    }
                    disabled={mIdx === groupMembers.value.length - 1}
                    class="p-0.5 disabled:opacity-20"
                    style={{ color: "var(--dt-text-muted)" }}
                    aria-label={t("group.moveDown")}
                  >
                    <ChevronDown class="size-3.5" />
                  </button>
                </div>
                <DragGrip
                  {...ctx.value.dragHandle({
                    kind: "member",
                    gIdx: props.gIdx,
                    mIdx,
                  })}
                />
                <button
                  type="button"
                  onClick={() => ctx.value.onToggleColor(colorKey)}
                  class="size-6 sm:size-7 rounded-full shrink-0 theme-border transition-transform hover:scale-110"
                  style={{ backgroundColor: member.color, borderWidth: "2px" }}
                  aria-label={t("group.changeColor")}
                />
                <input
                  type="text"
                  value={member.name}
                  onInput={e =>
                    ctx.value.onMemberNameChange(
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
                  }}
                  aria-label={t("group.memberName")}
                />
                <button
                  type="button"
                  onClick={() =>
                    ctx.value.onRemoveMemberFromGroup(props.gIdx, member.id)
                  }
                  class="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-30"
                  style={{ color: "#DC2626" }}
                  disabled={groupMembers.value.length <= 1}
                  aria-label={t("group.excludeMember", { name: member.name })}
                >
                  <X class="size-3.5" aria-hidden="true" />
                </button>
              </div>
              <div class="pl-7 sm:pl-[1.75rem]">
                {ctx.value.openColorKey === colorKey && (
                  <div class="mt-1.5 mb-1">
                    <ColorPalette
                      member={member}
                      onPresetSelect={ctx.value.onColorPreset}
                      onCustomColor={ctx.value.onColorCustom}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      {!isImplicitAll.value && (
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => ctx.value.onResetToAllMembers(props.gIdx)}
            class="text-xs font-bold hover:underline"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("group.resetToAll")}
          </button>
          {unassignedMembers.value.length > 0 && (
            <button
              type="button"
              onClick={() =>
                ctx.value.onAddMemberToGroup(
                  props.gIdx,
                  unassignedMembers.value[0].id
                )
              }
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold hover:bg-black/5 rounded-lg transition-colors"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              <Plus class="size-3.5" aria-hidden="true" />{" "}
              {t("group.addMember")}
            </button>
          )}
          <button
            type="button"
            onClick={() => ctx.value.onAddNewMemberToGroup(props.gIdx)}
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold hover:bg-black/5 rounded-lg transition-colors"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            <Plus class="size-3.5" aria-hidden="true" /> {t("group.newMember")}
          </button>
        </div>
      )}
    </div>
  );
});
const AssigneeModeTaskList = defineView<{
  group: TaskGroup;
  gIdx: number;
}>(["group", "gIdx"], (props, _viewContext) => {
  const ctx = useGroupCardContext();
  const t = useT();
  return () => (
    <>
      {props.group.tasks.map((task, tIdx) => {
        const drop =
          ctx.value.dropTarget?.gIdx === props.gIdx &&
          ctx.value.dropTarget.idx === tIdx
            ? ctx.value.dropTarget
            : null;
        return (
          <div
            key={`${props.group.id}-t${tIdx}`}
            class="relative flex items-center gap-2 transition-all duration-150"
            data-drag-item
            data-drop-task={`${props.gIdx}:${tIdx}`}
          >
            {drop && <DropLine after={drop.after} />}
            <div class="flex flex-col shrink-0 sm:hidden">
              <button
                type="button"
                onClick={() => ctx.value.onMoveTask(props.gIdx, tIdx, -1)}
                disabled={tIdx === 0}
                class="p-0.5 disabled:opacity-20"
                style={{ color: "var(--dt-text-muted)" }}
                aria-label={t("group.moveUp")}
              >
                <ChevronUp class="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => ctx.value.onMoveTask(props.gIdx, tIdx, 1)}
                disabled={tIdx === props.group.tasks.length - 1}
                class="p-0.5 disabled:opacity-20"
                style={{ color: "var(--dt-text-muted)" }}
                aria-label={t("group.moveDown")}
              >
                <ChevronDown class="size-3.5" />
              </button>
            </div>
            <DragGrip
              {...ctx.value.dragHandle({
                kind: "task",
                gIdx: props.gIdx,
                tIdx,
              })}
            />
            <input
              type="text"
              value={task}
              onInput={e =>
                ctx.value.onUpdateTask(
                  props.gIdx,
                  tIdx,
                  (e.target as HTMLInputElement).value
                )
              }
              maxlength={LIMITS.task}
              placeholder={t("group.taskNamePlaceholder")}
              class="flex-1 min-w-0 theme-border px-3 py-2 text-sm font-medium"
              style={{
                borderRadius: "var(--dt-border-radius-sm)",
                backgroundColor: "var(--dt-button-bg)",
              }}
              aria-label={t("group.taskAt", { g: props.gIdx + 1, t: tIdx + 1 })}
            />
            <button
              type="button"
              onClick={() => ctx.value.onRemoveTask(props.gIdx, tIdx)}
              class="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              style={{ color: "#DC2626" }}
              aria-label={t("group.deleteTask", {
                task: task || t("group.emptyTask"),
              })}
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => ctx.value.onAddTask(props.gIdx)}
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold self-start hover:bg-black/5 rounded-lg transition-colors"
        style={{ color: "var(--dt-text-secondary)" }}
      >
        <Plus class="size-3.5" aria-hidden="true" /> {t("group.addTask")}
      </button>
    </>
  );
});
const DragGrip = defineView<{
  onPointerdown: (e: PointerEvent) => void;
}>(["onPointerdown"], (props, _viewContext) => {
  return () => (
    <span
      {...props}
      data-drag-grip
      class="shrink-0 -m-1.5 p-1.5 cursor-grab active:cursor-grabbing touch-none select-none"
      style={{ color: "var(--dt-text-muted)" }}
      aria-hidden="true"
    >
      <GripVertical class="size-4" />
    </span>
  );
});
const DropLine = defineView<{
  after: boolean;
}>(["after"], (props, _viewContext) => {
  return () => (
    <div
      class={`absolute left-0 right-0 h-0.5 rounded-full ${props.after ? "-bottom-1.5" : "-top-1.5"}`}
      style={{ backgroundColor: "var(--dt-focus-ring)" }}
    />
  );
});
