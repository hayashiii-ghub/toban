import { createContext, useContext } from "react";
import type { Member } from "@/rotation/types";

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
  // グループDnD
  dragGroupIdx: number | null;
  onGroupDragStart: (e: React.DragEvent, gIdx: number) => void;
  onGroupDragEnd: () => void;
  onGroupReorderDragOver: (e: React.DragEvent, gIdx: number) => void;
  onGroupReorderDrop: (e: React.DragEvent, gIdx: number) => void;
  // タスクDnD
  dragTask: { gIdx: number; tIdx: number } | null;
  dropTarget: { gIdx: number; tIdx: number } | null;
  onTaskDragStart: (e: React.DragEvent, gIdx: number, tIdx: number) => void;
  onTaskDragOver: (e: React.DragEvent, gIdx: number, tIdx: number) => void;
  onTaskDrop: (e: React.DragEvent, gIdx: number, tIdx: number) => void;
  onTaskDragEnd: () => void;
  onGroupDragOver: (e: React.DragEvent) => void;
  onGroupDropZone: (e: React.DragEvent, gIdx: number) => void;
  // メンバーDnD（タスクモード）
  dragMember: { gIdx: number; mIdx: number } | null;
  dropMemberTarget: { gIdx: number; mIdx: number } | null;
  onMemberDragStart: (e: React.DragEvent, gIdx: number, mIdx: number) => void;
  onMemberDragOver: (e: React.DragEvent, gIdx: number, mIdx: number) => void;
  onMemberDrop: (e: React.DragEvent, gIdx: number, mIdx: number) => void;
  onMemberDragEnd: () => void;
}

const GroupCardContext = createContext<GroupCardContextValue | null>(null);

export const GroupCardProvider = GroupCardContext.Provider;

export function useGroupCardContext(): GroupCardContextValue {
  const ctx = useContext(GroupCardContext);
  if (!ctx) {
    throw new Error("useGroupCardContext must be used within a GroupCardProvider");
  }
  return ctx;
}
