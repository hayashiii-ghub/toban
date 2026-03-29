import { updateSchedule, ApiError } from "./api";
import type { Schedule } from "@shared/types";

const DEBOUNCE_MS = 3000;
const timers = new Map<string, number>();
const pendingSchedules = new Map<string, Schedule>();
const pausedScheduleIds = new Set<string>();

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

type SyncStatusCallback = (scheduleId: string, status: SyncStatus) => void;

let statusCallback: SyncStatusCallback | null = null;

export function setSyncStatusCallback(cb: SyncStatusCallback | null): void {
  statusCallback = cb;
}

export function isScheduleSyncPaused(scheduleId: string): boolean {
  return pausedScheduleIds.has(scheduleId);
}

export function pauseScheduleSync(scheduleId: string): void {
  pausedScheduleIds.add(scheduleId);
  const timer = timers.get(scheduleId);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(scheduleId);
  }
}

export function resumeScheduleSync(scheduleId: string): void {
  pausedScheduleIds.delete(scheduleId);
  schedulePendingSync(scheduleId);
}

export function clearPendingSync(scheduleId: string): void {
  const timer = timers.get(scheduleId);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(scheduleId);
  }
  pendingSchedules.delete(scheduleId);
}

async function doSync(
  schedule: Schedule,
  options?: { keepalive?: boolean },
): Promise<boolean> {
  if (!schedule.slug || !schedule.editToken) return false;

  statusCallback?.(schedule.id, "syncing");
  try {
    await updateSchedule(schedule.slug, schedule.editToken, {
      name: schedule.name,
      rotation: schedule.rotation,
      groups: schedule.groups,
      members: schedule.members,
      rotationConfig: schedule.rotationConfig,
      assignmentMode: schedule.assignmentMode,
      designThemeId: schedule.designThemeId,
    }, options);
    statusCallback?.(schedule.id, "synced");
    return true;
  } catch (error) {
    statusCallback?.(schedule.id, "error");

    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        // Auth error — non-retriable, discard pending
        console.warn(`[syncManager] 認証エラー (${error.status}): スケジュール ${schedule.id} の同期をスキップ`);
        pendingSchedules.delete(schedule.id);
      } else if (error.status === 400) {
        // Validation error — non-retriable, discard pending
        console.warn(`[syncManager] データ不正 (400): スケジュール ${schedule.id} の同期をスキップ`, error.message);
        pendingSchedules.delete(schedule.id);
      } else {
        // 5xx server errors — retriable, keep pending for retry on reconnect
        console.error(`[syncManager] サーバーエラー (${error.status}): スケジュール ${schedule.id} の同期に失敗`, error);
      }
    } else {
      // Network errors etc. — retriable, keep pending for retry on reconnect
      console.error(`[syncManager] ネットワークエラー: スケジュール ${schedule.id} の同期に失敗`, error);
    }

    return false;
  }
}

function schedulePendingSync(scheduleId: string): void {
  if (isScheduleSyncPaused(scheduleId)) return;

  const pending = pendingSchedules.get(scheduleId);
  if (!pending) return;

  const existing = timers.get(scheduleId);
  if (existing) window.clearTimeout(existing);

  const timer = window.setTimeout(() => {
    timers.delete(scheduleId);
    const latestPending = pendingSchedules.get(scheduleId);
    if (latestPending) {
      void doSync(latestPending).then((synced) => {
        if (synced && pendingSchedules.get(scheduleId) === latestPending) {
          pendingSchedules.delete(scheduleId);
        }
      });
    }
  }, DEBOUNCE_MS);

  timers.set(scheduleId, timer);
}

export function scheduleSyncDebounced(schedule: Schedule): void {
  if (!schedule.slug || !schedule.editToken) return;

  pendingSchedules.set(schedule.id, structuredClone(schedule));
  schedulePendingSync(schedule.id);
}

export async function flushPendingSync(
  scheduleId: string,
  options?: { keepalive?: boolean },
): Promise<void> {
  const timer = timers.get(scheduleId);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(scheduleId);
  }
  const pending = pendingSchedules.get(scheduleId);
  if (pending) {
    const synced = await doSync(pending, options);
    if (synced && pendingSchedules.get(scheduleId) === pending) {
      pendingSchedules.delete(scheduleId);
    }
  }
}
