import { updateSchedule } from "./api";
import type { Schedule } from "@shared/types";

const DEBOUNCE_MS = 3000;
const timers = new Map<string, number>();
const pendingSchedules = new Map<string, Schedule>();

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

type SyncStatusCallback = (scheduleId: string, status: SyncStatus) => void;

let statusCallback: SyncStatusCallback | null = null;

export function setSyncStatusCallback(cb: SyncStatusCallback | null): void {
  statusCallback = cb;
}

async function doSync(schedule: Schedule): Promise<void> {
  if (!schedule.slug || !schedule.editToken) return;

  statusCallback?.(schedule.id, "syncing");
  try {
    await updateSchedule(schedule.slug, schedule.editToken, {
      name: schedule.name,
      rotation: schedule.rotation,
      groups: schedule.groups,
      members: schedule.members,
    });
    statusCallback?.(schedule.id, "synced");
  } catch {
    statusCallback?.(schedule.id, "error");
  }
}

export function scheduleSyncDebounced(schedule: Schedule): void {
  if (!schedule.slug || !schedule.editToken) return;

  pendingSchedules.set(schedule.id, schedule);

  const existing = timers.get(schedule.id);
  if (existing) window.clearTimeout(existing);

  const timer = window.setTimeout(() => {
    timers.delete(schedule.id);
    const pending = pendingSchedules.get(schedule.id);
    if (pending) {
      pendingSchedules.delete(schedule.id);
      doSync(pending);
    }
  }, DEBOUNCE_MS);

  timers.set(schedule.id, timer);
}

export async function flushPendingSync(scheduleId: string): Promise<void> {
  const timer = timers.get(scheduleId);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(scheduleId);
  }
  const pending = pendingSchedules.get(scheduleId);
  if (pending) {
    pendingSchedules.delete(scheduleId);
    await doSync(pending);
  }
}
