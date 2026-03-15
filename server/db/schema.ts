import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  editToken: text("edit_token").notNull(),
  editTokenHash: text("edit_token_hash"),
  name: text("name").notNull(),
  rotation: integer("rotation").default(0).notNull(),
  groupsJson: text("groups_json").notNull(),
  membersJson: text("members_json").notNull(),
  rotationConfigJson: text("rotation_config_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
