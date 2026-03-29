import { useEffect, useRef, useState, useCallback } from "react";
import type { Schedule } from "@/rotation/types";
import { createSchedule } from "@/lib/api";
import {
  scheduleSyncDebounced,
  setSyncStatusCallback,
  flushPendingSync,
  isScheduleSyncPaused,
  type SyncStatus,
} from "@/lib/syncManager";

const BACKUP_DEBOUNCE_MS = 5000;

function useSyncStatusSubscription(scheduleId: string | undefined): {
  syncStatus: SyncStatus;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>;
} {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const scheduleIdRef = useRef(scheduleId ?? "");

  useEffect(() => {
    setSyncStatusCallback((id, status) => {
      if (id === scheduleIdRef.current) {
        setSyncStatus(status);
      }
    });
    return () => setSyncStatusCallback(null);
  }, []);

  useEffect(() => {
    scheduleIdRef.current = scheduleId ?? "";
    setSyncStatus("idle");
  }, [scheduleId]);

  return { syncStatus, setSyncStatus };
}

function useAutoBackup(
  schedule: Schedule | undefined,
  onScheduleUpdate: ((updater: (s: Schedule) => Schedule) => void) | undefined,
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>,
): {
  cancelPendingBackup: () => void;
  prepareForManualSave: () => Promise<Schedule | undefined>;
  attemptAutoBackup: (s: Schedule) => Promise<Schedule | undefined>;
  scheduleRef: React.MutableRefObject<Schedule | undefined>;
  backupTimerRef: React.MutableRefObject<number | null>;
} {
  const backupTimerRef = useRef<number | null>(null);
  const backupInFlightRef = useRef(false);
  const backupPromiseRef = useRef<Promise<Schedule | undefined> | null>(null);
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  const attemptAutoBackup = useCallback(async (s: Schedule) => {
    // 最新の状態を再チェック — 別の経路で既に slug が付与されていたらスキップ
    const latest = scheduleRef.current;
    if (latest && latest.id === s.id && latest.slug && latest.editToken) return latest;

    if (isScheduleSyncPaused(s.id)) return s;
    if (backupInFlightRef.current && backupPromiseRef.current) {
      return backupPromiseRef.current;
    }
    // Only auto-backup if there are real members (at least 1 with a name)
    const hasMembers = s.members.some(m => m.name.trim() !== "");
    if (!hasMembers) return s;

    // eslint-disable-next-line prefer-const -- assigned after IIFE captures the closure
    let currentBackupPromise!: Promise<Schedule | undefined>;
    const backupPromise = (async () => {
      backupInFlightRef.current = true;
      setSyncStatus("syncing");
      try {
        const result = await createSchedule({
          name: s.name,
          rotation: s.rotation,
          groups: s.groups,
          members: s.members,
          rotationConfig: s.rotationConfig,
          assignmentMode: s.assignmentMode,
          designThemeId: s.designThemeId,
        });
        const updatedSchedule = {
          ...s,
          slug: result.slug,
          editToken: result.editToken,
        };
        onScheduleUpdate?.(() => updatedSchedule);
        setSyncStatus("synced");
        return updatedSchedule;
      } catch {
        setSyncStatus("error");
        return s;
      } finally {
        backupInFlightRef.current = false;
        if (backupPromiseRef.current === currentBackupPromise) {
          backupPromiseRef.current = null;
        }
      }
    })();

    currentBackupPromise = backupPromise;
    backupPromiseRef.current = backupPromise;
    return backupPromise;
  }, [onScheduleUpdate, setSyncStatus]);

  // Cleanup backup timer on unmount
  useEffect(() => {
    return () => {
      if (backupTimerRef.current) {
        window.clearTimeout(backupTimerRef.current);
      }
    };
  }, []);

  const cancelPendingBackup = useCallback(() => {
    if (backupTimerRef.current) {
      window.clearTimeout(backupTimerRef.current);
      backupTimerRef.current = null;
    }
  }, []);

  const prepareForManualSave = useCallback(async () => {
    cancelPendingBackup();
    if (backupPromiseRef.current) {
      return backupPromiseRef.current;
    }
    return scheduleRef.current;
  }, [cancelPendingBackup]);

  return { cancelPendingBackup, prepareForManualSave, attemptAutoBackup, scheduleRef, backupTimerRef };
}

function useSyncOnChange(
  schedule: Schedule | undefined,
  attemptAutoBackup: (s: Schedule) => Promise<Schedule | undefined>,
  onScheduleUpdate: ((updater: (s: Schedule) => Schedule) => void) | undefined,
  scheduleRef: React.MutableRefObject<Schedule | undefined>,
  backupTimerRef: React.MutableRefObject<number | null>,
): void {
  const prevJsonRef = useRef<string>("");

  useEffect(() => {
    prevJsonRef.current = "";
  }, [schedule?.id]);

  useEffect(() => {
    if (!schedule) return;

    const json = JSON.stringify({
      name: schedule.name,
      rotation: schedule.rotation,
      groups: schedule.groups,
      members: schedule.members,
      rotationConfig: schedule.rotationConfig,
      assignmentMode: schedule.assignmentMode,
      designThemeId: schedule.designThemeId,
    });

    const changed = prevJsonRef.current && prevJsonRef.current !== json;
    prevJsonRef.current = json;

    if (!changed) return;

    if (schedule.slug && schedule.editToken) {
      // Already has cloud identity — sync update
      scheduleSyncDebounced(schedule);
    } else if (onScheduleUpdate) {
      // No cloud identity yet — schedule auto-backup with debounce
      if (backupTimerRef.current) window.clearTimeout(backupTimerRef.current);
      backupTimerRef.current = window.setTimeout(() => {
        backupTimerRef.current = null;
        // Use ref to get latest schedule — avoids stale closure creating orphan rows
        const current = scheduleRef.current;
        if (!current || (current.slug && current.editToken)) return;
        attemptAutoBackup(current);
      }, BACKUP_DEBOUNCE_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scheduleRef and backupTimerRef are stable refs
  }, [schedule, attemptAutoBackup, onScheduleUpdate]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (backupTimerRef.current) {
        window.clearTimeout(backupTimerRef.current);
        backupTimerRef.current = null;
      }
      if (schedule?.slug && schedule?.editToken && schedule.id) {
        void flushPendingSync(schedule.id, { keepalive: true });
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- backupTimerRef is a stable ref
  }, [schedule?.id, schedule?.slug, schedule?.editToken]);

  useEffect(() => {
    const retrySync = () => {
      const current = scheduleRef.current;
      if (!current) return;

      if (current.slug && current.editToken) {
        void flushPendingSync(current.id);
        return;
      }

      if (onScheduleUpdate) {
        void attemptAutoBackup(current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        retrySync();
      }
    };

    window.addEventListener("online", retrySync);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("online", retrySync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scheduleRef is a stable ref
  }, [attemptAutoBackup, onScheduleUpdate]);
}

export function useAutoSync(
  schedule: Schedule | undefined,
  onScheduleUpdate?: (updater: (s: Schedule) => Schedule) => void,
): {
  syncStatus: SyncStatus;
  cancelPendingBackup: () => void;
  prepareForManualSave: () => Promise<Schedule | undefined>;
} {
  const { syncStatus, setSyncStatus } = useSyncStatusSubscription(schedule?.id);
  const { cancelPendingBackup, prepareForManualSave, attemptAutoBackup, scheduleRef, backupTimerRef } = useAutoBackup(schedule, onScheduleUpdate, setSyncStatus);
  useSyncOnChange(schedule, attemptAutoBackup, onScheduleUpdate, scheduleRef, backupTimerRef);
  return { syncStatus, cancelPendingBackup, prepareForManualSave };
}
