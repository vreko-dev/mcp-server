/**
 * TDD Tests for Turborepo Optimization
 *
 * Tests validate:
 * - Turborepo 2.3.4 upgrade
 * - Phase-based pipeline configuration
 * - Docker integration with turbo prune
 * - Affected package detection
 *
 * @see turbo.json
 * @see package.json
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

describe("Turborepo Configuration - TDD", () => {
	let turboConfig: any;
	let packageJson: any;
	let pnpmWorkspace: any;

	beforeAll(() => {
		const rootDir = path.resolve(__dirname, "../..");
		turboConfig = JSON.parse(readFileSync(path.join(rootDir, "turbo.json"), "utf-8"));
		packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf-8"));
		const pnpmWorkspaceContent = readFileSync(path.join(rootDir, "pnpm-workspace.yaml"), "utf-8");
		pnpmWorkspace = pnpmWorkspaceContent;
	});

	describe("🔴 RED: Version Upgrades", () => {
		it("should be using Turborepo 2.3.4 or higher", () => {
			// GIVEN: Package catalog with turbo version
			const turboVersion = pnpmWorkspace.match(/turbo:\s*([^\s]+)/)?.[1];

			// THEN: Version should be 2.3.4 or higher
			expect(turboVersion).toBeDefined();
			expect(turboVersion).toMatch(/^(2\.3\.[4-9]|2\.[4-9]\.\d+|[3-9]\.\d+\.\d+)/);
		});

		it("should have turbo installed as devDependency", () => {
			// GIVEN: Package.json devDependencies
			const hasTurbo = packageJson.devDependencies?.turbo;

			// THEN: Should use catalog reference
			expect(hasTurbo).toBe("catalog:");
		});
	});

	describe("🔴 RED: Phase-Based Pipeline", () => {
		it("should define docker-build phase", () => {
			// GIVEN: turbo.json tasks
			const dockerBuildTask = turboConfig.tasks?.["docker-build"];

			// THEN: Should exist and depend on build
			expect(dockerBuildTask).toBeDefined();
			expect(dockerBuildTask.dependsOn).toContain("build");
			expect(dockerBuildTask.cache).toBe(false); // Side-effect task
		});

		it("should define deploy phase", () => {
			// GIVEN: turbo.json tasks
			const deployTask = turboConfig.tasks?.deploy;

			// THEN: Should exist and depend on test + docker-build
			expect(deployTask).toBeDefined();
			expect(deployTask.dependsOn).toContain("test");
			expect(deployTask.dependsOn).toContain("docker-build");
			expect(deployTask.cache).toBe(false);
		});

		it("should define sync-open-source phase", () => {
			// GIVEN: turbo.json tasks
			const syncOssTask = turboConfig.tasks?.["sync-open-source"];

			// THEN: Should exist and depend on build
			expect(syncOssTask).toBeDefined();
			expect(syncOssTask.dependsOn).toContain("build");
			expect(syncOssTask.cache).toBe(false);
		});

		it("should define release phase", () => {
			// GIVEN: turbo.json tasks
			const releaseTask = turboConfig.tasks?.release;

			// THEN: Should exist and depend on deploy
			expect(releaseTask).toBeDefined();
			expect(releaseTask.dependsOn).toContain("deploy");
			expect(releaseTask.cache).toBe(false);
		});
	});

	describe("🔴 RED: Environment Variable Management", () => {
		it("should define globalEnv for hash-affecting variables", () => {
			// GIVEN: turbo.json globalEnv
			const globalEnv = turboConfig.globalEnv;

			// THEN: Should include critical env vars
			expect(globalEnv).toContain("DATABASE_URL");
			expect(globalEnv).toContain("REDIS_URL");
		});

		it("should define globalPassThroughEnv for non-hashing variables", () => {
			// GIVEN: turbo.json globalPassThroughEnv
			const passThrough = turboConfig.globalPassThroughEnv;

			// THEN: Should include CI/deployment flags
			expect(passThrough).toContain("NODE_OPTIONS");
			expect(passThrough).toContain("CI");
			expect(passThrough).toContain("DOCKER_BUILDKIT");
		});

		it("should configure passThroughEnv for docker-build", () => {
			// GIVEN: docker-build task
			const dockerBuildTask = turboConfig.tasks?.["docker-build"];

			// THEN: Should have passThroughEnv for Docker flags
			expect(dockerBuildTask?.passThroughEnv).toBeDefined();
			expect(dockerBuildTask?.passThroughEnv).toContain("DOCKER_BUILDKIT");
		});
	});

	describe("🔴 RED: Smart Deploy Commands", () => {
		it("should have deploy:affected script", () => {
			// GIVEN: package.json scripts
			const deployAffected = packageJson.scripts?.["deploy:affected"];

			// THEN: Should use --filter=...[origin/main]
			expect(deployAffected).toBeDefined();
			expect(deployAffected).toContain("--filter=...[origin/main]");
		});

		it("should have docker:affected script", () => {
			// GIVEN: package.json scripts
			const dockerAffected = packageJson.scripts?.["docker:affected"];

			// THEN: Should run docker-build with filter
			expect(dockerAffected).toBeDefined();
			expect(dockerAffected).toContain("docker-build");
			expect(dockerAffected).toContain("--filter=...[origin/main]");
		});

		it("should have test:affected script", () => {
			// GIVEN: package.json scripts
			const testAffected = packageJson.scripts?.["test:affected"];

			// THEN: Should run tests with filter
			expect(testAffected).toBeDefined();
			expect(testAffected).toContain("test");
			expect(testAffected).toContain("--filter=...[origin/main]");
		});

		it("should have build:affected script", () => {
			// GIVEN: package.json scripts
			const buildAffected = packageJson.scripts?.["build:affected"];

			// THEN: Should run build with filter
			expect(buildAffected).toBeDefined();
			expect(buildAffected).toContain("build");
			expect(buildAffected).toContain("--filter=...[origin/main]");
		});
	});

	describe("🔴 RED: Workspace Package Scripts", () => {
		it("should validate web app has deploy script", async () => {
			// GIVEN: apps/web/package.json
			const webPkg = JSON.parse(readFileSync(path.resolve(__dirname, "../../apps/web/package.json"), "utf-8"));

			// THEN: Should have deploy script
			expect(webPkg.scripts?.deploy).toBeDefined();
		});

		it("should validate api app has docker-build script", async () => {
			// GIVEN: apps/api/package.json
			const apiPkg = JSON.parse(readFileSync(path.resolve(__dirname, "../../apps/api/package.json"), "utf-8"));

			// THEN: Should have docker-build script
			expect(apiPkg.scripts?.["docker-build"]).toBeDefined();
		});

		it("should validate mcp-server has deploy script", async () => {
			// GIVEN: apps/mcp-server/package.json
			const mcpPkg = JSON.parse(
				readFileSync(path.resolve(__dirname, "../../apps/mcp-server/package.json"), "utf-8"),
			);

			// THEN: Should have deploy script
			expect(mcpPkg.scripts?.deploy).toBeDefined();
		});
	});

	describe("🔴 RED: Turbo Cache Configuration", () => {
		it("should cache build task outputs", () => {
			// GIVEN: build task
			const buildTask = turboConfig.tasks?.build;

			// THEN: Should have outputs defined
			expect(buildTask.outputs).toBeDefined();
			expect(buildTask.outputs).toContain("dist/**");
			expect(buildTask.outputs).toContain(".next/**");
		});

		it("should not cache side-effect tasks", () => {
			// GIVEN: Side-effect tasks
			const sideEffectTasks = ["deploy", "docker-build", "sync-open-source", "release"];

			// THEN: All should have cache: false
			for (const taskName of sideEffectTasks) {
				const task = turboConfig.tasks?.[taskName];
				expect(task?.cache).toBe(false);
			}
		});

		it("should have proper dependency chain", () => {
			// GIVEN: Task pipeline
			// build -> test -> docker-build -> deploy -> release

			const buildTask = turboConfig.tasks?.build;
			const testTask = turboConfig.tasks?.test;
			const dockerBuildTask = turboConfig.tasks?.["docker-build"];
			const deployTask = turboConfig.tasks?.deploy;
			const releaseTask = turboConfig.tasks?.release;

			// THEN: Dependency chain should be correct
			expect(testTask.dependsOn).toContain("^build");
			expect(dockerBuildTask.dependsOn).toContain("build");
			expect(deployTask.dependsOn).toContain("test");
			expect(deployTask.dependsOn).toContain("docker-build");
			expect(releaseTask.dependsOn).toContain("deploy");
		});
	});
});

describe("Next.js 16 Upgrade - TDD", () => {
	describe("🔴 RED: Next.js Version", () => {
		it("should be using Next.js 16.x", () => {
			// GIVEN: pnpm-workspace.yaml catalog
			const rootDir = path.resolve(__dirname, "../..");
			const pnpmWorkspace = readFileSync(path.join(rootDir, "pnpm-workspace.yaml"), "utf-8");

			const nextVersion = pnpmWorkspace.match(/next:\s*([^\s]+)/)?.[1];

			// THEN: Should be version 16.x
			expect(nextVersion).toBeDefined();
			expect(nextVersion).toMatch(/^16\./);
		});

		it("should have Turbopack enabled in web app dev script", () => {
			// GIVEN: apps/web/package.json
			const webPkg = JSON.parse(readFileSync(path.resolve(__dirname, "../../apps/web/package.json"), "utf-8"));

			// THEN: dev script should include --turbopack
			expect(webPkg.scripts?.dev).toContain("--turbopack");
		});

		it("should have Turbopack enabled in docs app dev script", () => {
			// GIVEN: apps/docs/package.json
			const docsPkg = JSON.parse(readFileSync(path.resolve(__dirname, "../../apps/docs/package.json"), "utf-8"));

			// THEN: dev script should include --turbopack
			expect(docsPkg.scripts?.dev).toContain("--turbopack");
		});
	});
});
