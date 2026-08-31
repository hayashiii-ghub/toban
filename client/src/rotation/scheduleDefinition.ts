import { nanoid } from "nanoid";
import { z } from "zod";
import { LIMITS } from "@shared/limits";
import { MEMBER_PRESETS } from "./constants";
import { parseIsoDateLocal } from "./dateUtils";
import type { RotationConfig, Schedule } from "./types";

// The existing Japanese equinox formulas cover 1980–2099. Restrict new tool
// input to that range, which also bounds countSkipDays' per-year work. This
// does not add historical holiday rules absent from the existing calculator.
export const ROTATION_DATE_MIN = "1980-01-01";
export const ROTATION_DATE_MAX = "2099-12-31";

const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);

const startDateSchema = z.string().superRefine((value, context) => {
  if (!parseIsoDateLocal(value)) {
    context.addIssue({
      code: "custom",
      message: "Use a real calendar date in YYYY-MM-DD format.",
    });
  } else if (value < ROTATION_DATE_MIN || value > ROTATION_DATE_MAX) {
    context.addIssue({
      code: "custom",
      message: `Start date must be between ${ROTATION_DATE_MIN} and ${ROTATION_DATE_MAX}.`,
    });
  }
});

/** Strict partial fields for configure_rotation; validate the merged result too. */
export const rotationInputSchema = z.strictObject({
  mode: z.enum(["manual", "date"]).optional(),
  start_date: startDateSchema.optional(),
  cycle_days: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
  skip_saturday: z.boolean().optional(),
  skip_sunday: z.boolean().optional(),
  skip_holidays: z.boolean().optional(),
});

/** A complete configuration, including the disclosed manual default. */
export const rotationDefinitionSchema = rotationInputSchema
  .extend({ mode: z.enum(["manual", "date"]).default("manual") })
  .superRefine((rotation, context) => {
    if (rotation.mode !== "date") return;
    if (rotation.start_date === undefined) {
      context.addIssue({
        code: "custom",
        path: ["start_date"],
        message: "Date rotation requires start_date.",
      });
    }
    if (rotation.cycle_days === undefined) {
      context.addIssue({
        code: "custom",
        path: ["cycle_days"],
        message: "Date rotation requires cycle_days.",
      });
    }
  });

export const scheduleDefinitionSchema = z.strictObject({
  name: boundedText(LIMITS.scheduleName).optional(),
  members: z.array(boundedText(LIMITS.memberName)).min(1).max(LIMITS.members),
  task_groups: z
    .array(
      z.strictObject({
        tasks: z
          .array(boundedText(LIMITS.task))
          .min(1)
          .max(LIMITS.tasksPerGroup),
        emoji: boundedText(LIMITS.emoji).optional(),
      })
    )
    .min(1)
    .max(LIMITS.groups),
  rotation: rotationDefinitionSchema.default({ mode: "manual" }),
});

export type RotationInput = z.output<typeof rotationInputSchema>;
export type RotationDefinition = z.output<typeof rotationDefinitionSchema>;
export type ScheduleDefinitionInput = z.input<typeof scheduleDefinitionSchema>;
export type ScheduleDefinition = z.output<typeof scheduleDefinitionSchema>;

export function toRotationConfig(rotation: RotationDefinition): RotationConfig {
  return {
    mode: rotation.mode,
    ...(rotation.start_date === undefined
      ? {}
      : { startDate: rotation.start_date }),
    ...(rotation.cycle_days === undefined
      ? {}
      : { cycleDays: rotation.cycle_days }),
    skipSaturday: rotation.skip_saturday ?? false,
    skipSunday: rotation.skip_sunday ?? false,
    skipHolidays: rotation.skip_holidays ?? false,
  };
}

/** Construct the whole schedule before a caller performs its one state update. */
export function createScheduleFromDefinition(
  definition: ScheduleDefinition,
  locale: "ja" | "en"
): Schedule {
  // Keep this exported boundary safe for callers that bypass TypeScript. No ID
  // or schedule is created until the entire definition has passed validation.
  const validated = scheduleDefinitionSchema.parse(definition);

  return {
    id: `s${nanoid()}`,
    name: validated.name ?? (locale === "ja" ? "新しい当番表" : "New schedule"),
    rotation: 0,
    assignmentMode: "task",
    members: validated.members.map((name, index) => ({
      id: `m${nanoid()}`,
      name,
      ...MEMBER_PRESETS[index % MEMBER_PRESETS.length],
    })),
    groups: validated.task_groups.map(group => ({
      id: `g${nanoid()}`,
      tasks: [...group.tasks],
      emoji: group.emoji ?? "📋",
    })),
    rotationConfig: toRotationConfig(validated.rotation),
  };
}
