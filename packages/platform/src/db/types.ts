import type { InferModel } from "drizzle-orm";
import type { extensionSessions } from "./schema/extension-auth";
import type {
	account,
	aiChat,
	apiKeys,
	apiUsage,
	invitation,
	member,
	newsletterSubscribers,
	organization,
	passkey,
	purchase,
	session,
	subscriptions,
	twoFactor,
	usageLimits,
	user,
	verification,
} from "./schema/postgres";

export type Database = {
	public: {
		Tables: {
			user: {
				Row: InferModel<typeof user, "select">;
				Insert: InferModel<typeof user, "insert">;
				Update: Partial<InferModel<typeof user, "insert">>;
			};
			session: {
				Row: InferModel<typeof session, "select">;
				Insert: InferModel<typeof session, "insert">;
				Update: Partial<InferModel<typeof session, "insert">>;
			};
			account: {
				Row: InferModel<typeof account, "select">;
				Insert: InferModel<typeof account, "insert">;
				Update: Partial<InferModel<typeof account, "insert">>;
			};
			verification: {
				Row: InferModel<typeof verification, "select">;
				Insert: InferModel<typeof verification, "insert">;
				Update: Partial<InferModel<typeof verification, "insert">>;
			};
			passkey: {
				Row: InferModel<typeof passkey, "select">;
				Insert: InferModel<typeof passkey, "insert">;
				Update: Partial<InferModel<typeof passkey, "insert">>;
			};
			twoFactor: {
				Row: InferModel<typeof twoFactor, "select">;
				Insert: InferModel<typeof twoFactor, "insert">;
				Update: Partial<InferModel<typeof twoFactor, "insert">>;
			};
			organization: {
				Row: InferModel<typeof organization, "select">;
				Insert: InferModel<typeof organization, "insert">;
				Update: Partial<InferModel<typeof organization, "insert">>;
			};
			member: {
				Row: InferModel<typeof member, "select">;
				Insert: InferModel<typeof member, "insert">;
				Update: Partial<InferModel<typeof member, "insert">>;
			};
			invitation: {
				Row: InferModel<typeof invitation, "select">;
				Insert: InferModel<typeof invitation, "insert">;
				Update: Partial<InferModel<typeof invitation, "insert">>;
			};
			purchase: {
				Row: InferModel<typeof purchase, "select">;
				Insert: InferModel<typeof purchase, "insert">;
				Update: Partial<InferModel<typeof purchase, "insert">>;
			};
			aiChat: {
				Row: InferModel<typeof aiChat, "select">;
				Insert: InferModel<typeof aiChat, "insert">;
				Update: Partial<InferModel<typeof aiChat, "insert">>;
			};
			api_keys: {
				Row: InferModel<typeof apiKeys, "select">;
				Insert: InferModel<typeof apiKeys, "insert">;
				Update: Partial<InferModel<typeof apiKeys, "insert">>;
			};
			api_usage: {
				Row: InferModel<typeof apiUsage, "select">;
				Insert: InferModel<typeof apiUsage, "insert">;
				Update: Partial<InferModel<typeof apiUsage, "insert">>;
			};
			extension_sessions: {
				Row: InferModel<typeof extensionSessions, "select">;
				Insert: InferModel<typeof extensionSessions, "insert">;
				Update: Partial<InferModel<typeof extensionSessions, "insert">>;
			};
			subscriptions: {
				Row: InferModel<typeof subscriptions, "select">;
				Insert: InferModel<typeof subscriptions, "insert">;
				Update: Partial<InferModel<typeof subscriptions, "insert">>;
			};
			usage_limits: {
				Row: InferModel<typeof usageLimits, "select">;
				Insert: InferModel<typeof usageLimits, "insert">;
				Update: Partial<InferModel<typeof usageLimits, "insert">>;
			};
			newsletter_subscribers: {
				Row: InferModel<typeof newsletterSubscribers, "select">;
				Insert: InferModel<typeof newsletterSubscribers, "insert">;
				Update: Partial<InferModel<typeof newsletterSubscribers, "insert">>;
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
	};
};
