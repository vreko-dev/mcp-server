import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const policyEvaluations = pgTable("policy_evaluations", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	userId: text("user_id").notNull(),
	apiKeyId: text("api_key_id").notNull(),
	sessionId: text("session_id"),
	requestId: text("request_id").notNull(),
	policyName: text("policy_name").notNull(),
	policyVersion: text("policy_version"),
	evaluationResult: text("evaluation_result"),
	violations: jsonb("violations").default([]),
	remediationSteps: jsonb("remediation_steps").default([]),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PolicyEvaluation = typeof policyEvaluations.$inferSelect;
export type NewPolicyEvaluation = typeof policyEvaluations.$inferInsert;
