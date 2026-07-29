import { z } from "zod";
import {
  taskGroupSchema as baseTaskGroupSchema,
  memberSchema as baseMemberSchema,
  rotationConfigSchema as baseRotationConfigSchema,
} from "../../shared/schemas";
import { LIMITS } from "../../shared/limits";

// Server-side: stricter validation with length limits and patterns
// #RGB, #RRGGBB, #RRGGBBAA のみ許可（実際にクライアントが生成する形式）
const CSS_COLOR_PATTERN = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$/;

export const taskGroupSchema = baseTaskGroupSchema.extend({
  id: z.string().trim().min(1).max(100),
  tasks: z
    .array(z.string().trim().min(1).max(LIMITS.task))
    .min(1)
    .max(LIMITS.tasksPerGroup),
  emoji: z.string().trim().min(1).max(LIMITS.emoji),
  memberIds: z.array(z.string().trim().min(1).max(100)).optional(),
});

export const memberSchema = baseMemberSchema.extend({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(LIMITS.memberName),
  color: z.string().trim().min(1).max(100).regex(CSS_COLOR_PATTERN),
  bgColor: z.string().trim().min(1).max(100).regex(CSS_COLOR_PATTERN),
  textColor: z.string().trim().min(1).max(100).regex(CSS_COLOR_PATTERN),
});

export const rotationConfigObjectSchema = baseRotationConfigSchema.extend({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(s => {
      const d = new Date(s + "T00:00:00Z");
      return !isNaN(d.getTime()) && d.toISOString().startsWith(s);
    }, "Invalid date")
    .optional(),
  cycleDays: z.number().int().min(1).max(365).optional(),
});

const rotationConfigSchema = rotationConfigObjectSchema.optional();

export const createScheduleSchema = z
  .object({
    name: z.string().trim().min(1).max(LIMITS.scheduleName),
    rotation: z.number().int().default(0),
    groups: z.array(taskGroupSchema).min(1).max(LIMITS.groups),
    members: z.array(memberSchema).min(1).max(LIMITS.members),
    rotationConfig: rotationConfigSchema,
    assignmentMode: z.enum(["member", "task"]).optional(),
    designThemeId: z.string().trim().min(1).max(50).optional(),
  })
  .superRefine((data, ctx) => {
    const memberIds = new Set(data.members.map(member => member.id));

    data.groups.forEach((group, groupIndex) => {
      group.memberIds?.forEach((memberId, memberIndex) => {
        if (!memberIds.has(memberId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["groups", groupIndex, "memberIds", memberIndex],
            message: "Unknown member id",
          });
        }
      });
    });

    if (data.rotationConfig?.mode === "date") {
      if (!data.rotationConfig.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rotationConfig", "startDate"],
          message: "startDate is required in date mode",
        });
      }
      if (!data.rotationConfig.cycleDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rotationConfig", "cycleDays"],
          message: "cycleDays is required in date mode",
        });
      }
    }
  });

export const updateScheduleSchema = createScheduleSchema;
