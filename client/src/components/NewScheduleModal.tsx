import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, X } from "lucide-react";
import type { ScheduleTemplate } from "@/rotation/types";
import { TEMPLATES } from "@/rotation/constants";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  onSelect: (template: ScheduleTemplate) => void;
  onClose: () => void;
}

export function NewScheduleModal({ onSelect, onClose }: Props) {
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
