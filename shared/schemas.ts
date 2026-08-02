import { z } from "zod";

/** お問い合わせの種別（client の select と server の検証で共有し、drift を防ぐ） */
export const CONTACT_CATEGORIES = [
  "不具合の報告",
  "機能のご要望",
  "使い方の質問",
  "その他",
] as const;

export const contactCategorySchema = z.enum(CONTACT_CATEGORIES);

/** タスクグループスキーマ */
export const taskGroupSchema = z.object({
  id: z.string(),
  tasks: z.array(z.string()),
  emoji: z.string(),
  memberIds: z.array(z.string()).optional(),
});

/** メンバースキーマ */
export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  bgColor: z.string(),
  textColor: z.string(),
  skipped: z.boolean().optional(),
});

/** ローテーション設定スキーマ */
export const rotationConfigSchema = z.object({
  mode: z.enum(["manual", "date"]),
  startDate: z.string().optional(),
  cycleDays: z.number().optional(),
  skipSaturday: z.boolean().optional(),
  skipSunday: z.boolean().optional(),
  skipHolidays: z.boolean().optional(),
});

/** 割り当てモード */
const assignmentModeSchema = z.enum(["member", "task"]);

/** スケジュール書き込みデータ（create/update共通） */
const scheduleDataSchema = z.object({
  name: z.string(),
  rotation: z.number(),
  groups: z.array(taskGroupSchema),
  members: z.array(memberSchema),
  rotationConfig: rotationConfigSchema.optional(),
  assignmentMode: assignmentModeSchema.optional(),
  designThemeId: z.string().optional(),
});

/** スケジュールレスポンス（API応答用） */
export const scheduleResponseSchema = scheduleDataSchema.extend({
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** スケジュール作成レスポンス */
export const createScheduleResponseSchema = z.object({
  slug: z.string(),
  editToken: z.string(),
});

// Derived types
export type ScheduleData = z.infer<typeof scheduleDataSchema>;
export type ScheduleResponse = z.infer<typeof scheduleResponseSchema>;
export type CreateScheduleResponse = z.infer<
  typeof createScheduleResponseSchema
>;
