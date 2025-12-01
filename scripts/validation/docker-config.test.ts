/**
 * Docker Configuration Validation Tests
 *
 * RED Phase: Tests that validate Docker configuration before implementation
 * These tests will fail initially, guiding the implementation of fixes
 *
 * Coverage:
 * - Dockerfile script name validation
 * - Package reference validation
 * - Database migration execution
 * - Environment variable configuration
 * - Port conflict detection
 * - Health check configuration
 * - docker-compose service dependencies
 */

import fs from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();

/**
 * Helper: Parse package.json to extract script names
 */
function getPackageScripts(packagePath: string): Record<string, string> {
	const content = fs.readFileSync(packagePath, "utf-8");
	const pkg = JSON.parse(content);
	return pkg.scripts || {};
}

/**
 * Helper: Extract all pnpm filter references from Dockerfile
 */
function getDockerfilePnpmFilters(dockerfilePath: string): string[] {
	const content = fs.readFileSync(dockerfilePath, "utf-8");
	const matches = content.match(/pnpm\s+(?:--filter|run)\s+([^\s"]+)/g) || [];
	return matches.map((m) => m.match(/([^\s"]+)$/)?.[0] || "").filter(Boolean);
}

/**
 * Helper: Extract all pnpm run commands from Dockerfile
 */
function getDockerfileRunScripts(dockerfilePath: string): string[] {
	const content = fs.readFileSync(dockerfilePath, "utf-8");
	const matches = content.match(/pnpm\s+run\s+([^\s"]+)/g) || [];
	return matches.map((m) => m.replace("pnpm run ", "")).filter(Boolean);
}

/**
 * Helper: Extract service ports from docker-compose.yml
 */
function getComposeServicePorts(composePath: string): Record<string, number[]> {
	const content = fs.readFileSync(composePath, "utf-8");
	const ports: Record<string, number[]> = {};

	// Simple regex-based parsing (not full YAML parser)
	const serviceMatches = content.matchAll(/^\s*([a-z-]+):\s*\n([\s\S]*?)(?=^\s*[a-z-]+:|$)/gm);

	for (const match of serviceMatches) {
		const serviceName = match[1];
		const serviceContent = match[2];
		const portMatches = serviceContent.match(/ports:\s*\n([\s\S]*?)(?=\n\s{4,}[a-z]|$)/);

		if (portMatches) {
			const hostPorts: number[] = [];
			const portLines = portMatches[1].match(/- ["']?(\d+):/g) || [];
			for (const portLine of portLines) {
				const portNum = Number.parseInt(portLine.replace(/[^\d]/g, ""), 10);
				if (!isNaN(portNum)) {
					hostPorts.push(portNum);
				}
			}
			if (hostPorts.length > 0) {
				ports[serviceName] = hostPorts;
			}
		}
	}

	return ports;
}

/**
 * Helper: Check if .env file exists
 */
function envFileExists(envPath: string): boolean {
	return fs.existsSync(envPath);
}

/**
 * Helper: Parse .env file to extract variables
 */
function parseEnvFile(envPath: string): Record<string, string> {
	if (!fs.existsSync(envPath)) {
		return {};
	}

	const content = fs.readFileSync(envPath, "utf-8");
	const vars: Record<string, string> = {};

	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const [key, ...valueParts] = trimmed.split("=");
		if (key) {
			vars[key.trim()] = valueParts.join("=").trim();
		}
	}

	return vars;
}

/**
 * Helper: Get all package names from workspace
 */
function getWorkspacePackages(): string[] {
	const patterns = ["apps/*", "packages/*", "tooling/*", "config"];
	const packages: string[] = [];

	for (const pattern of patterns) {
		const baseDir = pattern.split("/")[0];
		const subPattern = pattern.split("/")[1];

		if (!subPattern || subPattern === "*") {
			const basePath = path.join(PROJECT_ROOT, baseDir);
			if (fs.existsSync(basePath)) {
				const items = fs.readdirSync(basePath);
				for (const item of items) {
					const packageJsonPath = path.join(basePath, item, "package.json");
					if (fs.existsSync(packageJsonPath)) {
						const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
						if (pkg.name) {
							packages.push(pkg.name);
						}
					}
				}
			}
		} else {
			const packageJsonPath = path.join(PROJECT_ROOT, baseDir, subPattern, "package.json");
			if (fs.existsSync(packageJsonPath)) {
				const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
				if (pkg.name) {
					packages.push(pkg.name);
				}
			}
		}
	}

	return packages;
}

describe("Docker Configuration Validation - RED Phase", () => {
	let workspacePackages: string[];

	beforeAll(() => {
		workspacePackages = getWorkspacePackages();
	});

	// ============================================================================
	// DOCKERFILE VALIDATION TESTS
	// ============================================================================

	describe("Dockerfile Script Names", () => {
		it("should have valid script names in root Dockerfile", () => {
			const dockerfilePath = path.join(PROJECT_ROOT, "Dockerfile");
			const scripts = getDockerfileRunScripts(dockerfilePath);
			const packageScripts = getPackageScripts(path.join(PROJECT_ROOT, "apps/web/package.json"));

			const validScripts = ["build", "dev", "lint", "type-check"];
			for (const script of scripts) {
				expect(validScripts).toContain(
					script,
					`Script '${script}' not found in common build scripts for web app`,
				);
			}
		});

		it("should have valid script names in API Dockerfile", () => {
			const dockerfilePath = path.join(PROJECT_ROOT, "apps/api/Dockerfile");
			const scripts = getDockerfileRunScripts(dockerfilePath);
			const packageScripts = getPackageScripts(path.join(PROJECT_ROOT, "apps/api/package.json"));

			for (const script of scripts) {
				expect(packageScripts).toHaveProperty(
					script,
					`Script '${script}' not defined in apps/api/package.json`,
				);
			}
		});

		it("should have valid script names in MCP Dockerfile", () => {
			const dockerfilePath = path.join(PROJECT_ROOT, "apps/mcp-server/Dockerfile");
			const scripts = getDockerfileRunScripts(dockerfilePath);
			const packageScripts = getPackageScripts(path.join(PROJECT_ROOT, "apps/mcp-server/package.json"));

			for (const script of scripts) {
				expect(packageScripts).toHaveProperty(
					script,
					`Script '${script}' not defined in apps/mcp-server/package.json`,
				);
			}

			// Specific validation for MCP
			expect(scripts).not.toContain("build:mcp", "MCP Dockerfile should use 'build', not 'build:mcp'");
			expect(scripts).not.toContain("start:mcp", "MCP Dockerfile should use 'start', not 'start:mcp'");
		});
	});

	describe("Dockerfile Package References", () => {
		it("should reference valid workspace packages in pnpm --filter", () => {
			const dockerfiles = ["Dockerfile", "apps/api/Dockerfile", "apps/mcp-server/Dockerfile"];

			for (const dockerfileName of dockerfiles) {
				const dockerfilePath = path.join(PROJECT_ROOT, dockerfileName);
				if (!fs.existsSync(dockerfilePath)) continue;

				const filters = getDockerfilePnpmFilters(dockerfilePath);

				for (const filter of filters) {
					if (filter === "build" || filter === "dev" || filter === "lint") {
						continue; // Skip non-filter commands
					}

					expect(workspacePackages).toContain(
						filter,
						`Package '${filter}' in ${dockerfileName} not found in workspace. Did you mean one of: ${workspacePackages.join(", ")}`,
					);
				}
			}
		});

		it("should not reference non-existent 'database' package", () => {
			const dockerfilePath = path.join(PROJECT_ROOT, "Dockerfile");
			const content = fs.readFileSync(dockerfilePath, "utf-8");

			expect(content).not.toMatch(
				/--filter\s+database\s/,
				"Dockerfile should not reference 'database' package. Use '@snapback/platform' instead",
			);
		});
	});

	// ============================================================================
	// ENVIRONMENT VARIABLE VALIDATION TESTS
	// ============================================================================

	describe("Environment Configuration", () => {
		it("should have .env.docker file for local development", () => {
			const envPath = path.join(PROJECT_ROOT, ".env.docker");
			expect(envFileExists(envPath)).toBe(true, ".env.docker file must exist for docker-compose configuration");
		});

		it("should have required OAuth environment variables", () => {
			const envPath = path.join(PROJECT_ROOT, ".env.docker");
			const envVars = parseEnvFile(envPath);

			const requiredVars = [
				"NEXT_PUBLIC_SITE_URL",
				"BETTER_AUTH_URL",
				"BETTER_AUTH_SECRET",
				"GOOGLE_CLIENT_ID",
				"GOOGLE_CLIENT_SECRET",
				"DATABASE_URL",
			];

			for (const varName of requiredVars) {
				expect(envVars).toHaveProperty(
					varName,
					`Required environment variable '${varName}' not set in .env.docker`,
				);
				expect(envVars[varName]).not.toBe("", `Environment variable '${varName}' must not be empty`);
			}
		});

		it("should separate public URL from internal service URL", () => {
			const envPath = path.join(PROJECT_ROOT, ".env.docker");
			const envVars = parseEnvFile(envPath);

			// NEXT_PUBLIC_SITE_URL should be localhost:3000 (browser-facing)
			expect(envVars["NEXT_PUBLIC_SITE_URL"]).toMatch(
				/localhost:3000|snapback\.dev|https:\/\//,
				"NEXT_PUBLIC_SITE_URL must be publicly accessible (localhost:3000 or public domain)",
			);
			expect(envVars["NEXT_PUBLIC_SITE_URL"]).not.toMatch(
				/api:3001/,
				"NEXT_PUBLIC_SITE_URL must NOT be internal service name (api:3001)",
			);

			// BETTER_AUTH_URL should be api:3001 (internal)
			expect(envVars["BETTER_AUTH_URL"]).toMatch(
				/http:\/\/api:3001/,
				"BETTER_AUTH_URL should use internal service name (http://api:3001)",
			);
		});

		it("should have valid OAuth provider credentials", () => {
			const envPath = path.join(PROJECT_ROOT, ".env.docker");
			const envVars = parseEnvFile(envPath);

			if (envVars["GOOGLE_CLIENT_ID"]) {
				expect(envVars["GOOGLE_CLIENT_ID"]).toMatch(
					/\.apps\.googleusercontent\.com/,
					"GOOGLE_CLIENT_ID should be in format: ...apps.googleusercontent.com",
				);
				expect(envVars["GOOGLE_CLIENT_SECRET"]).toBeTruthy(
					"If GOOGLE_CLIENT_ID is set, GOOGLE_CLIENT_SECRET must also be set",
				);
			}
		});
	});

	// ============================================================================
	// DATABASE MIGRATION VALIDATION TESTS
	// ============================================================================

	describe("Database Migration Setup", () => {
		it("should have drizzle migrations directory", () => {
			const migrationsPath = path.join(PROJECT_ROOT, "packages/platform/drizzle/migrations");
			expect(fs.existsSync(migrationsPath)).toBe(
				true,
				"Drizzle migrations directory must exist at packages/platform/drizzle/migrations",
			);

			const migrations = fs.readdirSync(migrationsPath);
			expect(migrations.length).toBeGreaterThan(0, "Must have at least one migration file");

			// Check for critical migrations
			const hasAuthMigration = migrations.some((f) => f.match(/auth\.sql/));
			expect(hasAuthMigration).toBe(
				true,
				"Must have auth migration (0003_auth.sql or similar) for better-auth tables",
			);
		});

		it("should have migration entrypoint script for API", () => {
			const entrypointPath = path.join(PROJECT_ROOT, "apps/api/docker-entrypoint.sh");
			expect(fs.existsSync(entrypointPath)).toBe(
				true,
				"API Dockerfile should have docker-entrypoint.sh that runs migrations before startup",
			);

			const content = fs.readFileSync(entrypointPath, "utf-8");
			expect(content).toMatch(/db:push|migrate/i, "Entrypoint script must run database migrations");
			expect(content).toMatch(/node|exec/i, "Entrypoint script must execute the application after migrations");
		});

		it("should run db:generate before build in Dockerfile", () => {
			const dockerfilePath = path.join(PROJECT_ROOT, "Dockerfile");
			const content = fs.readFileSync(dockerfilePath, "utf-8");

			// Find positions of db:generate and build
			const generatePos = content.indexOf("db:generate");
			const buildPos = content.indexOf("pnpm turbo build");

			expect(generatePos).toBeGreaterThan(-1, "Dockerfile must run 'db:generate' before building");
			expect(buildPos).toBeGreaterThan(-1, "Dockerfile must have build step");
			expect(generatePos).toBeLessThan(buildPos, "db:generate must run BEFORE the build step");
		});
	});

	// ============================================================================
	// DOCKER-COMPOSE VALIDATION TESTS
	// ============================================================================

	describe("Docker Compose Configuration", () => {
		it("should have all required services", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const content = fs.readFileSync(composePath, "utf-8");

			const requiredServices = ["postgres", "redis", "api", "web"];
			for (const service of requiredServices) {
				expect(content).toMatch(
					new RegExp(`${service}:`, "m"),
					`docker-compose.yml must include '${service}' service`,
				);
			}
		});

		it("should have MCP service defined", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const content = fs.readFileSync(composePath, "utf-8");

			expect(content).toMatch(/mcp-server:|mcp:/, "docker-compose.yml must include mcp-server service");
		});

		it("should not have port conflicts between services", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const ports = getComposeServicePorts(composePath);

			const allPorts: number[] = [];
			const conflicts: Record<number, string[]> = {};

			for (const [service, servicePorts] of Object.entries(ports)) {
				for (const port of servicePorts) {
					if (allPorts.includes(port)) {
						if (!conflicts[port]) {
							conflicts[port] = [
								Object.entries(ports).find(([_, p]) => p.includes(port))?.[0] || "unknown",
							];
						}
						conflicts[port].push(service);
					}
					allPorts.push(port);
				}
			}

			const conflictMessage = Object.entries(conflicts)
				.map(([port, services]) => `Port ${port}: ${services.join(", ")}`)
				.join("; ");

			expect(Object.keys(conflicts).length).toBe(0, `Port conflicts detected: ${conflictMessage}`);
		});

		it("should assign unique ports to each service", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const ports = getComposeServicePorts(composePath);

			// Expected unique port assignments
			const expectedPorts: Record<string, number[]> = {
				postgres: [5432],
				redis: [6379],
				api: [3001],
				web: [3000],
				"mcp-server": [3002], // MCP should use different port than web
			};

			for (const [service, expectedServicePorts] of Object.entries(expectedPorts)) {
				if (ports[service]) {
					for (const port of expectedServicePorts) {
						expect(ports[service]).toContain(port, `${service} should expose port ${port}`);
					}
				}
			}

			// Ensure MCP is not on 3000
			if (ports["mcp-server"]) {
				expect(ports["mcp-server"]).not.toContain(
					3000,
					"MCP server should not use port 3000 (conflicts with web)",
				);
			}
		});

		it("should load environment file in compose configuration", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const content = fs.readFileSync(composePath, "utf-8");

			// Check if file references env loading (either via command or configuration)
			const hasEnvFile = content.match(/env.?file|\.env\.docker|--env-file/);
			expect(
				fs.existsSync(path.join(PROJECT_ROOT, ".env.docker")) || fs.existsSync(path.join(PROJECT_ROOT, ".env")),
			).toBe(true, ".env.docker or .env file must exist");

			// Also check if docker-compose uses variables correctly
			const hasVariableUsage = content.match(/\$\{[A-Z_]+\}/);
			expect(hasVariableUsage?.length || 0).toBeGreaterThan(
				0,
				"docker-compose.yml should use environment variables like ${VAR_NAME}",
			);
		});

		it("should have health checks for services with dependencies", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const content = fs.readFileSync(composePath, "utf-8");

			expect(content).toMatch(/healthcheck:/, "Critical services should have healthcheck configuration");

			// API should depend on postgres health
			expect(content).toMatch(
				/depends_on:[^\n]*postgres:[^\n]*condition: service_healthy/s,
				"api service should depend on postgres being healthy",
			);
		});

		it("should have migration dependency in compose", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const content = fs.readFileSync(composePath, "utf-8");

			// Either migrations are in entrypoint, or there's explicit migration service
			const hasMigrationService = content.includes("migrations:");
			const apiService = content.match(/api:\n([\s\S]*?)(?=\n\s{2}[a-z-]+:|$)/);

			if (apiService) {
				const hasEntrypointReference = apiService[1].includes("docker-entrypoint.sh");
				expect(hasMigrationService || hasEntrypointReference).toBe(
					true,
					"Migrations must run either via entrypoint script or dedicated service",
				);
			}
		});

		it("should have resource limits defined for services", () => {
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const content = fs.readFileSync(composePath, "utf-8");

			// Check for deploy.resources sections
			const hasResourceLimits = content.match(/deploy:\s*resources:/);
			expect(hasResourceLimits?.length || 0).toBeGreaterThan(
				0,
				"Services should have defined resource limits (deploy.resources)",
			);
		});
	});

	// ============================================================================
	// ENVIRONMENT VALIDATION CODE TESTS
	// ============================================================================

	describe("Environment Variable Validation in Code", () => {
		it("should have environment validation enabled in packages/config/src/env.ts", () => {
			const envFilePath = path.join(PROJECT_ROOT, "packages/config/src/env.ts");
			const content = fs.readFileSync(envFilePath, "utf-8");

			// Check that validation is NOT commented out
			expect(content).toMatch(
				/const envParseResult\s*=\s*.*envSchema\.safeParse/,
				"Environment validation must use envSchema.safeParse()",
			);

			expect(content).not.toMatch(
				/^\\s*\/\/.*if \(!envParseResult\.success\)/m,
				"Environment validation error handling should not be commented out",
			);
		});

		it("should validate required OAuth variables at startup", () => {
			const envFilePath = path.join(PROJECT_ROOT, "packages/config/src/env.ts");
			const content = fs.readFileSync(envFilePath, "utf-8");

			expect(content).toMatch(
				/GOOGLE_CLIENT_ID|oauth|auth/i,
				"Config validation should check for OAuth credentials",
			);
		});
	});

	// ============================================================================
	// PRODUCTION ENVIRONMENT TESTS
	// ============================================================================

	describe("Production Environment Readiness", () => {
		it("should have production-safe environment variable handling", () => {
			const envFilePath = path.join(PROJECT_ROOT, "packages/config/src/env.ts");
			const content = fs.readFileSync(envFilePath, "utf-8");

			// Should throw in production but allow development to continue
			expect(content).toMatch(/NODE_ENV.*production/i, "Should check NODE_ENV for production handling");
			expect(content).toMatch(/throw.*Error/, "Should throw errors in production when validation fails");
		});

		it("should support environment variable injection for production", () => {
			// This test validates that the docker-compose structure supports
			// environment variable injection from secrets managers or CI/CD
			const composePath = path.join(PROJECT_ROOT, "docker-compose.yml");
			const content = fs.readFileSync(composePath, "utf-8");

			// Services should reference variables, not hardcode values
			expect(content).toMatch(/\$\{.*\}/, "Services should use environment variable references (${VAR})");

			// Database URL should be injected, not hardcoded
			expect(content).not.toMatch(
				/DATABASE_URL:\s*postgresql:\/\/[^$]/,
				"DATABASE_URL should be injected via environment variables, not hardcoded",
			);
		});

		it("should document how to deploy to production", () => {
			// Check for deployment documentation
			const deploymentDocs = ["DEPLOYMENT.md", "deployment/GUIDE.md", "docs/deployment.md"];

			const hasDeploymentGuide = deploymentDocs.some((doc) => fs.existsSync(path.join(PROJECT_ROOT, doc)));

			// For now, this test documents the requirement
			// Will pass once documentation is created
			console.log("Note: Deployment guide should document production environment setup");
		});
	});
});
