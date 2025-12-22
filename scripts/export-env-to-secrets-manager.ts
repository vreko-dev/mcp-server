#!/usr/bin/env tsx

/**
 * Environment Variable Export Script
 *
 * Exports all .env.example files to a format compatible with secret managers
 * (Infisical, Doppler, 1Password, HashiCorp Vault)
 *
 * Usage:
 *   pnpm tsx scripts/export-env-to-secrets-manager.ts
 *   pnpm tsx scripts/export-env-to-secrets-manager.ts --format=infisical
 *   pnpm tsx scripts/export-env-to-secrets-manager.ts --format=doppler
 *   pnpm tsx scripts/export-env-to-secrets-manager.ts --output=./secrets-export.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface EnvVariable {
	name: string;
	value: string;
	comment?: string;
	section?: string;
	isSecret: boolean;
	isPublic: boolean;
}

interface AppEnvConfig {
	app: string;
	path: string;
	variables: EnvVariable[];
}

interface SharedVariable {
	name: string;
	apps: string[];
	category: string;
	isSecret: boolean;
	sampleValue: string;
}

interface ExportOutput {
	generated: string;
	format: string;
	shared: Record<string, SharedVariable[]>;
	apps: Record<string, EnvVariable[]>;
	summary: {
		totalVariables: number;
		sharedVariables: number;
		secretsCount: number;
		publicCount: number;
	};
}

// ============================================================================
// Constants
// ============================================================================

const ROOT_DIR = path.resolve(__dirname, "..");

const ENV_EXAMPLE_PATHS = [
	{ app: "root", path: ".env.example" },
	{ app: "api", path: "apps/api/.env.example" },
	{ app: "web", path: "apps/web/.env.example" },
	{ app: "cli", path: "apps/cli/.env.example" },
	{ app: "mcp-server", path: "apps/mcp-server/.env.example" },
	{ app: "vscode", path: "apps/vscode/.env.example" },
	{ app: "auth", path: "packages/auth/.env.example" },
	{ app: "core", path: "packages/core/.env.example" },
	{ app: "platform", path: "packages/platform/.env.example" },
];

const SECRET_PATTERNS = [
	/SECRET/i,
	/KEY/i,
	/TOKEN/i,
	/PASSWORD/i,
	/CREDENTIAL/i,
	/API_KEY/i,
	/ACCESS_KEY/i,
	/PRIVATE/i,
	/AUTH/i,
	/DATABASE_URL/i,
	/REDIS_URL/i,
	/WEBHOOK/i,
];

const SHARED_CATEGORIES: Record<string, string[]> = {
	database: ["DATABASE_URL", "DIRECT_URL", "REDIS_URL"],
	auth: [
		"BETTER_AUTH_SECRET",
		"BETTER_AUTH_URL",
		"APP_URL",
		"GITHUB_CLIENT_ID",
		"GITHUB_CLIENT_SECRET",
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
	],
	email: ["RESEND_API_KEY"],
	security: ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
	payment: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
	monitoring: ["POSTHOG_API_KEY", "NEXT_PUBLIC_POSTHOG_KEY", "SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"],
	general: ["NODE_ENV", "LOG_LEVEL", "DEBUG"],
};

// ============================================================================
// Parsing Functions
// ============================================================================

function parseEnvFile(filePath: string): EnvVariable[] {
	const absolutePath = path.join(ROOT_DIR, filePath);

	if (!fs.existsSync(absolutePath)) {
		console.warn(`⚠️  File not found: ${filePath}`);
		return [];
	}

	const content = fs.readFileSync(absolutePath, "utf-8");
	const lines = content.split("\n");
	const variables: EnvVariable[] = [];
	let currentSection = "";
	let pendingComment = "";

	for (const line of lines) {
		const trimmed = line.trim();

		// Section header (e.g., "# === Database Configuration ===")
		if (trimmed.startsWith("# ==") || trimmed.startsWith("# ---")) {
			currentSection = trimmed
				.replace(/^#\s*[=-]+\s*/, "")
				.replace(/\s*[=-]+$/, "")
				.trim();
			pendingComment = "";
			continue;
		}

		// Regular comment
		if (trimmed.startsWith("#") && !trimmed.includes("=")) {
			pendingComment = trimmed.replace(/^#\s*/, "");
			continue;
		}

		// Empty line
		if (!trimmed) {
			pendingComment = "";
			continue;
		}

		// Variable line
		const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
		if (match) {
			const [, name, rawValue] = match;
			const value = rawValue.replace(/^["']|["']$/g, "");

			variables.push({
				name,
				value,
				comment: pendingComment || undefined,
				section: currentSection || undefined,
				isSecret: SECRET_PATTERNS.some((pattern) => pattern.test(name)),
				isPublic: name.startsWith("NEXT_PUBLIC_"),
			});

			pendingComment = "";
		}
	}

	return variables;
}

function findSharedVariables(configs: AppEnvConfig[]): SharedVariable[] {
	const variableMap = new Map<string, { apps: string[]; values: string[] }>();

	// Collect all occurrences
	for (const config of configs) {
		for (const variable of config.variables) {
			const existing = variableMap.get(variable.name);
			if (existing) {
				existing.apps.push(config.app);
				existing.values.push(variable.value);
			} else {
				variableMap.set(variable.name, {
					apps: [config.app],
					values: [variable.value],
				});
			}
		}
	}

	// Filter to shared (2+ apps)
	const shared: SharedVariable[] = [];
	for (const [name, data] of variableMap) {
		if (data.apps.length >= 2) {
			// Find category
			let category = "other";
			for (const [cat, vars] of Object.entries(SHARED_CATEGORIES)) {
				if (vars.includes(name)) {
					category = cat;
					break;
				}
			}

			shared.push({
				name,
				apps: data.apps,
				category,
				isSecret: SECRET_PATTERNS.some((pattern) => pattern.test(name)),
				sampleValue: data.values[0],
			});
		}
	}

	return shared.sort((a, b) => {
		// Sort by category, then by name
		if (a.category !== b.category) {
			return a.category.localeCompare(b.category);
		}
		return a.name.localeCompare(b.name);
	});
}

// ============================================================================
// Export Formatters
// ============================================================================

function formatForInfisical(output: ExportOutput): object {
	const secrets: Record<string, { value: string; comment?: string }> = {};

	// Add shared variables first (in folders)
	for (const [category, variables] of Object.entries(output.shared)) {
		for (const variable of variables) {
			const key = `shared/${category}/${variable.name}`;
			secrets[key] = {
				value: variable.sampleValue,
				comment: `Shared across: ${variable.apps.join(", ")}`,
			};
		}
	}

	// Add app-specific variables
	for (const [app, variables] of Object.entries(output.apps)) {
		for (const variable of variables) {
			// Skip if already in shared
			const isShared = Object.values(output.shared)
				.flat()
				.some((s) => s.name === variable.name);
			if (isShared) continue;

			const key = `apps/${app}/${variable.name}`;
			secrets[key] = {
				value: variable.value,
				comment: variable.comment,
			};
		}
	}

	return {
		version: "1.0",
		secrets,
	};
}

function formatForDoppler(output: ExportOutput): object {
	const projects: Record<string, Record<string, string>> = {};

	// Create shared project
	const sharedSecrets: Record<string, string> = {};
	for (const variables of Object.values(output.shared)) {
		for (const variable of variables) {
			sharedSecrets[variable.name] = variable.sampleValue;
		}
	}
	projects["snapback-shared"] = sharedSecrets;

	// Create app projects
	for (const [app, variables] of Object.entries(output.apps)) {
		const appSecrets: Record<string, string> = {};
		for (const variable of variables) {
			// Skip if in shared
			const isShared = Object.values(output.shared)
				.flat()
				.some((s) => s.name === variable.name);
			if (isShared) continue;

			appSecrets[variable.name] = variable.value;
		}
		if (Object.keys(appSecrets).length > 0) {
			projects[`snapback-${app}`] = appSecrets;
		}
	}

	return {
		version: "1.0",
		projects,
	};
}

function formatForOnePassword(output: ExportOutput): object {
	const items: Array<{
		title: string;
		category: string;
		fields: Array<{ label: string; value: string; type: string }>;
	}> = [];

	// Shared secrets vault
	const sharedFields: Array<{ label: string; value: string; type: string }> = [];
	for (const variables of Object.values(output.shared)) {
		for (const variable of variables) {
			sharedFields.push({
				label: variable.name,
				value: variable.sampleValue,
				type: variable.isSecret ? "concealed" : "string",
			});
		}
	}
	if (sharedFields.length > 0) {
		items.push({
			title: "SnapBack Shared Secrets",
			category: "Secure Note",
			fields: sharedFields,
		});
	}

	// App-specific items
	for (const [app, variables] of Object.entries(output.apps)) {
		const fields: Array<{ label: string; value: string; type: string }> = [];
		for (const variable of variables) {
			const isShared = Object.values(output.shared)
				.flat()
				.some((s) => s.name === variable.name);
			if (isShared) continue;

			fields.push({
				label: variable.name,
				value: variable.value,
				type: variable.isSecret ? "concealed" : "string",
			});
		}
		if (fields.length > 0) {
			items.push({
				title: `SnapBack ${app.toUpperCase()} Secrets`,
				category: "Secure Note",
				fields,
			});
		}
	}

	return {
		version: "1.0",
		items,
	};
}

// ============================================================================
// Main Export Function
// ============================================================================

function exportEnvVariables(format = "json"): ExportOutput {
	console.log("🔍 Scanning .env.example files...\n");

	// Parse all files
	const configs: AppEnvConfig[] = [];
	for (const { app, path: envPath } of ENV_EXAMPLE_PATHS) {
		const variables = parseEnvFile(envPath);
		if (variables.length > 0) {
			configs.push({ app, path: envPath, variables });
			console.log(`  ✓ ${app}: ${variables.length} variables`);
		}
	}

	// Find shared variables
	const sharedVariables = findSharedVariables(configs);
	console.log(`\n📊 Found ${sharedVariables.length} shared variables\n`);

	// Group shared by category
	const sharedByCategory: Record<string, SharedVariable[]> = {};
	for (const variable of sharedVariables) {
		if (!sharedByCategory[variable.category]) {
			sharedByCategory[variable.category] = [];
		}
		sharedByCategory[variable.category].push(variable);
	}

	// Build apps map
	const appsMap: Record<string, EnvVariable[]> = {};
	for (const config of configs) {
		appsMap[config.app] = config.variables;
	}

	// Calculate summary
	const allVariables = configs.flatMap((c) => c.variables);
	const uniqueNames = new Set(allVariables.map((v) => v.name));

	const output: ExportOutput = {
		generated: new Date().toISOString(),
		format,
		shared: sharedByCategory,
		apps: appsMap,
		summary: {
			totalVariables: uniqueNames.size,
			sharedVariables: sharedVariables.length,
			secretsCount: allVariables.filter((v) => v.isSecret).length,
			publicCount: allVariables.filter((v) => v.isPublic).length,
		},
	};

	return output;
}

// ============================================================================
// CLI
// ============================================================================

function main() {
	const args = process.argv.slice(2);
	let format = "json";
	let outputPath = "";

	for (const arg of args) {
		if (arg.startsWith("--format=")) {
			format = arg.split("=")[1];
		} else if (arg.startsWith("--output=")) {
			outputPath = arg.split("=")[1];
		} else if (arg === "--help" || arg === "-h") {
			console.log(`
Environment Variable Export Script

Usage:
  pnpm tsx scripts/export-env-to-secrets-manager.ts [options]

Options:
  --format=FORMAT    Output format: json, infisical, doppler, 1password
  --output=PATH      Write output to file instead of stdout
  --help, -h         Show this help message

Examples:
  pnpm tsx scripts/export-env-to-secrets-manager.ts
  pnpm tsx scripts/export-env-to-secrets-manager.ts --format=infisical
  pnpm tsx scripts/export-env-to-secrets-manager.ts --format=doppler --output=./secrets.json
`);
			process.exit(0);
		}
	}

	console.log("═══════════════════════════════════════════════════════════════");
	console.log("         Environment Variable Export for Secret Managers        ");
	console.log("═══════════════════════════════════════════════════════════════\n");

	const output = exportEnvVariables(format);

	// Format based on target
	let formattedOutput: object;
	switch (format) {
		case "infisical":
			formattedOutput = formatForInfisical(output);
			break;
		case "doppler":
			formattedOutput = formatForDoppler(output);
			break;
		case "1password":
			formattedOutput = formatForOnePassword(output);
			break;
		default:
			formattedOutput = output;
	}

	const jsonOutput = JSON.stringify(formattedOutput, null, 2);

	if (outputPath) {
		const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
		fs.writeFileSync(absoluteOutputPath, jsonOutput);
		console.log(`\n✅ Exported to: ${absoluteOutputPath}`);
	} else {
		console.log("\n═══════════════════════════════════════════════════════════════");
		console.log("                         EXPORT OUTPUT                          ");
		console.log("═══════════════════════════════════════════════════════════════\n");
		console.log(jsonOutput);
	}

	// Print summary
	console.log("\n═══════════════════════════════════════════════════════════════");
	console.log("                           SUMMARY                              ");
	console.log("═══════════════════════════════════════════════════════════════");
	console.log(`  Total unique variables: ${output.summary.totalVariables}`);
	console.log(`  Shared across apps:     ${output.summary.sharedVariables}`);
	console.log(`  Secrets (need rotation): ${output.summary.secretsCount}`);
	console.log(`  Public (NEXT_PUBLIC_*): ${output.summary.publicCount}`);
	console.log("═══════════════════════════════════════════════════════════════\n");

	// Print shared variables table
	console.log("📋 SHARED VARIABLES (used in 2+ apps):\n");
	console.log("┌─────────────────────────────────────┬──────────┬─────────────────────────┐");
	console.log("│ Variable                            │ Category │ Used In                 │");
	console.log("├─────────────────────────────────────┼──────────┼─────────────────────────┤");

	for (const variable of Object.values(output.shared).flat()) {
		const name = variable.name.padEnd(35).substring(0, 35);
		const category = variable.category.padEnd(8).substring(0, 8);
		const apps = variable.apps.join(", ").padEnd(23).substring(0, 23);
		console.log(`│ ${name} │ ${category} │ ${apps} │`);
	}

	console.log("└─────────────────────────────────────┴──────────┴─────────────────────────┘\n");

	// Print rotation recommendations
	console.log("🔐 SECRETS REQUIRING ROTATION (90-day cycle recommended):\n");
	const secrets = Object.values(output.shared)
		.flat()
		.filter((v) => v.isSecret);

	for (const secret of secrets) {
		console.log(`  • ${secret.name}`);
	}

	console.log("\n✨ Next Steps:");
	console.log("  1. Sign up for Infisical/Doppler/1Password");
	console.log("  2. Import the exported JSON");
	console.log("  3. Set up environment inheritance (dev → staging → prod)");
	console.log("  4. Install CLI: npm install -g @infisical/cli");
	console.log('  5. Update package.json: "dev": "infisical run -- turbo run dev"');
	console.log("");
}

main();
