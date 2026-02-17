import type { AppState, Schedule, ScheduleTemplate, TaskGroup, Member } from "./types";
import { STORAGE_KEY, TEMPLATES } from "./constants";
import { DEFAULT_APP_STATE } from "./defaultState";

export function generateId(prefix: string): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isValidSchedule(s: unknown): s is Schedule {
  if (!s || typeof s !== "object") return false;
  const obj = s as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.rotation === "number" &&
    Array.isArray(obj.groups) &&
    obj.groups.length > 0 &&
    Array.isArray(obj.members) &&
    obj.members.length > 0
  );
}

export function createScheduleFromTemplate(template: ScheduleTemplate): Schedule {
  return {
    id: generateId("s"),
    name: template.name,
    rotation: 0,
    groups: deepClone(template.groups),
    members: deepClone(template.members),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.schedules)) {
        const validSchedules = parsed.schedules.filter(isValidSchedule);
        if (validSchedules.length > 0) {
          const activeId = validSchedules.some((s: Schedule) => s.id === parsed.activeScheduleId)
            ? parsed.activeScheduleId
            : validSchedules[0].id;
          return { schedules: validSchedules, activeScheduleId: activeId };
        }
      }
    }
  } catch { /* ignore corrupted data */ }
  const validDefaults = DEFAULT_APP_STATE.schedules.filter(isValidSchedule);
  if (validDefaults.length > 0) {
    const activeId = DEFAULT_APP_STATE.schedules.some((s) => s.id === DEFAULT_APP_STATE.activeScheduleId)
      ? DEFAULT_APP_STATE.activeScheduleId
      : validDefaults[0].id;
    return { schedules: validDefaults, activeScheduleId: activeId };
  }
  const defaultSchedule = createScheduleFromTemplate(TEMPLATES[0]);
  const customSchedule = createScheduleFromTemplate(TEMPLATES[TEMPLATES.length - 1]);
  return { schedules: [defaultSchedule, customSchedule], activeScheduleId: defaultSchedule.id };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full or unavailable */ }
}

export function computeAssignments(
  groups: TaskGroup[],
  members: Member[],
  rotation: number
): { group: TaskGroup; member: Member }[] {
  if (members.length === 0) return [];
  return groups.map((group, i) => {
    const memberIdx = ((i + rotation) % members.length + members.length) % members.length;
    return { group, member: members[memberIdx] };
  });
}

export function getGridCols(count: number): string {
  if (count <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (count === 3) return "grid-cols-1 md:grid-cols-3";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}
