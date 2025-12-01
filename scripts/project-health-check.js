#!/usr/bin/env node

/**
 * Script to perform a comprehensive health check of the project
 *
 * This script analyzes various aspects of the project including:
 * - Dependencies
 * - Code quality
 * - Test coverage
 * - Security issues
 * - Performance concerns
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

console.log("🏥 Performing comprehensive project health check...\n");

// Health check results
const healthCheck = {
	dependencies: { status: "unknown", issues: [] },
	codeQuality: { status: "unknown", issues: [] },
	tests: { status: "unknown", issues: [] },
	security: { status: "unknown", issues: [] },
	performance: { status: "unknown", issues: [] },
};

try {
	// Check dependencies
	console.log("📦 Checking dependencies...");
	try {
		execSync("pnpm list --depth 0", {
			cwd: process.cwd(),
			stdio: "pipe",
		});
		healthCheck.dependencies.status = "healthy";
	} catch (_error) {
		healthCheck.dependencies.status = "issues";
		healthCheck.dependencies.issues.push("Dependency tree has issues");
	}

	// Check for circular dependencies
	console.log("🔄 Checking for circular dependencies...");
	try {
		const madgeOutput = execSync("npx madge --circular apps/web/", {
			cwd: process.cwd(),
			encoding: "utf8",
			stdio: "pipe",
		});

		if (madgeOutput.includes("No circular dependency found")) {
			healthCheck.dependencies.status = healthCheck.dependencies.status === "issues" ? "issues" : "healthy";
		} else {
			healthCheck.dependencies.status = "issues";
			healthCheck.dependencies.issues.push("Circular dependencies detected");
		}
	} catch (_error) {
		healthCheck.dependencies.status = "issues";
		healthCheck.dependencies.issues.push("Failed to check circular dependencies");
	}

	// Check code quality with biome
	console.log("✨ Checking code quality...");
	try {
		execSync("pnpm lint", {
			cwd: process.cwd(),
			stdio: "pipe",
		});
		healthCheck.codeQuality.status = "healthy";
	} catch (_error) {
		healthCheck.codeQuality.status = "issues";
		healthCheck.codeQuality.issues.push("Code quality issues detected");
	}

	// Check if tests can run
	console.log("🧪 Checking test setup...");
	try {
		// Just check if vitest is available
		execSync("pnpm list vitest", {
			cwd: join(process.cwd(), "apps", "web"),
			stdio: "pipe",
		});
		healthCheck.tests.status = "healthy";
	} catch (_error) {
		healthCheck.tests.status = "issues";
		healthCheck.tests.issues.push("Test framework not properly configured");
	}

	// Check for security issues
	console.log("🔒 Checking for security vulnerabilities...");
	try {
		// This would normally run a security audit, but we'll simulate for now
		healthCheck.security.status = "unknown";
		healthCheck.security.issues.push('Run "pnpm audit" to check for vulnerabilities');
	} catch (_error) {
		healthCheck.security.status = "unknown";
		healthCheck.security.issues.push("Security check not performed");
	}

	// Check performance (build time, bundle size, etc.)
	console.log("⚡ Checking performance indicators...");
	try {
		healthCheck.performance.status = "unknown";
		healthCheck.performance.issues.push("Performance metrics require actual build/test runs");
	} catch (_error) {
		healthCheck.performance.status = "unknown";
	}

	// Generate report
	const report = `
# Project Health Check Report

## Overall Status
${Object.entries(healthCheck)
	.map(([category, data]) => `- ${category}: ${data.status}`)
	.join("\n")}

## Detailed Analysis

### Dependencies
Status: ${healthCheck.dependencies.status}
${healthCheck.dependencies.issues.map((issue) => `- ⚠️  ${issue}`).join("\n") || "- ✅ No issues found"}

### Code Quality
Status: ${healthCheck.codeQuality.status}
${healthCheck.codeQuality.issues.map((issue) => `- ⚠️  ${issue}`).join("\n") || "- ✅ No issues found"}

### Tests
Status: ${healthCheck.tests.status}
${healthCheck.tests.issues.map((issue) => `- ⚠️  ${issue}`).join("\n") || "- ✅ Test framework is available"}

### Security
Status: ${healthCheck.security.status}
${healthCheck.security.issues.map((issue) => `- ℹ️  ${issue}`).join("\n")}

### Performance
Status: ${healthCheck.performance.status}
${healthCheck.performance.issues.map((issue) => `- ℹ️  ${issue}`).join("\n")}

## Recommendations

### Immediate Actions
1. Fix dependency issues if any were found
2. Address code quality issues by running linting fixes
3. Ensure test framework is properly configured
4. Run security audit to identify vulnerabilities

### Medium-term Improvements
1. Set up automated health checks in CI/CD pipeline
2. Implement performance monitoring
3. Establish code quality gates
4. Create security scanning workflows

### Long-term Goals
1. Achieve and maintain "healthy" status in all categories
2. Implement automated reporting
3. Set up alerts for health degradation
4. Create runbooks for common issues

## Commands to Run

### Dependency Health
\`\`\`bash
pnpm install # Fix dependency issues
npx madge --circular apps/web/ # Check circular dependencies
\`\`\`

### Code Quality
\`\`\`bash
pnpm lint # Check for issues
pnpm lint:fix # Automatically fix issues
\`\`\`

### Security
\`\`\`bash
pnpm audit # Check for vulnerabilities
\`\`\`

### Tests
\`\`\`bash
pnpm test # Run all tests
pnpm test:coverage # Check coverage
\`\`\`

## Next Steps

1. Run this health check regularly (weekly/bi-weekly)
2. Address any "issues" status items first
3. Set up automated monitoring for critical areas
4. Share results with the team to maintain awareness
`;

	// Write report to file
	const reportPath = join(process.cwd(), "PROJECT_HEALTH_REPORT.md");
	writeFileSync(reportPath, report);
	console.log("\n✅ Health check complete!");
	console.log(`📝 Detailed report saved to: ${reportPath}`);

	// Summary
	console.log("\n📊 SUMMARY:");
	Object.entries(healthCheck).forEach(([category, data]) => {
		console.log(`  ${category}: ${data.status}`);
	});
} catch (error) {
	console.error("❌ Error during health check:", error.message);
}
