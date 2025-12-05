import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../postgres";

// User profiles table - extends Better Auth user table
export const userProfiles = pgTable("user_profiles", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),

	// Profile info
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	company: text("company"),
	role: text("role"), // "developer", "team_lead", "enterprise_admin"

	// Onboarding
	onboardingCompleted: boolean("onboarding_completed").default(false),
	onboardingStep: integer("onboarding_step").default(0),
	primaryLanguage: text("primary_language"), // "typescript", "python", etc.
	useCases: text("use_cases").array(), // Array of use cases

	// Referral tracking
	referralCode: text("referral_code").unique(),
	referredBy: text("referred_by").references(() => user.id),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	user: one(user, {
		fields: [userProfiles.userId],
		references: [user.id],
	}),
}));
