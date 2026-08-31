import { nanoid } from "nanoid";
import { z } from "zod";
import { LIMITS } from "@shared/limits";
import type { Schedule } from "./types";

const id = z.string().trim().min(1).max(200);
const taskList = z
  .array(z.string().trim().min(1).max(LIMITS.task))
  .min(1)
  .max(LIMITS.tasksPerGroup);

/** Additive fields for update_schedule; name, pin status and retry IDs stay in the tool. */
export const scheduleEditsSchema = z.strictObject({
  assignment_mode: z.enum(["member", "task"]).optional(),
  task_changes: z
    .array(z.strictObject({ group_id: id, tasks: taskList }))
    .min(1)
    .max(LIMITS.groups)
    .optional(),
  add_task_groups: z
    .array(
      z.strictObject({
        tasks: taskList,
        emoji: z.string().trim().min(1).max(LIMITS.emoji).optional(),
      })
    )
    .min(1)
    .max(LIMITS.groups)
    .describe(
      "Append independent duties. Requires task assignment mode, or assignment_mode task in this same call. Members are never added implicitly."
    )
    .optional(),
  remove_group_ids: z
    .array(id)
    .min(1)
    .max(LIMITS.groups)
    .describe(
      "Remove these duties by stable group ID. Requires task assignment mode. Never removes members; at least one duty must remain."
    )
    .optional(),
  group_member_changes: z
    .array(
      z.strictObject({
        group_id: id,
        member_ids: z
          .array(id)
          .min(1)
          .max(LIMITS.members)
          .nullable()
          .describe(
            "Ordered, distinct IDs of members currently eligible for rotation. null restores the default pool of all members, including future additions. An empty list is not allowed."
          ),
      })
    )
    .min(1)
    .max(LIMITS.groups)
    .optional(),
});

export type ScheduleEdits = z.output<typeof scheduleEditsSchema>;

const messages = {
  INVALID_EDIT_SHAPE:
    "Check the group edits, required IDs, task text and limits.",
  DUPLICATE_GROUP_ID:
    "A group ID must identify exactly one group and appear only once within an operation.",
  GROUP_NOT_FOUND: "A requested task group does not exist in this roster.",
  CONFLICTING_GROUP_EDITS:
    "A group cannot be updated and removed in the same call.",
  TASK_MODE_REQUIRED:
    "Adding or removing independent duties requires task assignment mode. Set assignment_mode to task in the same call if intended.",
  GROUP_LIMIT_EXCEEDED: "The edited roster would exceed the task group limit.",
  LAST_GROUP: "The last task group cannot be removed without a replacement.",
  MEMBER_MODE_COUNT_MISMATCH:
    "Switching to member assignment mode requires the same number of members and task groups. No people or placeholder duties were added.",
  DUPLICATE_MEMBER_ID:
    "A candidate ID must identify exactly one member and appear only once in a candidate pool.",
  MEMBER_NOT_FOUND: "A requested candidate does not exist in this roster.",
  MEMBER_NOT_ELIGIBLE:
    "A requested candidate is currently excluded from rotation. Resume that member before assigning them to a candidate pool.",
} as const;

export type ScheduleEditReason = keyof typeof messages;

export class ScheduleEditError extends Error {
  readonly code: "INVALID_INPUT" | "NOT_FOUND";

  constructor(readonly reason: ScheduleEditReason) {
    super(messages[reason]);
    this.name = "ScheduleEditError";
    this.code =
      reason === "GROUP_NOT_FOUND" || reason === "MEMBER_NOT_FOUND"
        ? "NOT_FOUND"
        : "INVALID_INPUT";
  }
}

function requireDistinctGroupIds(ids: string[]) {
  if (new Set(ids).size !== ids.length)
    throw new ScheduleEditError("DUPLICATE_GROUP_ID");
}

/** Validate against the latest roster, then build its replacement without mutating input. */
export function applyScheduleEdits(
  schedule: Schedule,
  input: unknown
): Schedule {
  const parsed = scheduleEditsSchema.safeParse(input);
  if (!parsed.success) throw new ScheduleEditError("INVALID_EDIT_SHAPE");
  const edits = parsed.data;
  const taskChanges = edits.task_changes ?? [];
  const additions = edits.add_task_groups ?? [];
  const removals = edits.remove_group_ids ?? [];
  const memberChanges = edits.group_member_changes ?? [];
  requireDistinctGroupIds(taskChanges.map(change => change.group_id));
  requireDistinctGroupIds(removals);
  requireDistinctGroupIds(memberChanges.map(change => change.group_id));

  const removalIds = new Set(removals);
  const updatedGroupIds = [...taskChanges, ...memberChanges].map(
    change => change.group_id
  );
  for (const id of [...removals, ...updatedGroupIds]) {
    const matches = schedule.groups.filter(group => group.id === id);
    if (!matches.length) throw new ScheduleEditError("GROUP_NOT_FOUND");
    if (matches.length > 1) throw new ScheduleEditError("DUPLICATE_GROUP_ID");
  }
  if (updatedGroupIds.some(id => removalIds.has(id))) {
    throw new ScheduleEditError("CONFLICTING_GROUP_EDITS");
  }

  const mode = edits.assignment_mode ?? schedule.assignmentMode ?? "member";
  if ((additions.length > 0 || removals.length > 0) && mode !== "task") {
    throw new ScheduleEditError("TASK_MODE_REQUIRED");
  }
  const groupCount =
    schedule.groups.length - removals.length + additions.length;
  if (groupCount < 1) throw new ScheduleEditError("LAST_GROUP");
  if (groupCount > LIMITS.groups)
    throw new ScheduleEditError("GROUP_LIMIT_EXCEEDED");
  // Existing unequal legacy rosters still accept text edits. An explicit mode
  // change must not silently create people or empty duties to make them match.
  if (
    edits.assignment_mode === "member" &&
    groupCount !== schedule.members.length
  ) {
    throw new ScheduleEditError("MEMBER_MODE_COUNT_MISMATCH");
  }

  for (const change of memberChanges) {
    if (change.member_ids === null) continue;
    if (new Set(change.member_ids).size !== change.member_ids.length) {
      throw new ScheduleEditError("DUPLICATE_MEMBER_ID");
    }
    for (const memberId of change.member_ids) {
      const matches = schedule.members.filter(member => member.id === memberId);
      if (!matches.length) throw new ScheduleEditError("MEMBER_NOT_FOUND");
      if (matches.length > 1)
        throw new ScheduleEditError("DUPLICATE_MEMBER_ID");
      if (matches[0].skipped)
        throw new ScheduleEditError("MEMBER_NOT_ELIGIBLE");
    }
  }

  if (
    !taskChanges.length &&
    !additions.length &&
    !removals.length &&
    !memberChanges.length &&
    edits.assignment_mode === undefined
  ) {
    return schedule;
  }

  const taskByGroup = new Map(
    taskChanges.map(change => [change.group_id, change.tasks])
  );
  const membersByGroup = new Map(
    memberChanges.map(change => [change.group_id, change.member_ids])
  );
  const groups = schedule.groups
    .filter(group => !removalIds.has(group.id))
    .map(group => {
      const tasks = taskByGroup.get(group.id);
      const memberIds = membersByGroup.get(group.id);
      if (!tasks && memberIds === undefined) return group;
      const updated = { ...group };
      if (tasks) updated.tasks = [...tasks];
      if (memberIds === null) delete updated.memberIds;
      else if (memberIds !== undefined) updated.memberIds = [...memberIds];
      return updated;
    });
  // Generate IDs only after every requested edit has been validated.
  groups.push(
    ...additions.map(group => ({
      id: `g${nanoid()}`,
      tasks: [...group.tasks],
      emoji: group.emoji ?? "📋",
    }))
  );
  return {
    ...schedule,
    groups,
    ...(edits.assignment_mode === undefined
      ? {}
      : { assignmentMode: edits.assignment_mode }),
  };
}
