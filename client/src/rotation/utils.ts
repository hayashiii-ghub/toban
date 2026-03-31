import type { AppState, Assignment, AssignmentMode, Member, RotationConfig, Schedule, ScheduleTemplate, TaskGroup } from "./types";
import { STORAGE_KEY, TEMPLATES } from "./constants";
import { DEFAULT_APP_STATE } from "./defaultState";
import { countSkipDays, isSkippedDate } from "./holidays";
import { addDays, diffLocalCalendarDays, parseIsoDateLocal, startOfLocalDay } from "./dateUtils";
import { safeGetItem, safeSetItem } from "@/lib/storage";

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

export function sanitizeTaskGroup(group: unknown): TaskGroup | null {
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

  const result: TaskGroup = {
    id: group.id,
    emoji: group.emoji,
    tasks,
  };

  if (Array.isArray(group.memberIds)) {
    const validMemberIds = group.memberIds.filter(isNonEmptyString);
    if (validMemberIds.length > 0) {
      result.memberIds = validMemberIds;
    }
  }

  return result;
}

export function sanitizeMember(member: unknown): Member | null {
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
  if (typeof member.skipped === "boolean") {
    result.skipped = member.skipped;
  }
  return result;
}

export function sanitizeSchedule(schedule: unknown): Schedule | null {
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

  if (schedule.assignmentMode === "member" || schedule.assignmentMode === "task") {
    result.assignmentMode = schedule.assignmentMode;
  }

  if (isNonEmptyString(schedule.designThemeId)) {
    result.designThemeId = schedule.designThemeId;
  }
  if (typeof schedule.pinned === "boolean") {
    result.pinned = schedule.pinned;
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
    if (typeof rc.skipSaturday === "boolean") {
      config.skipSaturday = rc.skipSaturday;
    }
    if (typeof rc.skipSunday === "boolean") {
      config.skipSunday = rc.skipSunday;
    }
    if (typeof rc.skipHolidays === "boolean") {
      config.skipHolidays = rc.skipHolidays;
    }
    // マイグレーション: 旧 weekdaysOnly → skipSaturday + skipSunday
    if (typeof rc.weekdaysOnly === "boolean" && rc.weekdaysOnly) {
      config.skipSaturday ??= true;
      config.skipSunday ??= true;
    }
    result.rotationConfig = config;
  }

  return result;
}

export function sanitizeAppState(state: unknown): AppState | null {
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

export function normalizeRotation(rotation: number, memberCount: number): number {
  if (memberCount <= 0 || !Number.isFinite(rotation)) {
    return 0;
  }

  const normalizedRotation = Math.trunc(rotation);
  return ((normalizedRotation % memberCount) + memberCount) % memberCount;
}

export function createScheduleFromTemplate(template: ScheduleTemplate): Schedule {
  const schedule: Schedule = {
    id: generateId("s"),
    name: template.name,
    rotation: 0,
    groups: deepClone(template.groups),
    members: deepClone(template.members),
  };
  if (template.assignmentMode) {
    schedule.assignmentMode = template.assignmentMode;
  }
  if (template.designThemeId) {
    schedule.designThemeId = template.designThemeId;
  }
  return schedule;
}

export function loadState(): AppState {
  try {
    const raw = safeGetItem(STORAGE_KEY);
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
  safeSetItem(STORAGE_KEY, JSON.stringify(state));
}

export function computeAssignments(
  groups: TaskGroup[],
  members: Member[],
  rotation: number,
  assignmentMode?: AssignmentMode,
): Assignment[] {
  const activeMembers = members.filter(m => !m.skipped);
  if (activeMembers.length === 0) return [];
  const isTaskMode = assignmentMode === "task";
  return groups.map((group, i) => {
    // グループ専用メンバーが指定されている場合、そのプールを使う
    let pool = activeMembers;
    let useGroupIndex = true;
    if (group.memberIds && group.memberIds.length > 0) {
      const groupMembers = group.memberIds
        .map(id => activeMembers.find(m => m.id === id))
        .filter((m): m is Member => m !== undefined);
      if (groupMembers.length > 0) {
        pool = groupMembers;
        // タスクモード: 常にグループインデックスを使う（同じプールでも別タスクに別メンバー）
        // 担当者モード: 専用プールではグループインデックスオフセット不要
        useGroupIndex = isTaskMode ? true : false;
      }
    }
    const offset = useGroupIndex ? i + rotation : rotation;
    const memberIdx = ((offset % pool.length) + pool.length) % pool.length;
    return { group, member: pool[memberIdx] };
  });
}

export function getGridCols(): string {
  return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}

export function computeDateRotation(config: RotationConfig, memberCount: number): number {
  return computeDateRotationForDate(config, memberCount, new Date());
}

export function computeDateRotationForDate(
  config: RotationConfig,
  memberCount: number,
  targetDate: Date,
): number {
  if (!config.startDate || !config.cycleDays || config.cycleDays <= 0 || memberCount <= 0) {
    return 0;
  }

  const start = parseIsoDateLocal(config.startDate);
  if (!start) return 0;

  let effectiveTarget = startOfLocalDay(targetDate);
  while (
    diffLocalCalendarDays(start, effectiveTarget) >= 0 &&
    isSkippedDate(effectiveTarget, config)
  ) {
    effectiveTarget = addDays(effectiveTarget, -1);
  }

  const diffDays = diffLocalCalendarDays(start, effectiveTarget);
  if (diffDays < 0) return 0;
  const skipDays = countSkipDays(start, effectiveTarget, config);
  const effectiveDays = diffDays - skipDays;
  const cycles = Math.floor(effectiveDays / config.cycleDays);
  return ((cycles % memberCount) + memberCount) % memberCount;
}

export function getEffectiveRotation(schedule: Schedule): number {
  if (schedule.rotationConfig?.mode === "date") {
    const activeMembers = schedule.members.filter(m => !m.skipped);
    return computeDateRotation(schedule.rotationConfig, activeMembers.length);
  }
  return schedule.rotation;
}
