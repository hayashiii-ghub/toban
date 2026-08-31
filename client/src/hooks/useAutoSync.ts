import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import type { Schedule } from "@/rotation/types";
import { createSchedule, getScheduleForEdit, toScheduleData } from "@/lib/api";
import {
  scheduleSyncDebounced,
  setSyncStatusCallback,
  flushPendingSync,
  isScheduleSyncPaused,
  hasPendingSync,
  restorePendingScheduleSync,
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

type ScheduleLookup = (id: string) => Schedule | undefined;

function useAutoBackup(
  schedule: Schedule | undefined,
  onScheduleUpdate: ((updater: (s: Schedule) => Schedule) => void) | undefined,
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>,
  getScheduleById: ScheduleLookup | undefined
): {
  cancelPendingBackup: () => void;
  prepareForManualSave: () => Promise<Schedule | undefined>;
  attemptAutoBackup: (s: Schedule) => Promise<Schedule | undefined>;
  scheduleRef: React.MutableRefObject<Schedule | undefined>;
  backupTimerRef: React.MutableRefObject<number | null>;
} {
  const backupTimerRef = useRef<number | null>(null);
  const backupPromisesRef = useRef(
    new Map<string, Promise<Schedule | undefined>>()
  );
  const scheduleRef = useRef(schedule);
  const mountedRef = useRef(true);
  useLayoutEffect(() => {
    if (scheduleRef.current?.id !== schedule?.id && backupTimerRef.current) {
      window.clearTimeout(backupTimerRef.current);
      backupTimerRef.current = null;
    }
    scheduleRef.current = schedule;
  }, [schedule]);

  const lookup = useCallback(
    (id: string) =>
      getScheduleById
        ? getScheduleById(id)
        : scheduleRef.current?.id === id
          ? scheduleRef.current
          : undefined,
    [getScheduleById]
  );

  const attemptAutoBackup = useCallback(
    async (s: Schedule) => {
      const latest = lookup(s.id);
      if (!latest || !mountedRef.current) return undefined;
      if (latest.slug && latest.editToken) return latest;
      if (isScheduleSyncPaused(s.id)) return latest;
      const pending = backupPromisesRef.current.get(s.id);
      if (pending) return pending;
      if (!latest.members.some(m => m.name.trim() !== "")) return latest;

      // The request owns this ID and snapshot. Its response only adds identity.
      const source = latest;
      const sourceJson = JSON.stringify(toScheduleData(source));
      // eslint-disable-next-line prefer-const -- assigned after IIFE captures the closure
      let currentBackupPromise!: Promise<Schedule | undefined>;
      const backupPromise = (async () => {
        if (scheduleRef.current?.id === source.id) setSyncStatus("syncing");
        try {
          const result = await createSchedule(toScheduleData(source));
          if (!mountedRef.current) return undefined;
          const attachIdentity = (current: Schedule): Schedule => {
            if (current.id !== source.id || (current.slug && current.editToken))
              return current;
            return {
              ...current,
              slug: result.slug,
              editToken: result.editToken,
            };
          };
          onScheduleUpdate?.(attachIdentity);
          const current = lookup(source.id);
          const updated = current ? attachIdentity(current) : undefined;
          const hasNewChanges =
            updated && JSON.stringify(toScheduleData(updated)) !== sourceJson;
          if (updated && hasNewChanges) {
            // Edits made during POST must also reach the cloud, even after a tab switch.
            // This runs outside the React updater, which may be replayed.
            scheduleSyncDebounced(updated);
          }
          if (scheduleRef.current?.id === source.id) {
            setSyncStatus(hasNewChanges ? "syncing" : "synced");
          }
          return updated;
        } catch {
          if (mountedRef.current && scheduleRef.current?.id === source.id) {
            setSyncStatus("error");
          }
          return lookup(source.id);
        } finally {
          if (
            backupPromisesRef.current.get(source.id) === currentBackupPromise
          ) {
            backupPromisesRef.current.delete(source.id);
          }
        }
      })();
      currentBackupPromise = backupPromise;
      backupPromisesRef.current.set(source.id, backupPromise);
      return backupPromise;
    },
    [lookup, onScheduleUpdate, setSyncStatus]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
    const before = scheduleRef.current;
    cancelPendingBackup();
    if (!before) return undefined;
    const backedUp = await backupPromisesRef.current.get(before.id);
    const current = scheduleRef.current;
    if (!mountedRef.current || current?.id !== before.id) {
      throw new Error("The schedule changed while preparing to share.");
    }
    // Waiting for POST must not restore its older content in a manual save.
    const latest = lookup(before.id) ?? current;
    return backedUp?.slug &&
      backedUp.editToken &&
      !(latest.slug && latest.editToken)
      ? { ...latest, slug: backedUp.slug, editToken: backedUp.editToken }
      : latest;
  }, [cancelPendingBackup, lookup]);

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
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useLayoutEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const canPull = useCallback(
    (s: Schedule | undefined): s is CloudSchedule =>
      mountedRef.current &&
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

    const beforeJson = JSON.stringify(toScheduleData(before));
    let fetched;
    try {
      fetched = await getScheduleForEdit(before.slug, before.editToken);
    } catch {
      // 行が消えている(404)・トークンが通らない(403)・通信失敗のいずれでも
      // ローカルには触らない。引き直しは取れたときだけ反映する片道の処理。
      return;
    }

    // Recheck both after the network wait and inside the eventual state update.
    // A pending local write can finish while GET is in flight, so its flag alone
    // cannot prove that the original snapshot is still current.
    const unchanged = (
      current: Schedule | undefined
    ): current is CloudSchedule =>
      canPull(current) &&
      scheduleRef.current?.id === before.id &&
      current.id === before.id &&
      current.slug === before.slug &&
      current.editToken === before.editToken &&
      JSON.stringify(toScheduleData(current)) === beforeJson;
    const after = scheduleRef.current;
    if (!unchanged(after)) return;

    const serverData = {
      name: fetched.name,
      rotation: fetched.rotation,
      groups: fetched.groups,
      members: fetched.members,
      rotationConfig: fetched.rotationConfig,
      assignmentMode: fetched.assignmentMode,
      designThemeId: fetched.designThemeId,
    };
    const mergedJson = JSON.stringify(serverData);
    if (mergedJson === beforeJson) return;

    // A rejected updater has no effects. The marker only suppresses an actual
    // render of this server payload; IDs prevent cross-schedule suppression.
    adoptedJsonRef.current = `${before.id}:${mergedJson}`;
    onScheduleUpdate(current =>
      unchanged(current) ? { ...current, ...serverData } : current
    );
  }, [onScheduleUpdate, scheduleRef, adoptedJsonRef, canPull]);

  // 起動時とスケジュール切り替え時。同じ対象で二重に引かないよう鍵で覚える
  const pulledKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${schedule?.id ?? ""}:${schedule?.slug ?? ""}:${schedule?.editToken ?? ""}`;
    if (pulledKeyRef.current === key) return;
    pulledKeyRef.current = key;
    void pull();
  }, [schedule?.id, schedule?.slug, schedule?.editToken, pull]);

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
  const previousRef = useRef<{
    id: string;
    json: string;
    cloudIdentity: string;
  } | null>(null);

  useEffect(() => {
    if (!schedule) return;

    const json = JSON.stringify(toScheduleData(schedule));
    const cloudIdentity = `${schedule.slug ?? ""}:${schedule.editToken ?? ""}`;
    const previous = previousRef.current;
    previousRef.current = { id: schedule.id, json, cloudIdentity };

    // 引き直しで取り込んだ内容は、サーバと同じなので送り返さない
    if (adoptedJsonRef.current === `${schedule.id}:${json}`) {
      adoptedJsonRef.current = null;
      return;
    }

    const sameSchedule = previous?.id === schedule.id;
    // The marker was loaded before usePullFromServer's first effect, so the
    // initial GET cannot overwrite edits whose previous page never sent them.
    if (!sameSchedule && restorePendingScheduleSync(schedule)) return;
    const changed = sameSchedule && previous.json !== json;
    const gainedIdentity =
      sameSchedule && previous.cloudIdentity !== cloudIdentity;
    // Preserve the initial seed behavior, while backing up a newly selected
    // complete roster without requiring an extra edit to trigger change detection.
    const newlySelectedLocal =
      previous && !sameSchedule && !(schedule.slug && schedule.editToken);
    if (!changed && !gainedIdentity && !newlySelectedLocal) return;

    if (schedule.slug && schedule.editToken) {
      // Already has cloud identity — sync update
      if (backupTimerRef.current) {
        window.clearTimeout(backupTimerRef.current);
        backupTimerRef.current = null;
      }
      scheduleSyncDebounced(schedule);
    } else if (onScheduleUpdate) {
      // No cloud identity yet — schedule auto-backup with debounce
      if (backupTimerRef.current) window.clearTimeout(backupTimerRef.current);
      backupTimerRef.current = window.setTimeout(() => {
        backupTimerRef.current = null;
        // Use ref to get latest schedule — avoids stale closure creating orphan rows
        const current = scheduleRef.current;
        if (
          !current ||
          current.id !== schedule.id ||
          (current.slug && current.editToken)
        )
          return;
        void attemptAutoBackup(current);
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
  options?: { isEditing?: boolean; getScheduleById?: ScheduleLookup }
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
  } = useAutoBackup(
    schedule,
    onScheduleUpdate,
    setSyncStatus,
    options?.getScheduleById
  );
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
