import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { ModalHost } from "@/components/ModalHost";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationControls } from "@/features/home/RotationControls";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { RotationCalendar } from "@/features/home/RotationCalendar";
import { ViewTabs } from "@/features/home/ViewTabs";
import { ScheduleHeader } from "@/features/home/ScheduleHeader";
import { ScheduleTabs } from "@/features/home/ScheduleTabs";
import { TodayBanner } from "@/features/home/TodayBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useHomeState } from "./useHomeState";
import "./home.css";

export default function Home() {
  const s = useHomeState();

  if (!s.activeSchedule) {
    return (
      <DesignThemeProvider themeId={undefined}>
        <main className="rotation-page min-h-screen" style={{ backgroundColor: "var(--dt-page-bg)" }}>
          <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
            <p className="text-lg font-bold" style={{ color: "var(--dt-text)" }}>当番表がありません</p>
            <p className="text-sm" style={{ color: "var(--dt-text-secondary)" }}>新しい当番表を作成してください。</p>
            <button
              type="button"
              className="theme-border px-6 py-3 font-bold theme-hover-lift transition-all duration-150"
              style={{ backgroundColor: "var(--dt-button-bg)", borderRadius: "var(--dt-border-radius-sm)", color: "var(--dt-text)" }}
              onClick={s.openNewSchedule}
            >
              当番表を作成
            </button>
          </div>
          {createPortal(
            <AnimatePresence>
              {s.modal.type === "newSchedule" && <NewScheduleModal onSelect={s.onAddSchedule} onClose={s.closeModal} />}
            </AnimatePresence>,
            document.body,
          )}
          {s.showOnboarding && <OnboardingOverlay onComplete={s.handleOnboardingComplete} />}
          <InstallPrompt />
        </main>
      </DesignThemeProvider>
    );
  }

  const rotationLabel = s.effectiveRotation === 0 ? "初期" : `${s.effectiveRotation}回目`;

  return (
    <DesignThemeProvider themeId={s.activeSchedule.designThemeId}>
    <main className="rotation-page min-h-screen" style={{ backgroundColor: "var(--dt-page-bg)" }}>
      <ScheduleHeader scheduleName={s.activeSchedule.name} rotationLabel={rotationLabel} />

      <RotationControls
        rotation={s.effectiveRotation}
        rotationLabel={rotationLabel}
        isSharing={s.isSharing}
        isDateMode={s.isDateMode}
        isAnimating={s.isAnimating}
        onPrint={() => s.handlePrint(s.viewTab)}
        onOpenSettings={s.openSettings}
        onShare={s.handleShare}
        onRotateForward={() => s.handleRotate("forward")}
        onRotateBackward={() => s.handleRotate("backward")}
        syncStatus={s.syncStatus}
        hasSlug={!!s.activeSchedule.slug}
      />

      {s.isDateMode && (
        <TodayBanner groups={s.groups} members={s.members} rotation={s.effectiveRotation} assignmentMode={s.activeSchedule.assignmentMode} />
      )}

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

      {s.viewTab === "cards" && (
        <AssignmentsGrid
          assignments={s.assignments} direction={s.direction} rotation={s.effectiveRotation}
          scheduleId={s.activeSchedule.id} stagger={s.isAnimating}
          assignmentMode={s.activeSchedule.assignmentMode}
        />
      )}
      {s.viewTab === "table" && (
        <RotationQuickTable groups={s.groups} members={s.members} rotation={s.effectiveRotation} assignmentMode={s.activeSchedule.assignmentMode} />
      )}
      {s.viewTab === "calendar" && (
        <RotationCalendar groups={s.groups} members={s.members} rotation={s.effectiveRotation} rotationConfig={s.activeSchedule.rotationConfig} assignmentMode={s.activeSchedule.assignmentMode} />
      )}

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
      {s.showOnboarding && <OnboardingOverlay onComplete={s.handleOnboardingComplete} />}
      <InstallPrompt />
    </main>
    </DesignThemeProvider>
  );
}
