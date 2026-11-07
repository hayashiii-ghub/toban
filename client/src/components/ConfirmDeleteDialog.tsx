import type { Ref } from "vue";
import { defineView } from "@/lib/vue";
import { motion as m, useDomRef } from "motion-v";
import { Trash2 } from "@lucide/vue";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";
import { SheetHandle } from "./SheetHandle";
import { useT } from "@/i18n";
interface Props {
  scheduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}
export const ConfirmDeleteDialog = defineView<Props>(
  ["scheduleName", "onConfirm", "onCancel"],
  (props, _viewContext) => {
    const t = useT();
    const modalRef: Ref<HTMLDivElement | null> = useDomRef();
    const handleEscape = () => props.onCancel();
    useEscapeKey(handleEscape);
    useFocusTrap(modalRef, true);
    const handleSheetSwipe = useSheetSwipe(modalRef, props.onCancel);
    return () => (
      <m.div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 rotation-no-print"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={props.onCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <m.div
          ref={modalRef}
          class="theme-border theme-shadow w-full max-w-md overflow-hidden sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
          style={{ backgroundColor: "var(--dt-card-bg)" }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <div
            class="relative flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-4 max-sm:touch-none"
            style={{
              borderBottom:
                "var(--dt-border-width) solid var(--dt-border-color)",
            }}
            onPointerdown={handleSheetSwipe}
          >
            <SheetHandle />
            <Trash2
              class="size-5"
              style={{ color: "#DC2626" }}
              aria-hidden="true"
            />
            <h2
              id="delete-dialog-title"
              class="text-lg font-extrabold"
              style={{ color: "var(--dt-text)" }}
            >
              {t("confirmDelete.title")}
            </h2>
          </div>
          <div class="p-4 sm:p-5">
            <p
              class="text-sm mb-5"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {t("confirmDelete.message", { name: props.scheduleName })}
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                onClick={props.onCancel}
                class="theme-border theme-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
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
                onClick={props.onConfirm}
                class="theme-border theme-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
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
);
