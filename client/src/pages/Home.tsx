import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { ModalHost } from "@/components/ModalHost";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { RotationControls } from "@/features/home/RotationControls";
import { ScheduleViews } from "@/features/home/ScheduleViews";
import { ViewTabs } from "@/features/home/ViewTabs";
import { ScheduleHeader } from "@/features/home/ScheduleHeader";
import { ScheduleTabs } from "@/features/home/ScheduleTabs";
import { TodayBanner } from "@/features/home/TodayBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useHomeState } from "@/hooks/useHomeState";
import { useTobanTools } from "@/hooks/useTobanTools";
import { useT } from "@/i18n";
import "./home.css";

export default function Home() {
  const s = useHomeState();
  const t = useT();
  useTobanTools(s); // WebMCP tools を登録（非対応ブラウザでは no-op）

  if (!s.activeSchedule) {
    return (
      <DesignThemeProvider themeId={undefined}>
        <main
          className="rotation-page min-h-screen"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
            <p
              className="text-lg font-bold"
              style={{ color: "var(--dt-text)" }}
            >
              {t("home.empty")}
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {t("home.emptyHint")}
            </p>
            <button
              type="button"
              className="theme-border px-6 py-3 font-bold theme-hover-lift transition-all duration-150"
              style={{
                backgroundColor: "var(--dt-button-bg)",
                borderRadius: "var(--dt-border-radius-sm)",
                color: "var(--dt-text)",
              }}
              onClick={s.openNewSchedule}
            >
              {t("home.create")}
            </button>
          </div>
          {createPortal(
            <AnimatePresence>
              {s.modal.type === "newSchedule" && (
                <NewScheduleModal
                  onSelect={s.onAddSchedule}
                  onClose={s.closeModal}
                />
              )}
            </AnimatePresence>,
            document.body
          )}
          {s.showOnboarding && (
            <OnboardingOverlay onComplete={s.handleOnboardingComplete} />
          )}
          <InstallPrompt />
        </main>
      </DesignThemeProvider>
    );
  }

  const rotationLabel =
    s.effectiveRotation === 0
      ? t("rotation.initial")
      : t("rotation.nth", { n: s.effectiveRotation });

  return (
    <DesignThemeProvider themeId={s.activeSchedule.designThemeId}>
      <main
        className="rotation-page min-h-screen"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
      >
        <ScheduleHeader
          scheduleName={s.activeSchedule.name}
          rotationLabel={rotationLabel}
        />

        <RotationControls
          rotation={s.effectiveRotation}
          rotationLabel={rotationLabel}
          isSharing={s.isSharing}
          isDateMode={s.isDateMode}
          isAnimating={s.isAnimating}
          onPrint={() =>
            s.handlePrint(s.viewTab, s.activeSchedule.name, rotationLabel)
          }
          onOpenSettings={s.openSettings}
          onShare={s.handleShare}
          onRotateForward={() => s.handleRotate("forward")}
          onRotateBackward={() => s.handleRotate("backward")}
          syncStatus={s.syncStatus}
          hasSlug={!!s.activeSchedule.slug}
        />

        <TodayBanner
          groups={s.groups}
          members={s.members}
          rotation={s.effectiveRotation}
          isDateMode={s.isDateMode}
          rotationLabel={rotationLabel}
          assignmentMode={s.activeSchedule.assignmentMode}
        />

        <ScheduleTabs
          schedules={s.state.schedules}
          activeScheduleId={s.state.activeScheduleId}
          draggedTabId={s.draggedTabId}
          dragOverTabId={s.dragOverTabId}
          onSelectSchedule={s.selectSchedule}
          onAddSchedule={s.openNewSchedule}
          onDragStart={s.onDragStart}
          onDragOver={s.onDragOver}
          onDrop={s.onDrop}
          onDragEnd={s.onDragEnd}
          onReorderTab={s.onReorderTab}
        />

        <ViewTabs viewTab={s.viewTab} onChangeTab={s.changeTab} />

        <ScheduleViews
          viewTab={s.viewTab}
          assignments={s.assignments}
          groups={s.groups}
          members={s.members}
          rotation={s.effectiveRotation}
          rotationConfig={s.activeSchedule.rotationConfig}
          assignmentMode={s.activeSchedule.assignmentMode}
          scheduleId={s.activeSchedule.id}
          direction={s.direction}
          stagger={s.isAnimating}
        />

        <ModalHost
          modalType={s.modal.type}
          deleteTargetId={s.modal.deleteTargetId}
          showShare={s.showShare}
          activeSchedule={s.activeSchedule}
          schedules={s.state.schedules}
          onAddSchedule={s.onAddSchedule}
          onDeleteSchedule={s.onDeleteSchedule}
          onDuplicateSchedule={s.onDuplicateSchedule}
          onSaveSettings={s.onSaveSettings}
          onCloseModal={s.closeModal}
          onRequestDelete={() => s.openConfirmDelete(s.activeSchedule!.id)}
          onCloseShare={() => s.setShowShare(false)}
        />
        {s.showOnboarding && (
          <OnboardingOverlay onComplete={s.handleOnboardingComplete} />
        )}
        <InstallPrompt />
      </main>
    </DesignThemeProvider>
  );
}
