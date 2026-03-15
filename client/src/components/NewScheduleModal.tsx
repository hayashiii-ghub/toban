import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, X } from "lucide-react";
import type { ScheduleTemplate } from "@/rotation/types";
import { TEMPLATES } from "@/rotation/constants";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const TEMPLATE_SECTIONS = [
  { label: "✨ カスタム", from: 9, to: 10, defaultOpen: true },
  { label: "🏢 事務室・オフィス", from: 0, to: 2, defaultOpen: false },
  { label: "🌷 幼稚園・保育園", from: 2, to: 5, defaultOpen: false },
  { label: "🏫 小中学校（クラス用）", from: 5, to: 8, defaultOpen: false },
  { label: "🔑 職員室（先生用）", from: 8, to: 9, defaultOpen: false },
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
        <div className="p-5 overflow-y-auto flex flex-col gap-1">
          <p className="text-xs font-bold mb-2" style={{ color: "#888" }}>
            テンプレートを選択してください。後から自由に編集できます。
          </p>

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
                    className="text-xs font-extrabold tracking-wider"
                    style={{ color: "#666" }}
                  >
                    {section.label}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 transition-transform duration-200"
                    style={{ color: "#aaa", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
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
                      <div className="flex flex-col gap-2 pt-1 pb-2">
                        {templates.map((template, idx) => (
                          <button
                            key={section.from + idx}
                            onClick={() => onSelect(template)}
                            className="brutal-border brutal-shadow-sm p-3 sm:p-4 w-full text-left transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
                            style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl" aria-hidden="true">{template.emoji}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold" style={{ color: "#1a1a1a" }}>
                                  {template.name}
                                </div>
                                <div className="text-[10px] font-medium mt-0.5 truncate" style={{ color: "#888" }}>
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
