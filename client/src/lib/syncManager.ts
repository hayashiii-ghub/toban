import { updateSchedule, toScheduleData, ApiError } from "./api";
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

/**
 * schedule単位の同期停止フラグ。PUT更新のdebounce（本ファイル内）だけでなく、
 * POST初回作成（useAutoSync.tsのattemptAutoBackup）のガードとしても参照される。
 * 手動共有（useShareFlow）中に自動同期が競合しないよう、経路を問わず
 * 「このscheduleへのあらゆる自動同期を止める」という意味で共有されている。
 */
export function isScheduleSyncPaused(scheduleId: string): boolean {
  return pausedScheduleIds.has(scheduleId);
}

/**
 * 未送信のローカル変更が残っているか。
 * サーバからの引き直し（useAutoSync）が、まだ送れていない編集を
 * 上書きしないためのガードとして参照される。
 */
export function hasPendingSync(scheduleId: string): boolean {
  return pendingSchedules.has(scheduleId) || timers.has(scheduleId);
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
  options?: { keepalive?: boolean }
): Promise<boolean> {
  if (!schedule.slug || !schedule.editToken) return false;

  statusCallback?.(schedule.id, "syncing");
  try {
    await updateSchedule(
      schedule.slug,
      schedule.editToken,
      toScheduleData(schedule),
      options
    );
    statusCallback?.(schedule.id, "synced");
    return true;
  } catch (error) {
    statusCallback?.(schedule.id, "error");

    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        // Auth error — non-retriable, discard pending
        console.warn(
          `[syncManager] 認証エラー (${error.status}): スケジュール ${schedule.id} の同期をスキップ`
        );
        pendingSchedules.delete(schedule.id);
      } else if (error.status === 400 || error.status === 413) {
        // Validation error / payload too large — 同じ内容を送り直しても必ず失敗する。
        // 保持し続けると復帰イベントのたびに無駄な再送が走るので破棄する。
        console.warn(
          `[syncManager] 送信内容が不正 (${error.status}): スケジュール ${schedule.id} の同期をスキップ`,
          error.message
        );
        pendingSchedules.delete(schedule.id);
      } else {
        // 5xx server errors — retriable, keep pending for retry on reconnect
        console.error(
          `[syncManager] サーバーエラー (${error.status}): スケジュール ${schedule.id} の同期に失敗`,
          error
        );
      }
    } else {
      // Network errors etc. — retriable, keep pending for retry on reconnect
      console.error(
        `[syncManager] ネットワークエラー: スケジュール ${schedule.id} の同期に失敗`,
        error
      );
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
      void doSync(latestPending).then(synced => {
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
  options?: { keepalive?: boolean }
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
