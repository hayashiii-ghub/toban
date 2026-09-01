import {
  startTransition,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
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
import { toast } from "sonner";

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
  const [snapshot, setSnapshot] = useState<StateSnapshot>(() => ({
    state: loadState(),
    revision: 0,
  }));
  const { state } = snapshot;
  const currentRef = useRef(snapshot);
  const committedRef = useRef(snapshot);
  const mountedRef = useRef(false);
  const pendingRef = useRef(new Set<PendingToolCommit>());
  const savedRef = useRef<"saved" | "failed">("failed");
  const [localSaveStatus, setLocalSaveStatus] = useState<
    "saved" | "failed" | "pending"
  >("pending");

  // Callers update the latest requested state, including another update in the
  // same batch. React receives a value: it never repeats user commands or IDs.
  const applyState = useCallback(
    (action: SetStateAction<AppState>, forceCommit = false) => {
      const previous = currentRef.current;
      const next =
        typeof action === "function" ? action(previous.state) : action;
      if (next === previous.state && !forceCommit) return previous;
      const nextSnapshot = { state: next, revision: previous.revision + 1 };
      currentRef.current = nextSnapshot;
      setLocalSaveStatus("pending");
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    },
    []
  );

  const setState: Dispatch<SetStateAction<AppState>> = useCallback(
    action => {
      if (mountedRef.current) applyState(action);
    },
    [applyState]
  );

  const getToolState = useCallback(() => currentRef.current.state, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    const pending = pendingRef.current;
    return () => {
      mountedRef.current = false;
      for (const commit of pending) {
        commit.resolve({
          applied: false,
          local: "failed",
          state: committedRef.current.state,
          code: "UNMOUNTED",
        });
      }
      pending.clear();
    };
  }, []);

  useLayoutEffect(() => {
    committedRef.current = snapshot;
    const local = saveState(snapshot.state) ? "saved" : "failed";
    savedRef.current = local;
    setLocalSaveStatus(
      currentRef.current.revision === snapshot.revision ? local : "pending"
    );
    // Layout effects run after DOM changes. Saving and resolving here keeps the
    // observable page and the reported persistence result on the same revision.
    for (const commit of pendingRef.current) {
      if (commit.revision !== null && commit.revision <= snapshot.revision) {
        pendingRef.current.delete(commit);
        commit.resolve({ applied: true, local, state: snapshot.state });
      }
    }
  }, [snapshot]);

  const commitToolState = useCallback(
    (
      updater: (state: AppState) => AppState,
      isEditing: () => boolean = () => false
    ): Promise<ToolStateCommitResult> => {
      const blocked = (code: "EDIT_IN_PROGRESS" | "UNMOUNTED") => ({
        applied: false,
        local: code === "UNMOUNTED" ? ("failed" as const) : savedRef.current,
        state: committedRef.current.state,
        code,
      });
      if (!mountedRef.current) return Promise.resolve(blocked("UNMOUNTED"));
      if (isEditing()) return Promise.resolve(blocked("EDIT_IN_PROGRESS"));

      return new Promise((resolve, reject) => {
        const commit: PendingToolCommit = { revision: null, resolve };
        pendingRef.current.add(commit);
        queueMicrotask(() => {
          if (!pendingRef.current.has(commit)) return;
          if (!mountedRef.current || isEditing()) {
            pendingRef.current.delete(commit);
            resolve(
              blocked(mountedRef.current ? "EDIT_IN_PROGRESS" : "UNMOUNTED")
            );
            return;
          }
          try {
            // This is an external browser command, not a render/effect. Flush
            // only this boundary so its promise can observe a committed page.
            flushSync(() => {
              commit.revision = currentRef.current.revision + 1;
              applyState(updater, true);
            });
          } catch (error) {
            pendingRef.current.delete(commit);
            reject(error);
          }
        });
      });
    },
    [applyState]
  );

  const activeSchedule = useMemo(() => {
    return (
      state.schedules.find(
        schedule => schedule.id === state.activeScheduleId
      ) ??
      state.schedules[0] ??
      undefined
    );
  }, [state.activeScheduleId, state.schedules]);

  const updateScheduleById = useCallback(
    (scheduleId: string, updater: (schedule: Schedule) => Schedule) => {
      startTransition(() => {
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
      });
    },
    [setState]
  );

  const updateActiveSchedule = useCallback(
    (updater: (schedule: Schedule) => Schedule) => {
      const current = getToolState();
      const scheduleId = current.schedules.some(
        s => s.id === current.activeScheduleId
      )
        ? current.activeScheduleId
        : current.schedules[0]?.id;
      if (scheduleId) updateScheduleById(scheduleId, updater);
    },
    [getToolState, updateScheduleById]
  );

  const handleAddSchedule = useCallback(
    (template: ScheduleTemplate) => {
      const newSchedule = createScheduleFromTemplate(template);
      startTransition(() => {
        setState(prev => ({
          schedules: [...prev.schedules, newSchedule],
          activeScheduleId: newSchedule.id,
        }));
      });
      return newSchedule;
    },
    [setState]
  );

  const handleDeleteSchedule = useCallback(
    (scheduleId: string) => {
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

      startTransition(() => {
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
      });
    },
    [getToolState, setState, t]
  );

  const handleDuplicateSchedule = useCallback(
    (locale?: Locale) => {
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
      startTransition(() => {
        setState(prev => ({
          schedules: [...prev.schedules, clone],
          activeScheduleId: clone.id,
        }));
      });
    },
    [getToolState, setState, t]
  );

  const handleSaveSettings = useCallback(
    (settings: ScheduleSettings) => {
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
    },
    [updateActiveSchedule]
  );

  const selectSchedule = useCallback(
    (scheduleId: string) => {
      startTransition(() => {
        setState(prev =>
          prev.schedules.some(s => s.id === scheduleId)
            ? { ...prev, activeScheduleId: scheduleId }
            : prev
        );
      });
    },
    [setState]
  );

  const handleTabDrop = useCallback(
    (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      startTransition(() => {
        setState(prev => {
          const schedules = [...prev.schedules];
          const fromIndex = schedules.findIndex(
            schedule => schedule.id === draggedId
          );
          const toIndex = schedules.findIndex(
            schedule => schedule.id === targetId
          );
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
      });
    },
    [setState]
  );

  const addScheduleFromTemplateIndex = useCallback(
    (idx: number, templates: ScheduleTemplate[]) => {
      if (idx < 0 || idx >= templates.length) return false;
      const newSchedule = createScheduleFromTemplate(templates[idx]);
      setState(prev => ({
        schedules: [...prev.schedules, newSchedule],
        activeScheduleId: newSchedule.id,
      }));
      return true;
    },
    [setState]
  );

  return {
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
  };
}
