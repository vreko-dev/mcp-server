import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const retentionConfig = pgTable("retention_config", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	tableName: text("table_name").notNull(),
	retentionDays: integer("retention_days").notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	lastRunAt: timestamp("last_run_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RetentionConfig = typeof retentionConfig.$inferSelect;
export type NewRetentionConfig = typeof retentionConfig.$inferInsert;
