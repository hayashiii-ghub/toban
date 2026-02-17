export interface TaskGroup {
  id: string;
  tasks: string[];
  emoji: string;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export interface Schedule {
  id: string;
  name: string;
  rotation: number;
  groups: TaskGroup[];
  members: Member[];
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
}
