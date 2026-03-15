import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { SettingsModal } from "@/components/SettingsModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { createSchedule, updateSchedule, deleteSchedule } from "@/lib/api";
import { ANIMATION_DURATION_MS } from "@/rotation/constants";
import type { AppState, Member, Schedule, ScheduleTemplate, TaskGroup } from "@/rotation/types";
import {
  computeAssignments,
  createScheduleFromTemplate,
  loadState,
  normalizeRotation,
  saveState,
} from "@/rotation/utils";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationControls } from "@/features/home/RotationControls";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { ScheduleHeader } from "@/features/home/ScheduleHeader";
import { ScheduleTabs } from "@/features/home/ScheduleTabs";
import { TransferModal } from "@/components/TransferModal";
import "./home.css";

export default function Home() {
  const [state, setState] = useState<AppState>(loadState);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  const activeSchedule = useMemo(() => {
    return state.schedules.find((schedule) => schedule.id === state.activeScheduleId) ?? state.schedules[0];
  }, [state.activeScheduleId, state.schedules]);

  const { groups, members, rotation } = activeSchedule;

  const assignments = useMemo(
    () => computeAssignments(groups, members, rotation),
    [groups, members, rotation],
  );

  useBodyScrollLock(showSettings || showNewSchedule || showTransfer || confirmDelete !== null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
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
      if (!schedule || schedule.members.length === 0) return prev;

      const nextRotation = nextDirection === "forward"
        ? schedule.rotation + 1
        : schedule.rotation - 1;

      return {
        ...prev,
        schedules: prev.schedules.map((item) =>
          item.id === prev.activeScheduleId
            ? {
                ...item,
                rotation: normalizeRotation(nextRotation, schedule.members.length),
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

  const handleSaveName = useCallback(() => {
    const nextName = tempName.trim();
    if (nextName) {
      updateActiveSchedule((schedule) => ({ ...schedule, name: nextName }));
    }
    setEditingName(false);
  }, [tempName, updateActiveSchedule]);

  const handleSaveSettings = useCallback((name: string, nextGroups: TaskGroup[], nextMembers: Member[]) => {
    updateActiveSchedule((schedule) => ({
      ...schedule,
      name,
      groups: nextGroups,
      members: nextMembers,
      rotation: normalizeRotation(schedule.rotation, nextMembers.length),
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
      };

      if (activeSchedule.slug && activeSchedule.editToken) {
        await updateSchedule(activeSchedule.slug, activeSchedule.editToken, data);
        const shareUrl = `${window.location.origin}/s/${activeSchedule.slug}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("更新して共有URLをコピーしました");
      } else {
        const result = await createSchedule(data);
        updateActiveSchedule((schedule) => ({
          ...schedule,
          slug: result.slug,
          editToken: result.editToken,
        }));
        const shareUrl = `${window.location.origin}/s/${result.slug}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("共有URLをコピーしました");
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSharing(false);
    }
  }, [activeSchedule, updateActiveSchedule]);

  const rotationLabel = rotation === 0 ? "初期" : `${rotation}回目`;

  return (
    <main className="rotation-page min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      <ScheduleHeader
        editingName={editingName}
        tempName={tempName}
        scheduleName={activeSchedule.name}
        rotationLabel={rotationLabel}
        nameInputRef={nameInputRef}
        onTempNameChange={setTempName}
        onSaveName={handleSaveName}
        onCancelEditing={() => setEditingName(false)}
        onStartEditing={() => {
          setTempName(activeSchedule.name);
          setEditingName(true);
        }}
      />

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
        rotation={rotation}
        rotationLabel={rotationLabel}
        isAnimating={isAnimating}
        isCloudSaved={!!activeSchedule.slug}
        isSharing={isSharing}
        onRotateBackward={() => handleRotate("backward")}
        onRotateForward={() => handleRotate("forward")}
        onPrint={() => window.print()}
        onOpenSettings={() => setShowSettings(true)}
        onShare={handleShare}
      />

      <AssignmentsGrid
        assignments={assignments}
        direction={direction}
        rotation={rotation}
        groupCount={groups.length}
        scheduleId={activeSchedule.id}
        stagger={isAnimating}
      />

      <RotationQuickTable groups={groups} members={members} rotation={rotation} />

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
              canDelete={state.schedules.length > 1}
              canTransfer={!!(activeSchedule.slug && activeSchedule.editToken)}
              onSave={handleSaveSettings}
              onDelete={() => {
                setShowSettings(false);
                setConfirmDelete(activeSchedule.id);
              }}
              onTransfer={() => {
                setShowSettings(false);
                setShowTransfer(true);
              }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {createPortal(
        <AnimatePresence>
          {showTransfer && activeSchedule.slug && activeSchedule.editToken && (
            <TransferModal
              slug={activeSchedule.slug}
              editToken={activeSchedule.editToken}
              scheduleName={activeSchedule.name}
              onClose={() => setShowTransfer(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </main>
  );
}
