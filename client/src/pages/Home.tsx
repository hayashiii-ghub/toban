/*
 * 掃除当番ローテーション表
 * - 3グループ制: グループ1〜3にタスクをまとめ、3人でローテーション
 * - ローカルストレージ保存
 * - 印刷対応（@media print）
 * - 担当者・タスク編集機能
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCw, RotateCcw, Printer, Settings, X,
  Plus, Trash2, GripVertical, Save, Sparkles,
} from "lucide-react";

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

interface AppState {
  rotation: number;
  groups: TaskGroup[];
  members: Member[];
}

// ===== デフォルトデータ =====
const DEFAULT_GROUPS: TaskGroup[] = [
  { id: "g1", tasks: ["クイックルワイパー", "事務所掃除機"], emoji: "🧹" },
  { id: "g2", tasks: ["トイレ", "加湿器", "水回り"], emoji: "🚿" },
  { id: "g3", tasks: ["床（掃除機）", "ゴミ捨て"], emoji: "🗑️" },
];

const DEFAULT_MEMBERS: Member[] = [
  { id: "tanaka", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
  { id: "matsumaru", name: "松丸", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
  { id: "yamashita", name: "山下", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
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

const STORAGE_KEY = "cleaning-rotation-state";

// ===== ローカルストレージ =====
function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.rotation === "number" && Array.isArray(parsed.groups) && Array.isArray(parsed.members)) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return { rotation: 0, groups: DEFAULT_GROUPS, members: DEFAULT_MEMBERS };
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ===== メインコンポーネント =====
export default function Home() {
  const [state, setState] = useState<AppState>(loadState);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [showSettings, setShowSettings] = useState(false);

  const { rotation, groups, members } = state;

  // 状態変更時にローカルストレージに保存
  useEffect(() => {
    saveState(state);
  }, [state]);

  // ローテーションに基づいて割り当てを計算
  const getAssignments = useCallback((rot: number) => {
    return groups.map((group, i) => {
      const memberIdx = ((i + rot) % members.length + members.length) % members.length;
      return { group, member: members[memberIdx] };
    });
  }, [groups, members]);

  const assignments = getAssignments(rotation);

  const handleRotate = (dir: "forward" | "backward") => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setState((prev) => ({
      ...prev,
      rotation: dir === "forward"
        ? (prev.rotation + 1) % prev.members.length
        : (prev.rotation - 1 + prev.members.length) % prev.members.length,
    }));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const rotationLabel = rotation === 0 ? "初期" : `${rotation}回目`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      {/* ===== 印刷用スタイル ===== */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; border: 2px solid #333 !important; }
          .print-header { border: 2px solid #333 !important; box-shadow: none !important; }
        }
        @media screen { .print-only { display: none; } }
      `}</style>

      {/* ===== ヘッダー ===== */}
      <header className="pt-6 sm:pt-8 pb-3 sm:pb-4 px-3 sm:px-4 print-header">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 mb-2 no-print">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "#888" }}>
                Cleaning Rotation
              </span>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "#1a1a1a" }}>
              掃除当番表
            </h1>
            {/* 印刷時のみ表示 */}
            <div className="print-only mt-2 text-sm font-bold" style={{ color: "#666" }}>
              ローテーション: {rotationLabel} ／ 印刷日: {new Date().toLocaleDateString("ja-JP")}
            </div>
          </motion.div>
        </div>
      </header>

      {/* ===== ローテーション制御（画面のみ） ===== */}
      <div className="px-3 sm:px-4 py-3 no-print">
        <div className="max-w-3xl mx-auto">
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
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== 担当カード（3グループ横並び） ===== */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
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
                      className="brutal-border w-11 h-11 sm:w-14 sm:h-14 mx-auto flex items-center justify-center font-extrabold text-xl sm:text-2xl mb-1.5 sm:mb-2"
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
        <div className="max-w-3xl mx-auto">
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

      {/* ===== 設定モーダル（Portal経由でbody直下にレンダリング） ===== */}
      {createPortal(
        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              groups={groups}
              members={members}
              onSave={(newGroups, newMembers) => {
                setState((prev) => ({
                  ...prev,
                  groups: newGroups,
                  members: newMembers,
                  rotation: prev.rotation % newMembers.length,
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

// ===== 設定モーダル =====
function SettingsModal({
  groups,
  members,
  onSave,
  onClose,
}: {
  groups: TaskGroup[];
  members: Member[];
  onSave: (groups: TaskGroup[], members: Member[]) => void;
  onClose: () => void;
}) {
  const [editGroups, setEditGroups] = useState<TaskGroup[]>(JSON.parse(JSON.stringify(groups)));
  const [editMembers, setEditMembers] = useState<Member[]>(JSON.parse(JSON.stringify(members)));
  const [activeTab, setActiveTab] = useState<"tasks" | "members">("tasks");
  const modalRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
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
    // 空のタスクや名前をフィルタ
    const cleanedGroups = editGroups
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.trim() !== "") }))
      .filter((g) => g.tasks.length > 0);
    const cleanedMembers = editMembers.filter((m) => m.name.trim() !== "");
    if (cleanedGroups.length === 0 || cleanedMembers.length === 0) return;
    onSave(cleanedGroups, cleanedMembers);
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

        {/* タブ */}
        <div className="flex" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <button
            className="flex-1 py-3 text-sm font-bold transition-colors"
            style={{
              backgroundColor: activeTab === "tasks" ? "#FBBF24" : "transparent",
              color: "#1a1a1a",
            }}
            onClick={() => setActiveTab("tasks")}
          >
            掃除タスク
          </button>
          <button
            className="flex-1 py-3 text-sm font-bold transition-colors"
            style={{
              backgroundColor: activeTab === "members" ? "#FBBF24" : "transparent",
              color: "#1a1a1a",
              borderLeft: "3px solid #1a1a1a",
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
