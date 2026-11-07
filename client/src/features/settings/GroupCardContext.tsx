import {
  computed,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
} from "vue";
import { defineView } from "@/lib/vue";
import type { Member } from "@/rotation/types";

/** 並べ替えで動かしているもの。仕事の順・仕事の中の行・仕事の担当者の順 */
export type EditorDragItem =
  | { kind: "group"; gIdx: number }
  | { kind: "task"; gIdx: number; tIdx: number }
  | { kind: "member"; gIdx: number; mIdx: number };

/** 落とす所の印。after なら、その行の後ろに入る */
export interface DropMark {
  gIdx: number;
  idx: number;
  after: boolean;
}

export interface GroupCardContextValue {
  // モード・メンバーデータ
  isTaskMode: boolean;
  activeMembers: Member[];
  activeMemberIds: string[];
  membersById: Map<string, Member>;
  // 詳細展開
  openDetailsKey: string | null;
  onToggleDetails: (key: string) => void;
  // カラーパレット
  openColorKey: string | null;
  onToggleColor: (key: string) => void;
  onColorPreset: (memberId: string, presetIdx: number) => void;
  onColorCustom: (memberId: string, hex: string) => void;
  // メンバー名
  onMemberNameChange: (memberId: string, name: string) => void;
  // グループ操作
  onMoveGroup: (gIdx: number, direction: -1 | 1) => void;
  onRemoveGroup: (idx: number) => void;
  onUpdateEmoji: (gIdx: number, emoji: string) => void;
  // タスク操作
  onAddTask: (gIdx: number) => void;
  onUpdateTask: (gIdx: number, tIdx: number, value: string) => void;
  onRemoveTask: (gIdx: number, tIdx: number) => void;
  onMoveTask: (gIdx: number, tIdx: number, direction: -1 | 1) => void;
  // メンバーグループ操作（タスクモード）
  onRemoveMemberFromGroup: (gIdx: number, memberId: string) => void;
  onAddMemberToGroup: (gIdx: number, memberId: string) => void;
  onAddNewMemberToGroup: (gIdx: number) => void;
  onSetExplicitMembers: (gIdx: number) => void;
  onResetToAllMembers: (gIdx: number) => void;
  onReorderMember: (gIdx: number, mIdx: number, direction: -1 | 1) => void;
  // 並べ替え（つまむ印の onPointerdown。usePointerDrag）
  dragHandle: (item: EditorDragItem) => {
    onPointerdown: (e: PointerEvent) => void;
  };
  dragging: EditorDragItem | null;
  dropTarget: DropMark | null;
  dropMemberTarget: DropMark | null;
}

const GroupCardContext: InjectionKey<ComputedRef<GroupCardContextValue>> =
  Symbol("GroupCardContext");

export const GroupCardProvider = defineView<{ value: GroupCardContextValue }>(
  ["value"],
  (props, context) => {
    provide(
      GroupCardContext,
      computed(() => props.value)
    );
    return () => context.slots.default?.();
  }
);

export function useGroupCardContext(): ComputedRef<GroupCardContextValue> {
  const context = inject(GroupCardContext);
  if (!context)
    throw new Error(
      "useGroupCardContext must be used within a GroupCardProvider"
    );
  return context;
}
