#!/usr/bin/env node

/**
 * Validation Script for Docker + Turbo Integration
 *
 * Verifies production Dockerfiles use turbo prune for optimal builds
 * Following TDD principles with comprehensive validation
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
let allPassed = true;

console.log("🐳 Validating Docker + Turbo Integration...\n");

// Test 1: Check production Dockerfiles exist
console.log("✅ Test 1: Production Dockerfiles");
const requiredDockerfiles = [
	"apps/api/Dockerfile.prod",
	"apps/mcp-server/Dockerfile.prod",
	"apps/web/Dockerfile.prod",
];

let missingDockerfiles = [];
for (const dockerfile of requiredDockerfiles) {
	const filePath = path.join(rootDir, dockerfile);
	if (!fs.existsSync(filePath)) {
		missingDockerfiles.push(dockerfile);
	}
}

if (missingDockerfiles.length === 0) {
	console.log("   ✓ All production Dockerfiles present");
	console.log(`   Files: ${requiredDockerfiles.join(", ")}\n`);
} else {
	console.log(
		`   ✗ FAILED: Missing Dockerfiles: ${missingDockerfiles.join(", ")}\n`
	);
	allPassed = false;
}

// Test 2: Validate turbo prune usage
console.log("✅ Test 2: Turbo Prune Integration");
const dockerfilesToCheck = [
	{ path: 'apps/api/Dockerfile.prod', package: '@snapback/api' },
	{
		path: "apps/mcp-server/Dockerfile.prod",
		package: "@snapback/mcp-server",
	},
	{ path: "apps/web/Dockerfile.prod", package: "@snapback/web" },
];

let filesWithTurboPrune = 0;
let filesWithPrunerStage = 0;

for (const { path: dockerPath, package: pkgName } of dockerfilesToCheck) {
	const filePath = path.join(rootDir, dockerPath);
	if (fs.existsSync(filePath)) {
		const content = fs.readFileSync(filePath, "utf-8");

		// Check for pruner stage
		if (content.includes("FROM base AS pruner")) {
			filesWithPrunerStage++;
		}

		// Check for turbo prune command
		if (content.includes(`turbo prune ${pkgName}`)) {
			filesWithTurboPrune++;
			console.log(
				`   ✓ ${dockerPath}: turbo prune configured for ${pkgName}`
			);
		} else {
			console.log(
				`   ✗ ${dockerPath}: Missing turbo prune for ${pkgName}`
			);
			allPassed = false;
		}
	}
}

if (
	filesWithTurboPrune === dockerfilesToCheck.length &&
	filesWithPrunerStage === dockerfilesToCheck.length
) {
	console.log(`   ✓ All Dockerfiles use turbo prune optimization\n`);
} else {
	console.log(`   ✗ FAILED: Not all Dockerfiles use turbo prune\n`);
	allPassed = false;
}

// Test 3: Validate multi-stage build pattern
console.log("✅ Test 3: Multi-Stage Build Pattern");
const requiredStages = ["base", "pruner", "deps", "builder", "runner"];
let allDockerfilesHaveStages = true;

for (const { path: dockerPath } of dockerfilesToCheck) {
	const filePath = path.join(rootDir, dockerPath);
	if (fs.existsSync(filePath)) {
		const content = fs.readFileSync(filePath, "utf-8");
		const missingStages = requiredStages.filter(
			(stage) => !content.includes(`AS ${stage}`)
		);

		if (missingStages.length === 0) {
			console.log(
				`   ✓ ${dockerPath}: All stages present (${requiredStages.join(
					", "
				)})`
			);
		} else {
			console.log(
				`   ✗ ${dockerPath}: Missing stages: ${missingStages.join(
					", "
				)}`
			);
			allDockerfilesHaveStages = false;
			allPassed = false;
		}
	}
}

if (allDockerfilesHaveStages) {
	console.log(`   ✓ All Dockerfiles follow multi-stage pattern\n`);
} else {
	console.log(`\n`);
}

// Test 4: Check security hardening
console.log("✅ Test 4: Security Hardening");
const securityFeatures = [
	{ name: "non-root user", pattern: /USER (apiuser|mcpuser|nextjs)/ },
	{ name: "dumb-init", pattern: /dumb-init/ },
	{ name: "Alpine Linux", pattern: /FROM node:.*-alpine/ },
	{ name: "Health check", pattern: /HEALTHCHECK/ },
];

let allSecurityFeaturesPresent = true;

for (const { path: dockerPath } of dockerfilesToCheck) {
	const filePath = path.join(rootDir, dockerPath);
	if (fs.existsSync(filePath)) {
		const content = fs.readFileSync(filePath, "utf-8");
		const missingFeatures = securityFeatures.filter(
			({ pattern }) => !pattern.test(content)
		);

		if (missingFeatures.length === 0) {
			console.log(`   ✓ ${dockerPath}: All security features present`);
		} else {
			console.log(
				`   ✗ ${dockerPath}: Missing: ${missingFeatures
					.map((f) => f.name)
					.join(", ")}`
			);
			allSecurityFeaturesPresent = false;
			allPassed = false;
		}
	}
}

if (allSecurityFeaturesPresent) {
	console.log(`   ✓ All Dockerfiles include security hardening\n`);
} else {
	console.log(`\n`);
}

// Test 5: Validate Docker build scripts
console.log("✅ Test 5: Docker Build Scripts");
const packagesToCheck = [
	{ path: "apps/web/package.json", name: "web" },
	{ path: "apps/api/package.json", name: "api" },
	{ path: "apps/mcp-server/package.json", name: "mcp-server" },
];

let allPackagesHaveScripts = true;

for (const { path: pkgPath, name } of packagesToCheck) {
	const filePath = path.join(rootDir, pkgPath);
	if (fs.existsSync(filePath)) {
		const pkg = JSON.parse(fs.readFileSync(filePath, "utf-8"));

		const hasDockerBuild = pkg.scripts && pkg.scripts["docker-build"];
		const hasDockerBuildDev =
			pkg.scripts && pkg.scripts["docker-build:dev"];
		const usesProdDockerfile =
			hasDockerBuild &&
			pkg.scripts["docker-build"].includes("Dockerfile.prod");

		if (hasDockerBuild && hasDockerBuildDev && usesProdDockerfile) {
			console.log(
				`   ✓ ${name}: docker-build and docker-build:dev scripts present`
			);
		} else {
			console.log(
				`   ✗ ${name}: Missing docker build scripts or not using Dockerfile.prod`
			);
			allPackagesHaveScripts = false;
			allPassed = false;
		}
	}
}

if (allPackagesHaveScripts) {
	console.log(`   ✓ All packages have docker-build scripts\n`);
} else {
	console.log(`\n`);
}

// Test 6: Check Next.js standalone output
console.log("✅ Test 6: Next.js Standalone Output");
const nextConfigPath = path.join(rootDir, "apps/web/next.config.mjs");
if (fs.existsSync(nextConfigPath)) {
	const nextConfig = fs.readFileSync(nextConfigPath, "utf-8");

	if (nextConfig.includes('output: "standalone"')) {
		console.log(
			"   ✓ Next.js standalone output enabled for Docker optimization\n"
		);
	} else {
		console.log("   ✗ FAILED: Next.js standalone output not configured\n");
		allPassed = false;
	}
} else {
	console.log("   ✗ FAILED: next.config.mjs not found\n");
	allPassed = false;
}

// Test 7: Validate layer caching optimization
console.log("✅ Test 7: Layer Caching Optimization");
let allUseCacheMounts = true;

for (const { path: dockerPath } of dockerfilesToCheck) {
	const filePath = path.join(rootDir, dockerPath);
	if (fs.existsSync(filePath)) {
		const content = fs.readFileSync(filePath, "utf-8");

		// Check for pnpm cache mount
		if (
			content.includes("--mount=type=cache") &&
			content.includes("/pnpm/store")
		) {
			console.log(`   ✓ ${dockerPath}: pnpm cache mount configured`);
		} else {
			console.log(`   ✗ ${dockerPath}: Missing pnpm cache mount`);
			allUseCacheMounts = false;
			allPassed = false;
		}
	}
}

if (allUseCacheMounts) {
	console.log(`   ✓ All Dockerfiles use cache mounts for faster builds\n`);
} else {
	console.log(`\n`);
}

// Final result
console.log("\n" + "=".repeat(50));
if (allPassed) {
	console.log("🎉 All tests passed! Docker + Turbo integration complete.");
	console.log("\n📊 Summary:");
	console.log("  • Production Dockerfiles with turbo prune ✓");
	console.log("  • Multi-stage builds (5 stages) ✓");
	console.log("  • Security hardening (non-root, dumb-init, Alpine) ✓");
	console.log("  • Docker build scripts in packages ✓");
	console.log("  • Next.js standalone output ✓");
	console.log("  • Layer caching optimization ✓");
	console.log("\n🚀 Ready to build:");
	console.log(
		"  pnpm --filter @snapback/web docker-build       # Build web (prod)"
	);
	console.log(
		"  pnpm --filter @snapback/api docker-build       # Build API (prod)"
	);
	console.log(
		"  pnpm --filter @snapback/mcp-server docker-build  # Build MCP (prod)"
	);
	console.log(
		"  pnpm docker:affected                           # Build all changed (via Turbo)"
	);
	console.log("\n📦 Expected improvements:");
	console.log("  • 60-80% smaller Docker context (turbo prune)");
	console.log("  • 5-10x faster builds (layer caching)");
	console.log("  • Minimal final images (multi-stage)");
	console.log("  • Production-grade security (non-root + hardening)");
	process.exit(0);
} else {
	console.log("❌ Some tests failed. Please review the output above.");
	process.exit(1);
}
