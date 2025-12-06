import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "../postgres";

export const member = pgTable(
	"organization_member",
	{
		id: uuid("id").primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organization.id),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id),
		role: text("role").notNull(),
	},
	(table) => ({
		// ✅ Composite index for common query
		orgUserIdx: index("org_user_idx").on(table.organizationId, table.userId),
		// ✅ Index for role-based queries
		roleIdx: index("role_idx").on(table.role),
		// ✅ Index for organization-based queries
		orgIdIdx: index("org_id_idx").on(table.organizationId),
		// ✅ Index for user-based queries
		userIdIdx: index("user_id_idx").on(table.userId),
	}),
);
