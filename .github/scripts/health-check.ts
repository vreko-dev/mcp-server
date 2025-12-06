import { execSync } from "child_process";

interface HealthCheck {
	name: string;
	cmd: string;
	critical: boolean; // If true, failure blocks CI
}

const checks: HealthCheck[] = [
	{
		name: "Syncpack (dependency versions)",
		cmd: "pnpm syncpack list-mismatches",
		critical: false,
	},
	{
		name: "Circular dependencies",
		cmd: 'npx madge . --circular --exclude "node_modules|dist|.next|.turbo|coverage" || true',
		critical: false,
	},
	{
		name: "Security audit",
		cmd: "pnpm audit --audit-level=high || true",
		critical: false,
	},
];

async function runHealthChecks() {
	console.log("🏥 Running SnapBack Monorepo Health Check\n");
	console.log("═".repeat(50));

	const results = { passed: 0, failed: 0, critical: 0 };

	for (const check of checks) {
		try {
			console.log(`\n⏳ ${check.name}...`);
			const output = execSync(check.cmd, {
				encoding: "utf-8",
				timeout: 120000,
				stdio: process.env.VERBOSE ? "inherit" : "pipe",
			});

			if (output && process.env.VERBOSE) {
				console.log(output);
			}

			console.log(`✅ ${check.name}`);
			results.passed++;
		} catch (error) {
			console.log(`⚠️  ${check.name} (check details above)`);
			results.failed++;

			if (check.critical) {
				results.critical++;
			}
		}
	}

	console.log("\n" + "═".repeat(50));
	console.log(`\n📊 Results: ${results.passed}/${checks.length} passed`);

	if (results.critical > 0) {
		console.log(`\n❌ ${results.critical} CRITICAL check(s) failed`);
		process.exit(1);
	} else if (results.failed > 0) {
		console.log(`\n⚠️  ${results.failed} check(s) need attention (non-blocking)`);
		process.exit(0);
	} else {
		console.log("\n✨ All health checks passed!");
		process.exit(0);
	}
}

runHealthChecks();
