/*
 * 汎用ローテーション当番表アプリ
 * - 複数の当番表を作成・管理
 * - テンプレートから素早く作成
 * - ローテーション制御（次へ/戻す）
 * - ローカルストレージ保存
 * - 印刷対応（@media print）
 * - 担当者・タスク・当番表名の編集機能
 * - レスポンシブ対応
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCw, RotateCcw, Printer, Settings, X,
  Plus, Trash2, GripVertical, Save,
  FileText, Edit3, ArrowRight,
} from "lucide-react";
import type { TaskGroup, Member, Schedule, AppState, ScheduleTemplate } from "@/rotation/types";
import {
  ANIMATION_DURATION_MS,
  CARD_STAGGER_DELAY,
  TASK_STAGGER_DELAY,
  TEMPLATES,
  MEMBER_PRESETS,
} from "@/rotation/constants";
import {
  loadState,
  saveState,
  createScheduleFromTemplate,
  computeAssignments,
  getGridCols,
  generateId,
  deepClone,
} from "@/rotation/utils";
import { DEFAULT_APP_STATE } from "@/rotation/defaultState";

// ===== カスタムフック: Escキーでモーダルを閉じる =====
function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onEscape]);
}

// ===== カスタムフック: モーダル表示時にbodyスクロールをロック =====
function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isLocked]);
}

// ===== メインコンポーネント =====
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

  // 状態変更時にローカルストレージに保存
  useEffect(() => {
    saveState(state);
  }, [state]);

  // 名前編集開始
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
            {/* 当番表名（クリックで編集） */}
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

            {/* 印刷時のみ表示 */}
            <div className="print-only mt-2 text-sm font-bold" style={{ color: "#666" }}>
              ローテーション: {rotationLabel} ／ 印刷日: {new Date().toLocaleDateString("ja-JP")}
            </div>
          </motion.div>
        </div>
      </header>

      {/* ===== 当番表切り替えタブ（画面のみ） ===== */}
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

      {/* ===== ローテーション制御（画面のみ） ===== */}
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
                  {/* 担当者名ヘッダー */}
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

                  {/* タスクリスト */}
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

      {/* ===== 新規当番表作成モーダル（Portal） ===== */}
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

      {/* ===== 削除確認ダイアログ（Portal） ===== */}
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

      {/* ===== 設定モーダル（Portal） ===== */}
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

// ===== 削除確認ダイアログ =====
function ConfirmDeleteDialog({
  scheduleName,
  onConfirm,
  onCancel,
}: {
  scheduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const handleEscape = useCallback(() => onCancel(), [onCancel]);
  useEscapeKey(handleEscape);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="brutal-border brutal-shadow p-6 max-w-sm w-full mx-4"
        style={{ backgroundColor: "#fff", borderRadius: "16px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 flex items-center justify-center brutal-border"
            style={{ backgroundColor: "#FEE2E2", borderRadius: "50%" }}
          >
            <Trash2 className="w-5 h-5" style={{ color: "#DC2626" }} aria-hidden="true" />
          </div>
          <h3 id="delete-dialog-title" className="font-extrabold text-lg">当番表を削除</h3>
        </div>
        <p className="text-sm mb-6" style={{ color: "#555" }}>
          「{scheduleName}」を削除しますか？この操作は元に戻せません。
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="brutal-border brutal-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
            style={{ backgroundColor: "#fff", borderRadius: "10px" }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="brutal-border brutal-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
            style={{ backgroundColor: "#DC2626", borderRadius: "10px" }}
          >
            削除する
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== 新規当番表作成モーダル =====
function NewScheduleModal({
  onSelect,
  onClose,
}: {
  onSelect: (template: ScheduleTemplate) => void;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(() => onClose(), [onClose]);
  useEscapeKey(handleEscape);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
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
      aria-labelledby="new-schedule-title"
    >
      <motion.div
        ref={modalRef}
        className="brutal-border brutal-shadow w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: "#fff", borderRadius: "16px" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <h2 id="new-schedule-title" className="text-lg font-extrabold" style={{ color: "#1a1a1a" }}>
            <FileText className="w-5 h-5 inline-block mr-2 -mt-0.5" aria-hidden="true" />
            新しい当番表を作成
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="閉じる">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* テンプレート一覧 */}
        <div className="p-5 overflow-y-auto flex flex-col gap-3">
          <p className="text-xs font-bold mb-1" style={{ color: "#888" }}>
            テンプレートを選択してください。後から自由に編集できます。
          </p>
          {TEMPLATES.map((template, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(template)}
              className="brutal-border brutal-shadow-sm p-4 text-left transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
              style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{template.emoji}</span>
                <div>
                  <div className="text-sm font-extrabold" style={{ color: "#1a1a1a" }}>
                    {template.name}
                  </div>
                  <div className="text-[10px] font-medium mt-0.5" style={{ color: "#888" }}>
                    {template.groups.length}グループ ・ {template.members.length}人
                    {template.groups.length > 0 && (
                      <span> ・ {template.groups.map((g) => g.tasks.join("、")).join(" / ")}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== 設定モーダル =====
function SettingsModal({
  scheduleName,
  groups,
  members,
  onSave,
  onClose,
  onCopyAsDefault,
  onResetToDefault,
}: {
  scheduleName: string;
  groups: TaskGroup[];
  members: Member[];
  onSave: (name: string, groups: TaskGroup[], members: Member[]) => void;
  onClose: () => void;
  onCopyAsDefault?: () => void;
  onResetToDefault?: () => void;
}) {
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
    // ドラッグ中のゴースト画像を少し透過させる
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
      // 元のグループからタスクを取り出す
      const [movedTask] = next[srcGIdx].tasks.splice(srcTIdx, 1);
      // ターゲットグループに挿入
      next[targetGIdx].tasks.splice(targetTIdx, 0, movedTask);
      // 空になったグループは残す（タスクが0でも構造を維持）
      return next;
    });
    setDragTask(null);
    setDropTarget(null);
  };

  const handleTaskDragEnd = () => {
    setDragTask(null);
    setDropTarget(null);
  };

  // グループ末尾へのドロップ（タスクがない場所やリスト末尾）
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
                        {/* グループの担当者プレビュー */}
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
                          {/* ドロップインジケーター（上部） */}
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
