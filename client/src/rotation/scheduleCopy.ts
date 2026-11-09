import { LIMITS } from "@shared/limits";
import type { Schedule } from "./types";
import { deepClone, generateId } from "./utils";

export function copySchedule(source: Schedule, name: string): Schedule {
  // A copy starts privately; only editable content belongs in the new roster.
  return {
    id: generateId("s"),
    name: name.slice(0, LIMITS.scheduleName),
    rotation: 0,
    groups: deepClone(source.groups),
    members: deepClone(source.members),
    rotationConfig: source.rotationConfig
      ? deepClone(source.rotationConfig)
      : undefined,
    assignmentMode: source.assignmentMode,
    designThemeId: source.designThemeId,
    fontId: source.fontId,
  };
}
