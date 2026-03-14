import type { AppState, Member, Schedule, ScheduleTemplate, TaskGroup } from "./types";
import { STORAGE_KEY, TEMPLATES } from "./constants";
import { DEFAULT_APP_STATE } from "./defaultState";

export function generateId(prefix: string): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeTaskGroup(group: unknown): TaskGroup | null {
  if (!isRecord(group)) return null;

  const tasks = Array.isArray(group.tasks)
    ? group.tasks.filter(isNonEmptyString).map((task) => task.trim())
    : [];

  if (
    !isNonEmptyString(group.id) ||
    !isNonEmptyString(group.emoji) ||
    tasks.length === 0
  ) {
    return null;
  }

  return {
    id: group.id,
    emoji: group.emoji,
    tasks,
  };
}

function sanitizeMember(member: unknown): Member | null {
  if (!isRecord(member)) return null;

  if (
    !isNonEmptyString(member.id) ||
    !isNonEmptyString(member.name) ||
    !isNonEmptyString(member.color) ||
    !isNonEmptyString(member.bgColor) ||
    !isNonEmptyString(member.textColor)
  ) {
    return null;
  }

  return {
    id: member.id,
    name: member.name.trim(),
    color: member.color,
    bgColor: member.bgColor,
    textColor: member.textColor,
  };
}

function sanitizeSchedule(schedule: unknown): Schedule | null {
  if (!isRecord(schedule)) return null;

  const groups = Array.isArray(schedule.groups)
    ? schedule.groups.map(sanitizeTaskGroup).filter((group): group is TaskGroup => group !== null)
    : [];
  const members = Array.isArray(schedule.members)
    ? schedule.members.map(sanitizeMember).filter((member): member is Member => member !== null)
    : [];

  if (
    !isNonEmptyString(schedule.id) ||
    !isNonEmptyString(schedule.name) ||
    typeof schedule.rotation !== "number" ||
    !Number.isFinite(schedule.rotation) ||
    groups.length === 0 ||
    members.length === 0
  ) {
    return null;
  }

  const result: Schedule = {
    id: schedule.id,
    name: schedule.name.trim(),
    rotation: normalizeRotation(schedule.rotation, members.length),
    groups,
    members,
  };

  if (isNonEmptyString(schedule.slug)) {
    result.slug = schedule.slug;
  }
  if (isNonEmptyString(schedule.editToken)) {
    result.editToken = schedule.editToken;
  }

  return result;
}

function sanitizeAppState(state: unknown): AppState | null {
  if (!isRecord(state) || !Array.isArray(state.schedules)) {
    return null;
  }

  const schedules = state.schedules
    .map(sanitizeSchedule)
    .filter((schedule): schedule is Schedule => schedule !== null);

  if (schedules.length === 0) {
    return null;
  }

  const activeScheduleId = isNonEmptyString(state.activeScheduleId)
    && schedules.some((schedule) => schedule.id === state.activeScheduleId)
    ? state.activeScheduleId
    : schedules[0].id;

  return { schedules, activeScheduleId };
}

export function isValidSchedule(schedule: unknown): schedule is Schedule {
  return sanitizeSchedule(schedule) !== null;
}

export function normalizeRotation(rotation: number, memberCount: number): number {
  if (memberCount <= 0 || !Number.isFinite(rotation)) {
    return 0;
  }

  const normalizedRotation = Math.trunc(rotation);
  return ((normalizedRotation % memberCount) + memberCount) % memberCount;
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
      const parsedState = sanitizeAppState(JSON.parse(raw));
      if (parsedState) {
        return parsedState;
      }
    }
  } catch { /* ignore corrupted data */ }

  const defaultState = sanitizeAppState(DEFAULT_APP_STATE);
  if (defaultState) {
    return defaultState;
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
