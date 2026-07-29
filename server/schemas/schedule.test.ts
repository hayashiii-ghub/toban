import { describe, it, expect } from "vitest";
import {
  createScheduleSchema,
  taskGroupSchema,
  memberSchema,
  rotationConfigObjectSchema,
} from "./schedule";

const validMember = {
  id: "m1",
  name: "田中",
  color: "#FF5733",
  bgColor: "#FFEEDD",
  textColor: "#333333",
};

const validGroup = {
  id: "g1",
  tasks: ["掃除"],
  emoji: "🧹",
};

describe("memberSchema", () => {
  it("accepts valid member", () => {
    expect(memberSchema.safeParse(validMember).success).toBe(true);
  });

  it("rejects invalid color format", () => {
    expect(
      memberSchema.safeParse({ ...validMember, color: "red" }).success
    ).toBe(false);
    expect(
      memberSchema.safeParse({ ...validMember, color: "#GGGGGG" }).success
    ).toBe(false);
  });

  it("accepts #RGB, #RRGGBB, #RRGGBBAA", () => {
    expect(
      memberSchema.safeParse({ ...validMember, color: "#F00" }).success
    ).toBe(true);
    expect(
      memberSchema.safeParse({ ...validMember, color: "#FF5733" }).success
    ).toBe(true);
    expect(
      memberSchema.safeParse({ ...validMember, color: "#FF573380" }).success
    ).toBe(true);
  });

  it("rejects empty name", () => {
    expect(memberSchema.safeParse({ ...validMember, name: "" }).success).toBe(
      false
    );
  });
});

describe("taskGroupSchema", () => {
  it("accepts valid group", () => {
    expect(taskGroupSchema.safeParse(validGroup).success).toBe(true);
  });

  it("accepts group with memberIds", () => {
    expect(
      taskGroupSchema.safeParse({ ...validGroup, memberIds: ["m1", "m2"] })
        .success
    ).toBe(true);
  });

  it("rejects empty tasks", () => {
    expect(
      taskGroupSchema.safeParse({ ...validGroup, tasks: [] }).success
    ).toBe(false);
  });
});

describe("rotationConfigObjectSchema", () => {
  it("accepts manual mode", () => {
    expect(
      rotationConfigObjectSchema.safeParse({ mode: "manual" }).success
    ).toBe(true);
  });

  it("accepts date mode with required fields", () => {
    const result = rotationConfigObjectSchema.safeParse({
      mode: "date",
      startDate: "2026-01-01",
      cycleDays: 7,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    expect(
      rotationConfigObjectSchema.safeParse({
        mode: "date",
        startDate: "2026/01/01",
      }).success
    ).toBe(false);
  });

  it("rejects invalid date value", () => {
    expect(
      rotationConfigObjectSchema.safeParse({
        mode: "date",
        startDate: "2026-02-30",
      }).success
    ).toBe(false);
  });
});

describe("createScheduleSchema", () => {
  const validPayload = {
    name: "掃除当番",
    rotation: 0,
    groups: [validGroup],
    members: [validMember],
  };

  it("accepts valid payload", () => {
    expect(createScheduleSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      createScheduleSchema.safeParse({ ...validPayload, name: "" }).success
    ).toBe(false);
  });

  it("rejects unknown memberIds in groups", () => {
    const result = createScheduleSchema.safeParse({
      ...validPayload,
      groups: [{ ...validGroup, memberIds: ["unknown-id"] }],
    });
    expect(result.success).toBe(false);
  });

  it("requires startDate in date mode", () => {
    const result = createScheduleSchema.safeParse({
      ...validPayload,
      rotationConfig: { mode: "date", cycleDays: 7 },
    });
    expect(result.success).toBe(false);
  });

  it("requires cycleDays in date mode", () => {
    const result = createScheduleSchema.safeParse({
      ...validPayload,
      rotationConfig: { mode: "date", startDate: "2026-01-01" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts date mode with all required fields", () => {
    const result = createScheduleSchema.safeParse({
      ...validPayload,
      rotationConfig: { mode: "date", startDate: "2026-01-01", cycleDays: 7 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional assignmentMode", () => {
    expect(
      createScheduleSchema.safeParse({
        ...validPayload,
        assignmentMode: "task",
      }).success
    ).toBe(true);
    expect(
      createScheduleSchema.safeParse({
        ...validPayload,
        assignmentMode: "member",
      }).success
    ).toBe(true);
  });

  it("rejects invalid assignmentMode", () => {
    expect(
      createScheduleSchema.safeParse({
        ...validPayload,
        assignmentMode: "invalid",
      }).success
    ).toBe(false);
  });
});
