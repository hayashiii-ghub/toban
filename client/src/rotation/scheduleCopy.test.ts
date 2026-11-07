import { describe, expect, it } from "vitest";
import { LIMITS } from "@shared/limits";
import { copySchedule } from "./scheduleCopy";
import { DEFAULT_APP_STATE } from "./defaultState";
import { createScheduleSchema } from "../../../server/schemas/schedule";

describe("private schedule copies", () => {
  it("copies all editable settings independently and resets identity and position", () => {
    const source = {
      ...structuredClone(DEFAULT_APP_STATE.schedules[0]),
      rotation: 3,
      slug: "published-roster",
      editToken: "synthetic-token",
      pinned: true,
      rotationConfig: { mode: "date" as const, cycleDays: 3 },
    };
    const copy = copySchedule(source, "Copy");
    expect(copy).toEqual({
      id: expect.any(String),
      name: "Copy",
      rotation: 0,
      groups: source.groups,
      members: source.members,
      rotationConfig: source.rotationConfig,
      assignmentMode: source.assignmentMode,
      designThemeId: source.designThemeId,
      fontId: source.fontId,
    });
    expect(copy.id).not.toBe(source.id);
    copy.members[0].name = "Changed";
    copy.groups[0].tasks[0] = "Changed";
    copy.rotationConfig!.cycleDays = 5;
    expect(source.members[0].name).toBe("佐藤");
    expect(source.groups[0].tasks[0]).toBe("床そうじ");
    expect(source.rotationConfig.cycleDays).toBe(3);
  });

  it.each(["（コピー）", " (copy)", " のコピー"])(
    "keeps names valid for cloud backup when appending %s at the input limit",
    suffix => {
      const source = {
        ...DEFAULT_APP_STATE.schedules[0],
        name: "名".repeat(LIMITS.scheduleName),
      };
      expect(createScheduleSchema.safeParse(source).success).toBe(true);
      const copy = copySchedule(source, `${source.name}${suffix}`);
      expect(copy.name).toHaveLength(LIMITS.scheduleName);
      expect(createScheduleSchema.safeParse(copy).success).toBe(true);
    }
  );
});
