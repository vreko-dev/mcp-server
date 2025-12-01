#!/usr/bin/env tsx
/**
 * Full Audit Orchestrator for SnapBack
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface AuditStep {
	name: string;
	script: string;
	required: boolean;
}

interface AuditResult {
	step: string;
	passed: boolean;
	error?: string;
}

const AUDIT_STEPS: AuditStep[] = [
	{ name: "Static Analysis", script: "audit/run-audit.ts", required: true },
	{ name: "Test Smell Detection", script: "audit/detect-test-smells.ts", required: true },
	{ name: "Coverage Analysis", script: "audit/analyze-coverage.ts", required: true },
	{ name: "Mock Usage Analysis", script: "audit/analyze-mocks.ts", required: true },
	{ name: "API Change Detection", script: "audit/check-api-changes.ts", required: true },
	{ name: "Requirements Mapping", script: "audit/generate-mapping.ts", required: false },
];

function runCommand(command: string, cwd?: string): { success: boolean; stdout: string; stderr: string } {
	try {
		const result = execSync(command, {
			cwd: cwd || process.cwd(),
			encoding: "utf-8",
			stdio: "pipe",
		});
		return { success: true, stdout: result, stderr: "" };
	} catch (error: any) {
		return {
			success: false,
			stdout: error.stdout || "",
			stderr: error.stderr || error.message,
		};
	}
}

async function runAuditStep(step: AuditStep): Promise<AuditResult> {
	console.log(`\n🔍 Running ${step.name}...`);
	console.log("=".repeat(40));

	const scriptPath = path.resolve(__dirname, step.script);

	if (!fs.existsSync(scriptPath)) {
		return {
			step: step.name,
			passed: !step.required,
			error: `Script not found: ${scriptPath}`,
		};
	}

	try {
		const result = runCommand(`tsx ${scriptPath}`, path.resolve(__dirname));

		if (result.success) {
			console.log(`✅ ${step.name} completed successfully`);
			return { step: step.name, passed: true };
		}
		console.log(`❌ ${step.name} failed`);
		console.log("Error output:", result.stderr);
		return {
			step: step.name,
			passed: !step.required,
			error: result.stderr,
		};
	} catch (error) {
		console.log(`❌ ${step.name} failed with exception`);
		return {
			step: step.name,
			passed: !step.required,
			error: (error as Error).message,
		};
	}
}

async function runFullAudit() {
	console.log("🚀 Starting Full SnapBack Code Review & Test Audit");
	console.log("==================================================");

	// Ensure audit reports directory exists
	const reportsDir = path.resolve(__dirname, "../test/.audit-reports");
	if (!fs.existsSync(reportsDir)) {
		fs.mkdirSync(reportsDir, { recursive: true });
	}

	// Run each audit step
	const results: AuditResult[] = [];

	for (const step of AUDIT_STEPS) {
		const result = await runAuditStep(step);
		results.push(result);

		// If a required step fails, we might want to continue or stop based on policy
		if (!result.passed && step.required) {
			console.log(`\n⚠️ Required step "${step.name}" failed!`);
			if (process.env.FAIL_FAST === "true") {
				console.log("Exiting due to FAIL_FAST policy...");
				break;
			}
		}
	}

	// Generate final summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 FULL AUDIT SUMMARY");
	console.log("=".repeat(60));

	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => !r.passed).length;
	const total = results.length;

	results.forEach((result) => {
		const status = result.passed ? "✅ PASS" : "❌ FAIL";
		console.log(`${status} ${result.step}`);
	});

	console.log(`\n${"-".repeat(60)}`);
	console.log(`Total: ${passed}/${total} steps passed`);

	if (failed === 0) {
		console.log("🎉 All audit steps completed successfully!");
		return true;
	}
	const requiredFailures = results.filter((r) => !r.passed && AUDIT_STEPS.find((s) => s.name === r.step)?.required);
	if (requiredFailures.length === 0) {
		console.log("✅ All required audit steps passed (some optional steps failed)");
		return true;
	}
	console.log(`❌ ${requiredFailures.length} required audit step(s) failed:`);
	requiredFailures.forEach((failure) => {
		console.log(`   - ${failure.step}`);
	});
	return false;
}

// Run the full audit
runFullAudit()
	.then((success) => {
		if (!success) {
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error("Audit failed with error:", error);
		process.exit(1);
	});
