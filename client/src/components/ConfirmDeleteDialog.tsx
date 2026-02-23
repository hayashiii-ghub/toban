import { useCallback } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  scheduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({ scheduleName, onConfirm, onCancel }: Props) {
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
