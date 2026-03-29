import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, Save, Pin, PinOff, Copy, Trash2 } from "lucide-react";
import type { AssignmentMode, TaskGroup, Member, RotationConfig } from "@/rotation/types";
import { deepClone, generateId } from "@/rotation/utils";
import { MEMBER_PRESETS } from "@/rotation/constants";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { TaskGroupEditor } from "./settings/TaskGroupEditor";
import { AccordionSection } from "./settings/AccordionSection";
import { DesignThemePicker } from "./settings/DesignThemePicker";
import { RotationConfigEditor } from "./settings/RotationConfigEditor";
import { getThemeById } from "@/rotation/designThemes";
import { applyThemeToRoot } from "@/contexts/DesignThemeContext";

interface Props {
  scheduleName: string;
  groups: TaskGroup[];
  members: Member[];
  rotationConfig?: RotationConfig;
  pinned?: boolean;
  assignmentMode?: AssignmentMode;
  designThemeId?: string;
  canDelete: boolean;
  onSave: (name: string, groups: TaskGroup[], members: Member[], rotationConfig?: RotationConfig, pinned?: boolean, assignmentMode?: AssignmentMode, designThemeId?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ROTATION_MODE_LABELS: Record<string, string> = {
  manual: "手動で切り替え",
  date: "日付で自動",
};

type EditorPatch = {
  name?: string;
  groups?: TaskGroup[];
  members?: Member[];
  rotationConfig?: RotationConfig;
  pinned?: boolean;
  assignmentMode?: AssignmentMode;
  designThemeId?: string | undefined;
};

export function SettingsModal({
  scheduleName,
  groups,
  members,
  rotationConfig,
  pinned,
  assignmentMode,
  designThemeId,
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
  const [editPinned, setEditPinned] = useState(pinned ?? false);
  const [editAssignmentMode, setEditAssignmentMode] = useState<AssignmentMode>(assignmentMode ?? "member");
  const [editDesignThemeId, setEditDesignThemeId] = useState<string | undefined>(designThemeId);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // 初期値のJSON文字列を一度だけ計算してキャッシュ（isDirty比較用）
  const initialGroupsJson = useRef(JSON.stringify(groups));
  const initialMembersJson = useRef(JSON.stringify(members));
  const initialRotationConfigJson = useRef(JSON.stringify(rotationConfig ?? { mode: "manual" }));

  const modalRef = useRef<HTMLDivElement>(null);

  const computeDirty = useCallback((patch: EditorPatch = {}) => {
    const nextName = "name" in patch ? patch.name ?? "" : editName;
    const nextGroups = "groups" in patch ? patch.groups ?? editGroups : editGroups;
    const nextMembers = "members" in patch ? patch.members ?? editMembers : editMembers;
    const nextRotationConfig = "rotationConfig" in patch ? patch.rotationConfig ?? editRotationConfig : editRotationConfig;
    const nextPinned = "pinned" in patch ? patch.pinned ?? false : editPinned;
    const nextAssignmentMode = "assignmentMode" in patch
      ? patch.assignmentMode ?? "member"
      : editAssignmentMode;
    const nextDesignThemeId = "designThemeId" in patch ? patch.designThemeId : editDesignThemeId;

    if (nextName !== scheduleName) return true;
    if (nextPinned !== (pinned ?? false)) return true;
    if (nextAssignmentMode !== (assignmentMode ?? "member")) return true;
    if (nextDesignThemeId !== designThemeId) return true;
    if (JSON.stringify(nextGroups) !== initialGroupsJson.current) return true;
    if (JSON.stringify(nextMembers) !== initialMembersJson.current) return true;
    if (JSON.stringify(nextRotationConfig) !== initialRotationConfigJson.current) return true;
    return false;
  }, [
    assignmentMode,
    designThemeId,
    editAssignmentMode,
    editDesignThemeId,
    editGroups,
    editMembers,
    editName,
    editPinned,
    editRotationConfig,
    pinned,
    scheduleName,
  ]);

  const applyEditorPatch = useCallback((patch: EditorPatch) => {
    if ("name" in patch) setEditName(patch.name ?? "");
    if ("groups" in patch) setEditGroups(patch.groups ?? []);
    if ("members" in patch) setEditMembers(patch.members ?? []);
    if ("rotationConfig" in patch && patch.rotationConfig) setEditRotationConfig(patch.rotationConfig);
    if ("pinned" in patch) setEditPinned(patch.pinned ?? false);
    if ("assignmentMode" in patch && patch.assignmentMode) setEditAssignmentMode(patch.assignmentMode);
    if ("designThemeId" in patch) setEditDesignThemeId(patch.designThemeId);
    setIsDirty(computeDirty(patch));
  }, [computeDirty]);

  const updateRotationConfig = useCallback((updater: (prev: RotationConfig) => RotationConfig) => {
    applyEditorPatch({ rotationConfig: updater(editRotationConfig) });
  }, [applyEditorPatch, editRotationConfig]);

  const handleThemePreview = useCallback((themeId: string) => {
    applyEditorPatch({ designThemeId: themeId });
    applyThemeToRoot(getThemeById(themeId));
  }, [applyEditorPatch]);

  const handleAssignmentModeChange = useCallback((mode: AssignmentMode) => {
    let nextGroups = editGroups;
    let nextMembers = editMembers;

    if (mode === "member") {
      if (editGroups.length > editMembers.length) {
        const missing = editGroups.length - editMembers.length;
        nextMembers = [...editMembers];
        for (let i = 0; i < missing; i++) {
          const preset = MEMBER_PRESETS[(editMembers.length + i) % MEMBER_PRESETS.length];
          nextMembers.push({ id: generateId("m"), name: "", ...preset });
        }
      } else if (editMembers.length > editGroups.length) {
        const extra = editMembers.length - editGroups.length;
        nextGroups = [...editGroups];
        for (let i = 0; i < extra; i++) {
          nextGroups.push({ id: generateId("g"), tasks: ["新しいタスク"], emoji: "✨" });
        }
      }
    }

    applyEditorPatch({
      assignmentMode: mode,
      groups: nextGroups,
      members: nextMembers,
    });
  }, [applyEditorPatch, editGroups, editMembers]);

  const revertThemePreview = useCallback(() => {
    if (editDesignThemeId !== designThemeId) {
      handleThemePreview(designThemeId ?? "whiteboard");
    }
  }, [editDesignThemeId, designThemeId, handleThemePreview]);

  const handleCloseWithCheck = useCallback(() => {
    if (isDirty) {
      if (window.confirm("変更が保存されていません。閉じますか？")) {
        revertThemePreview();
        onClose();
      }
    } else {
      revertThemePreview();
      onClose();
    }
  }, [isDirty, onClose, revertThemePreview]);

  useEscapeKey(useCallback(() => handleCloseWithCheck(), [handleCloseWithCheck]));
  useFocusTrap(modalRef, true);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleCloseWithCheck();
    }
  };

  const handleSave = () => {
    setValidationError(null);
    const cleanedMembers = editMembers.filter((m) => m.name.trim() !== "");
    const activeMemberIds = cleanedMembers.filter(m => !m.skipped).map(m => m.id);
    const cleanedGroups = editGroups
      .map((g) => {
        const cleaned = { ...g, tasks: g.tasks.filter((t) => t.trim() !== "") };
        if (cleaned.memberIds) {
          const validIds = cleaned.memberIds.filter(id => activeMemberIds.includes(id));
          if (validIds.length === 0) {
            delete cleaned.memberIds;
          } else if (validIds.length >= activeMemberIds.length) {
            // 全員いるが、並び順がデフォルトと同じなら不要なので消す
            const isSameOrder = activeMemberIds.every((id, i) => validIds[i] === id);
            if (isSameOrder) {
              delete cleaned.memberIds;
            } else {
              cleaned.memberIds = validIds;
            }
          } else {
            cleaned.memberIds = validIds;
          }
        }
        return cleaned;
      })
      .filter((g) => g.tasks.length > 0);

    if (cleanedGroups.length === 0) {
      setValidationError("タスクが1つ以上必要です。");
      return;
    }
    if (cleanedMembers.length === 0) {
      setValidationError("担当者が1人以上必要です。");
      return;
    }
    onSave(editName.trim() || scheduleName, cleanedGroups, cleanedMembers, editRotationConfig, editPinned, editAssignmentMode, editDesignThemeId);
  };

  const rotationModeLabel = ROTATION_MODE_LABELS[editRotationConfig.mode] ?? editRotationConfig.mode;
  const assignmentModeLabel = editAssignmentMode === "task" ? "タスクから見る" : "担当者から見る";
  const basicSummary = `${editName || scheduleName} / ${assignmentModeLabel} / ${rotationModeLabel}`;
  const taskSummary = editAssignmentMode === "task"
    ? `${editGroups.length}タスク・${editMembers.length}人`
    : `${editMembers.length}人・${editGroups.length}グループ`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 rotation-no-print"
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
        className="theme-border theme-shadow w-full max-w-lg modal-max-h overflow-hidden flex flex-col sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
        style={{ backgroundColor: "var(--dt-card-bg)" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* ヘッダー */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4" style={{ borderBottom: "var(--dt-border-width) solid var(--dt-border-color)" }}>
          <h2 id="settings-title" className="text-lg font-extrabold flex items-center gap-2" style={{ color: "var(--dt-text)" }}>
            編集
            {isDirty && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                未保存
              </span>
            )}
          </h2>
          <button onClick={handleCloseWithCheck} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="閉じる">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* バリデーションエラー */}
        {validationError && (
          <div className="mx-4 sm:mx-5 mt-3 px-3 py-2 text-sm font-bold rounded-lg" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }} role="alert">
            {validationError}
          </div>
        )}

        {/* アコーディオンコンテンツ */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* 基本設定 */}
          <AccordionSection title="基本設定" summary={basicSummary} defaultOpen={false}>
            <div className="flex flex-col gap-3">
              {/* 名前 + ピン */}
              <div>
                <label htmlFor="schedule-name-input" className="text-xs font-bold mb-1 block" style={{ color: "var(--dt-text-muted)" }}>当番表の名前</label>
                <div className="flex items-stretch gap-2">
                  <input
                    id="schedule-name-input"
                    type="text"
                    value={editName}
                    onChange={(e) => applyEditorPatch({ name: e.target.value })}
                    className="flex-1 min-w-0 theme-border px-3 py-2 text-sm font-bold"
                    style={{ borderRadius: "var(--dt-border-radius-sm)", backgroundColor: "#FAFAFA" }}
                    placeholder="例: 掃除当番、給食当番、日直..."
                  />
                  <button
                    type="button"
                    onClick={() => applyEditorPatch({ pinned: !editPinned })}
                    className="theme-border w-9 flex items-center justify-center shrink-0 transition-colors"
                    style={{ borderRadius: "var(--dt-border-radius-sm)", backgroundColor: editPinned ? "var(--dt-current-highlight)" : "#FAFAFA" }}
                    aria-label={editPinned ? "固定を解除" : "先頭に固定"}
                    title={editPinned ? "固定を解除" : "タブを先頭に固定"}
                  >
                    {editPinned ? <Pin className="w-4 h-4" style={{ color: "var(--dt-text)" }} /> : <PinOff className="w-4 h-4" style={{ color: "#999" }} />}
                  </button>
                </div>
              </div>

              {/* 割り当て方式 */}
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: "var(--dt-text-muted)" }}>見方をえらぶ</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="settings-option-control flex-1 theme-border transition-colors"
                    style={{ borderRadius: "var(--dt-border-radius-sm)", backgroundColor: editAssignmentMode === "member" ? "var(--dt-current-highlight)" : "#FAFAFA" }}
                    onClick={() => handleAssignmentModeChange("member")}
                  >
                    だれが何をするか
                  </button>
                  <button
                    type="button"
                    className="settings-option-control flex-1 theme-border transition-colors"
                    style={{ borderRadius: "var(--dt-border-radius-sm)", backgroundColor: editAssignmentMode === "task" ? "var(--dt-current-highlight)" : "#FAFAFA" }}
                    onClick={() => handleAssignmentModeChange("task")}
                  >
                    何をだれがやるか
                  </button>
                </div>
              </div>

              {/* ローテーション方式 */}
              <RotationConfigEditor config={editRotationConfig} onUpdate={updateRotationConfig} />
            </div>
          </AccordionSection>

          {/* デザインテンプレート */}
          <AccordionSection title="デザインテンプレート" summary={getThemeById(editDesignThemeId).name} defaultOpen={false}>
            <DesignThemePicker
              selectedThemeId={editDesignThemeId}
              onSelect={handleThemePreview}
            />
          </AccordionSection>

          {/* タスク */}
          <AccordionSection title="内容を編集" summary={taskSummary} defaultOpen={true}>
            <TaskGroupEditor
              groups={editGroups}
              members={editMembers}
              onGroupsChange={(nextGroups) => applyEditorPatch({ groups: nextGroups })}
              onMembersChange={(nextMembers) => applyEditorPatch({ members: nextMembers })}
              assignmentMode={editAssignmentMode}
            />
          </AccordionSection>
        </div>

        {/* フッター */}
        <div className="shrink-0 px-4 sm:px-5 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 flex flex-col gap-2" style={{ borderTop: "var(--dt-border-width) solid var(--dt-border-color)" }}>
          <button
            onClick={handleSave}
            className="theme-border theme-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
            style={{ backgroundColor: "var(--dt-control-bar-bg)", color: "var(--dt-control-bar-text)", borderRadius: "10px" }}
          >
            <Save className="w-4 h-4" aria-hidden="true" /> 保存する
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onDuplicate(); }}
              className="theme-border flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold transition-all duration-150 theme-hover-lift"
              style={{ color: "var(--dt-text)", backgroundColor: "var(--dt-card-bg)", borderRadius: "10px" }}
            >
              <Copy className="w-4 h-4" aria-hidden="true" />
              複製
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => { onDelete(); }}
                className="theme-border flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold transition-all duration-150 theme-hover-lift"
                style={{ color: "#DC2626", backgroundColor: "var(--dt-card-bg)", borderRadius: "10px" }}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                削除
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
