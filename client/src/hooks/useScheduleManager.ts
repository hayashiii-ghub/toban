import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  reactive,
  shallowRef,
  watch,
} from "vue";
import type { AppState, Schedule, ScheduleTemplate } from "@/rotation/types";
import {
  createScheduleFromTemplate,
  deepClone,
  generateId,
  normalizeRotation,
} from "@/rotation/utils";
import { loadState, saveState } from "@/lib/appState";
import { deleteSchedule } from "@/lib/api";
import { clearPendingSync } from "@/lib/syncManager";
import { useT } from "@/i18n";
import type { Locale } from "@/i18n/core";
import { localizeGuide } from "@/rotation/guide-localization";
import { toast } from "vue-sonner";
import type { StateAction, StateSetter } from "@/lib/vue";
/**
 * handleSaveSettings の保存ペイロード（Schedule の設定系フィールド）。
 * partial merge ではなく設定全体の置換。ただし rotationConfig のみ未指定時は現値維持で、
 * 他の optional（pinned / assignmentMode / designThemeId / fontId）は undefined で上書きされる。
 */
export type ScheduleSettings = Omit<
  Schedule,
  "id" | "rotation" | "slug" | "editToken"
>;
export interface ToolStateCommitResult {
  applied: boolean;
  local: "saved" | "failed";
  state: AppState;
  code?: "EDIT_IN_PROGRESS" | "UNMOUNTED";
}
interface StateSnapshot {
  state: AppState;
  revision: number;
}
interface PendingToolCommit {
  revision: number | null;
  resolve: (result: ToolStateCommitResult) => void;
}
export function useScheduleManager() {
  const t = useT();
  const snapshot = shallowRef<StateSnapshot>({
    state: loadState(),
    revision: 0,
  });
  const state = computed(() => snapshot.value.state);
  const localSaveStatus = shallowRef<"saved" | "failed" | "pending">("pending");
  let committed = snapshot.value;
  let mounted = false;
  let saved: "saved" | "failed" = "failed";
  const pending = new Set<PendingToolCommit>();
  let toolQueue = Promise.resolve();
  function applyState(action: StateAction<AppState>, forceCommit = false) {
    const previous = snapshot.value;
    const next = typeof action === "function" ? action(previous.state) : action;
    if (next === previous.state && !forceCommit) return previous;
    localSaveStatus.value = "pending";
    snapshot.value = { state: next, revision: previous.revision + 1 };
    return snapshot.value;
  }
  const setState: StateSetter<AppState> = action => {
    if (mounted) applyState(action);
  };
  const getToolState = () => snapshot.value.state;
  function persist(value: StateSnapshot) {
    if (!mounted) return;
    committed = value;
    const local = saveState(value.state) ? "saved" : "failed";
    saved = local;
    localSaveStatus.value =
      snapshot.value.revision === value.revision ? local : "pending";
    // Post-flush persistence makes a tool receipt observe the same rendered revision.
    for (const commit of pending) {
      if (commit.revision !== null && commit.revision <= value.revision) {
        pending.delete(commit);
        commit.resolve({ applied: true, local, state: value.state });
      }
    }
  }
  watch(snapshot, persist, { flush: "post" });
  onMounted(() => {
    mounted = true;
    persist(snapshot.value);
  });
  onScopeDispose(() => {
    mounted = false;
    for (const commit of pending) {
      commit.resolve({
        applied: false,
        local: "failed",
        state: committed.state,
        code: "UNMOUNTED",
      });
    }
    pending.clear();
  });
  function commitToolState(
    updater: (state: AppState) => AppState,
    isEditing: () => boolean = () => false
  ): Promise<ToolStateCommitResult> {
    const blocked = (
      code: "EDIT_IN_PROGRESS" | "UNMOUNTED"
    ): ToolStateCommitResult => ({
      applied: false,
      local: code === "UNMOUNTED" ? "failed" : saved,
      state: committed.state,
      code,
    });
    if (!mounted) return Promise.resolve(blocked("UNMOUNTED"));
    if (isEditing()) return Promise.resolve(blocked("EDIT_IN_PROGRESS"));
    return new Promise((resolve, reject) => {
      const commit: PendingToolCommit = { revision: null, resolve };
      pending.add(commit);
      toolQueue = toolQueue.then(async () => {
        if (!pending.has(commit)) return;
        if (!mounted || isEditing()) {
          pending.delete(commit);
          resolve(blocked(mounted ? "EDIT_IN_PROGRESS" : "UNMOUNTED"));
          return;
        }
        try {
          commit.revision = snapshot.value.revision + 1;
          applyState(updater, true);
          await nextTick();
        } catch (error) {
          pending.delete(commit);
          reject(error);
        }
      });
    });
  }
  const activeSchedule = computed(
    () =>
      state.value.schedules.find(
        schedule => schedule.id === state.value.activeScheduleId
      ) ?? state.value.schedules[0]
  );
  const updateScheduleById = (
    scheduleId: string,
    updater: (schedule: Schedule) => Schedule
  ) => {
    setState(prev => {
      let changed = false;
      const schedules = prev.schedules.map(schedule => {
        if (schedule.id !== scheduleId) return schedule;
        const next = updater(schedule);
        changed = next !== schedule;
        return next;
      });
      return changed ? { ...prev, schedules } : prev;
    });
  };
  const updateActiveSchedule = (updater: (schedule: Schedule) => Schedule) => {
    const current = getToolState();
    const scheduleId = current.schedules.some(
      s => s.id === current.activeScheduleId
    )
      ? current.activeScheduleId
      : current.schedules[0]?.id;
    if (scheduleId) updateScheduleById(scheduleId, updater);
  };
  const handleAddSchedule = (template: ScheduleTemplate) => {
    const newSchedule = createScheduleFromTemplate(template);
    setState(prev => ({
      schedules: [...prev.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    }));
    return newSchedule;
  };
  const handleDeleteSchedule = (scheduleId: string) => {
    // API呼び出しはsetState外で行う（state updaterは複数回呼ばれる可能性があるため）
    const current = getToolState();
    const schedule = current.schedules.find(s => s.id === scheduleId);
    if (!schedule || current.schedules.length <= 1) return;
    // Deleted rosters must not retain retry timers or durable recovery markers.
    clearPendingSync(scheduleId);
    if (schedule?.slug && schedule?.editToken) {
      deleteSchedule(schedule.slug, schedule.editToken).catch(error => {
        console.error("Failed to delete schedule from server:", error);
        toast.error(t("schedule.deleteFailed"));
      });
    }
    setState(prev => {
      const remainingSchedules = prev.schedules.filter(
        s => s.id !== scheduleId
      );
      if (remainingSchedules.length === 0) return prev;
      return {
        schedules: remainingSchedules,
        activeScheduleId:
          prev.activeScheduleId === scheduleId
            ? remainingSchedules[0].id
            : prev.activeScheduleId,
      };
    });
  };
  const handleDuplicateSchedule = (locale?: Locale) => {
    const current = getToolState();
    const savedSource = current.schedules.find(
      s => s.id === current.activeScheduleId
    );
    if (!savedSource) return;
    const source = locale ? localizeGuide(savedSource, locale) : savedSource;
    const clone: Schedule = {
      id: generateId("s"),
      name: t("schedule.copyName", { name: source.name }),
      rotation: 0,
      groups: deepClone(source.groups),
      members: deepClone(source.members),
      rotationConfig: source.rotationConfig
        ? deepClone(source.rotationConfig)
        : undefined,
      assignmentMode: source.assignmentMode,
      designThemeId: source.designThemeId,
      fontId: source.fontId,
    };
    setState(prev => ({
      schedules: [...prev.schedules, clone],
      activeScheduleId: clone.id,
    }));
  };
  const handleSaveSettings = (settings: ScheduleSettings) => {
    const {
      name,
      groups,
      members,
      rotationConfig,
      pinned,
      assignmentMode,
      designThemeId,
      fontId,
    } = settings;
    updateActiveSchedule(schedule => ({
      ...schedule,
      name,
      groups,
      members,
      rotation: normalizeRotation(
        schedule.rotation,
        members.filter(m => !m.skipped).length || members.length
      ),
      rotationConfig: rotationConfig ?? schedule.rotationConfig,
      pinned,
      assignmentMode,
      designThemeId,
      fontId,
    }));
  };
  const selectSchedule = (scheduleId: string) => {
    setState(prev =>
      prev.schedules.some(s => s.id === scheduleId)
        ? { ...prev, activeScheduleId: scheduleId }
        : prev
    );
  };
  const handleTabDrop = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setState(prev => {
      const schedules = [...prev.schedules];
      const fromIndex = schedules.findIndex(
        schedule => schedule.id === draggedId
      );
      const toIndex = schedules.findIndex(schedule => schedule.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      if (
        (schedules[fromIndex].pinned ?? false) !==
        (schedules[toIndex].pinned ?? false)
      ) {
        return prev;
      }
      const [movedSchedule] = schedules.splice(fromIndex, 1);
      schedules.splice(toIndex, 0, movedSchedule);
      return { ...prev, schedules };
    });
  };
  const addScheduleFromTemplateIndex = (
    idx: number,
    templates: ScheduleTemplate[]
  ) => {
    if (idx < 0 || idx >= templates.length) return false;
    const newSchedule = createScheduleFromTemplate(templates[idx]);
    setState(prev => ({
      schedules: [...prev.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    }));
    return true;
  };
  return reactive({
    state,
    setState,
    getToolState,
    commitToolState,
    localSaveStatus,
    activeSchedule,
    updateScheduleById,
    updateActiveSchedule,
    handleAddSchedule,
    handleDeleteSchedule,
    handleDuplicateSchedule,
    handleSaveSettings,
    selectSchedule,
    handleTabDrop,
    addScheduleFromTemplateIndex,
    saveState,
  });
}
