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

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCw, RotateCcw, Printer, Settings, X,
  Plus, Trash2, GripVertical, Save, Sparkles,
  ChevronDown,  FileText, Edit3,} from "lucide-react";

// ===== 型定義 =====
interface TaskGroup {
  id: string;
  tasks: string[];
  emoji: string;
}

interface Member {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
}

interface Schedule {
  id: string;
  name: string;
  rotation: number;
  groups: TaskGroup[];
  members: Member[];
}

interface AppState {
  schedules: Schedule[];
  activeScheduleId: string;
}

// ===== テンプレート =====
interface ScheduleTemplate {
  name: string;
  emoji: string;
  groups: TaskGroup[];
  members: Member[];
}

const TEMPLATES: ScheduleTemplate[] = [
  {
    name: "掃除当番",
    emoji: "🧹",
    groups: [
      { id: "g1", tasks: ["クイックルワイパー", "事務所掃除機"], emoji: "🧹" },
      { id: "g2", tasks: ["トイレ", "加湿器", "水回り"], emoji: "🚿" },
      { id: "g3", tasks: ["床（掃除機）", "ゴミ捨て"], emoji: "🗑️" },
    ],
    members: [
      { id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "松丸", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "山下", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ],
  },
  {
    name: "給食当番",
    emoji: "🍽️",
    groups: [
      { id: "g1", tasks: ["配膳"], emoji: "🍚" },
      { id: "g2", tasks: ["片付け", "台拭き"], emoji: "🧽" },
      { id: "g3", tasks: ["牛乳配り", "ストロー配り"], emoji: "🥛" },
    ],
    members: [
      { id: "m1", name: "1班", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "2班", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "3班", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ],
  },
  {
    name: "日直",
    emoji: "📋",
    groups: [
      { id: "g1", tasks: ["朝の会", "帰りの会"], emoji: "🎤" },
      { id: "g2", tasks: ["黒板消し", "日誌記入"], emoji: "📝" },
    ],
    members: [
      { id: "m1", name: "Aさん", color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
      { id: "m2", name: "Bさん", color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
    ],
  },
  {
    name: "受付当番",
    emoji: "🏢",
    groups: [
      { id: "g1", tasks: ["午前受付", "電話対応"], emoji: "📞" },
      { id: "g2", tasks: ["午後受付", "来客対応"], emoji: "🤝" },
      { id: "g3", tasks: ["郵便物", "備品管理"], emoji: "📦" },
    ],
    members: [
      { id: "m1", name: "佐藤", color: "#14B8A6", bgColor: "#CCFBF1", textColor: "#134E4A" },
      { id: "m2", name: "鈴木", color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
      { id: "m3", name: "高橋", color: "#6366F1", bgColor: "#E0E7FF", textColor: "#312E81" },
    ],
  },
  {
    name: "カスタム（空白）",
    emoji: "✨",
    groups: [
      { id: "g1", tasks: ["タスク1"], emoji: "📌" },
    ],
    members: [
      { id: "m1", name: "メンバー1", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
    ],
  },
];

const MEMBER_PRESETS = [
  { color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
  { color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
  { color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
  { color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
  { color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
  { color: "#14B8A6", bgColor: "#CCFBF1", textColor: "#134E4A" },
  { color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
  { color: "#6366F1", bgColor: "#E0E7FF", textColor: "#312E81" },
];

const STORAGE_KEY = "rotation-schedule-app-state";

// ===== ローカルストレージ =====
function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.schedules) && parsed.activeScheduleId) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  // デフォルト: 掃除当番テンプレートから1つ作成
  const defaultSchedule = createScheduleFromTemplate(TEMPLATES[0]);
  return { schedules: [defaultSchedule], activeScheduleId: defaultSchedule.id };
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function createScheduleFromTemplate(template: ScheduleTemplate): Schedule {
  return {
    id: `s${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: template.name,
    rotation: 0,
    groups: JSON.parse(JSON.stringify(template.groups)),
    members: JSON.parse(JSON.stringify(template.members)),
  };
}

// ===== メインコンポーネント =====
export default function Home() {
  const [state, setState] = useState<AppState>(loadState);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeSchedule = state.schedules.find((s) => s.id === state.activeScheduleId)
    || state.schedules[0];

  const { rotation, groups, members } = activeSchedule;

  // 状態変更時にローカルストレージに保存
  useEffect(() => {
    saveState(state);
  }, [state]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowScheduleMenu(false);
      }
    };
    if (showScheduleMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showScheduleMenu]);

  // 名前編集開始
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // ローテーションに基づいて割り当てを計算
  const getAssignments = useCallback((rot: number) => {
    return groups.map((group, i) => {
      const memberIdx = ((i + rot) % members.length + members.length) % members.length;
      return { group, member: members[memberIdx] };
    });
  }, [groups, members]);

  const assignments = getAssignments(rotation);

  const updateActiveSchedule = (updater: (s: Schedule) => Schedule) => {
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s) =>
        s.id === prev.activeScheduleId ? updater(s) : s
      ),
    }));
  };

  const handleRotate = (dir: "forward" | "backward") => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    updateActiveSchedule((s) => ({
      ...s,
      rotation: dir === "forward"
        ? (s.rotation + 1) % s.members.length
        : (s.rotation - 1 + s.members.length) % s.members.length,
    }));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleAddSchedule = (template: ScheduleTemplate) => {
    const newSchedule = createScheduleFromTemplate(template);
    setState((prev) => ({
      schedules: [...prev.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    }));
    setShowNewSchedule(false);
    setShowScheduleMenu(false);
  };

  const handleDeleteSchedule = (id: string) => {
    if (state.schedules.length <= 1) return;
    setState((prev) => {
      const remaining = prev.schedules.filter((s) => s.id !== id);
      return {
        schedules: remaining,
        activeScheduleId: prev.activeScheduleId === id ? remaining[0].id : prev.activeScheduleId,
      };
    });
    setConfirmDelete(null);
  };

  // タブのドラッグ&ドロップ並べ替え
  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTabDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedTabId && id !== draggedTabId) {
      setDragOverTabId(id);
    }
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }
    setState((prev) => {
      const schedules = [...prev.schedules];
      const fromIdx = schedules.findIndex((s) => s.id === draggedTabId);
      const toIdx = schedules.findIndex((s) => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = schedules.splice(fromIdx, 1);
      schedules.splice(toIdx, 0, moved);
      return { ...prev, schedules };
    });
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleTabDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateActiveSchedule((s) => ({ ...s, name: tempName.trim() }));
    }
    setEditingName(false);
  };

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
      <header className="pt-6 sm:pt-8 pb-3 sm:pb-4 px-3 sm:px-4 print-header">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 mb-2 no-print">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "#888" }}>
                Rotation Schedule
              </span>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>

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
                />
              </div>
            ) : (
              <button
                className="group inline-flex items-center gap-2 no-print"
                onClick={() => {
                  setTempName(activeSchedule.name);
                  setEditingName(true);
                }}
              >
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "#1a1a1a" }}>
                  {activeSchedule.name}
                </h1>
                <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1" ref={menuRef}>
            {state.schedules.map((schedule) => (
              <button
                key={schedule.id}
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
                  dragOverTabId === schedule.id ? "ring-2 ring-yellow-400 ring-offset-1" : ""
                } ${
                  draggedTabId === schedule.id ? "opacity-50" : ""
                }`}
                style={{
                  backgroundColor: schedule.id === state.activeScheduleId ? "#FBBF24" : "#fff",
                  borderRadius: "8px",
                  cursor: "grab",
                }}
              >
                <GripVertical className="w-3 h-3 opacity-40" />
                {schedule.name}
              </button>
            ))}
            <button
              onClick={() => setShowNewSchedule(true)}
              className="brutal-border shrink-0 px-2.5 py-1.5 text-xs sm:text-sm font-bold transition-all duration-150 hover:bg-gray-100"
              style={{ borderRadius: "8px", backgroundColor: "#fff" }}
              title="新しい当番表を追加"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
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
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 戻す
              </button>
              <button
                onClick={() => handleRotate("forward")}
                disabled={isAnimating}
                className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                style={{ backgroundColor: "#1a1a1a", borderRadius: "8px" }}
              >
                次へ回す <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => window.print()}
                className="brutal-border brutal-shadow-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
                style={{ backgroundColor: "#fff", borderRadius: "8px" }}
                title="印刷"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="brutal-border brutal-shadow-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
                style={{ backgroundColor: "#fff", borderRadius: "8px" }}
                title="設定"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              {state.schedules.length > 1 && (
                <button
                  onClick={() => setConfirmDelete(activeSchedule.id)}
                  className="brutal-border brutal-shadow-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
                  style={{ backgroundColor: "#FEE2E2", borderRadius: "8px", color: "#DC2626" }}
                  title="この当番表を削除"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== 担当カード ===== */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto">
          <div className={`grid gap-3 md:gap-4 ${
            groups.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
            groups.length === 3 ? "grid-cols-1 md:grid-cols-3" :
            groups.length === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" :
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
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
                    delay: idx * 0.08,
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
                        key={tIdx}
                        className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 font-bold text-xs sm:text-sm"
                        style={{
                          backgroundColor: member.bgColor,
                          borderRadius: "8px",
                          border: `2px solid ${member.color}40`,
                          color: member.textColor,
                        }}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.08 + tIdx * 0.06 + 0.2, duration: 0.3 }}
                      >
                        <span className="text-lg">{group.emoji}</span>
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
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr>
                    <th
                      className="text-left py-2 sm:py-2.5 px-2 sm:px-3 font-extrabold text-[10px] sm:text-xs"
                      style={{ color: "#1a1a1a", borderBottom: "3px solid #1a1a1a" }}
                    >
                      回
                    </th>
                    {groups.map((group) => (
                      <th
                        key={group.id}
                        className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-[10px] sm:text-xs"
                        style={{ color: "#666", borderBottom: "3px solid #1a1a1a" }}
                      >
                        <span className="text-sm sm:text-base">{group.emoji}</span>
                        <br />
                        <span className="text-[9px] sm:text-[10px] leading-tight">
                          {group.tasks.join("・")}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: members.length }, (_, rot) => {
                    const rowAssignments = getAssignments(rot);
                    const isCurrent = rot === rotation;
                    return (
                      <tr
                        key={rot}
                        style={{
                          backgroundColor: isCurrent ? "#FBBF24" : "transparent",
                          fontWeight: isCurrent ? 800 : 500,
                        }}
                      >
                        <td
                          className="py-2 sm:py-2.5 px-2 sm:px-3 font-bold text-[10px] sm:text-xs whitespace-nowrap"
                          style={{ borderTop: "2px solid #e5e5e5" }}
                        >
                          {rot === 0 ? "初期" : `${rot}回目`}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              onClick={() => setConfirmDelete(null)}
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
                    <Trash2 className="w-5 h-5" style={{ color: "#DC2626" }} />
                  </div>
                  <h3 className="font-extrabold text-lg">当番表を削除</h3>
                </div>
                <p className="text-sm mb-6" style={{ color: "#555" }}>
                  「{state.schedules.find((s) => s.id === confirmDelete)?.name}」を削除しますか？この操作は元に戻せません。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="brutal-border brutal-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                    style={{ backgroundColor: "#fff", borderRadius: "10px" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(confirmDelete)}
                    className="brutal-border brutal-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                    style={{ backgroundColor: "#DC2626", borderRadius: "10px" }}
                  >
                    削除する
                  </button>
                </div>
              </motion.div>
            </motion.div>
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
              onSave={(newName, newGroups, newMembers) => {
                updateActiveSchedule((s) => ({
                  ...s,
                  name: newName,
                  groups: newGroups,
                  members: newMembers,
                  rotation: s.rotation % newMembers.length,
                }));
                setShowSettings(false);
              }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
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
          <h2 className="text-lg font-extrabold" style={{ color: "#1a1a1a" }}>
            <FileText className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            新しい当番表を作成
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
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
                <span className="text-2xl">{template.emoji}</span>
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
}: {
  scheduleName: string;
  groups: TaskGroup[];
  members: Member[];
  onSave: (name: string, groups: TaskGroup[], members: Member[]) => void;
  onClose: () => void;
}) {
  const [editName, setEditName] = useState(scheduleName);
  const [editGroups, setEditGroups] = useState<TaskGroup[]>(JSON.parse(JSON.stringify(groups)));
  const [editMembers, setEditMembers] = useState<Member[]>(JSON.parse(JSON.stringify(members)));
  const [activeTab, setActiveTab] = useState<"tasks" | "members">("tasks");
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // --- タスクグループ操作 ---
  const addGroup = () => {
    setEditGroups((prev) => [
      ...prev,
      { id: `g${Date.now()}`, tasks: ["新しいタスク"], emoji: "✨" },
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
      { id: `m${Date.now()}`, name: "", ...preset },
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
    const cleanedGroups = editGroups
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.trim() !== "") }))
      .filter((g) => g.tasks.length > 0);
    const cleanedMembers = editMembers.filter((m) => m.name.trim() !== "");
    if (cleanedGroups.length === 0 || cleanedMembers.length === 0) return;
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
          <h2 className="text-lg font-extrabold" style={{ color: "#1a1a1a" }}>設定</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 当番表名 */}
        <div className="px-5 py-3" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <label className="text-xs font-bold mb-1.5 block" style={{ color: "#888" }}>当番表の名前</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full brutal-border px-3 py-2 text-sm font-bold"
            style={{ borderRadius: "8px", backgroundColor: "#FAFAFA" }}
            placeholder="例: 掃除当番、給食当番、日直..."
          />
        </div>

        {/* タブ */}
        <div className="grid grid-cols-2" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <button
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

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "tasks" ? (
            <div className="flex flex-col gap-5">
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
                      />
                      <span className="text-sm font-extrabold" style={{ color: "#666" }}>
                        グループ {gIdx + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => removeGroup(gIdx)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      style={{ color: "#EF4444" }}
                      disabled={editGroups.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {group.tasks.map((task, tIdx) => (
                      <div key={tIdx} className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 shrink-0" style={{ color: "#ccc" }} />
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => updateTask(gIdx, tIdx, e.target.value)}
                          placeholder="タスク名を入力"
                          className="flex-1 brutal-border px-3 py-2 text-sm font-medium"
                          style={{ borderRadius: "8px", backgroundColor: "#fff" }}
                        />
                        <button
                          onClick={() => removeTask(gIdx, tIdx)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          style={{ color: "#EF4444" }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTask(gIdx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold self-start hover:bg-gray-100 rounded-lg transition-colors"
                      style={{ color: "#666" }}
                    >
                      <Plus className="w-3.5 h-3.5" /> タスクを追加
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addGroup}
                className="brutal-border brutal-shadow-sm flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{ backgroundColor: "#E8E8E8", borderRadius: "10px" }}
              >
                <Plus className="w-4 h-4" /> グループを追加
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {editMembers.map((member, mIdx) => (
                <div
                  key={member.id}
                  className="brutal-border p-4 flex flex-col gap-3"
                  style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="brutal-border w-10 h-10 flex items-center justify-center font-extrabold text-sm shrink-0"
                      style={{
                        backgroundColor: member.color,
                        borderRadius: "50%",
                        color: "#fff",
                      }}
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
                    />
                    <button
                      onClick={() => removeMember(mIdx)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      style={{ color: "#EF4444" }}
                      disabled={editMembers.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* カラーパレット */}
                  <div className="flex items-center gap-1.5 pl-13">
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
                      />
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={addMember}
                className="brutal-border brutal-shadow-sm flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{ backgroundColor: "#E8E8E8", borderRadius: "10px" }}
              >
                <Plus className="w-4 h-4" /> 担当者を追加
              </button>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <div className="px-5 py-4" style={{ borderTop: "3px solid #1a1a1a" }}>
          <button
            onClick={handleSave}
            className="brutal-border brutal-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
            style={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
          >
            <Save className="w-4 h-4" /> 保存する
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
