import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { ModalHost } from "@/components/ModalHost";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useModalManager } from "@/hooks/useModalManager";
import { useOnboarding } from "@/hooks/useOnboarding";
import { usePrintMode } from "@/hooks/usePrintMode";
import { useRotationAnimation } from "@/hooks/useRotationAnimation";
import { useScheduleManager } from "@/hooks/useScheduleManager";
import { useShareFlow } from "@/hooks/useShareFlow";
import { useTabDragDrop } from "@/hooks/useTabDragDrop";
import { useViewTab } from "@/hooks/useViewTab";
import { safeGetItem } from "@/lib/storage";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { STORAGE_KEY, TEMPLATES } from "@/rotation/constants";
import { computeAssignments, getEffectiveRotation } from "@/rotation/utils";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationControls } from "@/features/home/RotationControls";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { RotationCalendar } from "@/features/home/RotationCalendar";
import { ViewTabs } from "@/features/home/ViewTabs";
import { ScheduleHeader } from "@/features/home/ScheduleHeader";
import { ScheduleTabs } from "@/features/home/ScheduleTabs";
import { TodayBanner } from "@/features/home/TodayBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import "./home.css";

export default function Home() {
  const {
    state, setState, activeSchedule, updateActiveSchedule,
    handleAddSchedule, handleDeleteSchedule, handleDuplicateSchedule,
    handleSaveSettings, selectSchedule, handleTabDrop, addScheduleFromTemplateIndex,
    saveState,
  } = useScheduleManager();

  const { syncStatus, prepareForManualSave } = useAutoSync(activeSchedule, updateActiveSchedule);
  const { isSharing, showShare, setShowShare, handleShare } = useShareFlow({ activeSchedule, prepareForManualSave, updateActiveSchedule });
  const { modal, openSettings, openNewSchedule, openConfirmDelete, closeModal } = useModalManager();
  const { isAnimating, direction, handleRotate } = useRotationAnimation(setState);
  const { draggedTabId, dragOverTabId, onDragStart, onDragOver, onDrop, onDragEnd } = useTabDragDrop(handleTabDrop);
  const { handlePrint } = usePrintMode();
  const { viewTab, changeTab } = useViewTab();
  const { showOnboarding, handleOnboardingComplete } = useOnboarding({
    hasSchedule: !!activeSchedule,
    isModalOpen: modal.type !== null,
    isShareOpen: showShare,
  });

  const mountedRef = useRef(false);

  const groups = useMemo(() => activeSchedule?.groups ?? [], [activeSchedule]);
  const members = useMemo(() => activeSchedule?.members ?? [], [activeSchedule]);
  const effectiveRotation = useMemo(
    () => (activeSchedule ? getEffectiveRotation(activeSchedule) : 0),
    [activeSchedule],
  );
  const isDateMode = activeSchedule?.rotationConfig?.mode === "date";
  const assignments = useMemo(
    () => activeSchedule ? computeAssignments(groups, members, effectiveRotation, activeSchedule.assignmentMode) : [],
    [groups, members, effectiveRotation, activeSchedule],
  );

  useBodyScrollLock(modal.type !== null || showShare);

  useEffect(() => { saveState(state); }, [state, saveState]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const templateParam = params.get("template");
    if (templateParam !== null) {
      const idx = parseInt(templateParam, 10);
      if (addScheduleFromTemplateIndex(idx, TEMPLATES)) {
        closeModal();
      }
    } else if (safeGetItem(STORAGE_KEY) === null) {
      openNewSchedule();
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [addScheduleFromTemplateIndex, closeModal, openNewSchedule]);

  const onAddSchedule = useCallback((template: Parameters<typeof handleAddSchedule>[0]) => {
    handleAddSchedule(template);
    closeModal();
  }, [handleAddSchedule, closeModal]);

  const onDeleteSchedule = useCallback((scheduleId: string) => {
    handleDeleteSchedule(scheduleId);
    closeModal();
  }, [handleDeleteSchedule, closeModal]);

  const onDuplicateSchedule = useCallback(() => {
    handleDuplicateSchedule();
    closeModal();
  }, [handleDuplicateSchedule, closeModal]);

  const onSaveSettings = useCallback((...args: Parameters<typeof handleSaveSettings>) => {
    handleSaveSettings(...args);
    closeModal();
  }, [handleSaveSettings, closeModal]);

  if (!activeSchedule) {
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
              onClick={openNewSchedule}
            >
              当番表を作成
            </button>
          </div>
          {createPortal(
            <AnimatePresence>
              {modal.type === "newSchedule" && <NewScheduleModal onSelect={onAddSchedule} onClose={closeModal} />}
            </AnimatePresence>,
            document.body,
          )}
          {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
          <InstallPrompt />
        </main>
      </DesignThemeProvider>
    );
  }

  const rotationLabel = effectiveRotation === 0 ? "初期" : `${effectiveRotation}回目`;

  return (
    <DesignThemeProvider themeId={activeSchedule.designThemeId}>
    <main className="rotation-page min-h-screen" style={{ backgroundColor: "var(--dt-page-bg)" }}>
      <ScheduleHeader scheduleName={activeSchedule.name} rotationLabel={rotationLabel} />

      <RotationControls
        rotation={effectiveRotation}
        rotationLabel={rotationLabel}
        isSharing={isSharing}
        isDateMode={isDateMode}
        isAnimating={isAnimating}
        onPrint={() => handlePrint(viewTab)}
        onOpenSettings={openSettings}
        onShare={handleShare}
        onRotateForward={() => handleRotate("forward")}
        onRotateBackward={() => handleRotate("backward")}
        syncStatus={syncStatus}
        hasSlug={!!activeSchedule.slug}
      />

      {isDateMode && (
        <TodayBanner groups={groups} members={members} rotation={effectiveRotation} assignmentMode={activeSchedule.assignmentMode} />
      )}

      <ScheduleTabs
        schedules={state.schedules}
        activeScheduleId={state.activeScheduleId}
        draggedTabId={draggedTabId}
        dragOverTabId={dragOverTabId}
        onSelectSchedule={selectSchedule}
        onAddSchedule={openNewSchedule}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      />

      <ViewTabs viewTab={viewTab} onChangeTab={changeTab} />

      {viewTab === "cards" && (
        <AssignmentsGrid
          assignments={assignments} direction={direction} rotation={effectiveRotation}
          scheduleId={activeSchedule.id} stagger={isAnimating}
          assignmentMode={activeSchedule.assignmentMode}
        />
      )}
      {viewTab === "table" && (
        <RotationQuickTable groups={groups} members={members} rotation={effectiveRotation} assignmentMode={activeSchedule.assignmentMode} />
      )}
      {viewTab === "calendar" && (
        <RotationCalendar groups={groups} members={members} rotation={effectiveRotation} rotationConfig={activeSchedule.rotationConfig} assignmentMode={activeSchedule.assignmentMode} />
      )}

      <ModalHost
        modalType={modal.type}
        deleteTargetId={modal.deleteTargetId}
        showShare={showShare}
        activeSchedule={activeSchedule}
        schedules={state.schedules}
        onAddSchedule={onAddSchedule}
        onDeleteSchedule={onDeleteSchedule}
        onDuplicateSchedule={onDuplicateSchedule}
        onSaveSettings={onSaveSettings}
        onCloseModal={closeModal}
        onRequestDelete={() => openConfirmDelete(activeSchedule.id)}
        onCloseShare={() => setShowShare(false)}
      />
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      <InstallPrompt />
    </main>
    </DesignThemeProvider>
  );
}
