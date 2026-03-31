import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { STORAGE_KEY, TEMPLATES } from "@/rotation/constants";
import { computeAssignments, getEffectiveRotation } from "@/rotation/utils";

export function useHomeState() {
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

  const onReorderTab = useCallback(
    (scheduleId: string, dir: "left" | "right") => {
      const { schedules } = state;
      const pinned = schedules.filter((s) => s.pinned);
      const unpinned = schedules.filter((s) => !s.pinned);
      const sorted = [...pinned, ...unpinned];
      const idx = sorted.findIndex((s) => s.id === scheduleId);
      if (idx < 0) return;
      if (sorted[idx].pinned) return;
      if (dir === "right") {
        const neighbor = sorted[idx + 1];
        if (!neighbor) return;
        handleTabDrop(scheduleId, neighbor.id);
      } else {
        const neighbor = sorted[idx - 1];
        if (!neighbor || neighbor.pinned) return;
        handleTabDrop(scheduleId, neighbor.id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- state.schedules is the only used property
    [state.schedules, handleTabDrop],
  );

  return {
    state,
    activeSchedule,
    selectSchedule,
    // Sync
    syncStatus,
    // Share
    isSharing, showShare, setShowShare, handleShare,
    // Modal
    modal, openSettings, openNewSchedule, openConfirmDelete, closeModal,
    // Animation
    isAnimating, direction, handleRotate,
    // Tab drag
    draggedTabId, dragOverTabId, onDragStart, onDragOver, onDrop, onDragEnd,
    // Print
    handlePrint,
    // View
    viewTab, changeTab,
    // Onboarding
    showOnboarding, handleOnboardingComplete,
    // Derived
    groups, members, effectiveRotation, isDateMode, assignments,
    // Callbacks
    onAddSchedule, onDeleteSchedule, onDuplicateSchedule, onSaveSettings, onReorderTab,
  };
}
