import { m } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Loader2,
  Pencil,
} from "lucide-react";
import type { SyncStatus } from "@/lib/syncManager";
import { PrintMenu } from "@/components/PrintMenu";
import { useT } from "@/i18n";

interface RotationControlsProps {
  rotation: number;
  rotationLabel: string;
  isSharing: boolean;
  isDateMode?: boolean;
  isAnimating?: boolean;
  syncStatus?: SyncStatus;
  hasSlug?: boolean;
  onPrint: () => void;
  onOpenSettings: () => void;
  onShare: () => void;
  onRotateForward?: () => void;
  onRotateBackward?: () => void;
}

export function RotationControls({
  rotation,
  rotationLabel,
  isSharing,
  isDateMode,
  isAnimating,
  syncStatus,
  hasSlug,
  onPrint,
  onOpenSettings,
  onShare,
  onRotateForward,
  onRotateBackward,
}: RotationControlsProps) {
  const t = useT();
  return (
    <div className="px-3 sm:px-4 pb-3 rotation-no-print">
      <div className="max-w-4xl mx-auto">
        <m.div
          className="theme-border theme-shadow p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4"
          style={{
            backgroundColor: "var(--dt-control-bar-bg)",
            borderRadius: "var(--dt-border-radius)",
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div
            className="flex items-center gap-3 sm:gap-3"
            data-onboarding="rotation-controls"
          >
            <div
              className="theme-border flex items-center overflow-hidden"
              style={{
                backgroundColor: "var(--dt-button-bg)",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
            >
              {!isDateMode && onRotateBackward && (
                <button
                  type="button"
                  onClick={onRotateBackward}
                  disabled={isAnimating}
                  className="h-9 sm:h-10 px-2 flex items-center justify-center transition-colors hover:bg-black/5 active:bg-black/10 disabled:opacity-50"
                  aria-label={t("rotation.prevAria")}
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
              <div
                className="h-9 sm:h-10 min-w-[2.25rem] sm:min-w-[2.5rem] flex items-center justify-center px-1 text-base sm:text-lg"
                style={{
                  fontWeight: "var(--dt-font-weight-extra)",
                  borderLeft: !isDateMode
                    ? "var(--dt-border-width) solid var(--dt-border-color)"
                    : "none",
                  borderRight: !isDateMode
                    ? "var(--dt-border-width) solid var(--dt-border-color)"
                    : "none",
                }}
                aria-label={t("rotation.currentAria", { n: rotation })}
              >
                {rotation}
              </div>
              {!isDateMode && onRotateForward && (
                <button
                  type="button"
                  onClick={onRotateForward}
                  disabled={isAnimating}
                  className="h-9 sm:h-10 px-2 flex items-center justify-center transition-colors hover:bg-black/5 active:bg-black/10 disabled:opacity-50"
                  aria-label={t("rotation.nextAria")}
                >
                  <ChevronRight className="size-4" />
                </button>
              )}
            </div>
            <div className="text-center sm:text-left">
              <div
                className="text-sm font-bold"
                style={{ color: "var(--dt-control-bar-text)" }}
              >
                {t("rotation.current")}
              </div>
              <div
                className="text-xs sm:text-sm font-medium"
                style={{ color: "var(--dt-control-bar-subtext)" }}
              >
                {isDateMode ? t("rotation.autoByDate") : rotationLabel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            <PrintMenu onPrint={onPrint} />
            <button
              type="button"
              onClick={onShare}
              disabled={isSharing}
              data-onboarding="share-button"
              className="theme-border theme-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              style={{
                backgroundColor: "var(--dt-button-bg)",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
              aria-label={t("rotation.shareAria")}
            >
              {isSharing ? (
                <Loader2
                  className="size-3.5 sm:size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : hasSlug ? (
                <span className="relative inline-flex">
                  {syncStatus === "error" ? (
                    <CloudOff
                      className="size-3.5 sm:size-4"
                      style={{ color: "#EF4444" }}
                      aria-hidden="true"
                    />
                  ) : syncStatus === "syncing" ? (
                    <Cloud
                      className="size-3.5 sm:size-4 animate-pulse"
                      aria-hidden="true"
                    />
                  ) : (
                    <>
                      <Cloud
                        className="size-3.5 sm:size-4"
                        aria-hidden="true"
                      />
                      <span
                        className="absolute -top-0.5 -right-0.5 size-2 rounded-full border border-white"
                        style={{ backgroundColor: "#10B981" }}
                        aria-label={t("rotation.cloudSaved")}
                      />
                    </>
                  )}
                </span>
              ) : (
                <span className="relative inline-flex">
                  <Cloud className="size-3.5 sm:size-4" aria-hidden="true" />
                  <span
                    className="absolute -top-0.5 -right-0.5 size-2 rounded-full border border-white"
                    style={{ backgroundColor: "#F59E0B" }}
                    aria-label={t("rotation.cloudUnsaved")}
                  />
                </span>
              )}
              {t("common.share")}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              data-onboarding="edit-button"
              className="theme-border theme-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift active:translate-x-[1px] active:translate-y-[1px]"
              style={{
                backgroundColor: "var(--dt-button-bg)",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
              aria-label={t("rotation.editAria")}
            >
              <Pencil className="size-3.5 sm:size-4" aria-hidden="true" />{" "}
              {t("common.edit")}
            </button>
          </div>
        </m.div>
      </div>
    </div>
  );
}
