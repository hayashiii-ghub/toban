import { useEffect, useRef, useState, useCallback } from "react";
import type { Schedule } from "@/rotation/types";
import { createSchedule, getScheduleForEdit, toScheduleData } from "@/lib/api";
import {
  scheduleSyncDebounced,
  setSyncStatusCallback,
  flushPendingSync,
  isScheduleSyncPaused,
  hasPendingSync,
  type SyncStatus,
} from "@/lib/syncManager";

const BACKUP_DEBOUNCE_MS = 5000;

/** クラウドに載っていて、引き直しの対象になるスケジュール */
type CloudSchedule = Schedule & { slug: string; editToken: string };

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
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>
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
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  const attemptAutoBackup = useCallback(
    async (s: Schedule) => {
      // 最新の状態を再チェック — 別の経路で既に slug が付与されていたらスキップ
      const latest = scheduleRef.current;
      if (latest && latest.id === s.id && latest.slug && latest.editToken)
        return latest;

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
          const result = await createSchedule(toScheduleData(s));
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
    },
    [onScheduleUpdate, setSyncStatus]
  );

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

  return {
    cancelPendingBackup,
    prepareForManualSave,
    attemptAutoBackup,
    scheduleRef,
    backupTimerRef,
  };
}

/**
 * サーバの内容をローカルへ引き直す。
 *
 * クライアントは今まで送るだけで一度も読み直していなかったため、2台目の端末は
 * 最初の取り込み以降ずっと古いままだった。その状態で編集すると、もう一方の端末の
 * 変更を黙って上書きしてしまう。開いた時点で追いつかせることで、これを防ぐ。
 *
 * ローカルを優先する。未送信の変更・編集中・同期停止中は引き直さない。
 */
function usePullFromServer(
  schedule: Schedule | undefined,
  onScheduleUpdate: ((updater: (s: Schedule) => Schedule) => void) | undefined,
  scheduleRef: React.MutableRefObject<Schedule | undefined>,
  backupTimerRef: React.MutableRefObject<number | null>,
  adoptedJsonRef: React.MutableRefObject<string | null>,
  isEditing: boolean
): void {
  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const canPull = useCallback(
    (s: Schedule | undefined): s is CloudSchedule =>
      !!s?.slug &&
      !!s.editToken &&
      !isEditingRef.current &&
      backupTimerRef.current === null &&
      !hasPendingSync(s.id) &&
      !isScheduleSyncPaused(s.id),
    [backupTimerRef]
  );

  const pull = useCallback(async () => {
    const before = scheduleRef.current;
    if (!onScheduleUpdate || !canPull(before)) return;

    let fetched;
    try {
      fetched = await getScheduleForEdit(before.slug, before.editToken);
    } catch {
      // 行が消えている(404)・トークンが通らない(403)・通信失敗のいずれでも
      // ローカルには触らない。引き直しは取れたときだけ反映する片道の処理。
      return;
    }

    // 取得中に別のスケジュールへ切り替わった／編集が始まっていたら捨てる
    const after = scheduleRef.current;
    if (!canPull(after) || after.id !== before.id || after.slug !== before.slug)
      return;

    const merged: Schedule = {
      ...after,
      name: fetched.name,
      rotation: fetched.rotation,
      groups: fetched.groups,
      members: fetched.members,
      rotationConfig: fetched.rotationConfig,
      assignmentMode: fetched.assignmentMode,
      designThemeId: fetched.designThemeId,
    };
    const mergedJson = JSON.stringify(toScheduleData(merged));
    if (mergedJson === JSON.stringify(toScheduleData(after))) return;

    // 取り込んだ内容をそのまま送り返さないよう useSyncOnChange へ知らせる
    adoptedJsonRef.current = mergedJson;
    onScheduleUpdate(() => merged);
  }, [onScheduleUpdate, scheduleRef, adoptedJsonRef, canPull]);

  // 起動時とスケジュール切り替え時。同じ対象で二重に引かないよう鍵で覚える
  const pulledKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${schedule?.id ?? ""}:${schedule?.slug ?? ""}`;
    if (pulledKeyRef.current === key) return;
    pulledKeyRef.current = key;
    void pull();
  }, [schedule?.id, schedule?.slug, pull]);

  // タブに戻ってきたとき。開きっぱなしの端末には効かないが、
  // 端末を持ち替える使い方はこれで拾える
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pull]);
}

function useSyncOnChange(
  schedule: Schedule | undefined,
  attemptAutoBackup: (s: Schedule) => Promise<Schedule | undefined>,
  onScheduleUpdate: ((updater: (s: Schedule) => Schedule) => void) | undefined,
  scheduleRef: React.MutableRefObject<Schedule | undefined>,
  backupTimerRef: React.MutableRefObject<number | null>,
  adoptedJsonRef: React.MutableRefObject<string | null>
): void {
  const prevJsonRef = useRef<string>("");

  useEffect(() => {
    prevJsonRef.current = "";
  }, [schedule?.id]);

  useEffect(() => {
    if (!schedule) return;

    const json = JSON.stringify(toScheduleData(schedule));

    // 引き直しで取り込んだ内容は、サーバと同じなので送り返さない
    if (adoptedJsonRef.current === json) {
      adoptedJsonRef.current = null;
      prevJsonRef.current = json;
      return;
    }

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
  /** 設定モーダル等で下書きを編集中。裏で土台が入れ替わらないよう引き直しを止める */
  options?: { isEditing?: boolean }
): {
  syncStatus: SyncStatus;
  cancelPendingBackup: () => void;
  prepareForManualSave: () => Promise<Schedule | undefined>;
} {
  const { syncStatus, setSyncStatus } = useSyncStatusSubscription(schedule?.id);
  const {
    cancelPendingBackup,
    prepareForManualSave,
    attemptAutoBackup,
    scheduleRef,
    backupTimerRef,
  } = useAutoBackup(schedule, onScheduleUpdate, setSyncStatus);
  const adoptedJsonRef = useRef<string | null>(null);
  usePullFromServer(
    schedule,
    onScheduleUpdate,
    scheduleRef,
    backupTimerRef,
    adoptedJsonRef,
    options?.isEditing ?? false
  );
  useSyncOnChange(
    schedule,
    attemptAutoBackup,
    onScheduleUpdate,
    scheduleRef,
    backupTimerRef,
    adoptedJsonRef
  );
  return { syncStatus, cancelPendingBackup, prepareForManualSave };
}
