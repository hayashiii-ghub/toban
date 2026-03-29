import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, Plus, X } from "lucide-react";
import type { ScheduleTemplate } from "@/rotation/types";
import { TEMPLATES } from "@/rotation/constants";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const CUSTOM_TEMPLATE = TEMPLATES[TEMPLATES.length - 1]; // カスタム（空白）— 常に最後

const TEMPLATE_SECTIONS = [
  { label: "🏢 事務室・オフィス", from: 0, to: 2, defaultOpen: false },
  { label: "🌷 幼稚園・保育園", from: 2, to: 7, defaultOpen: false },
  { label: "🏫 小中学校（クラス用）", from: 7, to: 13, defaultOpen: false },
  { label: "🔑 職員室（先生用）", from: 13, to: 14, defaultOpen: false },
  { label: "🚩 PTA・保護者会", from: 14, to: 18, defaultOpen: false },
  { label: "🏥 介護施設", from: 18, to: 21, defaultOpen: false },
  { label: "🏘️ 自治会・マンション", from: 21, to: 23, defaultOpen: false },
  { label: "🍴 飲食店・店舗", from: 23, to: 24, defaultOpen: false },
  { label: "🏠 家庭・暮らし", from: 24, to: 26, defaultOpen: false },
  { label: "🤝 その他の団体", from: 26, to: 28, defaultOpen: false },
  { label: "✅ チェックリスト・TODO", from: 28, to: 31, defaultOpen: false },
];

interface Props {
  onSelect: (template: ScheduleTemplate) => void;
  onClose: () => void;
}

export function NewScheduleModal({ onSelect, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(TEMPLATE_SECTIONS.filter((s) => s.defaultOpen).map((s) => s.label))
  );

  const handleEscape = useCallback(() => onClose(), [onClose]);
  useEscapeKey(handleEscape);
  useFocusTrap(modalRef, true);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

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
      aria-labelledby="new-schedule-title"
    >
      <motion.div
        ref={modalRef}
        className="theme-border theme-shadow w-full max-w-md modal-max-h overflow-hidden flex flex-col sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
        style={{ backgroundColor: "var(--dt-card-bg)" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4" style={{ borderBottom: "var(--dt-border-width) solid var(--dt-border-color)" }}>
          <h2 id="new-schedule-title" className="text-lg font-extrabold" style={{ color: "var(--dt-text)" }}>
            <FileText className="w-5 h-5 inline-block mr-2 -mt-0.5" aria-hidden="true" />
            新しい当番表を作成
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="閉じる">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* テンプレート一覧 */}
        <div className="p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5 overflow-y-auto flex flex-col gap-1">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--dt-text-muted)" }}>
            テンプレートを選択してください。後から自由に編集できます。
          </p>

          {/* 新しくつくる（カスタム） */}
          <button
            onClick={() => onSelect(CUSTOM_TEMPLATE)}
            className="theme-border theme-shadow-sm p-3 sm:p-4 w-full text-left transition-all duration-150 theme-hover-lift mb-2"
            style={{ borderRadius: "var(--dt-border-radius)", backgroundColor: "var(--dt-current-highlight)" }}
          >
            <div className="flex items-center gap-3">
              <Plus className="w-6 h-6" style={{ color: "var(--dt-text)" }} aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-extrabold" style={{ color: "var(--dt-text)" }}>
                  新しくつくる
                </div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "var(--dt-text-secondary)" }}>
                  空白から自由に当番表を作成
                </div>
              </div>
            </div>
          </button>

          {/* テンプレートセクション */}
          {TEMPLATE_SECTIONS.map((section) => {
            const isOpen = openSections.has(section.label);
            const templates = TEMPLATES.slice(section.from, section.to);
            return (
              <div key={section.label}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span
                    className="text-sm font-extrabold tracking-wider"
                    style={{ color: "var(--dt-text-secondary)" }}
                  >
                    {section.label}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 transition-transform duration-200"
                    style={{ color: "var(--dt-text-muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2 py-1 px-1">
                        {templates.map((template, idx) => (
                          <button
                            key={section.from + idx}
                            onClick={() => onSelect(template)}
                            className="theme-border theme-shadow-sm p-3 sm:p-4 w-full text-left transition-all duration-150 theme-hover-lift"
                            style={{ borderRadius: "var(--dt-border-radius)", backgroundColor: "#FAFAFA" }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl" aria-hidden="true">{template.emoji}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold" style={{ color: "var(--dt-text)" }}>
                                  {template.name}
                                </div>
                                <div className="text-xs font-medium mt-0.5 truncate" style={{ color: "var(--dt-text-muted)" }}>
                                  {template.groups.length}{template.assignmentMode === "task" ? "タスク" : "グループ"} ・ {template.members.length}人
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
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
