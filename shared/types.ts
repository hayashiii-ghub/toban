import type { FontId } from "./appearance";

export interface TaskGroup {
  id: string;
  tasks: string[];
  emoji: string;
  memberIds?: string[];
}

export interface Member {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  skipped?: boolean;
}

export interface RotationConfig {
  mode: "manual" | "date";
  startDate?: string;
  cycleDays?: number;
  skipSaturday?: boolean;
  skipSunday?: boolean;
  skipHolidays?: boolean;
}

export type AssignmentMode = "member" | "task";

/** computeAssignments の戻り値要素。グループとその担当メンバーの組。 */
export interface Assignment {
  group: TaskGroup;
  member: Member;
}

/** クライアント側でlocalStorageに保存されるスケジュール表現。 */
export interface Schedule {
  id: string;
  name: string;
  rotation: number;
  groups: TaskGroup[];
  members: Member[];
  slug?: string;
  editToken?: string;
  rotationConfig?: RotationConfig;
  pinned?: boolean;
  assignmentMode?: AssignmentMode;
  designThemeId?: string;
  fontId?: FontId;
}

export interface AppState {
  schedules: Schedule[];
  activeScheduleId: string;
}

export interface ScheduleTemplate {
  name: string;
  emoji: string;
  groups: TaskGroup[];
  members: Member[];
  assignmentMode?: AssignmentMode;
  designThemeId?: string;
  fontId?: FontId;
}

/** サーバーAPIが返すスケジュール表現。Scheduleとは別で、slugやタイムスタンプを持つ。 */
export interface ScheduleDTO {
  slug: string;
  name: string;
  rotation: number;
  groups: TaskGroup[];
  members: Member[];
  rotationConfig?: RotationConfig;
  assignmentMode?: AssignmentMode;
  designThemeId?: string;
  fontId?: FontId;
  createdAt: string;
  updatedAt: string;
}
