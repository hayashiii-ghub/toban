import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { SettingsModal } from "@/components/SettingsModal";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { createSchedule, updateSchedule, deleteSchedule } from "@/lib/api";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { ANIMATION_DURATION_MS, ONBOARDING_STORAGE_KEY, STORAGE_KEY } from "@/rotation/constants";
import type { AppState, Member, RotationConfig, Schedule, ScheduleTemplate, TaskGroup } from "@/rotation/types";
import {
  computeAssignments,
  createScheduleFromTemplate,
  deepClone,
  generateId,
  getEffectiveRotation,
  loadState,
  normalizeRotation,
  saveState,
} from "@/rotation/utils";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationControls } from "@/features/home/RotationControls";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { ScheduleHeader } from "@/features/home/ScheduleHeader";
import { ScheduleTabs } from "@/features/home/ScheduleTabs";
import { ShareModal } from "@/components/ShareModal";
import { SyncIndicator } from "@/features/home/SyncIndicator";
import { InstallPrompt } from "@/components/InstallPrompt";
import "./home.css";

export default function Home() {
  const [state, setState] = useState<AppState>(loadState);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);

  const activeSchedule = useMemo(() => {
    return state.schedules.find((schedule) => schedule.id === state.activeScheduleId) ?? state.schedules[0];
  }, [state.activeScheduleId, state.schedules]);

  const syncStatus = useAutoSync(activeSchedule);

  const { groups, members } = activeSchedule;

  const effectiveRotation = useMemo(
    () => getEffectiveRotation(activeSchedule),
    [activeSchedule],
  );

  const isDateMode = activeSchedule.rotationConfig?.mode === "date";

  const assignments = useMemo(
    () => computeAssignments(groups, members, effectiveRotation),
    [groups, members, effectiveRotation],
  );

  useBodyScrollLock(showSettings || showNewSchedule || showShare || confirmDelete !== null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        setShowNewSchedule(true);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      delete document.body.dataset.printMode;
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    try {
      const isExistingUser = localStorage.getItem(STORAGE_KEY) !== null;
      const onboardingDone = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
      if (!onboardingDone && !isExistingUser) {
        const timer = setTimeout(() => setShowOnboarding(true), 800);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch { /* ignore */ }
  }, []);

  const updateActiveSchedule = useCallback((updater: (schedule: Schedule) => Schedule) => {
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.id === prev.activeScheduleId ? updater(schedule) : schedule,
      ),
    }));
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

      const nextRotation = nextDirection === "forward"
        ? schedule.rotation + 1
        : schedule.rotation - 1;

      return {
        ...prev,
        schedules: prev.schedules.map((item) =>
          item.id === prev.activeScheduleId
            ? {
                ...item,
                rotation: normalizeRotation(nextRotation, activeMembers.length),
              }
            : item,
        ),
      };
    });

    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, ANIMATION_DURATION_MS);
  }, [isAnimating]);

  const handleAddSchedule = useCallback((template: ScheduleTemplate) => {
    const newSchedule = createScheduleFromTemplate(template);
    setState((prev) => ({
      schedules: [...prev.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    }));
    setShowNewSchedule(false);
  }, []);

  const handleDeleteSchedule = useCallback((scheduleId: string) => {
    setState((prev) => {
      if (prev.schedules.length <= 1) return prev;

      // D1からも削除を試みる（失敗してもローカル削除は実行）
      const schedule = prev.schedules.find((s) => s.id === scheduleId);
      if (schedule?.slug && schedule?.editToken) {
        deleteSchedule(schedule.slug, schedule.editToken).catch(() => {
          // D1削除失敗は無視（90日クリーンアップで自然削除される）
        });
      }

      const remainingSchedules = prev.schedules.filter((s) => s.id !== scheduleId);
      return {
        schedules: remainingSchedules,
        activeScheduleId: prev.activeScheduleId === scheduleId
          ? remainingSchedules[0].id
          : prev.activeScheduleId,
      };
    });
    setConfirmDelete(null);
  }, []);

  const handleDuplicateSchedule = useCallback(() => {
    const clone: Schedule = {
      id: generateId("s"),
      name: `${activeSchedule.name}（コピー）`,
      rotation: 0,
      groups: deepClone(activeSchedule.groups),
      members: deepClone(activeSchedule.members),
      rotationConfig: activeSchedule.rotationConfig ? deepClone(activeSchedule.rotationConfig) : undefined,
    };
    setState((prev) => ({
      schedules: [...prev.schedules, clone],
      activeScheduleId: clone.id,
    }));
    setShowSettings(false);
  }, [activeSchedule]);

  const handleTabDrop = useCallback((targetId: string) => {
    setDraggedTabId((currentDraggedId) => {
      if (!currentDraggedId || currentDraggedId === targetId) return null;

      setState((prev) => {
        const schedules = [...prev.schedules];
        const fromIndex = schedules.findIndex((schedule) => schedule.id === currentDraggedId);
        const toIndex = schedules.findIndex((schedule) => schedule.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return prev;

        const [movedSchedule] = schedules.splice(fromIndex, 1);
        schedules.splice(toIndex, 0, movedSchedule);
        return { ...prev, schedules };
      });

      return null;
    });
    setDragOverTabId(null);
  }, []);

  const handleSaveSettings = useCallback((name: string, nextGroups: TaskGroup[], nextMembers: Member[], rotationConfig?: RotationConfig) => {
    updateActiveSchedule((schedule) => ({
      ...schedule,
      name,
      groups: nextGroups,
      members: nextMembers,
      rotation: normalizeRotation(schedule.rotation, nextMembers.filter(m => !m.skipped).length || nextMembers.length),
      rotationConfig: rotationConfig ?? schedule.rotationConfig,
    }));
    setShowSettings(false);
  }, [updateActiveSchedule]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const data = {
        name: activeSchedule.name,
        rotation: activeSchedule.rotation,
        groups: activeSchedule.groups,
        members: activeSchedule.members,
        rotationConfig: activeSchedule.rotationConfig,
      };

      if (activeSchedule.slug && activeSchedule.editToken) {
        await updateSchedule(activeSchedule.slug, activeSchedule.editToken, data);
      } else {
        const result = await createSchedule(data);
        updateActiveSchedule((schedule) => ({
          ...schedule,
          slug: result.slug,
          editToken: result.editToken,
        }));
      }
      setShowShare(true);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSharing(false);
    }
  }, [activeSchedule, updateActiveSchedule]);

  const rotationLabel = effectiveRotation === 0 ? "初期" : `${effectiveRotation}回目`;

  return (
    <main className="rotation-page min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      <ScheduleHeader
        scheduleName={activeSchedule.name}
        rotationLabel={rotationLabel}
      />

      {activeSchedule.slug && (
        <div className="px-3 sm:px-4 -mt-1 mb-1">
          <div className="max-w-4xl mx-auto flex justify-end">
            <SyncIndicator status={syncStatus} hasSlug={!!activeSchedule.slug} />
          </div>
        </div>
      )}

      <ScheduleTabs
        schedules={state.schedules}
        activeScheduleId={state.activeScheduleId}
        draggedTabId={draggedTabId}
        dragOverTabId={dragOverTabId}
        onSelectSchedule={(scheduleId) => setState((prev) => ({ ...prev, activeScheduleId: scheduleId }))}
        onAddSchedule={() => setShowNewSchedule(true)}
        onDragStart={(event, scheduleId) => {
          setDraggedTabId(scheduleId);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event, scheduleId) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDragOverTabId(scheduleId);
        }}
        onDrop={(event, scheduleId) => {
          event.preventDefault();
          handleTabDrop(scheduleId);
        }}
        onDragEnd={() => {
          setDraggedTabId(null);
          setDragOverTabId(null);
        }}
      />

      <RotationControls
        rotation={effectiveRotation}
        rotationLabel={rotationLabel}
        isAnimating={isAnimating}
        isSharing={isSharing}
        isDateMode={isDateMode}
        onRotateBackward={() => handleRotate("backward")}
        onRotateForward={() => handleRotate("forward")}
        onPrint={(mode) => {
          document.body.dataset.printMode = mode;
          window.print();
        }}
        onOpenSettings={() => setShowSettings(true)}
        onShare={handleShare}
      />

      <AssignmentsGrid
        assignments={assignments}
        direction={direction}
        rotation={effectiveRotation}
        groupCount={groups.length}
        scheduleId={activeSchedule.id}
        stagger={isAnimating}
      />

      <RotationQuickTable groups={groups} members={members} rotation={effectiveRotation} />

      {createPortal(
        <AnimatePresence>
          {showNewSchedule && (
            <NewScheduleModal
              onSelect={handleAddSchedule}
              onClose={() => setShowNewSchedule(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {confirmDelete && (
            <ConfirmDeleteDialog
              scheduleName={state.schedules.find((schedule) => schedule.id === confirmDelete)?.name ?? ""}
              onConfirm={() => handleDeleteSchedule(confirmDelete)}
              onCancel={() => setConfirmDelete(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              scheduleName={activeSchedule.name}
              groups={groups}
              members={members}
              rotationConfig={activeSchedule.rotationConfig}
              canDelete={state.schedules.length > 1}
              onSave={handleSaveSettings}
              onDuplicate={handleDuplicateSchedule}
              onDelete={() => {
                setShowSettings(false);
                setConfirmDelete(activeSchedule.id);
              }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {createPortal(
        <AnimatePresence>
          {showShare && activeSchedule.slug && activeSchedule.editToken && (
            <ShareModal
              slug={activeSchedule.slug}
              editToken={activeSchedule.editToken}
              scheduleName={activeSchedule.name}
              onClose={() => setShowShare(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      <InstallPrompt />
    </main>
  );
}
