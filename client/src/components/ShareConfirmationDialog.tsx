import type { Ref } from "vue";
import { defineView } from "@/lib/vue";
import { motion as m, useDomRef } from "motion-v";
import { Loader2, Share2 } from "@lucide/vue";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";
import { SheetHandle } from "./SheetHandle";
import { useT } from "@/i18n";
interface Props {
  scheduleName: string;
  isSharing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export const ShareConfirmationDialog = defineView<Props>(
  ["scheduleName", "isSharing", "onConfirm", "onCancel"],
  (props, _viewContext) => {
    const t = useT();
    const modalRef: Ref<HTMLDivElement | null> = useDomRef();
    const handleCancel = () => {
      if (!props.isSharing) props.onCancel();
    };
    useEscapeKey(handleCancel);
    useFocusTrap(modalRef, true);
    const handleSheetSwipe = useSheetSwipe(modalRef, () => {
      if (props.isSharing) return false;
      props.onCancel();
    });
    return () => (
      <m.div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 rotation-no-print"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-confirm-title"
        aria-describedby="share-confirm-description"
        aria-busy={props.isSharing}
      >
        <m.div
          ref={modalRef}
          class="theme-border theme-shadow w-full max-w-md modal-max-h overflow-y-auto sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
          style={{ backgroundColor: "var(--dt-card-bg)" }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={event => event.stopPropagation()}
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
            <Share2 class="size-5" aria-hidden="true" />
            <h2
              id="share-confirm-title"
              class="text-lg font-extrabold"
              style={{ color: "var(--dt-text)" }}
            >
              {t("shareConfirm.title")}
            </h2>
          </div>
          <div class="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-5">
            <p
              id="share-confirm-description"
              class="text-sm mb-5 break-words"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {t("shareConfirm.message", { name: props.scheduleName })}
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={props.isSharing}
                class="theme-border theme-shadow-sm flex-1 px-4 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift disabled:opacity-50"
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
                onClick={() => {
                  if (!props.isSharing) props.onConfirm();
                }}
                disabled={props.isSharing}
                class="theme-border theme-shadow-sm flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift disabled:opacity-50"
                style={{
                  backgroundColor: "var(--dt-tab-active-bg)",
                  color: "var(--dt-tab-active-text)",
                  borderRadius: "10px",
                }}
              >
                {props.isSharing && (
                  <Loader2 class="size-4 animate-spin" aria-hidden="true" />
                )}
                {t(
                  props.isSharing
                    ? "shareConfirm.sharing"
                    : "shareConfirm.confirm"
                )}
              </button>
            </div>
          </div>
        </m.div>
      </m.div>
    );
  }
);
