import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys } from "./api-keys";

export const policyEvaluations = pgTable(
	"policy_evaluations",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		userId: text("user_id").notNull(),
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),
		sessionId: text("session_id"),
		requestId: text("request_id").notNull(),
		policyName: text("policy_name").notNull(),
		policyVersion: text("policy_version"),
		evaluationResult: text("evaluation_result"),
		violations: jsonb("violations").default([]),
		remediationSteps: jsonb("remediation_steps").default([]),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			userCreatedAtIndex: index("policy_evaluations_user_created_at_idx").on(table.userId, table.createdAt),
			apiKeyCreatedAtIndex: index("policy_evaluations_api_key_created_at_idx").on(
				table.apiKeyId,
				table.createdAt,
			),
			evaluationResultCheck: check(
				"policy_evaluations_evaluation_result_check",
				sql`evaluation_result IN ('passed', 'failed', 'warning', 'error')`,
			),
		};
	},
);

export type PolicyEvaluation = typeof policyEvaluations.$inferSelect;
export type NewPolicyEvaluation = typeof policyEvaluations.$inferInsert;
