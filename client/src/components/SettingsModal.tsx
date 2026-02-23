import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, GripVertical, Save, ArrowRight } from "lucide-react";
import type { TaskGroup, Member } from "@/rotation/types";
import { MEMBER_PRESETS } from "@/rotation/constants";
import { computeAssignments, generateId, deepClone } from "@/rotation/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  scheduleName: string;
  groups: TaskGroup[];
  members: Member[];
  onSave: (name: string, groups: TaskGroup[], members: Member[]) => void;
  onClose: () => void;
  onCopyAsDefault?: () => void;
  onResetToDefault?: () => void;
}

export function SettingsModal({
  scheduleName,
  groups,
  members,
  onSave,
  onClose,
  onCopyAsDefault,
  onResetToDefault,
}: Props) {
  const [editName, setEditName] = useState(scheduleName);
  const [editGroups, setEditGroups] = useState<TaskGroup[]>(deepClone(groups));
  const [editMembers, setEditMembers] = useState<Member[]>(deepClone(members));
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

  // --- 現在の割り当てプレビュー計算 ---
  const previewAssignments = useMemo(() => {
    const validMembers = editMembers.filter((m) => m.name.trim() !== "");
    const validGroups = editGroups
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.trim() !== "") }))
      .filter((g) => g.tasks.length > 0);
    if (validMembers.length === 0 || validGroups.length === 0) return [];
    return computeAssignments(validGroups, validMembers, 0);
  }, [editGroups, editMembers]);

  const handleEscape = useCallback(() => onClose(), [onClose]);
  useEscapeKey(handleEscape);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
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

  const updateMemberColor = (idx: number, presetIdx: number) => {
    const preset = MEMBER_PRESETS[presetIdx];
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
    onSave(editName.trim() || scheduleName, cleanedGroups, cleanedMembers);
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
        className="brutal-border brutal-shadow w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: "#fff", borderRadius: "16px" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <h2 id="settings-title" className="text-lg font-extrabold" style={{ color: "#1a1a1a" }}>設定</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="閉じる">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* 当番表名 */}
        <div className="px-5 py-3" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <label htmlFor="schedule-name-input" className="text-xs font-bold mb-1.5 block" style={{ color: "#888" }}>当番表の名前</label>
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

        {/* タブ */}
        <div className="grid grid-cols-2" style={{ borderBottom: "3px solid #1a1a1a" }} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "tasks"}
            aria-controls="panel-tasks"
            className="py-3 text-sm font-bold transition-colors"
            style={{
              backgroundColor: activeTab === "tasks" ? "#FBBF24" : "transparent",
              color: "#1a1a1a",
              borderRight: "1.5px solid #1a1a1a",
            }}
            onClick={() => setActiveTab("tasks")}
          >
            タスク
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "members"}
            aria-controls="panel-members"
            className="py-3 text-sm font-bold transition-colors"
            style={{
              backgroundColor: activeTab === "members" ? "#FBBF24" : "transparent",
              color: "#1a1a1a",
              borderLeft: "1.5px solid #1a1a1a",
            }}
            onClick={() => setActiveTab("members")}
          >
            担当者
          </button>
        </div>

        {/* バリデーションエラー */}
        {validationError && (
          <div className="mx-5 mt-3 px-3 py-2 text-xs font-bold rounded-lg" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }} role="alert">
            {validationError}
          </div>
        )}

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "tasks" ? (
            <div id="panel-tasks" role="tabpanel" className="flex flex-col gap-5">
              {editGroups.map((group, gIdx) => (
                <div
                  key={group.id}
                  className="brutal-border p-4"
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
                      <div>
                        <span className="text-sm font-extrabold" style={{ color: "#666" }}>
                          グループ {gIdx + 1}
                        </span>
                        {(() => {
                          const match = previewAssignments.find((a) => a.group.id === group.id);
                          if (!match) return null;
                          return (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white"
                                style={{ backgroundColor: match.member.color }}
                              >
                                {match.member.name.charAt(0)}
                              </span>
                              <span className="text-[10px] font-bold" style={{ color: match.member.color }}>
                                {match.member.name}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
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

                  <div
                    className="flex flex-col gap-2"
                    onDragOver={handleGroupDragOver}
                    onDrop={(e) => handleGroupDropZone(e, gIdx)}
                  >
                    {group.tasks.map((task, tIdx) => {
                      const isDragging = dragTask?.gIdx === gIdx && dragTask?.tIdx === tIdx;
                      const isDropTarget = dropTarget?.gIdx === gIdx && dropTarget?.tIdx === tIdx;
                      return (
                        <div
                          key={`${group.id}-t${tIdx}`}
                          className={`flex items-center gap-2 transition-all duration-150 ${
                            isDragging ? "opacity-30 scale-95" : ""
                          } ${isDropTarget ? "translate-y-1" : ""}`}
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, gIdx, tIdx)}
                          onDragOver={(e) => handleTaskDragOver(e, gIdx, tIdx)}
                          onDrop={(e) => { e.stopPropagation(); handleTaskDrop(e, gIdx, tIdx); }}
                          onDragEnd={handleTaskDragEnd}
                        >
                          {isDropTarget && (
                            <div
                              className="absolute left-0 right-0 h-0.5 -top-1.5 rounded-full"
                              style={{ backgroundColor: "#FBBF24" }}
                            />
                          )}
                          <GripVertical
                            className="w-4 h-4 shrink-0 cursor-grab active:cursor-grabbing"
                            style={{ color: "#bbb" }}
                            aria-hidden="true"
                          />
                          <input
                            type="text"
                            value={task}
                            onChange={(e) => updateTask(gIdx, tIdx, e.target.value)}
                            placeholder="タスク名を入力"
                            className="flex-1 brutal-border px-3 py-2 text-sm font-medium"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold self-start hover:bg-gray-100 rounded-lg transition-colors"
                      style={{ color: "#666" }}
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" /> タスクを追加
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addGroup}
                className="brutal-border brutal-shadow-sm flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{ backgroundColor: "#E8E8E8", borderRadius: "10px" }}
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> グループを追加
              </button>
            </div>
          ) : (
            <div id="panel-members" role="tabpanel" className="flex flex-col gap-4">
              {/* 割り当てプレビュー */}
              {previewAssignments.length > 0 && (
                <div
                  className="brutal-border p-3"
                  style={{ borderRadius: "10px", backgroundColor: "#FFFBEB", borderColor: "#FBBF24" }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#92700C" }}>
                    現在の割り当て（初期）
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {previewAssignments.map(({ group, member }, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-bold">
                        <span
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white brutal-border"
                          style={{ backgroundColor: member.color, borderWidth: "2px" }}
                        >
                          {member.name.charAt(0)}
                        </span>
                        <span style={{ color: member.color }}>{member.name}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "#bbb" }} aria-hidden="true" />
                        <span className="text-sm" aria-hidden="true">{group.emoji}</span>
                        <span style={{ color: "#555" }}>{group.tasks.join("・")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* メンバーリスト */}
              {editMembers.map((member, mIdx) => {
                const isDragging = dragMemberIdx === mIdx;
                const isDropTarget = dropMemberIdx === mIdx;
                return (
                  <div
                    key={member.id}
                    className={`brutal-border p-4 flex flex-col gap-3 transition-all duration-150 ${
                      isDragging ? "opacity-30 scale-[0.97]" : ""
                    } ${isDropTarget ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}
                    style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                    draggable
                    onDragStart={(e) => handleMemberDragStart(e, mIdx)}
                    onDragOver={(e) => handleMemberDragOver(e, mIdx)}
                    onDrop={(e) => handleMemberDrop(e, mIdx)}
                    onDragEnd={handleMemberDragEnd}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical
                        className="w-4 h-4 shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ color: "#bbb" }}
                        aria-hidden="true"
                      />
                      <div
                        className="brutal-border w-10 h-10 flex items-center justify-center font-extrabold text-sm shrink-0"
                        style={{
                          backgroundColor: member.color,
                          borderRadius: "50%",
                          color: "#fff",
                        }}
                        aria-hidden="true"
                      >
                        {member.name ? member.name.charAt(0) : "?"}
                      </div>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateMemberName(mIdx, e.target.value)}
                        placeholder="名前を入力"
                        className="flex-1 brutal-border px-3 py-2 text-sm font-bold"
                        style={{ borderRadius: "8px", backgroundColor: "#fff" }}
                        aria-label={`担当者${mIdx + 1}の名前`}
                      />
                      <button
                        onClick={() => removeMember(mIdx)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-30"
                        style={{ color: "#EF4444" }}
                        disabled={editMembers.length <= 1}
                        aria-label={`担当者「${member.name || "未入力"}」を削除`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* カラーパレット */}
                    <div className="flex items-center gap-1.5 pl-[4.25rem]" role="radiogroup" aria-label={`${member.name || "担当者"}のカラー選択`}>
                      {MEMBER_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                          style={{
                            backgroundColor: preset.color,
                            border: member.color === preset.color ? "3px solid #1a1a1a" : "2px solid #ddd",
                            transform: member.color === preset.color ? "scale(1.15)" : "scale(1)",
                          }}
                          onClick={() => updateMemberColor(mIdx, pIdx)}
                          role="radio"
                          aria-checked={member.color === preset.color}
                          aria-label={`カラー${pIdx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={addMember}
                className="brutal-border brutal-shadow-sm flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{ backgroundColor: "#E8E8E8", borderRadius: "10px" }}
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> 担当者を追加
              </button>
            </div>
          )}
        </div>

        {/* 保存ボタン・デフォルト用コピー */}
        <div className="px-5 py-4 flex flex-col gap-2" style={{ borderTop: "3px solid #1a1a1a" }}>
          <button
            onClick={handleSave}
            className="brutal-border brutal-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
            style={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
          >
            <Save className="w-4 h-4" aria-hidden="true" /> 保存する
          </button>
          {onCopyAsDefault && (
            <button
              type="button"
              onClick={onCopyAsDefault}
              className="text-xs font-bold hover:underline"
              style={{ color: "#666" }}
            >
              現在の画面の状態をデフォルト用にコピー
            </button>
          )}
          {onResetToDefault && (
            <button
              type="button"
              onClick={onResetToDefault}
              className="text-xs font-bold hover:underline"
              style={{ color: "#666" }}
            >
              デフォルトの状態に戻す
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
