import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * User Safety Profiles - Track user safety metrics and preferences
 */
export const userSafetyProfiles = pgTable("user_safety_profiles", {
	id: uuid("id").primaryKey().defaultRandom(),

	// Ownership
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),

	// Safety metrics
	totalAnalyses: integer("total_analyses").notNull().default(0),
	totalViolations: integer("total_violations").notNull().default(0),
	totalBlocked: integer("total_blocked").notNull().default(0),
	totalBypassed: integer("total_bypassed").notNull().default(0),

	// Risk scores
	averageRiskScore: integer("average_risk_score"), // 0-100
	highestRiskScore: integer("highest_risk_score"), // 0-100

	// Violation categories
	securityViolations: integer("security_violations").notNull().default(0),
	privacyViolations: integer("privacy_violations").notNull().default(0),
	complianceViolations: integer("compliance_violations").notNull().default(0),

	// Preferences
	autoBlockHighRisk: boolean("auto_block_high_risk").notNull().default(true),
	notifyOnViolation: boolean("notify_on_violation").notNull().default(true),
	notifyOnBypass: boolean("notify_on_bypass").notNull().default(true),

	// Learning
	suppressionPatternsLearned: integer("suppression_patterns_learned").notNull().default(0),
	bypassPatternsLearned: integer("bypass_patterns_learned").notNull().default(0),

	// Metadata
	metadata: jsonb("metadata").$type<Record<string, any>>().default({}),

	// Timestamps
	lastAnalysisAt: timestamp("last_analysis_at"),
	profileResetAt: timestamp("profile_reset_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const userSafetyProfilesRelations = relations(userSafetyProfiles, ({ one }) => ({
	user: one(user, {
		fields: [userSafetyProfiles.userId],
		references: [user.id],
	}),
}));

// Type exports
export type UserSafetyProfile = typeof userSafetyProfiles.$inferSelect;
export type NewUserSafetyProfile = typeof userSafetyProfiles.$inferInsert;
