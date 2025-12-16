#!/usr/bin/env npx tsx
/**
 * Security Validator - Blocks dangerous code patterns
 *
 * SOURCE: packages/core/src/guardian.ts (findSecurityIssues)
 *         packages/core/src/threat-detection.ts (detectThreats)
 *
 * VALIDATION GATE:
 * - eval() usage
 * - Function constructor
 * - Hardcoded secrets (passwords, API keys)
 * - Dangerous commands (rm -rf, DROP TABLE)
 *
 * CONTRACT:
 * - Input: --files=a.ts,b.ts or SNAPBACK_FILES env var
 * - Output: JSON to stdout
 * - Exit: 0 if pass, 1 if fail
 * - Timeout: 15s
 */

import { readFileSync } from "node:fs";
import * as esprima from "esprima";

interface ValidatorResult {
	status: "pass" | "fail";
	reason?: string;
	suggestion?: string;
	errors?: string[];
	details?: {
		threats: Array<{
			type: string;
			file: string;
			description: string;
			severity: number;
		}>;
	};
}

interface Threat {
	pattern: RegExp;
	description: string;
	severity: number;
}

// Dangerous code patterns (from threat-detection.ts)
const THREAT_PATTERNS: Record<string, Threat[]> = {
	critical: [
		{ pattern: /rm\s+-rf/i, description: "rm -rf command", severity: 1.0 },
		{ pattern: /DROP\s+TABLE/i, description: "DROP TABLE SQL", severity: 1.0 },
		{ pattern: /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/i, description: "DELETE all rows SQL", severity: 1.0 },
	],
	high: [
		{ pattern: /password\s*[:=]\s*['"]/i, description: "hardcoded password", severity: 0.8 },
		{ pattern: /api_?key\s*[:=]\s*['"]/i, description: "exposed API key", severity: 0.8 },
		{ pattern: /secret\s*[:=]\s*['"]/i, description: "hardcoded secret", severity: 0.8 },
		{ pattern: /token\s*[:=]\s*['"]/i, description: "hardcoded token", severity: 0.7 },
	],
};

/**
 * Detect AST-based security issues (eval, Function constructor)
 */
function findASTSecurityIssues(content: string, filePath: string): string[] {
	const issues: string[] = [];

	try {
		const ast = esprima.parseScript(content, { tolerant: true });

		const traverse = (node: any) => {
			if (!node) return;

			// Check for eval usage
			if (node.type === "CallExpression" && node.callee?.type === "Identifier" && node.callee.name === "eval") {
				issues.push(`${filePath}: eval() usage detected - security risk`);
			}

			// Check for Function constructor usage
			if (
				node.type === "NewExpression" &&
				node.callee?.type === "Identifier" &&
				node.callee.name === "Function"
			) {
				issues.push(`${filePath}: Function constructor usage detected - security risk`);
			}

			// Traverse child nodes
			for (const key in node) {
				if (Object.hasOwn(node, key)) {
					const child = node[key];
					if (typeof child === "object" && child !== null) {
						if (Array.isArray(child)) {
							child.forEach((childNode) => traverse(childNode));
						} else {
							traverse(child);
						}
					}
				}
			}
		};

		traverse(ast);
	} catch {
		// If parsing fails, skip AST checks (file might be TypeScript or JSX)
	}

	return issues;
}

/**
 * Detect pattern-based threats (secrets, dangerous commands)
 */
function findPatternThreats(
	content: string,
	filePath: string,
): Array<{
	type: string;
	file: string;
	description: string;
	severity: number;
}> {
	const threats: Array<{
		type: string;
		file: string;
		description: string;
		severity: number;
	}> = [];

	// Check critical threats
	for (const threat of THREAT_PATTERNS.critical) {
		const matches = content.match(threat.pattern);
		if (matches) {
			threats.push({
				type: "critical",
				file: filePath,
				description: threat.description,
				severity: threat.severity,
			});
		}
	}

	// Check high threats
	for (const threat of THREAT_PATTERNS.high) {
		const matches = content.match(threat.pattern);
		if (matches) {
			threats.push({
				type: "high",
				file: filePath,
				description: threat.description,
				severity: threat.severity,
			});
		}
	}

	return threats;
}

/**
 * Validate security for files
 */
function validateSecurity(files: string[]): ValidatorResult {
	const allThreats: Array<{
		type: string;
		file: string;
		description: string;
		severity: number;
	}> = [];
	const allErrors: string[] = [];

	for (const filePath of files) {
		try {
			const content = readFileSync(filePath, "utf8");

			// AST-based security checks
			const astIssues = findASTSecurityIssues(content, filePath);
			allErrors.push(...astIssues);

			// Pattern-based threat detection
			const patternThreats = findPatternThreats(content, filePath);
			allThreats.push(...patternThreats);
		} catch (error) {
			allErrors.push(
				`${filePath}: Failed to read file - ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// Fail if any threats detected
	if (allThreats.length > 0 || allErrors.length > 0) {
		const criticalThreats = allThreats.filter((t) => t.type === "critical");
		const hasCritical = criticalThreats.length > 0;

		return {
			status: "fail",
			reason: hasCritical
				? `Critical security threats detected: ${criticalThreats.map((t) => t.description).join(", ")}`
				: `Security issues detected: ${allErrors.length + allThreats.length} issue(s) found`,
			suggestion: hasCritical
				? "Remove dangerous commands immediately (rm -rf, DROP TABLE)"
				: "Review and fix security issues before proceeding",
			errors: [...allErrors, ...allThreats.map((t) => `${t.file}: ${t.description} (${t.type})`)],
			details: {
				threats: allThreats,
			},
		};
	}

	return {
		status: "pass",
	};
}

/**
 * Parse command-line arguments or environment variable
 */
function parseArgs(): string[] {
	const filesArg = process.argv.find((arg) => arg.startsWith("--files="));
	const filesEnv = process.env.SNAPBACK_FILES;

	if (filesArg) {
		return filesArg.replace("--files=", "").split(",");
	}

	if (filesEnv) {
		return filesEnv.split(",");
	}

	throw new Error("No files provided. Use --files=a.ts,b.ts or SNAPBACK_FILES env variable");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	try {
		const files = parseArgs();
		const result = validateSecurity(files);

		console.log(JSON.stringify(result));
		process.exit(result.status === "pass" ? 0 : 1);
	} catch (error) {
		const result: ValidatorResult = {
			status: "fail",
			reason: error instanceof Error ? error.message : String(error),
			errors: [error instanceof Error ? error.message : String(error)],
		};

		console.log(JSON.stringify(result));
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	void main();
}
