import { z } from "zod";
import { FONT_IDS } from "./appearance";
import { LIMITS } from "./limits";

/** お問い合わせの種別（client の select と server の検証で共有し、drift を防ぐ） */
export const CONTACT_CATEGORIES = [
  "不具合の報告",
  "機能のご要望",
  "使い方の質問",
  "その他",
] as const;

export const contactCategorySchema = z.enum(CONTACT_CATEGORIES);

/**
 * タスクグループ。
 * 配列の件数は LIMITS に合わせる。上限がないと、大きな配列の検証でメモリを使い切る。
 */
export const taskGroupSchema = z.object({
  id: z.string(),
  tasks: z.array(z.string()).max(LIMITS.tasksPerGroup),
  emoji: z.string(),
  memberIds: z.array(z.string()).max(LIMITS.members).optional(),
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
  // 件数は server の LIMITS と揃える（上限なし配列は検証時にメモリを使う）
  groups: z.array(taskGroupSchema).max(LIMITS.groups),
  members: z.array(memberSchema).max(LIMITS.members),
  rotationConfig: rotationConfigSchema.optional(),
  assignmentMode: assignmentModeSchema.optional(),
  designThemeId: z.string().optional(),
  fontId: z.enum(FONT_IDS).optional(),
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
