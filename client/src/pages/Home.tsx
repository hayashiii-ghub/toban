import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { ModalHost } from "@/components/ModalHost";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useModalManager } from "@/hooks/useModalManager";
import { useScheduleManager } from "@/hooks/useScheduleManager";
import { useShareFlow } from "@/hooks/useShareFlow";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { ANIMATION_DURATION_MS, ONBOARDING_STORAGE_KEY, STORAGE_KEY, TEMPLATES } from "@/rotation/constants";
import { computeAssignments, getEffectiveRotation, normalizeRotation } from "@/rotation/utils";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationControls } from "@/features/home/RotationControls";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { RotationCalendar } from "@/features/home/RotationCalendar";
import { ViewTabs, type ViewTabValue } from "@/features/home/ViewTabs";
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

  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTabValue>(() => {
    const saved = safeGetItem("toban-view-tab");
    if (saved === "cards" || saved === "table" || saved === "calendar") return saved;
    return "cards";
  });
  const animationTimeoutRef = useRef<number | null>(null);
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
    return () => { if (animationTimeoutRef.current !== null) window.clearTimeout(animationTimeoutRef.current); };
  }, []);

  useEffect(() => {
    const cleanupPrintState = () => {
      delete document.body.dataset.printMode;
      document.getElementById("print-orientation")?.remove();
    };
    window.addEventListener("afterprint", cleanupPrintState);
    return () => { window.removeEventListener("afterprint", cleanupPrintState); cleanupPrintState(); };
  }, []);

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

  useEffect(() => {
    const onboardingDone = safeGetItem(ONBOARDING_STORAGE_KEY) === "true";
    if (onboardingDone || modal.type !== null || showShare || !activeSchedule) return;
    const timer = window.setTimeout(() => setShowOnboarding(true), 800);
    return () => window.clearTimeout(timer);
  }, [activeSchedule, modal.type, showShare]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    safeSetItem(ONBOARDING_STORAGE_KEY, "true");
  }, []);

  const handleRotate = useCallback((nextDirection: "forward" | "backward") => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(nextDirection);
    setState((prev) => {
      const schedule = prev.schedules.find((item) => item.id === prev.activeScheduleId);
      if (!schedule) return prev;
      const activeMembers = schedule.members.filter(m => !m.skipped);
      if (activeMembers.length === 0) return prev;
      const nextRotation = nextDirection === "forward" ? schedule.rotation + 1 : schedule.rotation - 1;
      return {
        ...prev,
        schedules: prev.schedules.map((item) =>
          item.id === prev.activeScheduleId
            ? { ...item, rotation: normalizeRotation(nextRotation, activeMembers.length) }
            : item,
        ),
      };
    });
    if (animationTimeoutRef.current !== null) window.clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, ANIMATION_DURATION_MS);
  }, [isAnimating, setState]);

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

  const onTabDrop = useCallback((targetId: string) => {
    setDraggedTabId((currentDraggedId) => {
      if (currentDraggedId) handleTabDrop(currentDraggedId, targetId);
      return null;
    });
    setDragOverTabId(null);
  }, [handleTabDrop]);

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
        onPrint={() => {
          document.body.dataset.printMode = viewTab;
          const orientation = viewTab === "calendar" ? "portrait" : "landscape";
          const style = document.createElement("style");
          style.id = "print-orientation";
          style.textContent = `@page { size: A4 ${orientation}; }`;
          document.head.appendChild(style);
          window.print();
        }}
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
        onDragStart={(event, scheduleId) => { setDraggedTabId(scheduleId); event.dataTransfer.effectAllowed = "move"; }}
        onDragOver={(event, scheduleId) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverTabId(scheduleId); }}
        onDrop={(event, scheduleId) => { event.preventDefault(); onTabDrop(scheduleId); }}
        onDragEnd={() => { setDraggedTabId(null); setDragOverTabId(null); }}
      />

      <ViewTabs viewTab={viewTab} onChangeTab={(tab) => {
        startTransition(() => setViewTab(tab));
        safeSetItem("toban-view-tab", tab);
      }} />

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
