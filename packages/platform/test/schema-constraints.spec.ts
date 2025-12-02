import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { agentSuggestions } from "../src/db/schema/snapback/agent-suggestions.js";
import { feedback } from "../src/db/schema/snapback/feedback.js";
import { loops } from "../src/db/schema/snapback/loops.js";
import { policyEvaluations } from "../src/db/schema/snapback/policy-evaluations.js";
import { postAcceptOutcomes } from "../src/db/schema/snapback/post-accept-outcomes.js";
import { quarantineEvents } from "../src/db/schema/snapback/quarantine-events.js";

describe.skip("SCH1: Schema FK CASCADE constraints", () => {
	const testId1 = "sch-fk-001";
	const testId2 = "sch-fk-002";
	const testId3 = "sch-fk-003";

	it(`${testId1}: agent_suggestions should have FK CASCADE on apiKeyId`, () => {
		const config = getTableConfig(agentSuggestions);
		const apiKeyIdColumn = config.columns.find((col) => col.name === "api_key_id");

		expect(apiKeyIdColumn).toBeDefined();

		// Check for foreign key references
		const foreignKeys = config.foreignKeys;
		expect(foreignKeys.length).toBeGreaterThanOrEqual(1);

		// Verify apiKeyId has FK with CASCADE
		const apiKeyIdFk = foreignKeys.find((fk) => {
			const ref = fk.reference();
			return ref.columns.some((col) => col.name === "api_key_id");
		});
		expect(apiKeyIdFk).toBeDefined();
		expect(apiKeyIdFk?.onDelete).toBe("cascade");
	});

	it(`${testId2}: policy_evaluations should have FK CASCADE on apiKeyId`, () => {
		const config = getTableConfig(policyEvaluations);
		const foreignKeys = config.foreignKeys;

		expect(foreignKeys.length).toBeGreaterThanOrEqual(1);

		const apiKeyIdFk = foreignKeys.find((fk) => {
			const ref = fk.reference();
			return ref.columns.some((col) => col.name === "api_key_id");
		});
		expect(apiKeyIdFk).toBeDefined();
		expect(apiKeyIdFk?.onDelete).toBe("cascade");
	});

	it(`${testId3}: loops, feedback, and post_accept_outcomes should have FK CASCADE on apiKeyId`, () => {
		const tables = [
			{ name: "loops", table: loops },
			{ name: "feedback", table: feedback },
			{ name: "post_accept_outcomes", table: postAcceptOutcomes },
		];

		for (const { name, table } of tables) {
			const config = getTableConfig(table);
			const foreignKeys = config.foreignKeys;

			expect(foreignKeys.length, `${name} should have FKs`).toBeGreaterThanOrEqual(1);

			const apiKeyIdFk = foreignKeys.find((fk) => {
				const ref = fk.reference();
				return ref.columns.some((col) => col.name === "api_key_id");
			});
			expect(apiKeyIdFk, `${name} apiKeyId FK`).toBeDefined();
			expect(apiKeyIdFk?.onDelete, `${name} apiKeyId CASCADE`).toBe("cascade");
		}
	});
});

describe.skip("SCH2: Schema CHECK constraints for enums", () => {
	const testId1 = "sch-chk-001";
	const testId2 = "sch-chk-002";
	const testId3 = "sch-chk-003";
	const testId4 = "sch-chk-004";

	it(`${testId1}: agent_suggestions should have CHECK constraint on suggestionType`, () => {
		const config = getTableConfig(agentSuggestions);
		const checks = config.checks;

		expect(checks.length).toBeGreaterThanOrEqual(1);

		const suggestionTypeCheck = checks.find((chk) => chk.name === "agent_suggestions_suggestion_type_check");
		expect(suggestionTypeCheck, "suggestionType CHECK constraint").toBeDefined();
		expect(suggestionTypeCheck?.name).toBe("agent_suggestions_suggestion_type_check");
	});

	it(`${testId2}: policy_evaluations should have CHECK constraint on evaluationResult`, () => {
		const config = getTableConfig(policyEvaluations);
		const checks = config.checks;

		expect(checks.length).toBeGreaterThanOrEqual(1);

		const evalResultCheck = checks.find((chk) => chk.name === "policy_evaluations_evaluation_result_check");
		expect(evalResultCheck, "evaluationResult CHECK constraint").toBeDefined();
		expect(evalResultCheck?.name).toBe("policy_evaluations_evaluation_result_check");
	});

	it(`${testId3}: loops should have CHECK constraint on loopType`, () => {
		const config = getTableConfig(loops);
		const checks = config.checks;

		expect(checks.length).toBeGreaterThanOrEqual(1);

		const loopTypeCheck = checks.find((chk) => chk.name === "loops_loop_type_check");
		expect(loopTypeCheck, "loopType CHECK constraint").toBeDefined();
		expect(loopTypeCheck?.name).toBe("loops_loop_type_check");
	});

	it(`${testId4}: feedback should have CHECK constraint on feedbackType`, () => {
		const config = getTableConfig(feedback);
		const checks = config.checks;

		expect(checks.length).toBeGreaterThanOrEqual(1);

		const feedbackTypeCheck = checks.find((chk) => chk.name === "feedback_feedback_type_check");
		expect(feedbackTypeCheck, "feedbackType CHECK constraint").toBeDefined();
		expect(feedbackTypeCheck?.name).toBe("feedback_feedback_type_check");
	});
});

describe.skip("SCH3: Schema composite indexes", () => {
	const testId1 = "sch-idx-001";
	const testId2 = "sch-idx-002";

	it(`${testId1}: tables with userId should have composite (userId, createdAt) index`, () => {
		const tables = [
			{ name: "agent_suggestions", table: agentSuggestions },
			{ name: "policy_evaluations", table: policyEvaluations },
			{ name: "loops", table: loops },
			{ name: "feedback", table: feedback },
			{ name: "post_accept_outcomes", table: postAcceptOutcomes },
		];

		for (const { name, table } of tables) {
			const config = getTableConfig(table);
			const indexes = config.indexes;

			expect(indexes.length, `${name} should have indexes`).toBeGreaterThanOrEqual(1);

			// Look for composite index on (user_id, created_at)
			const userCreatedIndex = indexes.find((idx) => {
				const cols = idx.config.columns
					.filter((col): col is { name: string } => typeof col === "object" && col !== null && "name" in col)
					.map((col) => col.name);
				return cols.includes("user_id") && cols.includes("created_at");
			});

			expect(userCreatedIndex, `${name} should have (user_id, created_at) index`).toBeDefined();
		}
	});

	it(`${testId2}: tables with apiKeyId should have composite (apiKeyId, createdAt) index`, () => {
		const tables = [
			{ name: "agent_suggestions", table: agentSuggestions },
			{ name: "policy_evaluations", table: policyEvaluations },
			{ name: "loops", table: loops },
			{ name: "feedback", table: feedback },
			{ name: "post_accept_outcomes", table: postAcceptOutcomes },
		];

		for (const { name, table } of tables) {
			const config = getTableConfig(table);
			const indexes = config.indexes;

			// Look for composite index on (api_key_id, created_at)
			const apiKeyCreatedIndex = indexes.find((idx) => {
				const cols = idx.config.columns
					.filter((col): col is { name: string } => typeof col === "object" && col !== null && "name" in col)
					.map((col) => col.name);
				return cols.includes("api_key_id") && cols.includes("created_at");
			});

			expect(apiKeyCreatedIndex, `${name} should have (api_key_id, created_at) index`).toBeDefined();
		}
	});
});

describe("SCH4: Quarantine events schema alignment", () => {
	const testId = "sch-quar-001";

	it(`${testId}: quarantine_events should have userId, apiKeyId with FK CASCADE, and indexes`, () => {
		const config = getTableConfig(quarantineEvents);

		// Check columns exist
		const userIdColumn = config.columns.find((col) => col.name === "user_id");
		const apiKeyIdColumn = config.columns.find((col) => col.name === "api_key_id");

		expect(userIdColumn, "quarantine_events should have user_id").toBeDefined();
		expect(apiKeyIdColumn, "quarantine_events should have api_key_id").toBeDefined();

		// Check FK CASCADE
		const foreignKeys = config.foreignKeys;
		expect(foreignKeys.length).toBeGreaterThanOrEqual(1);

		const apiKeyIdFk = foreignKeys.find((fk) => {
			const ref = fk.reference();
			return ref.columns.some((col) => col.name === "api_key_id");
		});
		expect(apiKeyIdFk?.onDelete).toBe("cascade");

		// Check composite indexes
		const indexes = config.indexes;
		const userCreatedIndex = indexes.find((idx) => {
			const cols = idx.config.columns
				.filter((col): col is { name: string } => typeof col === "object" && col !== null && "name" in col)
				.map((col) => col.name);
			return cols.includes("user_id") && cols.includes("created_at");
		});
		expect(userCreatedIndex, "quarantine_events (user_id, created_at) index").toBeDefined();

		const apiKeyCreatedIndex = indexes.find((idx) => {
			const cols = idx.config.columns
				.filter((col): col is { name: string } => typeof col === "object" && col !== null && "name" in col)
				.map((col) => col.name);
			return cols.includes("api_key_id") && cols.includes("created_at");
		});
		expect(apiKeyCreatedIndex, "quarantine_events (api_key_id, created_at) index").toBeDefined();
	});
});
