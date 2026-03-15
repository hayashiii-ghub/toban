import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, GripVertical, Save, Palette, ChevronDown, Copy, ChevronUp, UserX, UserCheck } from "lucide-react";
import type { TaskGroup, Member, RotationConfig } from "@/rotation/types";
import { MEMBER_PRESETS, colorPresetFromHex } from "@/rotation/constants";
import { computeAssignments, generateId, deepClone } from "@/rotation/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  scheduleName: string;
  groups: TaskGroup[];
  members: Member[];
  rotationConfig?: RotationConfig;
  canDelete: boolean;
  onSave: (name: string, groups: TaskGroup[], members: Member[], rotationConfig?: RotationConfig) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SettingsModal({
  scheduleName,
  groups,
  members,
  rotationConfig,
  canDelete,
  onSave,
  onDuplicate,
  onDelete,
  onClose,
}: Props) {
  const [editName, setEditName] = useState(scheduleName);
  const [editGroups, setEditGroups] = useState<TaskGroup[]>(deepClone(groups));
  const [editMembers, setEditMembers] = useState<Member[]>(deepClone(members));
  const [editRotationConfig, setEditRotationConfig] = useState<RotationConfig>(
    rotationConfig ?? { mode: "manual" }
  );
  const [activeTab, setActiveTab] = useState<"tasks" | "members">("tasks");
  const [validationError, setValidationError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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
    setEditGroups((prev) => {
      const next = deepClone(prev);
      const [movedTask] = next[srcGIdx].tasks.splice(srcTIdx, 1);
      next[targetGIdx].tasks.splice(targetTIdx, 0, movedTask);
      return next;
    });
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
    setEditGroups((prev) => {
      const next = deepClone(prev);
      const [movedTask] = next[srcGIdx].tasks.splice(srcTIdx, 1);
      next[gIdx].tasks.push(movedTask);
      return next;
    });
    setDragTask(null);
    setDropTarget(null);
  };

  const handleGroupDragOver = (e: React.DragEvent) => {
    if (!dragTask) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // --- メンバードラッグ&ドロップ ---
  const [dragMemberIdx, setDragMemberIdx] = useState<number | null>(null);
  const [dropMemberIdx, setDropMemberIdx] = useState<number | null>(null);

  const handleMemberDragStart = (e: React.DragEvent, idx: number) => {
    setDragMemberIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 24);
    }
  };

  const handleMemberDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragMemberIdx !== null && dragMemberIdx !== idx) {
      setDropMemberIdx(idx);
    } else {
      setDropMemberIdx(null);
    }
  };

  const handleMemberDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragMemberIdx === null || dragMemberIdx === targetIdx) {
      setDragMemberIdx(null);
      setDropMemberIdx(null);
      return;
    }
    setEditMembers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragMemberIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragMemberIdx(null);
    setDropMemberIdx(null);
  };

  const handleMemberDragEnd = () => {
    setDragMemberIdx(null);
    setDropMemberIdx(null);
  };

  // --- タスク上下移動（タッチデバイス用） ---
  const moveTask = (gIdx: number, tIdx: number, direction: -1 | 1) => {
    setEditGroups((prev) => {
      const next = deepClone(prev);
      const tasks = next[gIdx].tasks;
      const newIdx = tIdx + direction;
      if (newIdx < 0 || newIdx >= tasks.length) return prev;
      [tasks[tIdx], tasks[newIdx]] = [tasks[newIdx], tasks[tIdx]];
      return next;
    });
  };

  // --- メンバー上下移動（タッチデバイス用） ---
  const moveMember = (mIdx: number, direction: -1 | 1) => {
    setEditMembers((prev) => {
      const newIdx = mIdx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[mIdx], next[newIdx]] = [next[newIdx], next[mIdx]];
      return next;
    });
  };

  // --- 割り当てマップ（グループIDX → 担当メンバー） ---
  const assignmentMap = useMemo(() => {
    const validMembers = editMembers.filter((m) => m.name.trim() !== "" && !m.skipped);
    const validGroups = editGroups
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.trim() !== "") }))
      .filter((g) => g.tasks.length > 0);
    if (validMembers.length === 0 || validGroups.length === 0) return new Map<string, Member>();
    const assignments = computeAssignments(validGroups, validMembers, 0);
    const map = new Map<string, Member>();
    for (const { group, member } of assignments) {
      map.set(group.id, member);
    }
    return map;
  }, [editGroups, editMembers]);

  // --- 担当者ピッカー ---
  const [openPickerIdx, setOpenPickerIdx] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // ピッカー外クリックで閉じる
  useEffect(() => {
    if (openPickerIdx === null) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPickerIdx(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPickerIdx]);

  // --- 未保存変更の検知 ---
  const isDirty = useMemo(() => {
    if (editName !== scheduleName) return true;
    if (JSON.stringify(editGroups) !== JSON.stringify(groups)) return true;
    if (JSON.stringify(editMembers) !== JSON.stringify(members)) return true;
    if (JSON.stringify(editRotationConfig) !== JSON.stringify(rotationConfig ?? { mode: "manual" })) return true;
    return false;
  }, [editName, scheduleName, editGroups, groups, editMembers, members, editRotationConfig, rotationConfig]);

  const handleCloseWithCheck = useCallback(() => {
    if (isDirty) {
      if (window.confirm("変更が保存されていません。閉じますか？")) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const assignMemberToGroup = (gIdx: number, memberId: string) => {
    setEditMembers((prev) => {
      const targetIdx = prev.findIndex((m) => m.id === memberId);
      if (targetIdx === -1 || targetIdx === gIdx) return prev;
      const next = [...prev];
      [next[gIdx], next[targetIdx]] = [next[targetIdx], next[gIdx]];
      return next;
    });
    setOpenPickerIdx(null);
  };

  const handleEscape = useCallback(() => handleCloseWithCheck(), [handleCloseWithCheck]);
  useEscapeKey(handleEscape);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleCloseWithCheck();
    }
  };

  // --- タスクグループ操作 ---
  const addGroup = () => {
    setEditGroups((prev) => [
      ...prev,
      { id: generateId("g"), tasks: ["新しいタスク"], emoji: "✨" },
    ]);
  };

  const removeGroup = (idx: number) => {
    if (editGroups.length <= 1) return;
    setEditGroups((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateGroupEmoji = (gIdx: number, emoji: string) => {
    setEditGroups((prev) => prev.map((g, i) => i === gIdx ? { ...g, emoji } : g));
  };

  const addTask = (gIdx: number) => {
    setEditGroups((prev) =>
      prev.map((g, i) => i === gIdx ? { ...g, tasks: [...g.tasks, ""] } : g)
    );
  };

  const updateTask = (gIdx: number, tIdx: number, value: string) => {
    setEditGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx ? { ...g, tasks: g.tasks.map((t, j) => (j === tIdx ? value : t)) } : g
      )
    );
  };

  const removeTask = (gIdx: number, tIdx: number) => {
    setEditGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx ? { ...g, tasks: g.tasks.filter((_, j) => j !== tIdx) } : g
      )
    );
  };

  // --- メンバー操作 ---
  const addMember = () => {
    const preset = MEMBER_PRESETS[editMembers.length % MEMBER_PRESETS.length];
    setEditMembers((prev) => [
      ...prev,
      { id: generateId("m"), name: "", ...preset },
    ]);
  };

  const removeMember = (idx: number) => {
    if (editMembers.length <= 1) return;
    setEditMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMemberName = (idx: number, name: string) => {
    setEditMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, name } : m)));
  };

  const toggleMemberSkip = (idx: number) => {
    setEditMembers((prev) => prev.map((m, i) =>
      i === idx ? { ...m, skipped: !m.skipped } : m
    ));
  };

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const bulkNames = useMemo(
    () => bulkText.split("\n").map((s) => s.trim()).filter(Boolean),
    [bulkText]
  );

  const handleBulkAdd = () => {
    if (bulkNames.length === 0) return;
    setEditMembers((prev) => {
      const newMembers = bulkNames.map((name, i) => {
        const preset = MEMBER_PRESETS[(prev.length + i) % MEMBER_PRESETS.length];
        return { id: generateId("m"), name, ...preset };
      });
      return [...prev, ...newMembers];
    });
    setBulkText("");
    setBulkMode(false);
  };

  const [openColorIdx, setOpenColorIdx] = useState<number | null>(null);

  const updateMemberColorPreset = (idx: number, presetIdx: number) => {
    const preset = MEMBER_PRESETS[presetIdx];
    setEditMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...preset } : m))
    );
    setOpenColorIdx(null);
  };

  const updateMemberColorCustom = (idx: number, hex: string) => {
    const preset = colorPresetFromHex(hex);
    setEditMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...preset } : m))
    );
  };

  const handleSave = () => {
    setValidationError(null);
    const cleanedGroups = editGroups
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.trim() !== "") }))
      .filter((g) => g.tasks.length > 0);
    const cleanedMembers = editMembers.filter((m) => m.name.trim() !== "");

    if (cleanedGroups.length === 0) {
      setValidationError("タスクが1つ以上必要です。");
      setActiveTab("tasks");
      return;
    }
    if (cleanedMembers.length === 0) {
      setValidationError("担当者が1人以上必要です。");
      setActiveTab("members");
      return;
    }
    onSave(editName.trim() || scheduleName, cleanedGroups, cleanedMembers, editRotationConfig);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <motion.div
        ref={modalRef}
        className="brutal-border brutal-shadow w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
        style={{ backgroundColor: "#fff" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* モーダルヘッダー */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <h2 id="settings-title" className="text-lg font-extrabold" style={{ color: "#1a1a1a" }}>編集</h2>
          <button onClick={handleCloseWithCheck} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="閉じる">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* 当番表名 */}
        <div className="shrink-0 px-5 py-3" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <label htmlFor="schedule-name-input" className="text-sm font-bold mb-1.5 block" style={{ color: "#888" }}>当番表の名前</label>
          <input
            id="schedule-name-input"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full brutal-border px-3 py-2 text-sm font-bold"
            style={{ borderRadius: "8px", backgroundColor: "#FAFAFA" }}
            placeholder="例: 掃除当番、給食当番、日直..."
          />
        </div>

        {/* ローテーション設定 */}
        <div className="shrink-0 px-5 py-3" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <label className="text-sm font-bold mb-1.5 block" style={{ color: "#888" }}>ローテーション方式</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className="flex-1 brutal-border px-3 py-2 text-sm font-bold transition-colors"
              style={{
                borderRadius: "8px",
                backgroundColor: editRotationConfig.mode === "manual" ? "#FBBF24" : "#FAFAFA",
              }}
              onClick={() => setEditRotationConfig(prev => ({ ...prev, mode: "manual" }))}
            >
              手動
            </button>
            <button
              type="button"
              className="flex-1 brutal-border px-3 py-2 text-sm font-bold transition-colors"
              style={{
                borderRadius: "8px",
                backgroundColor: editRotationConfig.mode === "date" ? "#FBBF24" : "#FAFAFA",
              }}
              onClick={() => setEditRotationConfig(prev => ({ ...prev, mode: "date", startDate: prev.startDate || new Date().toISOString().split("T")[0], cycleDays: prev.cycleDays || 7 }))}
            >
              日付ベース
            </button>
          </div>
          {editRotationConfig.mode === "date" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold block mb-1" style={{ color: "#888" }}>開始日</label>
                <input
                  type="date"
                  value={editRotationConfig.startDate || ""}
                  onChange={(e) => setEditRotationConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full brutal-border px-3 py-2 text-sm font-medium"
                  style={{ borderRadius: "8px", backgroundColor: "#fff" }}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold block mb-1" style={{ color: "#888" }}>周期</label>
                <div className="flex gap-1">
                  {[
                    { label: "毎日", days: 1 },
                    { label: "毎週", days: 7 },
                    { label: "隔週", days: 14 },
                  ].map(({ label, days }) => (
                    <button
                      key={days}
                      type="button"
                      className="flex-1 brutal-border px-2 py-2 text-xs font-bold transition-colors"
                      style={{
                        borderRadius: "6px",
                        backgroundColor: editRotationConfig.cycleDays === days ? "#FBBF24" : "#fff",
                      }}
                      onClick={() => setEditRotationConfig(prev => ({ ...prev, cycleDays: days }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* タブ */}
        <div className="shrink-0 px-5 py-3" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <label className="text-sm font-bold mb-1.5 block" style={{ color: "#888" }}>タスク・担当者</label>
          <div className="flex gap-2" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "tasks"}
            aria-controls="panel-tasks"
            className="flex-1 brutal-border px-3 py-2 text-sm font-bold transition-colors"
            style={{
              borderRadius: "8px",
              backgroundColor: activeTab === "tasks" ? "#FBBF24" : "#FAFAFA",
              color: "#1a1a1a",
            }}
            onClick={() => setActiveTab("tasks")}
          >
            タスク
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "members"}
            aria-controls="panel-members"
            className="flex-1 brutal-border px-3 py-2 text-sm font-bold transition-colors"
            style={{
              borderRadius: "8px",
              backgroundColor: activeTab === "members" ? "#FBBF24" : "#FAFAFA",
              color: "#1a1a1a",
            }}
            onClick={() => setActiveTab("members")}
          >
            担当者
          </button>
          </div>
        </div>

        {/* バリデーションエラー */}
        {validationError && (
          <div className="mx-5 mt-3 px-3 py-2 text-sm font-bold rounded-lg" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }} role="alert">
            {validationError}
          </div>
        )}

        {/* コンテンツ */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {activeTab === "tasks" ? (
            /* ── タスクグループタブ ── */
            <div id="panel-tasks" role="tabpanel" className="flex flex-col gap-3">
              {editGroups.map((group, gIdx) => {
                const assignedMember = assignmentMap.get(group.id);
                const isPickerOpen = openPickerIdx === gIdx;
                return (
                  <div
                    key={group.id}
                    className="brutal-border p-3 sm:p-4"
                    style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={group.emoji}
                          onChange={(e) => updateGroupEmoji(gIdx, e.target.value)}
                          className="w-10 text-center text-lg brutal-border px-1 py-0.5"
                          style={{ borderRadius: "6px", backgroundColor: "#fff" }}
                          aria-label={`グループ${gIdx + 1}の絵文字`}
                        />
                        <span className="text-sm font-extrabold" style={{ color: "#666" }}>
                          グループ {gIdx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 割り当てバッジ（クリックでピッカー） */}
                        <div className="relative" ref={isPickerOpen ? pickerRef : undefined}>
                          {assignedMember ? (
                            <button
                              type="button"
                              onClick={() => setOpenPickerIdx(isPickerOpen ? null : gIdx)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold cursor-pointer transition-all hover:shadow-md"
                              style={{ backgroundColor: assignedMember.bgColor, color: assignedMember.color }}
                            >
                              <span
                                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white"
                                style={{ backgroundColor: assignedMember.color }}
                              >
                                {assignedMember.name.charAt(0)}
                              </span>
                              {assignedMember.name}
                              <ChevronDown className="w-3 h-3 ml-0.5" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOpenPickerIdx(isPickerOpen ? null : gIdx)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border-2 border-dashed cursor-pointer"
                              style={{ borderColor: "#ccc", color: "#999" }}
                            >
                              担当者を選択
                              <ChevronDown className="w-3 h-3 ml-0.5" aria-hidden="true" />
                            </button>
                          )}

                          {/* ドロップダウンピッカー */}
                          {isPickerOpen && (
                            <div
                              className="absolute right-0 top-full mt-1 z-10 brutal-border py-1 min-w-[140px] max-h-[200px] overflow-y-auto"
                              style={{ backgroundColor: "#fff", borderRadius: "10px", boxShadow: "4px 4px 0px #1a1a1a" }}
                            >
                              {editMembers.map((m, mIdx) => {
                                if (!m.name.trim()) return null;
                                const isCurrent = assignedMember?.id === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors text-left"
                                    style={{
                                      backgroundColor: isCurrent ? m.bgColor : "transparent",
                                      color: isCurrent ? m.color : "#333",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isCurrent) (e.currentTarget.style.backgroundColor = "#f5f5f5");
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isCurrent) (e.currentTarget.style.backgroundColor = "transparent");
                                    }}
                                    onClick={() => assignMemberToGroup(gIdx, m.id)}
                                  >
                                    <span
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white shrink-0"
                                      style={{ backgroundColor: m.color }}
                                    >
                                      {m.name.charAt(0)}
                                    </span>
                                    {m.name}
                                    {isCurrent && <span className="ml-auto text-xs">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => removeGroup(gIdx)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                          style={{ color: "#EF4444" }}
                          disabled={editGroups.length <= 1}
                          aria-label={`グループ${gIdx + 1}を削除`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="flex flex-col gap-2"
                      onDragOver={handleGroupDragOver}
                      onDrop={(e) => handleGroupDropZone(e, gIdx)}
                    >
                      {group.tasks.map((task, tIdx) => {
                        const isDragging = dragTask?.gIdx === gIdx && dragTask?.tIdx === tIdx;
                        const isTaskDropTarget = dropTarget?.gIdx === gIdx && dropTarget?.tIdx === tIdx;
                        return (
                          <div
                            key={`${group.id}-t${tIdx}`}
                            className={`flex items-center gap-2 transition-all duration-150 ${
                              isDragging ? "opacity-30 scale-95" : ""
                            } ${isTaskDropTarget ? "translate-y-1" : ""}`}
                            draggable
                            onDragStart={(e) => handleTaskDragStart(e, gIdx, tIdx)}
                            onDragOver={(e) => handleTaskDragOver(e, gIdx, tIdx)}
                            onDrop={(e) => { e.stopPropagation(); handleTaskDrop(e, gIdx, tIdx); }}
                            onDragEnd={handleTaskDragEnd}
                          >
                            {isTaskDropTarget && (
                              <div
                                className="absolute left-0 right-0 h-0.5 -top-1.5 rounded-full"
                                style={{ backgroundColor: "#FBBF24" }}
                              />
                            )}
                            <div className="flex flex-col shrink-0 touch-device-only sm:hidden">
                              <button
                                type="button"
                                onClick={() => moveTask(gIdx, tIdx, -1)}
                                disabled={tIdx === 0}
                                className="p-0.5 disabled:opacity-20"
                                style={{ color: "#999" }}
                                aria-label="上に移動"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveTask(gIdx, tIdx, 1)}
                                disabled={tIdx === group.tasks.length - 1}
                                className="p-0.5 disabled:opacity-20"
                                style={{ color: "#999" }}
                                aria-label="下に移動"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <GripVertical
                              className="w-4 h-4 shrink-0 cursor-grab active:cursor-grabbing hidden sm:block"
                              style={{ color: "#bbb" }}
                              aria-hidden="true"
                            />
                            <input
                              type="text"
                              value={task}
                              onChange={(e) => updateTask(gIdx, tIdx, e.target.value)}
                              placeholder="タスク名を入力"
                              className="flex-1 min-w-0 brutal-border px-3 py-2 text-sm font-medium"
                              style={{ borderRadius: "8px", backgroundColor: "#fff" }}
                              aria-label={`グループ${gIdx + 1}のタスク${tIdx + 1}`}
                            />
                            <button
                              onClick={() => removeTask(gIdx, tIdx)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              style={{ color: "#EF4444" }}
                              aria-label={`タスク「${task || "空"}」を削除`}
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => addTask(gIdx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold self-start hover:bg-gray-100 rounded-lg transition-colors"
                        style={{ color: "#666" }}
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" /> タスクを追加
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={addGroup}
                className="brutal-border brutal-shadow-sm flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{ backgroundColor: "#E8E8E8", borderRadius: "10px" }}
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> グループを追加
              </button>
            </div>
          ) : (
            /* ── 担当者タブ ── */
            <div id="panel-members" role="tabpanel" className="flex flex-col gap-5">
              <div
                className="brutal-border p-3 sm:p-4"
                style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
              >
                <div className="flex flex-col gap-2">
                  {editMembers.map((member, mIdx) => {
                    const isDragging = dragMemberIdx === mIdx;
                    const isDropMemberTarget = dropMemberIdx === mIdx;
                    const isColorOpen = openColorIdx === mIdx;
                    return (
                      <div key={member.id}>
                        <div
                          className={`flex items-center gap-2 transition-all duration-150 ${
                            isDragging ? "opacity-30 scale-95" : ""
                          } ${isDropMemberTarget ? "translate-y-1" : ""} ${member.skipped ? "opacity-50" : ""}`}
                          draggable
                          onDragStart={(e) => handleMemberDragStart(e, mIdx)}
                          onDragOver={(e) => handleMemberDragOver(e, mIdx)}
                          onDrop={(e) => handleMemberDrop(e, mIdx)}
                          onDragEnd={handleMemberDragEnd}
                        >
                          <div className="flex flex-col shrink-0 sm:hidden">
                            <button
                              type="button"
                              onClick={() => moveMember(mIdx, -1)}
                              disabled={mIdx === 0}
                              className="p-0.5 disabled:opacity-20"
                              style={{ color: "#999" }}
                              aria-label="上に移動"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveMember(mIdx, 1)}
                              disabled={mIdx === editMembers.length - 1}
                              className="p-0.5 disabled:opacity-20"
                              style={{ color: "#999" }}
                              aria-label="下に移動"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <GripVertical
                            className="w-4 h-4 shrink-0 cursor-grab active:cursor-grabbing hidden sm:block"
                            style={{ color: "#bbb" }}
                            aria-hidden="true"
                          />
                          <button
                            type="button"
                            onClick={() => setOpenColorIdx(isColorOpen ? null : mIdx)}
                            className="w-7 h-7 rounded-full shrink-0 brutal-border transition-transform hover:scale-110"
                            style={{ backgroundColor: member.color, borderWidth: "2px" }}
                            aria-label="色を変更"
                          />
                          <button
                            type="button"
                            onClick={() => toggleMemberSkip(mIdx)}
                            className="p-1.5 rounded-lg transition-colors shrink-0"
                            style={{ color: member.skipped ? "#EF4444" : "#10B981" }}
                            aria-label={member.skipped ? "スキップ解除" : "スキップする"}
                            title={member.skipped ? "スキップ解除" : "当番をスキップ"}
                          >
                            {member.skipped ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updateMemberName(mIdx, e.target.value)}
                            placeholder="名前を入力"
                            className="flex-1 min-w-0 brutal-border px-3 py-2 text-sm font-medium"
                            style={{ borderRadius: "8px", backgroundColor: "#fff", textDecoration: member.skipped ? "line-through" : "none" }}
                            aria-label={`担当者${mIdx + 1}の名前`}
                          />
                          <button
                            onClick={() => removeMember(mIdx)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-30"
                            style={{ color: "#EF4444" }}
                            disabled={editMembers.length <= 1}
                            aria-label={`担当者「${member.name || "未入力"}」を削除`}
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>

                        {/* インラインカラーパレット */}
                        {isColorOpen && (
                          <div className="flex items-center gap-1.5 pl-[1.75rem] mt-1.5 mb-1" role="radiogroup" aria-label="カラー選択">
                            {MEMBER_PRESETS.map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                                style={{
                                  backgroundColor: preset.color,
                                  border: member.color === preset.color ? "3px solid #1a1a1a" : "2px solid #ddd",
                                  transform: member.color === preset.color ? "scale(1.15)" : "scale(1)",
                                }}
                                onClick={() => updateMemberColorPreset(mIdx, pIdx)}
                                role="radio"
                                aria-checked={member.color === preset.color}
                                aria-label={`カラー${pIdx + 1}`}
                              />
                            ))}
                            <label
                              className="w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer hover:scale-110 transition-transform relative overflow-hidden"
                              style={{ borderColor: "#bbb" }}
                              aria-label="カスタムカラー"
                            >
                              <Palette className="w-3 h-3" style={{ color: "#999" }} aria-hidden="true" />
                              <input
                                type="color"
                                value={member.color}
                                onChange={(e) => updateMemberColorCustom(mIdx, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={addMember}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold hover:bg-gray-100 rounded-lg transition-colors"
                      style={{ color: "#666" }}
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" /> 担当者を追加
                    </button>
                    <button
                      onClick={() => setBulkMode((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold hover:bg-gray-100 rounded-lg transition-colors"
                      style={{ color: bulkMode ? "#1a1a1a" : "#666" }}
                    >
                      📋 一括追加
                    </button>
                  </div>

                  {bulkMode && (
                    <div className="flex flex-col gap-2 mt-1">
                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="名前を1行に1人ずつ入力"
                        rows={5}
                        className="brutal-border px-3 py-2 text-sm font-medium resize-none"
                        style={{ borderRadius: "8px", backgroundColor: "#fff" }}
                      />
                      {bulkNames.length > 0 && (
                        <p className="text-xs font-bold" style={{ color: "#666" }}>
                          {bulkNames.length}人を追加します
                        </p>
                      )}
                      <button
                        onClick={handleBulkAdd}
                        disabled={bulkNames.length === 0}
                        className="brutal-border brutal-shadow-sm flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                        style={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
                      >
                        追加する
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="shrink-0 px-5 py-4 flex flex-col gap-2" style={{ borderTop: "3px solid #1a1a1a" }}>
          <button
            onClick={handleSave}
            className="brutal-border brutal-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
            style={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
          >
            <Save className="w-4 h-4" aria-hidden="true" /> 保存する
          </button>
          <div className="flex gap-2">
            {canDelete && (
              <button
                onClick={onDelete}
                className="flex-1 brutal-border flex items-center justify-center gap-1.5 px-3 py-2.5 font-bold text-sm transition-colors hover:bg-red-50"
                style={{ color: "#DC2626", borderRadius: "8px" }}
                aria-label="この当番表を削除する"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" /> 削除
              </button>
            )}
            <button
              onClick={onDuplicate}
              className="flex-1 brutal-border flex items-center justify-center gap-1.5 px-3 py-2.5 font-bold text-sm transition-colors hover:bg-blue-50"
              style={{ color: "#3B82F6", borderRadius: "8px" }}
              aria-label="この当番表を複製する"
            >
              <Copy className="w-4 h-4" aria-hidden="true" /> 複製
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
