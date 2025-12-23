import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "../postgres";

// Device auth codes table
// Tracks RFC 8628 device authorization flow (for VS Code extension auth)
export const deviceAuthCodes = pgTable(
	"device_auth_codes",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),

		// Device code credentials
		deviceCode: text("device_code").notNull().unique(),
		userCode: text("user_code").notNull(),

		// Client identifier
		clientId: text("client_id").notNull(), // "vscode-extension"

		// Verification URI
		verificationUri: text("verification_uri").notNull(),

		// User who approved (null until approved)
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),

		// Status
		approved: text("approved").notNull().default("false"),
		approvedAt: timestamp("approved_at"),

		// Expiration
		expiresAt: timestamp("expires_at").notNull(),

		// API Key issued after approval
		issuedApiKeyId: text("issued_api_key_id"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		deviceCodeIdx: index("device_auth_codes_device_code_idx").on(table.deviceCode),
		userCodeIdx: index("device_auth_codes_user_code_idx").on(table.userCode),
		userIdIdx: index("device_auth_codes_user_id_idx").on(table.userId),
		expiresAtIdx: index("device_auth_codes_expires_at_idx").on(table.expiresAt),
		approvedIdx: index("device_auth_codes_approved_idx").on(table.approved),
	}),
);

export type DeviceAuthCode = typeof deviceAuthCodes.$inferSelect;
export type NewDeviceAuthCode = typeof deviceAuthCodes.$inferInsert;
