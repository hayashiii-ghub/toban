import { motion } from "framer-motion";
import { Edit3 } from "lucide-react";
import type { RefObject } from "react";

interface ScheduleHeaderProps {
  editingName: boolean;
  tempName: string;
  scheduleName: string;
  rotationLabel: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onTempNameChange: (value: string) => void;
  onSaveName: () => void;
  onCancelEditing: () => void;
  onStartEditing: () => void;
}

export function ScheduleHeader({
  editingName,
  tempName,
  scheduleName,
  rotationLabel,
  nameInputRef,
  onTempNameChange,
  onSaveName,
  onCancelEditing,
  onStartEditing,
}: ScheduleHeaderProps) {
  return (
    <header className="rotation-print-header pt-6 sm:pt-8 pb-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {editingName ? (
            <div className="flex items-center justify-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={tempName}
                onChange={(event) => onTempNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSaveName();
                  if (event.key === "Escape") onCancelEditing();
                }}
                onBlur={onSaveName}
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-center brutal-border px-3 py-1"
                style={{
                  color: "#1a1a1a",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  maxWidth: "400px",
                }}
                aria-label="当番表の名前を編集"
              />
            </div>
          ) : (
            <button
              className="group inline-flex items-center gap-2 rotation-no-print"
              onClick={onStartEditing}
              aria-label={`「${scheduleName}」の名前を編集`}
            >
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight"
                style={{ color: "#1a1a1a" }}
              >
                {scheduleName}
              </h1>
              <Edit3
                className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity"
                aria-hidden="true"
              />
            </button>
          )}
          <h1
            className="rotation-print-only text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight"
            style={{ color: "#1a1a1a" }}
          >
            {scheduleName}
          </h1>

          <div className="rotation-print-only mt-2 text-sm font-bold" style={{ color: "#666" }}>
            ローテーション: {rotationLabel} ／ 印刷日: {new Date().toLocaleDateString("ja-JP")}
          </div>
        </motion.div>
      </div>
    </header>
  );
}
