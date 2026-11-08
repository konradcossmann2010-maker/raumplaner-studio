import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    data: text("data").notNull(),
    revision: integer("revision").notNull().default(1),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("projects_owner").on(t.owner)],
);
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
});
export const searchCache = sqliteTable("search_cache", {
  key: text("key").primaryKey(),
  data: text("data").notNull(),
  expires: integer("expires").notNull(),
});
export const searchLocks = sqliteTable("search_locks", {
  owner: text("owner").primaryKey(),
  expires: integer("expires").notNull(),
});
