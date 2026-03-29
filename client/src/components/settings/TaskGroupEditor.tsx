import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import type { AssignmentMode, TaskGroup, Member } from "@/rotation/types";
import { MEMBER_PRESETS, colorPresetFromHex } from "@/rotation/constants";
import { generateId, deepClone } from "@/rotation/utils";
import { GroupCard } from "./GroupCard";
import { GroupCardProvider, type GroupCardContextValue } from "./GroupCardContext";
import { BulkMemberAdd } from "./BulkMemberAdd";

interface Props {
  groups: TaskGroup[];
  members: Member[];
  onGroupsChange: (groups: TaskGroup[]) => void;
  onMembersChange: (members: Member[]) => void;
  assignmentMode?: AssignmentMode;
}

export function TaskGroupEditor({ groups, members, onGroupsChange, onMembersChange, assignmentMode }: Props) {
  const isTaskMode = assignmentMode === "task";
  const activeMembers = useMemo(
    () => members.filter((member) => member.name.trim() && !member.skipped),
    [members],
  );
  const activeMemberIds = useMemo(
    () => activeMembers.map((member) => member.id),
    [activeMembers],
  );
  const membersById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  // --- 詳細展開 ---
  const [openDetailsKey, setOpenDetailsKey] = useState<string | null>(null);
  const handleToggleDetails = (key: string) => setOpenDetailsKey(openDetailsKey === key ? null : key);

  // --- 一括追加 ---
  const [bulkMode, setBulkMode] = useState(members.length <= 1);

  // --- カラーパレット ---
  const [openColorKey, setOpenColorKey] = useState<string | null>(null);
  const handleToggleColor = (key: string) => setOpenColorKey(openColorKey === key ? null : key);

  const updateMemberColor = (memberId: string, presetIdx: number) => {
    const preset = MEMBER_PRESETS[presetIdx];
    onMembersChange(members.map((m) => (m.id === memberId ? { ...m, ...preset } : m)));
    setOpenColorKey(null);
  };

  const updateMemberColorCustom = (memberId: string, hex: string) => {
    const preset = colorPresetFromHex(hex);
    onMembersChange(members.map((m) => (m.id === memberId ? { ...m, ...preset } : m)));
  };

  const updateMemberName = (memberId: string, name: string) => {
    onMembersChange(members.map((m) => (m.id === memberId ? { ...m, name } : m)));
  };

  // --- タスクドラッグ&ドロップ ---
  const [dragTask, setDragTask] = useState<{ gIdx: number; tIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ gIdx: number; tIdx: number } | null>(null);

  const handleTaskDragStart = (e: React.DragEvent, gIdx: number, tIdx: number) => {
    setDragTask({ gIdx, tIdx });
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
    }
  };

  const handleTaskDragOver = (e: React.DragEvent, gIdx: number, tIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragTask) return;
    if (dragTask.gIdx !== gIdx || dragTask.tIdx !== tIdx) {
      setDropTarget({ gIdx, tIdx });
    } else {
      setDropTarget(null);
    }
  };

  const handleTaskDrop = (e: React.DragEvent, targetGIdx: number, targetTIdx: number) => {
    e.preventDefault();
    if (!dragTask) return;
    const { gIdx: srcGIdx, tIdx: srcTIdx } = dragTask;
    if (srcGIdx === targetGIdx && srcTIdx === targetTIdx) {
      setDragTask(null);
      setDropTarget(null);
      return;
    }
    const next = deepClone(groups);
    const [movedTask] = next[srcGIdx].tasks.splice(srcTIdx, 1);
    next[targetGIdx].tasks.splice(targetTIdx, 0, movedTask);
    onGroupsChange(next);
    setDragTask(null);
    setDropTarget(null);
  };

  const handleTaskDragEnd = () => {
    setDragTask(null);
    setDropTarget(null);
  };

  const handleGroupDropZone = (e: React.DragEvent, gIdx: number) => {
    e.preventDefault();
    if (!dragTask) return;
    const { gIdx: srcGIdx, tIdx: srcTIdx } = dragTask;
    const next = deepClone(groups);
    const [movedTask] = next[srcGIdx].tasks.splice(srcTIdx, 1);
    next[gIdx].tasks.push(movedTask);
    onGroupsChange(next);
    setDragTask(null);
    setDropTarget(null);
  };

  const handleGroupDragOver = (e: React.DragEvent) => {
    if (!dragTask) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // --- グループ並べ替えドラッグ&ドロップ ---
  const [dragGroupIdx, setDragGroupIdx] = useState<number | null>(null);
  const [dropGroupIdx, setDropGroupIdx] = useState<number | null>(null);

  const handleGroupDragStart = (e: React.DragEvent, gIdx: number) => {
    e.stopPropagation();
    setDragGroupIdx(gIdx);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
    }
  };

  const handleGroupReorderDragOver = (e: React.DragEvent, gIdx: number) => {
    if (dragGroupIdx === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropGroupIdx(dragGroupIdx !== gIdx ? gIdx : null);
  };

  const handleGroupReorderDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragGroupIdx === null || dragGroupIdx === targetIdx) {
      setDragGroupIdx(null);
      setDropGroupIdx(null);
      return;
    }
    const nextGroups = [...groups];
    const [movedGroup] = nextGroups.splice(dragGroupIdx, 1);
    nextGroups.splice(targetIdx, 0, movedGroup);
    if (!isTaskMode) {
      const nextMembers = [...members];
      const [movedMember] = nextMembers.splice(dragGroupIdx, 1);
      nextMembers.splice(targetIdx, 0, movedMember);
      onMembersChange(nextMembers);
    }
    onGroupsChange(nextGroups);
    setDragGroupIdx(null);
    setDropGroupIdx(null);
  };

  const handleGroupReorderDragEnd = () => {
    setDragGroupIdx(null);
    setDropGroupIdx(null);
  };

  // --- メンバー行ドラッグ&ドロップ（タスクモード用） ---
  const [dragMember, setDragMember] = useState<{ gIdx: number; mIdx: number } | null>(null);
  const [dropMemberTarget, setDropMemberTarget] = useState<{ gIdx: number; mIdx: number } | null>(null);

  const handleMemberDragStart = (e: React.DragEvent, gIdx: number, mIdx: number) => {
    e.stopPropagation();
    setDragMember({ gIdx, mIdx });
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
    }
  };

  const handleMemberDragOver = (e: React.DragEvent, gIdx: number, mIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (!dragMember || dragMember.gIdx !== gIdx) return;
    if (dragMember.mIdx !== mIdx) {
      setDropMemberTarget({ gIdx, mIdx });
    } else {
      setDropMemberTarget(null);
    }
  };

  const handleMemberDrop = (e: React.DragEvent, targetGIdx: number, targetMIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragMember || dragMember.gIdx !== targetGIdx) {
      setDragMember(null);
      setDropMemberTarget(null);
      return;
    }
    const { mIdx: srcMIdx } = dragMember;
    if (srcMIdx === targetMIdx) {
      setDragMember(null);
      setDropMemberTarget(null);
      return;
    }
    const next = deepClone(groups);
    const group = next[targetGIdx];
    const memberIds = group.memberIds ?? [...activeMemberIds];
    const [moved] = memberIds.splice(srcMIdx, 1);
    memberIds.splice(targetMIdx, 0, moved);
    group.memberIds = memberIds;
    onGroupsChange(next);
    setDragMember(null);
    setDropMemberTarget(null);
  };

  const handleMemberDragEnd = () => {
    setDragMember(null);
    setDropMemberTarget(null);
  };

  // --- メンバーグループ操作（タスクモード） ---
  const removeMemberFromGroup = (gIdx: number, memberId: string) => {
    const next = deepClone(groups);
    const group = next[gIdx];
    const memberIds = group.memberIds ?? activeMemberIds;
    group.memberIds = memberIds.filter(id => id !== memberId);
    onGroupsChange(next);
  };

  const addMemberToGroup = (gIdx: number, memberId: string) => {
    const next = deepClone(groups);
    const group = next[gIdx];
    const memberIds = group.memberIds ?? activeMemberIds;
    group.memberIds = [...memberIds, memberId];
    onGroupsChange(next);
  };

  const addNewMemberToGroup = (gIdx: number) => {
    const preset = MEMBER_PRESETS[members.length % MEMBER_PRESETS.length];
    const newMember: Member = { id: generateId("m"), name: "", ...preset };
    onMembersChange([...members, newMember]);
    const next = deepClone(groups);
    const group = next[gIdx];
    const memberIds = group.memberIds ?? activeMemberIds;
    group.memberIds = [...memberIds, newMember.id];
    onGroupsChange(next);
  };

  const setExplicitMembers = (gIdx: number) => {
    const next = [...groups];
    next[gIdx] = { ...next[gIdx], memberIds: activeMemberIds };
    onGroupsChange(next);
  };

  const resetToAllMembers = (gIdx: number) => {
    const next = [...groups];
    const { memberIds: _, ...rest } = next[gIdx];
    next[gIdx] = rest as TaskGroup;
    onGroupsChange(next);
  };

  const reorderMember = (gIdx: number, mIdx: number, direction: -1 | 1) => {
    const newIdx = mIdx + direction;
    const next = deepClone(groups);
    const ids = next[gIdx].memberIds ?? [...activeMemberIds];
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[mIdx], ids[newIdx]] = [ids[newIdx], ids[mIdx]];
    next[gIdx].memberIds = ids;
    onGroupsChange(next);
  };

  // --- グループ操作ヘルパー ---
  const moveGroup = (gIdx: number, direction: -1 | 1) => {
    const newIdx = gIdx + direction;
    if (newIdx < 0 || newIdx >= groups.length) return;
    const nextGroups = [...groups];
    [nextGroups[gIdx], nextGroups[newIdx]] = [nextGroups[newIdx], nextGroups[gIdx]];
    if (!isTaskMode) {
      const nextMembers = [...members];
      [nextMembers[gIdx], nextMembers[newIdx]] = [nextMembers[newIdx], nextMembers[gIdx]];
      onMembersChange(nextMembers);
    }
    onGroupsChange(nextGroups);
  };

  const moveTask = (gIdx: number, tIdx: number, direction: -1 | 1) => {
    const next = deepClone(groups);
    const tasks = next[gIdx].tasks;
    const newIdx = tIdx + direction;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    [tasks[tIdx], tasks[newIdx]] = [tasks[newIdx], tasks[tIdx]];
    onGroupsChange(next);
  };

  const addGroup = () => {
    if (isTaskMode) {
      const newGroup: TaskGroup = { id: generateId("g"), tasks: ["新しいタスク"], emoji: "✨" };
      if (activeMemberIds.length > 0) newGroup.memberIds = activeMemberIds;
      onGroupsChange([...groups, newGroup]);
    } else {
      const preset = MEMBER_PRESETS[members.length % MEMBER_PRESETS.length];
      const newMember: Member = { id: generateId("m"), name: "", ...preset };
      const newGroup: TaskGroup = { id: generateId("g"), tasks: ["新しいタスク"], emoji: "✨" };
      onMembersChange([...members, newMember]);
      onGroupsChange([...groups, newGroup]);
    }
  };

  const removeGroup = (idx: number) => {
    if (groups.length <= 1) return;
    if (!isTaskMode) {
      onMembersChange(members.filter((_, i) => i !== idx));
    }
    onGroupsChange(groups.filter((_, i) => i !== idx));
  };

  const updateGroupEmoji = (gIdx: number, emoji: string) => {
    onGroupsChange(groups.map((g, i) => i === gIdx ? { ...g, emoji } : g));
  };

  const addTask = (gIdx: number) => {
    onGroupsChange(groups.map((g, i) => i === gIdx ? { ...g, tasks: [...g.tasks, ""] } : g));
  };

  const updateTask = (gIdx: number, tIdx: number, value: string) => {
    onGroupsChange(
      groups.map((g, i) =>
        i === gIdx ? { ...g, tasks: g.tasks.map((t, j) => (j === tIdx ? value : t)) } : g
      )
    );
  };

  const removeTask = (gIdx: number, tIdx: number) => {
    onGroupsChange(
      groups.map((g, i) =>
        i === gIdx ? { ...g, tasks: g.tasks.filter((_, j) => j !== tIdx) } : g
      )
    );
  };

  const contextValue: GroupCardContextValue = {
    isTaskMode,
    activeMembers,
    activeMemberIds,
    membersById,
    openDetailsKey,
    onToggleDetails: handleToggleDetails,
    openColorKey,
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
    dragGroupIdx,
    onGroupDragStart: handleGroupDragStart,
    onGroupDragEnd: handleGroupReorderDragEnd,
    onGroupReorderDragOver: handleGroupReorderDragOver,
    onGroupReorderDrop: handleGroupReorderDrop,
    dragTask,
    dropTarget,
    onTaskDragStart: handleTaskDragStart,
    onTaskDragOver: handleTaskDragOver,
    onTaskDrop: handleTaskDrop,
    onTaskDragEnd: handleTaskDragEnd,
    onGroupDragOver: handleGroupDragOver,
    onGroupDropZone: handleGroupDropZone,
    dragMember,
    dropMemberTarget,
    onMemberDragStart: handleMemberDragStart,
    onMemberDragOver: handleMemberDragOver,
    onMemberDrop: handleMemberDrop,
    onMemberDragEnd: handleMemberDragEnd,
  };

  return (
    <div className="flex flex-col gap-3">
      <GroupCardProvider value={contextValue}>
        <div className={`flex flex-col gap-3 ${groups.length > 8 ? "max-h-[400px] overflow-y-auto pr-1" : ""}`}>
          {groups.map((group, gIdx) => (
            <GroupCard
              key={group.id}
              group={group}
              gIdx={gIdx}
              groupCount={groups.length}
              ownerMember={!isTaskMode ? members[gIdx] : undefined}
              isGroupDragging={dragGroupIdx === gIdx}
              isGroupDropTarget={dropGroupIdx === gIdx}
            />
          ))}
        </div>
      </GroupCardProvider>

      <div className="flex items-center gap-2">
        <button
          onClick={addGroup}
          className="theme-border theme-shadow-sm flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
          style={{ backgroundColor: "#E8E8E8", borderRadius: "10px" }}
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> {isTaskMode ? "タスクを追加" : "担当者を追加"}
        </button>
        <button
          onClick={() => setBulkMode((v) => !v)}
          className="theme-border theme-shadow-sm flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
          style={{ backgroundColor: bulkMode ? "var(--dt-current-highlight)" : "#E8E8E8", borderRadius: "10px" }}
        >
          📋 一括追加
        </button>
      </div>

      {bulkMode && (
        <BulkMemberAdd
          members={members}
          groups={groups}
          activeMemberIds={activeMemberIds}
          isTaskMode={isTaskMode}
          onMembersChange={onMembersChange}
          onGroupsChange={onGroupsChange}
          onClose={() => setBulkMode(false)}
        />
      )}
    </div>
  );
}
