import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// We expect to run this from monorepo root generally, but let's make it robust
// If running from packages/config, logic differs.
// Best to rely on relative path from this file if possible, or configuration.
// For CLI tool, usually __dirname relative is safest for internal assets.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to refactor-state relative to dist/migrations/validator.js
// src/migrations -> dist/migrations.
// state is in packages/config/refactor-state
// so ../../refactor-state from dist/migrations
const stateDir = join(__dirname, "../../refactor-state");

const validations = [
	{
		name: "Discovery State",
		schemaPath: join(stateDir, "discovery-state.schema.json"),
		statePath: join(stateDir, "discovery-state.json"),
	},
	{
		name: "Migration State",
		schemaPath: join(stateDir, "migration-state.schema.json"),
		statePath: join(stateDir, "migration-state.json"),
	},
	{
		name: "Cleanup Queue",
		schemaPath: join(stateDir, "cleanup-queue.schema.json"),
		statePath: join(stateDir, "cleanup-queue.json"),
	},
];

export function validateRefactorState(): boolean {
	let totalErrors = 0;
	console.log("🔍 Validating config refactor state files...\n");

	for (const { name, schemaPath, statePath } of validations) {
		if (!existsSync(schemaPath)) {
			console.error(`❌ ${name}: Schema file not found at ${schemaPath}`);
			totalErrors++;
			continue;
		}
		if (!existsSync(statePath)) {
			console.error(`❌ ${name}: State file not found at ${statePath}`);
			totalErrors++;
			continue;
		}

		try {
			const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
			const state = JSON.parse(readFileSync(statePath, "utf8"));
			const validate = ajv.compile(schema);
			const valid = validate(state);

			if (!valid) {
				console.error(`❌ ${name}: Validation failed`);
				if (validate.errors) {
					for (const error of validate.errors) {
						console.error(`   - ${error.instancePath || "/"}: ${error.message}`);
					}
				}
				totalErrors++;
			} else {
				console.log(`✅ ${name}: Valid`);
			}
		} catch (error: any) {
			console.error(`❌ ${name}: ${error.message}`);
			totalErrors++;
		}
	}

	// Logic validation (checking coverage/error rates)
	try {
		const migrationPath = join(stateDir, "migration-state.json");
		if (existsSync(migrationPath)) {
			const migrationState = JSON.parse(readFileSync(migrationPath, "utf8"));

			if (migrationState.test_coverage) {
				for (const [component, coverage] of Object.entries(migrationState.test_coverage)) {
					if ((coverage as number) < 95) {
						console.warn(`⚠️  Test coverage for ${component} is ${coverage}% (target: 95%+)`);
					}
				}
			}

			if (migrationState.rollout_status?.error_rate) {
				const errorRate = migrationState.rollout_status.error_rate;
				if (errorRate > 0.001) {
					console.error(`❌ Error rate too high: ${(errorRate * 100).toFixed(2)}% (target: <0.1%)`);
					totalErrors++;
				}
			}
		}
	} catch (error: any) {
		console.error(`❌ Logic validation failed: ${error.message}`);
		totalErrors++;
	}

	return totalErrors === 0;
}
