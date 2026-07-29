import { useCallback, useRef } from "react";
import { m } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useT } from "@/i18n";

interface Props {
  scheduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  scheduleName,
  onConfirm,
  onCancel,
}: Props) {
  const t = useT();
  const modalRef = useRef<HTMLDivElement>(null);
  const handleEscape = useCallback(() => onCancel(), [onCancel]);
  useEscapeKey(handleEscape);
  useFocusTrap(modalRef, true);

  return (
    <m.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 rotation-no-print"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <m.div
        ref={modalRef}
        className="theme-border theme-shadow w-full max-w-md overflow-hidden sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
        style={{ backgroundColor: "var(--dt-card-bg)" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-4"
          style={{
            borderBottom: "var(--dt-border-width) solid var(--dt-border-color)",
          }}
        >
          <Trash2
            className="size-5"
            style={{ color: "#DC2626" }}
            aria-hidden="true"
          />
          <h2
            id="delete-dialog-title"
            className="text-lg font-extrabold"
            style={{ color: "var(--dt-text)" }}
          >
            {t("confirmDelete.title")}
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          <p
            className="text-sm mb-5"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {t("confirmDelete.message", { name: scheduleName })}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="theme-border theme-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
              style={{
                backgroundColor: "var(--dt-card-bg)",
                color: "var(--dt-text)",
                borderRadius: "10px",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="theme-border theme-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
              style={{ backgroundColor: "#DC2626", borderRadius: "10px" }}
            >
              {t("confirmDelete.confirm")}
            </button>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}
