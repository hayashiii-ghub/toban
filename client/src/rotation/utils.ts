import type { AppState, Member, RotationConfig, Schedule, ScheduleTemplate, TaskGroup } from "./types";
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

  const result: Member = {
    id: member.id,
    name: member.name.trim(),
    color: member.color,
    bgColor: member.bgColor,
    textColor: member.textColor,
  };
  if (typeof (member as any).skipped === "boolean") {
    result.skipped = (member as any).skipped;
  }
  return result;
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
    rotation: normalizeRotation(schedule.rotation, members.filter(m => !m.skipped).length || members.length),
    groups,
    members,
  };

  if (isNonEmptyString(schedule.slug)) {
    result.slug = schedule.slug;
  }
  if (isNonEmptyString(schedule.editToken)) {
    result.editToken = schedule.editToken;
  }

  if (isRecord(schedule.rotationConfig)) {
    const rc = schedule.rotationConfig;
    const config: RotationConfig = { mode: "manual" };
    if (rc.mode === "manual" || rc.mode === "date") {
      config.mode = rc.mode;
    }
    if (typeof rc.startDate === "string" && rc.startDate) {
      config.startDate = rc.startDate;
    }
    if (typeof rc.cycleDays === "number" && Number.isFinite(rc.cycleDays) && rc.cycleDays > 0) {
      config.cycleDays = rc.cycleDays;
    }
    result.rotationConfig = config;
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

  const customSchedule = createScheduleFromTemplate(TEMPLATES[TEMPLATES.length - 1]);
  return { schedules: [customSchedule], activeScheduleId: customSchedule.id };
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
  const activeMembers = members.filter(m => !m.skipped);
  if (activeMembers.length === 0) return [];
  return groups.map((group, i) => {
    const memberIdx = ((i + rotation) % activeMembers.length + activeMembers.length) % activeMembers.length;
    return { group, member: activeMembers[memberIdx] };
  });
}

export function getGridCols(count: number): string {
  if (count <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (count === 3) return "grid-cols-1 md:grid-cols-3";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

export function computeDateRotation(config: RotationConfig, memberCount: number): number {
  if (!config.startDate || !config.cycleDays || config.cycleDays <= 0 || memberCount <= 0) {
    return 0;
  }
  const start = new Date(config.startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 0;
  const cycles = Math.floor(diffDays / config.cycleDays);
  return ((cycles % memberCount) + memberCount) % memberCount;
}

export function getEffectiveRotation(schedule: Schedule): number {
  if (schedule.rotationConfig?.mode === "date") {
    const activeMembers = schedule.members.filter(m => !m.skipped);
    return computeDateRotation(schedule.rotationConfig, activeMembers.length);
  }
  return schedule.rotation;
}
