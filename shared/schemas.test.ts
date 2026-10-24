import { describe, expect, it } from "vitest";
import { LIMITS } from "./limits";
import {
  scheduleResponseSchema,
  taskGroupSchema,
  type ScheduleResponse,
} from "./schemas";

const member = (id: string) => ({
  id,
  name: id,
  color: "#111111",
  bgColor: "#222222",
  textColor: "#333333",
});

const group = (
  id: string,
  tasks: string[] = ["掃除"],
  memberIds?: string[]
) => ({
  id,
  tasks,
  emoji: "🧹",
  ...(memberIds === undefined ? {} : { memberIds }),
});

const response = (
  groups: ReturnType<typeof group>[],
  members: ReturnType<typeof member>[]
): ScheduleResponse => ({
  name: "当番",
  rotation: 0,
  groups,
  members,
  slug: "abcdefghij",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

function expectWithinLimit(atLimit: unknown, overLimit: unknown) {
  expect(scheduleResponseSchema.safeParse(atLimit).success).toBe(true);
  const over = scheduleResponseSchema.safeParse(overLimit);
  expect(over.success).toBe(false);
  if (over.success) return;
  expect(over.error.issues.some(issue => issue.code === "too_big")).toBe(true);
}

describe("共有スケジュールの配列上限", () => {
  it("tasks は1グループの上限ちょうどを受け、1件超を拒む", () => {
    const tasks = Array.from(
      { length: LIMITS.tasksPerGroup },
      (_, index) => `仕事${index}`
    );
    expect(taskGroupSchema.safeParse(group("g1", tasks)).success).toBe(true);
    const over = taskGroupSchema.safeParse(group("g1", [...tasks, "余分"]));
    expect(over.success).toBe(false);
    if (over.success) return;
    expect(over.error.issues.some(issue => issue.code === "too_big")).toBe(
      true
    );
  });

  it("memberIds はメンバー上限ちょうどを受け、1件超を拒む", () => {
    const memberIds = Array.from(
      { length: LIMITS.members },
      (_, index) => `m${index}`
    );
    expect(
      taskGroupSchema.safeParse(group("g1", ["掃除"], memberIds)).success
    ).toBe(true);
    const over = taskGroupSchema.safeParse(
      group("g1", ["掃除"], [...memberIds, "extra"])
    );
    expect(over.success).toBe(false);
    if (over.success) return;
    expect(over.error.issues.some(issue => issue.code === "too_big")).toBe(
      true
    );
  });

  it("groups は上限ちょうどを受け、1件超を拒む", () => {
    const groups = Array.from({ length: LIMITS.groups }, (_, index) =>
      group(`g${index}`)
    );
    expectWithinLimit(
      response(groups, [member("m1")]),
      response([...groups, group("extra")], [member("m1")])
    );
  });

  it("members は上限ちょうどを受け、1件超を拒む", () => {
    const members = Array.from({ length: LIMITS.members }, (_, index) =>
      member(`m${index}`)
    );
    expectWithinLimit(
      response([group("g1")], members),
      response([group("g1")], [...members, member("extra")])
    );
  });
});
