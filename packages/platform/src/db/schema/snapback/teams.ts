import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { subscriptions, user } from "../postgres";

// Enums
export const teamRoleEnum = pgEnum("team_role", ["owner", "admin", "member", "billing"]);

// Teams
export const teams = pgTable(
	"teams",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),

		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		avatarUrl: text("avatar_url"),

		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		subscriptionId: text("subscription_id").references(() => subscriptions.id),

		settings: jsonb("settings").default(JSON.stringify({})),

		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		ownerIdIndex: uniqueIndex("idx_teams_owner").on(table.ownerId),
		slugIndex: uniqueIndex("idx_teams_slug").on(table.slug),
	}),
);

export const teamsRelations = relations(teams, ({ one }) => ({
	owner: one(user, {
		fields: [teams.ownerId],
		references: [user.id],
	}),
	subscription: one(subscriptions, {
		fields: [teams.subscriptionId],
		references: [subscriptions.id],
	}),
}));

// Team members
export const teamMembers = pgTable(
	"team_members",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),

		teamId: text("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		role: teamRoleEnum("role").notNull().default("member"),

		invitedBy: text("invited_by").references(() => user.id),
		invitedAt: timestamp("invited_at"),
		acceptedAt: timestamp("accepted_at"),

		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		teamIdIndex: uniqueIndex("idx_team_members_team").on(table.teamId),
		userIdIndex: uniqueIndex("idx_team_members_user").on(table.userId),
		teamUserUnique: uniqueIndex("team_members_team_id_user_id_unique").on(table.teamId, table.userId),
	}),
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id],
	}),
	user: one(user, {
		fields: [teamMembers.userId],
		references: [user.id],
	}),
	invitedByUser: one(user, {
		fields: [teamMembers.invitedBy],
		references: [user.id],
	}),
}));

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
