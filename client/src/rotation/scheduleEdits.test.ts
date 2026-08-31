import { describe, expect, it } from "vitest";
import { LIMITS } from "@shared/limits";
import type { Schedule } from "./types";
import { computeAssignments } from "./utils";
import {
  applyScheduleEdits,
  ScheduleEditError,
  scheduleEditsSchema,
  type ScheduleEditReason,
} from "./scheduleEdits";

const makeSchedule = (patch: Partial<Schedule> = {}): Schedule => ({
  id: "s1",
  name: "Office cleaning",
  assignmentMode: "task",
  rotation: 2,
  pinned: true,
  designThemeId: "sarasara/whiteboard",
  slug: "existing-public-link",
  editToken: "test-only-token",
  rotationConfig: { mode: "date", startDate: "2026-09-01", cycleDays: 1 },
  groups: [
    { id: "g1", tasks: ["Sweep"], emoji: "🧹", memberIds: ["m1", "m2"] },
    { id: "g2", tasks: ["Bins"], emoji: "🗑️" },
  ],
  members: [
    {
      id: "m1",
      name: "Alex",
      color: "#333333",
      bgColor: "#eeeeee",
      textColor: "#111111",
    },
    {
      id: "m2",
      name: "Sam",
      color: "#444444",
      bgColor: "#eeeeee",
      textColor: "#111111",
    },
  ],
  ...patch,
});

function expectRejected(
  schedule: Schedule,
  edits: unknown,
  reason: ScheduleEditReason
) {
  const before = structuredClone(schedule);
  let error: unknown;
  try {
    applyScheduleEdits(schedule, edits);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ScheduleEditError);
  expect(error).toMatchObject({ reason });
  expect(schedule).toEqual(before);
}

describe("applyScheduleEdits", () => {
  it("replaces existing task text without changing stable IDs, people, configuration or publication", () => {
    const schedule = makeSchedule();
    const before = structuredClone(schedule);
    const updated = applyScheduleEdits(schedule, {
      task_changes: [
        { group_id: "g1", tasks: ["  Mop  ", "Restock supplies"] },
      ],
    });
    expect(updated).toEqual({
      ...before,
      groups: [
        { ...before.groups[0], tasks: ["Mop", "Restock supplies"] },
        before.groups[1],
      ],
    });
    expect(schedule).toEqual(before);
  });

  it("adds and removes independent duties together without changing members or other roster fields", () => {
    const schedule = makeSchedule();
    const before = structuredClone(schedule);
    const updated = applyScheduleEdits(schedule, {
      task_changes: [{ group_id: "g1", tasks: ["Mop"] }],
      remove_group_ids: ["g2"],
      add_task_groups: [
        { tasks: ["Supplies"], emoji: "📦" },
        { tasks: ["Water plants"] },
      ],
    });
    expect(updated.groups).toHaveLength(3);
    expect(updated.groups[0]).toEqual({ ...before.groups[0], tasks: ["Mop"] });
    expect(updated.groups[1]).toMatchObject({
      tasks: ["Supplies"],
      emoji: "📦",
    });
    expect(updated.groups[2]).toMatchObject({
      tasks: ["Water plants"],
      emoji: "📋",
    });
    expect(updated.groups[1]).not.toHaveProperty("memberIds");
    expect(new Set(updated.groups.map(group => group.id)).size).toBe(3);
    expect(
      updated.groups
        .slice(1)
        .every(group => !before.groups.some(old => old.id === group.id))
    ).toBe(true);
    expect({ ...updated, groups: [] }).toEqual({ ...before, groups: [] });
    expect(schedule).toEqual(before);
  });

  it("accepts replacement at the group limit because only the final roster is committed", () => {
    const schedule = makeSchedule({
      groups: Array.from({ length: LIMITS.groups }, (_, index) => ({
        id: `g${index}`,
        tasks: ["Task"],
        emoji: "📋",
      })),
    });
    const updated = applyScheduleEdits(schedule, {
      remove_group_ids: ["g0"],
      add_task_groups: [{ tasks: ["New duty"] }],
    });
    expect(updated.groups).toHaveLength(LIMITS.groups);
    expect(updated.groups.some(group => group.id === "g0")).toBe(false);
    expect(updated.groups.at(-1)?.tasks).toEqual(["New duty"]);
  });

  it("rejects the last group deletion without applying a simultaneous valid update", () => {
    expectRejected(
      makeSchedule(),
      {
        assignment_mode: "member",
        remove_group_ids: ["g1", "g2"],
      },
      "TASK_MODE_REQUIRED"
    );
    expectRejected(
      makeSchedule(),
      { remove_group_ids: ["g1", "g2"] },
      "LAST_GROUP"
    );
  });

  it("rejects a final roster above the group limit", () => {
    const schedule = makeSchedule({
      groups: Array.from({ length: LIMITS.groups }, (_, index) => ({
        id: `g${index}`,
        tasks: ["Task"],
        emoji: "📋",
      })),
    });
    expectRejected(
      schedule,
      { add_task_groups: [{ tasks: ["One too many"] }] },
      "GROUP_LIMIT_EXCEEDED"
    );
  });

  it.each([
    { task_changes: [{ group_id: "missing", tasks: ["Changed"] }] },
    { remove_group_ids: ["missing"] },
    { group_member_changes: [{ group_id: "missing", member_ids: ["m1"] }] },
  ])("rejects unknown group IDs atomically: %j", edits => {
    expectRejected(makeSchedule(), edits, "GROUP_NOT_FOUND");
  });

  it.each([
    {
      task_changes: [
        { group_id: "g1", tasks: ["One"] },
        { group_id: "g1", tasks: ["Two"] },
      ],
    },
    { remove_group_ids: ["g1", "g1"] },
    {
      group_member_changes: [
        { group_id: "g1", member_ids: ["m1"] },
        { group_id: "g1", member_ids: null },
      ],
    },
  ])("rejects duplicate IDs within an operation: %j", edits => {
    expectRejected(makeSchedule(), edits, "DUPLICATE_GROUP_ID");
  });

  it.each([
    {
      remove_group_ids: ["g1"],
      task_changes: [{ group_id: "g1", tasks: ["Changed"] }],
    },
    {
      remove_group_ids: ["g1"],
      group_member_changes: [{ group_id: "g1", member_ids: ["m1"] }],
    },
  ])("rejects updates to a group being removed: %j", edits => {
    expectRejected(makeSchedule(), edits, "CONFLICTING_GROUP_EDITS");
  });

  it("changes ordered eligible candidates and task text together, using the real assignment calculation", () => {
    const schedule = makeSchedule();
    const before = structuredClone(schedule);
    const updated = applyScheduleEdits(schedule, {
      task_changes: [{ group_id: "g1", tasks: ["Reception"] }],
      group_member_changes: [{ group_id: "g1", member_ids: ["m2", "m1"] }],
    });
    expect(updated.groups[0]).toEqual({
      ...before.groups[0],
      tasks: ["Reception"],
      memberIds: ["m2", "m1"],
    });
    expect(
      computeAssignments(updated.groups, updated.members, 0, "task")[0].member
        .id
    ).toBe("m2");
    expect(
      computeAssignments(updated.groups, updated.members, 1, "task")[0].member
        .id
    ).toBe("m1");
    expect(schedule).toEqual(before);
  });

  it("rejects ambiguous group IDs in legacy data instead of deleting several duties", () => {
    const schedule = makeSchedule();
    schedule.groups[1].id = "g1";
    expectRejected(
      schedule,
      { remove_group_ids: ["g1"] },
      "DUPLICATE_GROUP_ID"
    );
  });

  it("rejects ambiguous member IDs in legacy data instead of selecting an arbitrary candidate", () => {
    const schedule = makeSchedule();
    schedule.members[1].id = "m1";
    expectRejected(
      schedule,
      {
        group_member_changes: [{ group_id: "g1", member_ids: ["m1"] }],
      },
      "DUPLICATE_MEMBER_ID"
    );
  });

  it("uses null to restore all current and future members rather than storing an empty pool", () => {
    const schedule = makeSchedule();
    const updated = applyScheduleEdits(schedule, {
      group_member_changes: [{ group_id: "g1", member_ids: null }],
    });
    expect(updated.groups[0]).not.toHaveProperty("memberIds");
    expect(updated.groups[0].tasks).toEqual(schedule.groups[0].tasks);
    expect(schedule.groups[0].memberIds).toEqual(["m1", "m2"]);
  });

  it("rejects duplicate candidate IDs instead of weighting the rotation", () => {
    expectRejected(
      makeSchedule(),
      { group_member_changes: [{ group_id: "g1", member_ids: ["m1", "m1"] }] },
      "DUPLICATE_MEMBER_ID"
    );
  });

  it("rejects candidates from another roster and does not apply accompanying task changes", () => {
    expectRejected(
      makeSchedule(),
      {
        task_changes: [{ group_id: "g2", tasks: ["Should not apply"] }],
        group_member_changes: [{ group_id: "g1", member_ids: ["missing"] }],
      },
      "MEMBER_NOT_FOUND"
    );
  });

  it("rejects skipped candidates so an inactive pool cannot silently become everyone", () => {
    const schedule = makeSchedule();
    schedule.members[1].skipped = true;
    expectRejected(
      schedule,
      { group_member_changes: [{ group_id: "g1", member_ids: ["m2"] }] },
      "MEMBER_NOT_ELIGIBLE"
    );
  });

  it.each(["member", undefined] as const)(
    "does not add or delete people implicitly in %s mode",
    assignmentMode => {
      const schedule = makeSchedule({ assignmentMode });
      expectRejected(
        schedule,
        { add_task_groups: [{ tasks: ["New duty"] }] },
        "TASK_MODE_REQUIRED"
      );
      expectRejected(
        schedule,
        { remove_group_ids: ["g1"] },
        "TASK_MODE_REQUIRED"
      );
    }
  );

  it("allows an explicit switch to task mode together with duty changes, preserving every person", () => {
    const schedule = makeSchedule({ assignmentMode: "member" });
    const updated = applyScheduleEdits(schedule, {
      assignment_mode: "task",
      remove_group_ids: ["g2"],
    });
    expect(updated.assignmentMode).toBe("task");
    expect(updated.groups).toEqual([schedule.groups[0]]);
    expect(updated.members).toEqual(schedule.members);
  });

  it("rejects explicit member mode unless people and groups already match, without inserting placeholders", () => {
    const schedule = makeSchedule();
    schedule.groups.pop();
    expectRejected(
      schedule,
      { assignment_mode: "member" },
      "MEMBER_MODE_COUNT_MISMATCH"
    );
    expect(
      applyScheduleEdits(makeSchedule(), { assignment_mode: "member" })
        .assignmentMode
    ).toBe("member");
  });

  it("preserves legacy unequal member-mode rosters when only editing task text", () => {
    const schedule = makeSchedule({ assignmentMode: "member" });
    schedule.groups.pop();
    const updated = applyScheduleEdits(schedule, {
      task_changes: [{ group_id: "g1", tasks: ["Edited"] }],
    });
    expect(updated.members).toEqual(schedule.members);
    expect(updated.groups).toHaveLength(1);
    expect(updated.groups[0].tasks).toEqual(["Edited"]);
  });
});

describe("scheduleEditsSchema", () => {
  it.each([
    { unknown: true },
    { add_task_groups: [] },
    { add_task_groups: [{ tasks: [] }] },
    { add_task_groups: [{ tasks: [" "] }] },
    { add_task_groups: [{ tasks: ["x".repeat(LIMITS.task + 1)] }] },
    { add_task_groups: [{ tasks: ["Task"], emoji: "" }] },
    {
      add_task_groups: [
        { tasks: ["Task"], emoji: "x".repeat(LIMITS.emoji + 1) },
      ],
    },
    { add_task_groups: [{ tasks: ["Task"], member_ids: ["m1"] }] },
    {
      add_task_groups: Array.from({ length: LIMITS.groups + 1 }, () => ({
        tasks: ["Task"],
      })),
    },
    {
      add_task_groups: [
        {
          tasks: Array.from({ length: LIMITS.tasksPerGroup + 1 }, () => "Task"),
        },
      ],
    },
    { remove_group_ids: [] },
    { remove_group_ids: [""] },
    {
      remove_group_ids: Array.from(
        { length: LIMITS.groups + 1 },
        (_, index) => `g${index}`
      ),
    },
    { group_member_changes: [] },
    { group_member_changes: [{ group_id: "g1", member_ids: [] }] },
    { group_member_changes: [{ group_id: "g1", member_ids: [""] }] },
    {
      group_member_changes: [
        {
          group_id: "g1",
          member_ids: Array.from(
            { length: LIMITS.members + 1 },
            (_, index) => `m${index}`
          ),
        },
      ],
    },
  ])(
    "rejects invalid input at both public schema and helper boundary: %j",
    edits => {
      expect(scheduleEditsSchema.safeParse(edits).success).toBe(false);
      expectRejected(makeSchedule(), edits, "INVALID_EDIT_SHAPE");
    }
  );

  it("preserves an empty patch for callers that only update name or pin status", () => {
    const schedule = makeSchedule();
    expect(applyScheduleEdits(schedule, {})).toEqual(schedule);
  });
});
