import { motion } from "framer-motion";
import { Cloud, Loader2, Pencil, RotateCcw, RotateCw } from "lucide-react";
import { PrintMenu } from "./PrintMenu";

interface RotationControlsProps {
  rotation: number;
  rotationLabel: string;
  isAnimating: boolean;
  isSharing: boolean;
  isDateMode?: boolean;
  onRotateBackward: () => void;
  onRotateForward: () => void;
  onPrint: (mode: "all" | "cards" | "table") => void;
  onOpenSettings: () => void;
  onShare: () => void;
}

export function RotationControls({
  rotation,
  rotationLabel,
  isAnimating,
  isSharing,
  isDateMode,
  onRotateBackward,
  onRotateForward,
  onPrint,
  onOpenSettings,
  onShare,
}: RotationControlsProps) {
  return (
    <div className="px-3 sm:px-4 py-3 rotation-no-print">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="brutal-border brutal-shadow p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4"
          style={{ backgroundColor: "#FBBF24", borderRadius: "12px" }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center gap-3 sm:gap-3">
            <div
              className="brutal-border w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center font-extrabold text-base sm:text-lg"
              style={{ backgroundColor: "#fff", borderRadius: "50%" }}
              aria-label={`現在のローテーション回数: ${rotation}`}
            >
              {rotation}
            </div>
            <div className="text-center sm:text-left">
              <div className="text-sm font-bold" style={{ color: "#1a1a1a" }}>
                現在の順番
              </div>
              <div className="text-xs sm:text-sm font-medium" style={{ color: "#7C5E00" }}>
                {isDateMode ? "日付ベース（自動）" : rotationLabel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide p-2 -m-2" data-onboarding="step-2">
            {!isDateMode && (
              <>
                <button
                  onClick={onRotateBackward}
                  disabled={isAnimating}
                  className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                  style={{ backgroundColor: "#fff", borderRadius: "8px" }}
                  aria-label="ローテーションを1つ戻す"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" /> 戻る
                </button>
                <button
                  onClick={onRotateForward}
                  disabled={isAnimating}
                  className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                  style={{ backgroundColor: "#fff", borderRadius: "8px" }}
                  aria-label="ローテーションを1つ進める"
                >
                  進む <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                </button>
              </>
            )}
            <PrintMenu onPrint={onPrint} />
            <button
              onClick={onShare}
              disabled={isSharing}
              data-onboarding="step-4"
              className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              style={{ backgroundColor: "#fff", borderRadius: "8px" }}
              aria-label="共有する"
            >
              {isSharing ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              )}
              共有
            </button>
            <button
              onClick={onOpenSettings}
              data-onboarding="step-3"
              className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px]"
              style={{ backgroundColor: "#fff", borderRadius: "8px" }}
              aria-label="当番表を編集する"
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" /> 編集
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
