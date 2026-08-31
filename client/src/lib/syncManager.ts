import { updateSchedule, toScheduleData, ApiError } from "./api";
import type { Schedule } from "@shared/types";
import { safeGetItem, safeSetItem } from "./storage";

const DEBOUNCE_MS = 3000;
const timers = new Map<string, number>();
const pendingSchedules = new Map<string, Schedule>();
const inFlightSyncs = new Map<string, Promise<void>>();
const pausedScheduleIds = new Set<string>();

// AppState already persists the latest body and credentials. Only remember which
// IDs must not be replaced by an older server response after a page is destroyed.
const RECOVERY_KEY = "toban-sync-recovery-v1";
type RecoveryState = "pending" | "blocked";
function readRecovery(): Map<string, RecoveryState> {
  try {
    const entries: unknown = JSON.parse(safeGetItem(RECOVERY_KEY) ?? "[]");
    if (!Array.isArray(entries)) return new Map();
    return new Map(
      entries.filter(
        (entry): entry is [string, RecoveryState] =>
          Array.isArray(entry) &&
          entry.length === 2 &&
          typeof entry[0] === "string" &&
          entry[0].length > 0 &&
          entry[0].length <= 200 &&
          (entry[1] === "pending" || entry[1] === "blocked")
      )
    );
  } catch {
    return new Map();
  }
}
const recovery = readRecovery();

function rememberRecovery(scheduleId: string, state?: RecoveryState): void {
  if (state) recovery.set(scheduleId, state);
  else recovery.delete(scheduleId);
  // Preserve markers written for other IDs by another tab.
  const stored = readRecovery();
  if (state) stored.set(scheduleId, state);
  else stored.delete(scheduleId);
  safeSetItem(RECOVERY_KEY, JSON.stringify([...stored]));
}

/** Rehydrate only from the existing local roster, never a second stored body. */
export function restorePendingScheduleSync(schedule: Schedule): boolean {
  if (!schedule.slug || !schedule.editToken) return false;
  const state = recovery.get(schedule.id);
  if (state === "blocked") {
    statusCallback?.(schedule.id, "error");
    return false;
  }
  if (state !== "pending" || pendingSchedules.has(schedule.id)) return false;
  scheduleSyncDebounced(schedule);
  return true;
}

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
  return (
    recovery.has(scheduleId) ||
    pendingSchedules.has(scheduleId) ||
    timers.has(scheduleId) ||
    inFlightSyncs.has(scheduleId)
  );
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

export function clearPendingSync(
  scheduleId: string,
  savedSchedule?: Schedule
): void {
  const pending = pendingSchedules.get(scheduleId);
  if (
    savedSchedule &&
    pending &&
    (pending.slug !== savedSchedule.slug ||
      pending.editToken !== savedSchedule.editToken ||
      JSON.stringify(toScheduleData(pending)) !==
        JSON.stringify(toScheduleData(savedSchedule)))
  )
    return;
  const timer = timers.get(scheduleId);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(scheduleId);
  }
  pendingSchedules.delete(scheduleId);
  rememberRecovery(scheduleId);
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
        if (pendingSchedules.get(schedule.id) === schedule) {
          pendingSchedules.delete(schedule.id);
          rememberRecovery(schedule.id, "blocked");
        }
      } else if (error.status === 400 || error.status === 413) {
        // Validation error / payload too large — 同じ内容を送り直しても必ず失敗する。
        // 保持し続けると復帰イベントのたびに無駄な再送が走るので破棄する。
        console.warn(
          `[syncManager] 送信内容が不正 (${error.status}): スケジュール ${schedule.id} の同期をスキップ`,
          error.message
        );
        if (pendingSchedules.get(schedule.id) === schedule) {
          pendingSchedules.delete(schedule.id);
          rememberRecovery(schedule.id, "blocked");
        }
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

/** Wait for already-dispatched PUTs without sending paused pending edits. */
export async function waitForScheduleSync(scheduleId: string): Promise<void> {
  let inFlight = inFlightSyncs.get(scheduleId);
  while (inFlight) {
    await inFlight;
    inFlight = inFlightSyncs.get(scheduleId);
  }
}

async function syncPendingSchedule(
  scheduleId: string,
  options?: { keepalive?: boolean }
): Promise<void> {
  // Check again after each await: another caller may have started the next PUT.
  let inFlight = inFlightSyncs.get(scheduleId);
  while (inFlight) {
    await inFlight;
    inFlight = inFlightSyncs.get(scheduleId);
  }
  if (isScheduleSyncPaused(scheduleId)) return;
  const pending = pendingSchedules.get(scheduleId);
  if (!pending) return;

  const request = doSync(pending, options).then(synced => {
    if (synced && pendingSchedules.get(scheduleId) === pending) {
      pendingSchedules.delete(scheduleId);
      rememberRecovery(scheduleId);
    }
  });
  inFlightSyncs.set(scheduleId, request);
  try {
    await request;
  } finally {
    if (inFlightSyncs.get(scheduleId) === request) {
      inFlightSyncs.delete(scheduleId);
    }
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
    void syncPendingSchedule(scheduleId);
  }, DEBOUNCE_MS);

  timers.set(scheduleId, timer);
}

export function scheduleSyncDebounced(schedule: Schedule): void {
  if (!schedule.slug || !schedule.editToken) return;

  pendingSchedules.set(schedule.id, structuredClone(schedule));
  rememberRecovery(schedule.id, "pending");
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
  await syncPendingSchedule(scheduleId, options);
}
