import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * インデックス分析:
 * - slug: UNIQUE 制約により暗黙的にインデックスが作成される。全クエリは slug 経由のため十分。
 * - is_public: 現在のクエリパターンでは slug との組み合わせで使用されるため追加インデックス不要。
 * - edit_token_hash: slug 経由で行を特定後に照合するため、単独インデックスは不要。
 * ※ 将来「公開スケジュール一覧」機能を追加する場合は is_public のインデックスを検討。
 */
export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  editToken: text("edit_token").notNull(),
  editTokenHash: text("edit_token_hash"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
  name: text("name").notNull(),
  rotation: integer("rotation").default(0).notNull(),
  groupsJson: text("groups_json").notNull(),
  membersJson: text("members_json").notNull(),
  rotationConfigJson: text("rotation_config_json"),
  assignmentMode: text("assignment_mode"),
  designThemeId: text("design_theme_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
