import { motion } from "framer-motion";
import { Cloud, CloudUpload, Loader2, Printer, RotateCcw, RotateCw, Settings } from "lucide-react";

interface RotationControlsProps {
  rotation: number;
  rotationLabel: string;
  isAnimating: boolean;
  isCloudSaved: boolean;
  isSharing: boolean;
  onRotateBackward: () => void;
  onRotateForward: () => void;
  onPrint: () => void;
  onOpenSettings: () => void;
  onShare: () => void;
}

export function RotationControls({
  rotation,
  rotationLabel,
  isAnimating,
  isCloudSaved,
  isSharing,
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
              <div className="text-xs sm:text-sm font-bold" style={{ color: "#1a1a1a" }}>
                現在のローテーション
              </div>
              <div className="text-[10px] sm:text-xs font-medium" style={{ color: "#7C5E00" }}>
                {rotationLabel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            <button
              onClick={onRotateBackward}
              disabled={isAnimating}
              className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              style={{ backgroundColor: "#fff", borderRadius: "8px" }}
              aria-label="ローテーションを1つ戻す"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" /> 戻る
            </button>
            <button
              onClick={onRotateForward}
              disabled={isAnimating}
              className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              style={{ backgroundColor: "#fff", borderRadius: "8px" }}
              aria-label="ローテーションを1つ進める"
            >
              進む <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
            </button>
            <button
              onClick={onPrint}
              className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px]"
              style={{ backgroundColor: "#fff", borderRadius: "8px" }}
              aria-label="当番表を印刷する"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              印刷
            </button>
            <button
              onClick={onShare}
              disabled={isSharing}
              className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              style={{ backgroundColor: "#fff", borderRadius: "8px" }}
              aria-label={isCloudSaved ? "クラウドに更新する" : "クラウドに共有する"}
            >
              {isSharing ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" aria-hidden="true" />
              ) : isCloudSaved ? (
                <CloudUpload className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              ) : (
                <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              )}
              {isCloudSaved ? "更新" : "共有"}
            </button>
            <button
              onClick={onOpenSettings}
              className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px]"
              style={{ backgroundColor: "#fff", borderRadius: "8px" }}
              aria-label="当番表の設定を開く"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" /> 設定
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
