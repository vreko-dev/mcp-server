#!/usr/bin/env node

/**
 * Docker Configuration Validation - RED Phase Tests
 *
 * This script runs RED phase validation tests without test framework dependencies
 * to establish the baseline of what needs to be fixed.
 *
 * Exit code: 0 if all tests pass, non-zero if any fail
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../");

let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

/**
 * Simple test assertion
 */
function assert(condition, message) {
	if (condition) {
		testsPassed++;
		console.log(`  ✓ ${message}`);
	} else {
		testsFailed++;
		console.log(`  ✗ ${message}`);
		failedTests.push(message);
	}
}

/**
 * Helper: Parse package.json to extract script names
 */
function getPackageScripts(packagePath) {
	try {
		const content = fs.readFileSync(packagePath, "utf-8");
		const pkg = JSON.parse(content);
		return pkg.scripts || {};
	} catch (e) {
		return {};
	}
}

/**
 * Helper: Extract all pnpm run commands from Dockerfile
 */
function getDockerfileRunScripts(dockerfilePath) {
	try {
		const content = fs.readFileSync(dockerfilePath, "utf-8");
		const matches = content.match(/pnpm\s+run\s+([^\s"]+)/g) || [];
		return matches.map((m) => m.replace("pnpm run ", "")).filter(Boolean);
	} catch (e) {
		return [];
	}
}

/**
 * Helper: Extract all pnpm filter references from Dockerfile
 */
function getDockerfilePnpmFilters(dockerfilePath) {
	try {
		const content = fs.readFileSync(dockerfilePath, "utf-8");
		const matches = content.match(/pnpm\s+--filter\s+([^\s"]+)/g) || [];
		return matches
			.map((m) => m.replace("pnpm --filter ", ""))
			.filter((f) => f && !f.match(/^(build|dev|lint|test)$/));
	} catch (e) {
		return [];
	}
}

/**
 * Helper: Check if .env file exists
 */
function envFileExists(envPath) {
	return fs.existsSync(envPath);
}

/**
 * Helper: Parse .env file to extract variables
 */
function parseEnvFile(envPath) {
	try {
		if (!fs.existsSync(envPath)) {
			return {};
		}

		const content = fs.readFileSync(envPath, "utf-8");
		const vars = {};

		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;

			const [key, ...valueParts] = trimmed.split("=");
			if (key) {
				vars[key.trim()] = valueParts.join("=").trim();
			}
		}

		return vars;
	} catch (e) {
		return {};
	}
}

/**
 * Helper: Get all package names from workspace
 */
function getWorkspacePackages() {
	const packages = [];

	// apps/*
	const appsPath = path.join(PROJECT_ROOT, "apps");
	if (fs.existsSync(appsPath)) {
		for (const item of fs.readdirSync(appsPath)) {
			const pkgPath = path.join(appsPath, item, "package.json");
			if (fs.existsSync(pkgPath)) {
				try {
					const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
					if (pkg.name) packages.push(pkg.name);
				} catch (e) {}
			}
		}
	}

	// packages/*
	const packagesPath = path.join(PROJECT_ROOT, "packages");
	if (fs.existsSync(packagesPath)) {
		for (const item of fs.readdirSync(packagesPath)) {
			const pkgPath = path.join(packagesPath, item, "package.json");
			if (fs.existsSync(pkgPath)) {
				try {
					const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
					if (pkg.name) packages.push(pkg.name);
				} catch (e) {}
			}
		}
	}

	return packages;
}

console.log("\n============================================================");
console.log("Docker Configuration Validation - RED Phase");
console.log("============================================================\n");

const workspacePackages = getWorkspacePackages();
console.log(`Found ${workspacePackages.length} workspace packages:\n`);
console.log(workspacePackages.map((p) => `  - ${p}`).join("\n"));
console.log("\n");

// ============================================================================
// DOCKERFILE SCRIPT VALIDATION
// ============================================================================

console.log("📋 Testing Dockerfile Script Names\n");

const dockerfiles = {
	"Root Dockerfile": path.join(PROJECT_ROOT, "Dockerfile"),
	"API Dockerfile": path.join(PROJECT_ROOT, "apps/api/Dockerfile"),
	"MCP Dockerfile": path.join(PROJECT_ROOT, "apps/mcp-server/Dockerfile"),
};

for (const [name, dockerfilePath] of Object.entries(dockerfiles)) {
	if (!fs.existsSync(dockerfilePath)) {
		console.log(`${name}: SKIP (not found)`);
		continue;
	}

	console.log(`${name}:`);
	const scripts = getDockerfileRunScripts(dockerfilePath);

	if (scripts.length === 0) {
		console.log("  ✓ No script validation issues");
	} else {
		console.log(`  Found scripts: ${scripts.join(", ")}`);

		// For MCP, check for bad script names
		if (name === "MCP Dockerfile") {
			assert(!scripts.includes("build:mcp"), "MCP should use 'build', not 'build:mcp'");
			assert(!scripts.includes("start:mcp"), "MCP should use 'start', not 'start:mcp'");
		}
	}
	console.log("");
}

// ============================================================================
// PACKAGE REFERENCE VALIDATION
// ============================================================================

console.log("📦 Testing Package References\n");

for (const [name, dockerfilePath] of Object.entries(dockerfiles)) {
	if (!fs.existsSync(dockerfilePath)) continue;

	console.log(`${name}:`);
	const content = fs.readFileSync(dockerfilePath, "utf-8");

	// Check for bad package names
	assert(!content.includes("--filter database"), "Should not reference 'database' package (use @snapback/platform)");

	const filters = getDockerfilePnpmFilters(dockerfilePath);
	if (filters.length === 0) {
		console.log("  ✓ No invalid filter references");
	} else {
		console.log(`  Found filters: ${filters.join(", ")}`);
		for (const filter of filters) {
			assert(workspacePackages.includes(filter), `Package '${filter}' exists in workspace`);
		}
	}
	console.log("");
}

// ============================================================================
// ENVIRONMENT FILE VALIDATION
// ============================================================================

console.log("🔐 Testing Environment Configuration\n");

const envPath = path.join(PROJECT_ROOT, ".env.docker");
assert(envFileExists(envPath), ".env.docker file exists");

const envVars = parseEnvFile(envPath);
const requiredVars = [
	"NEXT_PUBLIC_SITE_URL",
	"BETTER_AUTH_URL",
	"BETTER_AUTH_SECRET",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",
	"DATABASE_URL",
	"POSTGRES_PASSWORD",
	"POSTGRES_USER",
];

console.log("\nRequired variables in .env.docker:");
for (const varName of requiredVars) {
	const hasVar = varName in envVars && envVars[varName] !== "";
	assert(hasVar, `${varName} is set`);
}

console.log("\nURL separation:");
if (envVars["NEXT_PUBLIC_SITE_URL"]) {
	assert(
		envVars["NEXT_PUBLIC_SITE_URL"].includes("localhost:3000") ||
			envVars["NEXT_PUBLIC_SITE_URL"].includes("snapback.dev") ||
			envVars["NEXT_PUBLIC_SITE_URL"].includes("https://"),
		"NEXT_PUBLIC_SITE_URL is publicly accessible (localhost:3000 or domain)",
	);
	assert(
		!envVars["NEXT_PUBLIC_SITE_URL"].includes("api:3001"),
		"NEXT_PUBLIC_SITE_URL does NOT use internal service name",
	);
}

if (envVars["BETTER_AUTH_URL"]) {
	assert(envVars["BETTER_AUTH_URL"].includes("api:3001"), "BETTER_AUTH_URL uses internal service name (api:3001)");
}

console.log("");

// ============================================================================
// DATABASE MIGRATION VALIDATION
// ============================================================================

console.log("🗄️  Testing Database Migrations\n");

const migrationsPath = path.join(PROJECT_ROOT, "packages/platform/drizzle/migrations");
assert(fs.existsSync(migrationsPath), "Drizzle migrations directory exists");

if (fs.existsSync(migrationsPath)) {
	const migrations = fs.readdirSync(migrationsPath);
	console.log(`  Found ${migrations.length} migrations`);
	const hasAuthMigration = migrations.some((f) => f.includes("auth"));
	assert(hasAuthMigration, "Auth migration exists (better-auth tables)");
}

const entrypointPath = path.join(PROJECT_ROOT, "apps/api/docker-entrypoint.sh");
assert(fs.existsSync(entrypointPath), "API docker-entrypoint.sh exists for migration setup");

console.log("");

// ============================================================================
// DOCKER-COMPOSE VALIDATION
// ============================================================================

console.log("🐳 Testing Docker Compose Configuration\n");

const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
if (fs.existsSync(composePath)) {
	const content = fs.readFileSync(composePath, "utf-8");

	const requiredServices = ["postgres", "redis", "api", "web"];
	console.log("Services:");
	for (const service of requiredServices) {
		assert(content.includes(`${service}:`), `Service '${service}' is defined`);
	}

	console.log("\nMCP Service:");
	assert(content.includes("mcp-server:") || content.includes("mcp:"), "MCP service is defined");

	console.log("\nPort Configuration:");
	// Simple port conflict detection
	const portMatches = content.match(/ports:\s*\n\s*- ["']?(\d+):/g) || [];
	const ports = portMatches.map((m) => Number.parseInt(m.replace(/[^\d]/g, ""))).filter((p) => !isNaN(p));

	const uniquePorts = new Set(ports);
	assert(ports.length === uniquePorts.size, `No port conflicts (${ports.length} unique ports)`);

	console.log("\nHealth Checks:");
	assert(content.includes("healthcheck:"), "Services have health check configuration");

	console.log("\nEnvironment Variables:");
	assert(content.includes("${") || content.includes("$NEXT_PUBLIC"), "Uses environment variable references");
} else {
	console.log("⚠️  docker-compose.yml not found!");
}

console.log("");

// ============================================================================
// ENVIRONMENT VALIDATION CODE
// ============================================================================

console.log("✅ Testing Environment Validation Code\n");

const envFilePath = path.join(PROJECT_ROOT, "packages/config/src/env.ts");
if (fs.existsSync(envFilePath)) {
	const content = fs.readFileSync(envFilePath, "utf-8");

	assert(content.includes("envSchema.safeParse"), "Uses envSchema.safeParse for validation");

	const isCommented = content.match(/^\s*\/\/.*if \(!envParseResult\.success\)/m);
	assert(!isCommented, "Environment error handling is not commented out");
} else {
	console.log("⚠️  env.ts not found");
}

console.log("");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("============================================================");
console.log("RED Phase Test Results");
console.log("============================================================\n");

console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}\n`);

if (failedTests.length > 0) {
	console.log("Failed tests:");
	failedTests.forEach((test, i) => {
		console.log(`  ${i + 1}. ${test}`);
	});
	console.log("");
}

console.log("============================================================");
if (testsFailed > 0) {
	console.log("🔴 RED PHASE: Tests failing as expected!");
	console.log("Next: GREEN phase implementation to fix failures");
} else {
	console.log("🟢 All tests passing! Move to next phase.");
}
console.log("============================================================\n");

process.exit(testsFailed > 0 ? 1 : 0);
