import { describe, expect, it } from "vitest";
import { LIMITS } from "@shared/limits";
import { MEMBER_PRESETS } from "./constants";
import {
  createScheduleFromDefinition,
  rotationDefinitionSchema,
  rotationInputSchema,
  scheduleDefinitionSchema,
  type ScheduleDefinition,
} from "./scheduleDefinition";
import { computeAssignments, computeDateRotationForDate } from "./utils";

const officeDefinition = {
  name: "オフィス掃除当番",
  members: ["葵", "蓮", "美咲", "悠"],
  task_groups: [
    { tasks: ["床掃除"] },
    { tasks: ["ゴミ出し"] },
    { tasks: ["机拭き"] },
    { tasks: ["植物の水やり"], emoji: "🌱" },
  ],
  rotation: {
    mode: "date" as const,
    start_date: "2026-09-01",
    cycle_days: 1,
    skip_saturday: true,
    skip_sunday: true,
    skip_holidays: true,
  },
};

describe("createScheduleFromDefinition", () => {
  it("creates the complete requested roster without template leftovers", () => {
    const schedule = createScheduleFromDefinition(officeDefinition, "ja");

    expect(schedule.name).toBe("オフィス掃除当番");
    expect(schedule.assignmentMode).toBe("task");
    expect(schedule.members.map(member => member.name)).toEqual(
      officeDefinition.members
    );
    expect(schedule.groups.map(group => group.tasks)).toEqual(
      officeDefinition.task_groups.map(group => group.tasks)
    );
    expect(schedule.groups[0].emoji).toBe("📋");
    expect(schedule.groups[3].emoji).toBe("🌱");
    expect(schedule.rotationConfig).toEqual({
      mode: "date",
      startDate: "2026-09-01",
      cycleDays: 1,
      skipSaturday: true,
      skipSunday: true,
      skipHolidays: true,
    });
    expect(schedule).not.toHaveProperty("slug");
    expect(schedule).not.toHaveProperty("editToken");
    expect(schedule.members.every(member => !member.skipped)).toBe(true);
    expect(schedule.groups.every(group => group.memberIds === undefined)).toBe(
      true
    );

    // The definition uses the same rotation and assignment semantics as the UI.
    const rotation = computeDateRotationForDate(
      schedule.rotationConfig!,
      schedule.members.length,
      new Date(2026, 8, 5)
    );
    expect(rotation).toBe(3); // Saturday retains Friday's assignments.
    expect(
      computeAssignments(
        schedule.groups,
        schedule.members,
        rotation,
        schedule.assignmentMode
      ).map(({ member }) => member.name)
    ).toEqual(["悠", "葵", "蓮", "美咲"]);
  });

  it("uses localized defaults without translating supplied member or task text", () => {
    const definition = scheduleDefinitionSchema.parse({
      members: [" 葵 ", "Sam"],
      task_groups: [{ tasks: [" 床掃除 ", "water plants"] }],
    });
    const japanese = createScheduleFromDefinition(definition, "ja");
    const english = createScheduleFromDefinition(definition, "en");

    expect(japanese.name).toBe("新しい当番表");
    expect(english.name).toBe("New schedule");
    expect(english.members.map(member => member.name)).toEqual(["葵", "Sam"]);
    expect(english.groups[0].tasks).toEqual(["床掃除", "water plants"]);
    expect(english.rotationConfig).toEqual({
      mode: "manual",
      skipSaturday: false,
      skipSunday: false,
      skipHolidays: false,
    });
  });

  it("keeps unequal counts and grouped tasks intact under existing cyclic assignment", () => {
    const definition = scheduleDefinitionSchema.parse({
      members: ["A", "B"],
      task_groups: [
        { tasks: ["wash", "dry"] },
        { tasks: ["trash"] },
        { tasks: ["plants"] },
      ],
    });
    const schedule = createScheduleFromDefinition(definition, "en");
    expect(schedule.members).toHaveLength(2);
    expect(schedule.groups).toHaveLength(3);
    expect(
      computeAssignments(schedule.groups, schedule.members, 0).map(
        ({ member, group }) => ({ name: member.name, tasks: group.tasks })
      )
    ).toEqual([
      { name: "A", tasks: ["wash", "dry"] },
      { name: "B", tasks: ["trash"] },
      { name: "A", tasks: ["plants"] },
    ]);
  });

  it("creates independent IDs and arrays, including for repeated names", () => {
    const definition = scheduleDefinitionSchema.parse({
      members: Array.from({ length: LIMITS.members }, () => "Alex"),
      task_groups: [{ tasks: ["Wash"] }],
    });
    const original = structuredClone(definition);
    const first = createScheduleFromDefinition(definition, "en");
    const second = createScheduleFromDefinition(definition, "en");
    const ids = [first, second].flatMap(schedule => [
      schedule.id,
      ...schedule.members.map(member => member.id),
      ...schedule.groups.map(group => group.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(first.members[MEMBER_PRESETS.length]).toMatchObject(
      MEMBER_PRESETS[0]
    );
    first.groups[0].tasks.push("Dry");
    first.members[0].name = "Changed";
    expect(second.groups[0].tasks).toEqual(["Wash"]);
    expect(second.members[0].name).toBe("Alex");
    expect(definition).toEqual(original);
  });

  it("rejects a bypassed invalid definition without changing its input", () => {
    const invalid = {
      ...officeDefinition,
      task_groups: [{ tasks: ["掃除"] }, { tasks: [" "] }],
    };
    const original = structuredClone(invalid);
    expect(() =>
      createScheduleFromDefinition(invalid as ScheduleDefinition, "ja")
    ).toThrow();
    expect(invalid).toEqual(original);
  });
});

describe("scheduleDefinitionSchema", () => {
  it.each([
    ["empty members", { members: [] }],
    ["blank member", { members: [" \n "] }],
    ["member object", { members: [{ name: "A" }] }],
    ["empty groups", { task_groups: [] }],
    ["empty tasks", { task_groups: [{ tasks: [] }] }],
    ["blank task", { task_groups: [{ tasks: ["\t"] }] }],
    ["blank name", { name: " " }],
    ["blank emoji", { task_groups: [{ tasks: ["A"], emoji: " " }] }],
    ["unknown root key", { absent_today: ["A"] }],
    [
      "unsupported member pool",
      { task_groups: [{ tasks: ["A"], member_ids: ["A"] }] },
    ],
    ["unknown rotation key", { rotation: { weekday: "Monday" } }],
    ["non-boolean skip", { rotation: { skip_saturday: "true" } }],
    [
      "invalid date",
      { rotation: { ...officeDefinition.rotation, start_date: "2026-02-30" } },
    ],
  ])("rejects %s instead of dropping it", (_label, change) => {
    expect(
      scheduleDefinitionSchema.safeParse({ ...officeDefinition, ...change })
        .success
    ).toBe(false);
  });

  it("enforces every shared size limit and accepts their boundaries", () => {
    const boundary = {
      name: "n".repeat(LIMITS.scheduleName),
      members: Array.from({ length: LIMITS.members }, () =>
        "m".repeat(LIMITS.memberName)
      ),
      task_groups: Array.from({ length: LIMITS.groups }, () => ({
        tasks: Array.from({ length: LIMITS.tasksPerGroup }, () =>
          "t".repeat(LIMITS.task)
        ),
        emoji: "e".repeat(LIMITS.emoji),
      })),
    };
    expect(scheduleDefinitionSchema.safeParse(boundary).success).toBe(true);
    const overflows = [
      { ...boundary, name: boundary.name + "x" },
      { ...boundary, members: [...boundary.members, "Extra"] },
      { ...boundary, members: [boundary.members[0] + "x"] },
      {
        ...boundary,
        task_groups: [...boundary.task_groups, boundary.task_groups[0]],
      },
      {
        ...boundary,
        task_groups: [{ tasks: [...boundary.task_groups[0].tasks, "Extra"] }],
      },
      {
        ...boundary,
        task_groups: [{ tasks: [boundary.task_groups[0].tasks[0] + "x"] }],
      },
      {
        ...boundary,
        task_groups: [
          { tasks: ["A"], emoji: boundary.task_groups[0].emoji + "x" },
        ],
      },
    ];
    for (const overflow of overflows) {
      expect(scheduleDefinitionSchema.safeParse(overflow).success).toBe(false);
    }
  });
});

describe("rotation input validation", () => {
  it("supports strict partial updates, then requires a complete date configuration", () => {
    expect(rotationInputSchema.parse({ skip_saturday: false })).toEqual({
      skip_saturday: false,
    });
    expect(rotationInputSchema.safeParse({ mode: "date" }).success).toBe(true);
    const incomplete = rotationDefinitionSchema.safeParse({ mode: "date" });
    expect(incomplete.success).toBe(false);
    if (!incomplete.success) {
      expect(incomplete.error.issues.map(issue => issue.path)).toEqual([
        ["start_date"],
        ["cycle_days"],
      ]);
    }
    expect(rotationDefinitionSchema.parse({})).toEqual({ mode: "manual" });
  });

  it.each([0, -1, 1.5, "1", Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid cycle_days: %s",
    cycle_days => {
      expect(rotationInputSchema.safeParse({ cycle_days }).success).toBe(false);
    }
  );

  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-2-01",
    "2026-09-01T00:00:00Z",
    "1979-12-31",
    "2100-01-01",
    "9999-12-31",
  ])("rejects invalid or unsupported start_date: %s", start_date => {
    expect(rotationInputSchema.safeParse({ start_date }).success).toBe(false);
  });

  it.each(["1980-01-01", "2024-02-29", "2099-12-31"])(
    "accepts supported real dates: %s",
    start_date => {
      expect(
        rotationDefinitionSchema.safeParse({
          mode: "date",
          start_date,
          cycle_days: 1,
        }).success
      ).toBe(true);
    }
  );
});
