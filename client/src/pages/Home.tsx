import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCw, RotateCcw, Printer, Settings,
  Plus, Trash2, GripVertical, Edit3,
} from "lucide-react";
import type { TaskGroup, Member, Schedule, AppState, ScheduleTemplate } from "@/rotation/types";
import {
  ANIMATION_DURATION_MS,
  CARD_STAGGER_DELAY,
  TASK_STAGGER_DELAY,
} from "@/rotation/constants";
import {
  loadState,
  saveState,
  createScheduleFromTemplate,
  computeAssignments,
  getGridCols,
} from "@/rotation/utils";
import { DEFAULT_APP_STATE } from "@/rotation/defaultState";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { SettingsModal } from "@/components/SettingsModal";

export default function Home() {
  const [state, setState] = useState<AppState>(loadState);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeSchedule = useMemo(() => {
    return state.schedules.find((s) => s.id === state.activeScheduleId) ?? state.schedules[0];
  }, [state.schedules, state.activeScheduleId]);

  const { rotation, groups, members } = activeSchedule;

  const assignments = useMemo(
    () => computeAssignments(groups, members, rotation),
    [groups, members, rotation]
  );

  const isAnyModalOpen = showSettings || showNewSchedule || confirmDelete !== null;
  useBodyScrollLock(isAnyModalOpen);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const updateActiveSchedule = useCallback((updater: (s: Schedule) => Schedule) => {
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s) =>
        s.id === prev.activeScheduleId ? updater(s) : s
      ),
    }));
  }, []);

  const handleRotate = useCallback((dir: "forward" | "backward") => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setState((prev) => {
      const schedule = prev.schedules.find((s) => s.id === prev.activeScheduleId);
      if (!schedule || schedule.members.length === 0) return prev;
      const len = schedule.members.length;
      const newRotation = dir === "forward"
        ? (schedule.rotation + 1) % len
        : (schedule.rotation - 1 + len) % len;
      return {
        ...prev,
        schedules: prev.schedules.map((s) =>
          s.id === prev.activeScheduleId ? { ...s, rotation: newRotation } : s
        ),
      };
    });
    setTimeout(() => setIsAnimating(false), ANIMATION_DURATION_MS);
  }, [isAnimating]);

  const handleAddSchedule = useCallback((template: ScheduleTemplate) => {
    const newSchedule = createScheduleFromTemplate(template);
    setState((prev) => ({
      schedules: [...prev.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    }));
    setShowNewSchedule(false);
  }, []);

  const handleDeleteSchedule = useCallback((id: string) => {
    setState((prev) => {
      if (prev.schedules.length <= 1) return prev;
      const remaining = prev.schedules.filter((s) => s.id !== id);
      return {
        schedules: remaining,
        activeScheduleId: prev.activeScheduleId === id ? remaining[0].id : prev.activeScheduleId,
      };
    });
    setConfirmDelete(null);
  }, []);

  const handleTabDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleTabDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTabId(id);
  }, []);

  const handleTabDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDraggedTabId((currentDragged) => {
      if (!currentDragged || currentDragged === targetId) return null;
      setState((prev) => {
        const schedules = [...prev.schedules];
        const fromIdx = schedules.findIndex((s) => s.id === currentDragged);
        const toIdx = schedules.findIndex((s) => s.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const [moved] = schedules.splice(fromIdx, 1);
        schedules.splice(toIdx, 0, moved);
        return { ...prev, schedules };
      });
      return null;
    });
    setDragOverTabId(null);
  }, []);

  const handleTabDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, []);

  const handleSaveName = useCallback(() => {
    if (tempName.trim()) {
      updateActiveSchedule((s) => ({ ...s, name: tempName.trim() }));
    }
    setEditingName(false);
  }, [tempName, updateActiveSchedule]);

  const handleSaveSettings = useCallback((newName: string, newGroups: TaskGroup[], newMembers: Member[]) => {
    updateActiveSchedule((s) => ({
      ...s,
      name: newName,
      groups: newGroups,
      members: newMembers,
      rotation: newMembers.length > 0 ? s.rotation % newMembers.length : 0,
    }));
    setShowSettings(false);
  }, [updateActiveSchedule]);

  const rotationLabel = rotation === 0 ? "初期" : `${rotation}回目`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      {/* ===== 印刷用スタイル ===== */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          html, body {
            width: 297mm;
            height: 210mm;
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            overflow: hidden;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 2px solid #333 !important;
          }
          .print-header {
            border: none !important;
            box-shadow: none !important;
          }
          .min-h-screen {
            min-height: auto !important;
            width: 297mm;
            height: 210mm;
            padding: 8mm 12mm !important;
            box-sizing: border-box;
            overflow: hidden;
          }
          .print-card-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            gap: 12px !important;
          }
        }
        @media screen { .print-only { display: none; } }
      `}</style>

      {/* ===== ヘッダー ===== */}
      <header className="pt-6 sm:pt-8 pb-8 px-3 sm:px-4 print-header">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {editingName ? (
              <div className="flex items-center justify-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  onBlur={handleSaveName}
                  className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-center brutal-border px-3 py-1"
                  style={{ color: "#1a1a1a", borderRadius: "8px", backgroundColor: "#fff", maxWidth: "400px" }}
                  aria-label="当番表の名前を編集"
                />
              </div>
            ) : (
              <button
                className="group inline-flex items-center gap-2 no-print"
                onClick={() => {
                  setTempName(activeSchedule.name);
                  setEditingName(true);
                }}
                aria-label={`「${activeSchedule.name}」の名前を編集`}
              >
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "#1a1a1a" }}>
                  {activeSchedule.name}
                </h1>
                <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" aria-hidden="true" />
              </button>
            )}
            <h1 className="print-only text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "#1a1a1a" }}>
              {activeSchedule.name}
            </h1>

            <div className="print-only mt-2 text-sm font-bold" style={{ color: "#666" }}>
              ローテーション: {rotationLabel} ／ 印刷日: {new Date().toLocaleDateString("ja-JP")}
            </div>
          </motion.div>
        </div>
      </header>

      {/* ===== 当番表切り替えタブ ===== */}
      <div className="px-3 sm:px-4 pb-2 no-print">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="当番表の切り替え">
            <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist">
              {state.schedules.map((schedule) => (
                <button
                  key={schedule.id}
                  role="tab"
                  aria-selected={schedule.id === state.activeScheduleId}
                  aria-label={`${schedule.name}タブ`}
                  draggable
                  onDragStart={(e) => handleTabDragStart(e, schedule.id)}
                  onDragOver={(e) => handleTabDragOver(e, schedule.id)}
                  onDrop={(e) => handleTabDrop(e, schedule.id)}
                  onDragEnd={handleTabDragEnd}
                  onClick={() => setState((prev) => ({ ...prev, activeScheduleId: schedule.id }))}
                  className={`brutal-border shrink-0 px-3 py-1.5 text-xs sm:text-sm font-bold transition-all duration-150 flex items-center gap-1.5 ${
                    schedule.id === state.activeScheduleId
                      ? "brutal-shadow-sm"
                      : "opacity-70 hover:opacity-100"
                  } ${
                    dragOverTabId === schedule.id && draggedTabId !== schedule.id ? "ring-2 ring-yellow-400 ring-offset-1" : ""
                  } ${
                    draggedTabId === schedule.id ? "opacity-50" : ""
                  }`}
                  style={{
                    backgroundColor: schedule.id === state.activeScheduleId ? "#FBBF24" : "#fff",
                    borderRadius: "8px",
                    cursor: "grab",
                  }}
                >
                  <GripVertical className="w-3 h-3 opacity-40" aria-hidden="true" />
                  {schedule.name}
                </button>
              ))}
              <button
                onClick={() => setShowNewSchedule(true)}
                className="brutal-border shrink-0 px-2.5 py-1.5 text-xs sm:text-sm font-bold transition-all duration-150 hover:bg-gray-100"
                style={{ borderRadius: "8px", backgroundColor: "#fff" }}
                aria-label="新しい当番表を追加"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* ===== ローテーション制御 ===== */}
      <div className="px-3 sm:px-4 py-3 no-print">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="brutal-border brutal-shadow p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4"
            style={{ backgroundColor: "#FBBF24", borderRadius: "12px" }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="brutal-border w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center font-extrabold text-base sm:text-lg"
                style={{ backgroundColor: "#fff", borderRadius: "50%" }}
                aria-label={`現在のローテーション回数: ${rotation}`}
              >
                {rotation}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold" style={{ color: "#1a1a1a" }}>現在のローテーション</div>
                <div className="text-[10px] sm:text-xs font-medium" style={{ color: "#7C5E00" }}>{rotationLabel}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              <button
                onClick={() => handleRotate("backward")}
                disabled={isAnimating}
                className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                style={{ backgroundColor: "#fff", borderRadius: "8px" }}
                aria-label="ローテーションを1つ戻す"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" /> 戻す
              </button>
              <button
                onClick={() => handleRotate("forward")}
                disabled={isAnimating}
                className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                style={{ backgroundColor: "#1a1a1a", borderRadius: "8px" }}
                aria-label="ローテーションを1つ進める"
              >
                次へ回す <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => window.print()}
                className="brutal-border brutal-shadow-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
                style={{ backgroundColor: "#fff", borderRadius: "8px" }}
                aria-label="当番表を印刷する"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="brutal-border brutal-shadow-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
                style={{ backgroundColor: "#fff", borderRadius: "8px" }}
                aria-label="当番表の設定を開く"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              </button>
              {state.schedules.length > 1 && (
                <button
                  onClick={() => setConfirmDelete(activeSchedule.id)}
                  className="brutal-border brutal-shadow-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
                  style={{ backgroundColor: "#FEE2E2", borderRadius: "8px", color: "#DC2626" }}
                  aria-label="この当番表を削除する"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== 担当カード ===== */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto">
          <div className={`grid gap-3 md:gap-4 print-card-grid ${getGridCols(groups.length)}`}>
            <AnimatePresence mode="wait">
              {assignments.map(({ group, member }, idx) => (
                <motion.div
                  key={`${member.id}-${group.id}-${rotation}`}
                  className="brutal-border brutal-shadow print-card overflow-hidden"
                  style={{ borderRadius: "16px", backgroundColor: "#fff" }}
                  initial={{
                    x: direction === "forward" ? 40 : -40,
                    opacity: 0,
                    scale: 0.95,
                  }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: idx * CARD_STAGGER_DELAY,
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                  }}
                >
                  <div
                    className="px-3 sm:px-4 py-3 sm:py-4 text-center"
                    style={{ backgroundColor: member.color }}
                  >
                    <div
                      className="brutal-border w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 flex items-center justify-center font-extrabold text-sm sm:text-base"
                      style={{ backgroundColor: "#fff", borderRadius: "50%", color: member.color }}
                      aria-hidden="true"
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-white">
                      {member.name}
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2">
                    {group.tasks.map((task, tIdx) => (
                      <motion.div
                        key={`${group.id}-task-${tIdx}`}
                        className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 font-bold text-xs sm:text-sm"
                        style={{
                          backgroundColor: member.bgColor,
                          borderRadius: "8px",
                          border: `2px solid ${member.color}40`,
                          color: member.textColor,
                        }}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * CARD_STAGGER_DELAY + tIdx * TASK_STAGGER_DELAY + 0.2, duration: 0.3 }}
                      >
                        <span className="text-lg" aria-hidden="true">{group.emoji}</span>
                        <span>{task}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ===== ローテーション早見表 ===== */}
      <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="brutal-border brutal-shadow-sm p-3 sm:p-5 print-card"
            style={{ backgroundColor: "#fff", borderRadius: "12px" }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <h2 className="text-xs sm:text-sm font-extrabold mb-3 sm:mb-4 tracking-wider uppercase" style={{ color: "#999" }}>
              ローテーション早見表
            </h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs sm:text-sm border-collapse" aria-label="ローテーション早見表">
                <thead>
                  <tr>
                    <th
                      className="text-left py-2 sm:py-2.5 px-2 sm:px-3 font-extrabold text-[10px] sm:text-xs"
                      style={{ color: "#1a1a1a", borderBottom: "3px solid #1a1a1a" }}
                      scope="col"
                    >
                      回
                    </th>
                    {groups.map((group) => (
                      <th
                        key={group.id}
                        className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-[10px] sm:text-xs"
                        style={{ color: "#666", borderBottom: "3px solid #1a1a1a" }}
                        scope="col"
                      >
                        <span className="text-sm sm:text-base" aria-hidden="true">{group.emoji}</span>
                        <br />
                        <span className="text-[9px] sm:text-[10px] leading-tight">
                          {group.tasks.join("・")}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((_, rotIdx) => {
                    const rowAssignments = computeAssignments(groups, members, rotIdx);
                    const isCurrent = rotIdx === rotation;
                    return (
                      <tr
                        key={rotIdx}
                        style={{
                          backgroundColor: isCurrent ? "#FBBF24" : "transparent",
                          fontWeight: isCurrent ? 800 : 500,
                        }}
                        aria-current={isCurrent ? "true" : undefined}
                      >
                        <td
                          className="py-2 sm:py-2.5 px-2 sm:px-3 font-bold text-[10px] sm:text-xs whitespace-nowrap"
                          style={{ borderTop: "2px solid #e5e5e5" }}
                        >
                          {rotIdx === 0 ? "初期" : `${rotIdx}回目`}
                          {isCurrent && " ◀"}
                        </td>
                        {rowAssignments.map(({ member }, gIdx) => (
                          <td
                            key={gIdx}
                            className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-xs sm:text-sm"
                            style={{
                              borderTop: "2px solid #e5e5e5",
                              color: member.color,
                            }}
                          >
                            {member.name}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== モーダル（Portal） ===== */}
      {createPortal(
        <AnimatePresence>
          {showNewSchedule && (
            <NewScheduleModal
              onSelect={handleAddSchedule}
              onClose={() => setShowNewSchedule(false)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {confirmDelete && (
            <ConfirmDeleteDialog
              scheduleName={state.schedules.find((s) => s.id === confirmDelete)?.name ?? ""}
              onConfirm={() => handleDeleteSchedule(confirmDelete)}
              onCancel={() => setConfirmDelete(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              scheduleName={activeSchedule.name}
              groups={groups}
              members={members}
              onSave={handleSaveSettings}
              onClose={() => setShowSettings(false)}
              onCopyAsDefault={() => {
                navigator.clipboard.writeText(JSON.stringify(state, null, 2));
              }}
              onResetToDefault={() => {
                setState(DEFAULT_APP_STATE);
                saveState(DEFAULT_APP_STATE);
                setShowSettings(false);
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
