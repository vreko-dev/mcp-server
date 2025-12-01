#!/usr/bin/env node

/**
 * Script to analyze test coverage and suggest improvements
 *
 * This script helps identify areas that need better test coverage
 * and provides recommendations for improving the testing strategy.
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

console.log("🔍 Analyzing test coverage and structure...\n");

try {
	// Get the list of all components and pages
	const componentDirs = [
		"modules/ui/components",
		"modules/marketing/components",
		"modules/saas/shared/components",
		"modules/shared/components",
	];

	const appDirs = ["app/(marketing)", "app/(saas)", "app/api"];

	const testDirs = ["__tests__/components", "__tests__/api", "__tests__/lib", "__tests__/hooks"];

	// Check if vitest is installed
	let hasVitest = false;
	try {
		execSync("pnpm list vitest", {
			cwd: join(process.cwd(), "apps", "web"),
			stdio: "pipe",
		});
		hasVitest = true;
	} catch (_error) {
		// vitest not found
	}

	// Generate report
	const report = `
# Test Coverage Improvement Report

## Current Testing Structure

### Test Directories
${testDirs.map((dir) => `- ${dir}`).join("\n")}

### Component Directories
${componentDirs.map((dir) => `- ${dir}`).join("\n")}

### Application Directories
${appDirs.map((dir) => `- ${dir}`).join("\n")}

## Missing Tests Analysis

### Critical Missing Tests
1. Root layout component tests (app/layout.tsx)
2. Middleware tests for all middleware files
3. API route tests for incomplete implementations
4. Integration tests for key user flows
5. End-to-end tests for critical journeys

## Recommendations

### Immediate Actions
1. Add tests for the root layout component that applies fonts and global styles
2. Implement tests for all TODO-marked test files
3. Add integration tests for authentication flows
4. Create end-to-end tests for key user journeys

### Long-term Improvements
1. Increase overall test coverage to >70% as per project requirements
2. Implement visual regression testing for UI components
3. Add performance tests for critical components
4. Set up automated test coverage reporting

## Commands to Run Tests

### Unit Tests
\`\`\`bash
pnpm test:unit
\`\`\`

### Integration Tests
\`\`\`bash
pnpm test:int
\`\`\`

### Coverage Report
\`\`\`bash
pnpm test:coverage
\`\`\`

### Test UI
\`\`\`bash
pnpm test:ui
\`\`\`

## Test Structure Improvements

### Current Issues
1. Some test files are just placeholders with TODO comments
2. Missing tests for critical layout components
3. Incomplete API route tests
4. No clear test coverage metrics

### Suggested Structure
1. Organize tests by feature/module rather than type
2. Add test utilities for common testing scenarios
3. Implement proper mocking strategies
4. Add test data factories for consistent test data

## Next Steps

1. Run the current test suite to establish baseline coverage
2. Identify the most critical components that need tests
3. Create a testing roadmap prioritizing high-impact tests
4. Set up automated coverage reporting in CI/CD pipeline
5. Establish testing best practices and conventions for the team
`;

	// Write report to file
	const reportPath = join(process.cwd(), "TEST_IMPROVEMENT_REPORT.md");
	writeFileSync(reportPath, report);
	console.log("✅ Test analysis complete!");
	console.log(`📝 Detailed report saved to: ${reportPath}`);

	// Check if we can run tests
	if (hasVitest) {
		console.log("\n✅ Vitest is installed. You can run tests with the commands in the report.");
	} else {
		console.log("\n⚠️  Vitest not found. Install it with: pnpm add -D vitest");
	}
} catch (error) {
	console.error("❌ Error analyzing test structure:", error.message);
}
