import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
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
import { getTemplates } from "@shared/template-localization";
import { useLocale } from "@/i18n";
import { computeAssignments, getEffectiveRotation } from "@/rotation/utils";
import type { AppState, Schedule } from "@/rotation/types";
import {
  applyLocalizedGuideUpdate,
  localizeGuide,
  localizeGuideState,
} from "@/rotation/guide-localization";

export function useHomeState() {
  const { locale } = useLocale();
  const toolEditingRef = useRef(false);
  const shareVisibleRef = useRef(false);
  const {
    state: storedState,
    setState,
    activeSchedule: storedSchedule,
    updateActiveSchedule,
    updateScheduleById,
    handleAddSchedule,
    handleDeleteSchedule,
    handleDuplicateSchedule,
    handleSaveSettings,
    selectSchedule,
    handleTabDrop,
    addScheduleFromTemplateIndex,
    getToolState: getStoredState,
    commitToolState: commitManagerState,
    localSaveStatus,
  } = useScheduleManager();

  // The untouched guide is help content. Translate its presentation without
  // turning a language switch into a saved edit to an existing shared roster.
  const state = useMemo(
    () => localizeGuideState(storedState, locale),
    [storedState, locale]
  );
  const activeSchedule = state.schedules.find(s => s.id === storedSchedule?.id);
  const getToolState = useCallback(
    () => localizeGuideState(getStoredState(), locale),
    [getStoredState, locale]
  );

  const {
    modal,
    openSettings: openSettingsModal,
    openNewSchedule: openNewScheduleModal,
    openConfirmDelete: openConfirmDeleteModal,
    closeModal,
  } = useModalManager();

  // Async sync/share work keeps the target that was active when it started.
  // It must not attach a late response to whichever tab is active afterward.
  const activeScheduleId = activeSchedule?.id;
  const updateCurrentSchedule = useCallback(
    (updater: (schedule: Schedule) => Schedule) => {
      if (activeScheduleId) updateScheduleById(activeScheduleId, updater);
    },
    [activeScheduleId, updateScheduleById]
  );
  const getScheduleById = useCallback(
    (id: string) =>
      getStoredState().schedules.find(schedule => schedule.id === id),
    [getStoredState]
  );

  const { syncStatus, prepareForManualSave: prepareStoredForManualSave } =
    useAutoSync(
      storedSchedule,
      updateCurrentSchedule,
      // モーダルが開いている間は下書きを持っているので、引き直しで土台を入れ替えない
      { isEditing: modal.type !== null, getScheduleById }
    );
  const prepareForManualSave = useCallback(async () => {
    const prepared = await prepareStoredForManualSave();
    if (!prepared) return prepared;
    const localized = localizeGuide(prepared, locale);
    if (localized !== prepared) {
      // Sharing is an explicit save: publish the language the user sees, and
      // keep that same content in storage so a later sync cannot undo it.
      flushSync(() => {
        setState(current => ({
          ...current,
          schedules: current.schedules.map(schedule =>
            schedule.id === prepared.id
              ? localizeGuide(schedule, locale)
              : schedule
          ),
        }));
      });
    }
    return localized;
  }, [prepareStoredForManualSave, locale, setState]);
  const {
    isSharing,
    showShare,
    setShowShare: setShareVisible,
    handleShare: shareSchedule,
  } = useShareFlow({
    activeSchedule,
    prepareForManualSave,
    updateActiveSchedule: updateCurrentSchedule,
  });

  useLayoutEffect(() => {
    toolEditingRef.current = modal.type !== null || showShare || isSharing;
    shareVisibleRef.current = showShare;
  }, [modal.type, showShare, isSharing]);

  // Set the guard at invocation too: opening an editor and receiving a tool
  // call can happen before React commits the editor's state.
  const openSettings = useCallback(() => {
    toolEditingRef.current = true;
    openSettingsModal();
  }, [openSettingsModal]);
  const openNewSchedule = useCallback(() => {
    toolEditingRef.current = true;
    openNewScheduleModal();
  }, [openNewScheduleModal]);
  const openConfirmDelete = useCallback(
    (scheduleId: string) => {
      toolEditingRef.current = true;
      openConfirmDeleteModal(scheduleId);
    },
    [openConfirmDeleteModal]
  );
  const setShowShare = useCallback(
    (action: SetStateAction<boolean>) => {
      const next =
        typeof action === "function" ? action(shareVisibleRef.current) : action;
      shareVisibleRef.current = next;
      if (next) toolEditingRef.current = true;
      setShareVisible(next);
    },
    [setShareVisible]
  );
  const handleShare = useCallback(() => {
    if (!activeSchedule) return Promise.resolve();
    let pending = Promise.resolve();
    // Commit the busy state before an immediate API failure can clear it in
    // the same batch, so the editing guard is also reset on completion.
    flushSync(() => {
      toolEditingRef.current = true;
      pending = shareSchedule();
    });
    return pending;
  }, [activeSchedule, shareSchedule]);
  const isToolEditing = useCallback(() => toolEditingRef.current, []);
  const commitToolState = useCallback(
    async (updater: (state: AppState) => AppState) => {
      const outcome = await commitManagerState(
        current => applyLocalizedGuideUpdate(current, locale, updater),
        () => toolEditingRef.current
      );
      return {
        ...outcome,
        state: localizeGuideState(outcome.state, locale),
        storedState: outcome.state,
      };
    },
    [commitManagerState, locale]
  );
  const { isAnimating, direction, handleRotate } =
    useRotationAnimation(setState);
  const {
    draggedTabId,
    dragOverTabId,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  } = useTabDragDrop(handleTabDrop);
  const { handlePrint } = usePrintMode();
  const { viewTab, changeTab, changeTabForTool } = useViewTab();
  const { showOnboarding, handleOnboardingComplete } = useOnboarding({
    hasSchedule: !!activeSchedule,
    isModalOpen: modal.type !== null,
    isShareOpen: showShare,
  });

  const mountedRef = useRef(false);

  const groups = useMemo(() => activeSchedule?.groups ?? [], [activeSchedule]);
  const members = useMemo(
    () => activeSchedule?.members ?? [],
    [activeSchedule]
  );
  const effectiveRotation = useMemo(
    () => (activeSchedule ? getEffectiveRotation(activeSchedule) : 0),
    [activeSchedule]
  );
  const isDateMode = activeSchedule?.rotationConfig?.mode === "date";
  const assignments = useMemo(
    () =>
      activeSchedule
        ? computeAssignments(
            groups,
            members,
            effectiveRotation,
            activeSchedule.assignmentMode
          )
        : [],
    [groups, members, effectiveRotation, activeSchedule]
  );

  useBodyScrollLock(modal.type !== null || showShare);

  // /templates からの ?template=N 着地だけをここで処理する。
  // 保存データが無い初回訪問は loadState が defaultState（「はじめてガイド」）を
  // seed する設計で、モーダルは出さない（出すと useOnboarding のツアーが
  // isModalOpen で抑制されてしまう）。
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const templateParam = params.get("template");
    if (templateParam !== null) {
      const idx = parseInt(templateParam, 10);
      if (addScheduleFromTemplateIndex(idx, getTemplates(locale))) {
        closeModal();
      }
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [addScheduleFromTemplateIndex, closeModal, locale]);

  const onAddSchedule = useCallback(
    (template: Parameters<typeof handleAddSchedule>[0]) => {
      handleAddSchedule(template);
      closeModal();
    },
    [handleAddSchedule, closeModal]
  );

  const onDeleteSchedule = useCallback(
    (scheduleId: string) => {
      handleDeleteSchedule(scheduleId);
      closeModal();
    },
    [handleDeleteSchedule, closeModal]
  );

  const onDuplicateSchedule = useCallback(() => {
    handleDuplicateSchedule(locale);
    closeModal();
  }, [handleDuplicateSchedule, closeModal, locale]);

  const onSaveSettings = useCallback(
    (...args: Parameters<typeof handleSaveSettings>) => {
      handleSaveSettings(...args);
      closeModal();
    },
    [handleSaveSettings, closeModal]
  );

  const onReorderTab = useCallback(
    (scheduleId: string, dir: "left" | "right") => {
      const { schedules } = state;
      const pinned = schedules.filter(s => s.pinned);
      const unpinned = schedules.filter(s => !s.pinned);
      const sorted = [...pinned, ...unpinned];
      const idx = sorted.findIndex(s => s.id === scheduleId);
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
    [state.schedules, handleTabDrop]
  );

  return {
    state,
    getToolState,
    commitToolState,
    isToolEditing,
    localSaveStatus,
    activeSchedule,
    updateActiveSchedule,
    selectSchedule,
    // Sync
    syncStatus,
    // Share
    isSharing,
    showShare,
    setShowShare,
    handleShare,
    // Modal
    modal,
    openSettings,
    openNewSchedule,
    openConfirmDelete,
    closeModal,
    // Animation
    isAnimating,
    direction,
    handleRotate,
    // Tab drag
    draggedTabId,
    dragOverTabId,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    // Print
    handlePrint,
    // View
    viewTab,
    changeTab,
    changeTabForTool,
    // Onboarding
    showOnboarding,
    handleOnboardingComplete,
    // Derived
    groups,
    members,
    effectiveRotation,
    isDateMode,
    assignments,
    // Callbacks
    onAddSchedule,
    onDeleteSchedule,
    onDuplicateSchedule,
    onSaveSettings,
    onReorderTab,
  };
}
