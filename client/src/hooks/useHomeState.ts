import { computed, nextTick, onMounted, reactive } from "vue";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useModalManager } from "@/hooks/useModalManager";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useLocalToday } from "@/hooks/useLocalToday";
import { usePrintMode } from "@/hooks/usePrintMode";
import { useRotationAnimation } from "@/hooks/useRotationAnimation";
import { useScheduleManager } from "@/hooks/useScheduleManager";
import { useShareFlow } from "@/hooks/useShareFlow";
import { useViewTab } from "@/hooks/useViewTab";
import { getTemplates } from "@shared/template-localization";
import { toast } from "vue-sonner";
import { useLocale, useT } from "@/i18n";
import { computeAssignments, getEffectiveRotation } from "@/rotation/utils";
import type { AppState, Schedule } from "@/rotation/types";
import type { StateAction } from "@/lib/vue";
import { useLocation } from "@/lib/router";
import {
  applyLocalizedGuideUpdate,
  localizeGuide,
  localizeGuideState,
} from "@/rotation/guide-localization";

export function useHomeState() {
  const [, navigate] = useLocation();
  const today = useLocalToday();
  const { locale } = useLocale();
  const t = useT();
  const manager = useScheduleManager();
  // The untouched guide is translated presentation, never an implicit saved edit.
  const state = computed(() => localizeGuideState(manager.state, locale.value));
  const activeSchedule = computed(() =>
    state.value.schedules.find(
      schedule => schedule.id === manager.activeSchedule?.id
    )
  );
  const getToolState = () =>
    localizeGuideState(manager.getToolState(), locale.value);
  const modals = useModalManager();
  const updateCurrentSchedule = (
    updater: (schedule: Schedule) => Schedule,
    scheduleId?: string
  ) => {
    const target = scheduleId ?? activeSchedule.value?.id;
    if (target) manager.updateScheduleById(target, updater);
  };
  const getScheduleById = (id: string) =>
    manager.getToolState().schedules.find(schedule => schedule.id === id);
  const sync = useAutoSync(
    () => manager.activeSchedule,
    updateCurrentSchedule,
    {
      isEditing: () => modals.modal.type !== null,
      getScheduleById,
    }
  );
  async function prepareForManualSave() {
    const requestedLocale = locale.value;
    const prepared = await sync.prepareForManualSave();
    if (!prepared) return prepared;
    const localized = localizeGuide(prepared, requestedLocale);
    if (localized !== prepared) {
      manager.setState(current => ({
        ...current,
        schedules: current.schedules.map(schedule =>
          schedule.id === prepared.id
            ? localizeGuide(schedule, requestedLocale)
            : schedule
        ),
      }));
      // Explicit sharing must persist the same language that was confirmed.
      await nextTick();
    }
    return localized;
  }
  const share = useShareFlow({
    activeSchedule,
    prepareForManualSave,
    updateActiveSchedule: updateCurrentSchedule,
  });
  const isToolEditing = () =>
    modals.modal.type !== null ||
    share.showShare ||
    share.showShareConfirmation ||
    share.isSharing;
  const openSettings = () => modals.openSettings();
  const openNewSchedule = () => modals.openNewSchedule();
  const openConfirmDelete = (scheduleId: string) =>
    modals.openConfirmDelete(scheduleId);
  const setShowShare = (action: StateAction<boolean>) =>
    share.setShowShare(action);
  const handleShare = () =>
    activeSchedule.value ? share.handleShare() : Promise.resolve();
  const requestShareConfirmation = () => share.requestShareConfirmation();
  async function commitToolState(updater: (state: AppState) => AppState) {
    const requestedLocale = locale.value;
    const outcome = await manager.commitToolState(
      current => applyLocalizedGuideUpdate(current, requestedLocale, updater),
      isToolEditing
    );
    return {
      ...outcome,
      state: localizeGuideState(outcome.state, requestedLocale),
      storedState: outcome.state,
    };
  }
  const animation = useRotationAnimation(manager.setState);
  const { handlePrint } = usePrintMode();
  const view = useViewTab();
  const onboarding = useOnboarding({
    hasSchedule: () => !!activeSchedule.value,
    isModalOpen: () => modals.modal.type !== null,
    isShareOpen: () => share.showShare || share.showShareConfirmation,
  });
  const groups = computed(() => activeSchedule.value?.groups ?? []);
  const members = computed(() => activeSchedule.value?.members ?? []);
  const effectiveRotation = computed(() =>
    activeSchedule.value
      ? getEffectiveRotation(activeSchedule.value, today.value)
      : 0
  );
  const isDateMode = computed(
    () => activeSchedule.value?.rotationConfig?.mode === "date"
  );
  const assignments = computed(() =>
    activeSchedule.value
      ? computeAssignments(
          groups.value,
          members.value,
          effectiveRotation.value,
          activeSchedule.value.assignmentMode
        )
      : []
  );
  useBodyScrollLock(
    () =>
      modals.modal.type !== null ||
      share.showShare ||
      share.showShareConfirmation
  );

  onMounted(() => {
    const templateParam = new URLSearchParams(window.location.search).get(
      "template"
    );
    if (
      templateParam !== null &&
      manager.addScheduleFromTemplateIndex(
        parseInt(templateParam, 10),
        getTemplates(locale.value)
      )
    )
      modals.closeModal();
    if (window.location.search)
      void navigate(window.location.pathname, { replace: true });
  });
  const onAddSchedule = (
    template: Parameters<typeof manager.handleAddSchedule>[0]
  ) => {
    manager.handleAddSchedule(template);
    modals.closeModal();
  };
  const onDeleteSchedule = (scheduleId: string) => {
    manager.handleDeleteSchedule(scheduleId);
    modals.closeModal();
  };
  const onDuplicateSchedule = () => {
    manager.handleDuplicateSchedule(locale.value);
    modals.closeModal();
  };
  const onSaveSettings = (
    ...args: Parameters<typeof manager.handleSaveSettings>
  ) => {
    manager.handleSaveSettings(...args);
    modals.closeModal();
    toast.success(t("settings.saved"));
  };
  const onTogglePin = (scheduleId: string) =>
    manager.updateScheduleById(scheduleId, schedule => ({
      ...schedule,
      pinned: !schedule.pinned,
    }));
  function onReorderTab(scheduleId: string, direction: "left" | "right") {
    const sorted = [
      ...state.value.schedules.filter(schedule => schedule.pinned),
      ...state.value.schedules.filter(schedule => !schedule.pinned),
    ];
    const index = sorted.findIndex(schedule => schedule.id === scheduleId);
    if (index < 0 || sorted[index].pinned) return;
    const neighbor = sorted[index + (direction === "right" ? 1 : -1)];
    if (!neighbor || (direction === "left" && neighbor.pinned)) return;
    manager.handleTabDrop(scheduleId, neighbor.id);
  }
  return reactive({
    state,
    getToolState,
    commitToolState,
    isToolEditing,
    localSaveStatus: computed(() => manager.localSaveStatus),
    activeSchedule,
    updateActiveSchedule: manager.updateActiveSchedule,
    selectSchedule: manager.selectSchedule,
    syncStatus: computed(() => sync.syncStatus),
    isSharing: computed(() => share.isSharing),
    showShare: computed(() => share.showShare),
    setShowShare,
    handleShare,
    shareConfirmation: computed(() => share.shareConfirmation),
    showShareConfirmation: computed(() => share.showShareConfirmation),
    requestShareConfirmation,
    confirmShare: computed(() => share.confirmShare),
    cancelShareConfirmation: share.cancelShareConfirmation,
    modal: computed(() => modals.modal),
    openSettings,
    openNewSchedule,
    openConfirmDelete,
    closeModal: modals.closeModal,
    isAnimating: computed(() => animation.isAnimating),
    direction: computed(() => animation.direction),
    handleRotate: animation.handleRotate,
    onMoveTab: manager.handleTabDrop,
    handlePrint,
    viewTab: computed(() => view.viewTab),
    changeTab: view.changeTab,
    changeTabForTool: view.changeTabForTool,
    calendarMonth: computed(() => view.calendarMonth),
    setCalendarMonth: view.setCalendarMonth,
    showOnboarding: computed(() => onboarding.showOnboarding),
    handleOnboardingComplete: onboarding.handleOnboardingComplete,
    groups,
    members,
    effectiveRotation,
    isDateMode,
    assignments,
    onAddSchedule,
    onDeleteSchedule,
    onDuplicateSchedule,
    onSaveSettings,
    onReorderTab,
    onTogglePin,
  });
}
