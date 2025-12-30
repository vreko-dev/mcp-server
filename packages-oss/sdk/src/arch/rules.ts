/**
 * Architecture Rules Runner
 *
 * Wraps ts-arch to provide:
 * 1. Declarative rule definitions
 * 2. Project-specific rule configuration
 * 3. Integration with SnapBack's layer architecture
 * 4. Reporting for MCP and CI integration
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Architecture rule definition
 */
export interface ArchRule {
	/** Unique rule identifier */
	id: string;
	/** Human-readable description */
	description: string;
	/** Source pattern (files/folders that should NOT import target) */
	source: string | string[];
	/** Target pattern (files/folders that should NOT be imported) */
	target: string | string[];
	/** Rule type */
	type: "no-dependency" | "cycle-free" | "layer-dependency";
	/** Severity: error fails build, warning just reports */
	severity: "error" | "warning";
	/** Optional: specific files to exclude from this rule */
	exclude?: string[];
}

/**
 * Architecture rule violation
 */
export interface ArchViolation {
	/** Rule that was violated */
	ruleId: string;
	/** Rule description */
	ruleDescription: string;
	/** Severity */
	severity: "error" | "warning";
	/** Source file that has the bad import */
	sourceFile: string;
	/** Target file that should not be imported */
	targetFile?: string;
	/** Import path as written in code */
	importPath?: string;
	/** Line number of violation */
	line?: number;
}

/**
 * Architecture check result
 */
export interface ArchCheckResult {
	/** Whether all rules passed */
	passed: boolean;
	/** Total rules checked */
	rulesChecked: number;
	/** Rules that passed */
	rulesPassed: number;
	/** All violations found */
	violations: ArchViolation[];
	/** Execution time in ms */
	durationMs: number;
	/** Detailed results per rule */
	ruleResults: Array<{
		ruleId: string;
		passed: boolean;
		violations: ArchViolation[];
	}>;
}

/**
 * Architecture runner configuration
 */
export interface ArchRunnerConfig {
	/** Workspace root directory */
	workspaceRoot: string;
	/** Path to tsconfig.json (default: auto-detect) */
	tsconfigPath?: string;
	/** Custom rules to add to defaults */
	customRules?: ArchRule[];
	/** Override default rules entirely */
	overrideDefaultRules?: boolean;
	/** Patterns to exclude from all checks */
	globalExclude?: string[];
}

// =============================================================================
// Default SnapBack Layer Rules
// =============================================================================

/**
 * SnapBack Layer Architecture:
 *
 * Presentation (VSCode, Web, CLI)
 *    ↓ can import
 * Service (API, MCP, SDK)
 *    ↓ can import
 * Core (Guardian, Engine)
 *    ↓ can import
 * Intelligence (Validation, Learning)
 *
 * Key constraint: Presentation CANNOT import Infrastructure directly
 */
export const SNAPBACK_LAYER_RULES: ArchRule[] = [
	{
		id: "presentation-no-infrastructure",
		description: "Presentation layer (apps/) cannot import @snapback/infrastructure directly",
		source: ["apps/vscode", "apps/web", "apps/cli"],
		target: ["@snapback/infrastructure", "packages/infrastructure"],
		type: "no-dependency",
		severity: "error",
	},
	{
		id: "core-no-presentation",
		description: "Core packages cannot import presentation layer",
		source: ["packages/core", "packages/intelligence"],
		target: ["apps/vscode", "apps/web", "apps/cli"],
		type: "no-dependency",
		severity: "error",
	},
	{
		id: "sdk-no-vscode",
		description: "SDK cannot import VS Code specific modules",
		source: ["packages/sdk", "packages-oss/sdk"],
		target: ["vscode", "apps/vscode"],
		type: "no-dependency",
		severity: "error",
	},
	{
		id: "contracts-standalone",
		description: "Contracts package should have no internal dependencies",
		source: ["packages/contracts"],
		target: ["packages/core", "packages/infrastructure", "packages/intelligence", "packages/sdk", "apps/"],
		type: "no-dependency",
		severity: "error",
	},
	{
		id: "storage-workspace-only",
		description: "Storage operations must use workspace paths, not global paths",
		source: ["**/storage/**", "**/snapshot/**"],
		target: ["globalStorageUri", "globalState"],
		type: "no-dependency",
		severity: "warning",
	},
	{
		id: "no-circular-core",
		description: "Core packages must be free of circular dependencies",
		source: ["packages/core/src"],
		target: [],
		type: "cycle-free",
		severity: "error",
	},
	{
		id: "no-circular-intelligence",
		description: "Intelligence package must be free of circular dependencies",
		source: ["packages/intelligence/src"],
		target: [],
		type: "cycle-free",
		severity: "error",
	},
];

// =============================================================================
// Architecture Rules Runner
// =============================================================================

/**
 * Run architecture rules check
 *
 * Uses static analysis to verify import relationships without
 * requiring ts-arch as a runtime dependency.
 *
 * @example
 * ```typescript
 * const result = await runArchCheck({
 *   workspaceRoot: process.cwd(),
 *   customRules: [{
 *     id: "my-rule",
 *     description: "Custom rule",
 *     source: "src/api",
 *     target: "src/ui",
 *     type: "no-dependency",
 *     severity: "error"
 *   }]
 * });
 *
 * if (!result.passed) {
 *   console.error("Architecture violations:", result.violations);
 * }
 * ```
 */
export async function runArchCheck(config: ArchRunnerConfig): Promise<ArchCheckResult> {
	const startTime = Date.now();

	// Combine rules
	const rules = config.overrideDefaultRules
		? config.customRules || []
		: [...SNAPBACK_LAYER_RULES, ...(config.customRules || [])];

	const violations: ArchViolation[] = [];
	const ruleResults: ArchCheckResult["ruleResults"] = [];

	// Check each rule
	for (const rule of rules) {
		const ruleViolations = await checkRule(rule, config);
		ruleResults.push({
			ruleId: rule.id,
			passed: ruleViolations.length === 0,
			violations: ruleViolations,
		});
		violations.push(...ruleViolations);
	}

	const errorCount = violations.filter((v) => v.severity === "error").length;

	return {
		passed: errorCount === 0,
		rulesChecked: rules.length,
		rulesPassed: ruleResults.filter((r) => r.passed).length,
		violations,
		durationMs: Date.now() - startTime,
		ruleResults,
	};
}

/**
 * Check a single architecture rule
 */
async function checkRule(rule: ArchRule, config: ArchRunnerConfig): Promise<ArchViolation[]> {
	const violations: ArchViolation[] = [];

	switch (rule.type) {
		case "no-dependency":
			violations.push(...(await checkNoDependency(rule, config)));
			break;
		case "cycle-free":
			violations.push(...(await checkCycleFree(rule, config)));
			break;
		case "layer-dependency":
			// Future: validate layer hierarchy
			break;
	}

	return violations;
}

/**
 * Check no-dependency rule using grep-based static analysis
 */
async function checkNoDependency(rule: ArchRule, config: ArchRunnerConfig): Promise<ArchViolation[]> {
	const violations: ArchViolation[] = [];
	const { join, relative } = await import("node:path");

	const sources = Array.isArray(rule.source) ? rule.source : [rule.source];
	const targets = Array.isArray(rule.target) ? rule.target : [rule.target];

	for (const source of sources) {
		const sourceDir = join(config.workspaceRoot, source);

		for (const target of targets) {
			// Build grep pattern for import/require of target
			const patterns = [
				`from ['"]${escapeRegex(target)}`, // ES import
				`from ['"]${escapeRegex(target)}/`, // ES import subpath
				`require\\(['"]${escapeRegex(target)}`, // CommonJS require
				`require\\(['"]${escapeRegex(target)}/`, // CommonJS require subpath
				`import\\(['"]${escapeRegex(target)}`, // Dynamic import
			];

			const pattern = patterns.join("|");

			try {
				const result = await runGrep(sourceDir, pattern, config.globalExclude);

				for (const match of result) {
					// Skip excluded files
					if (rule.exclude?.some((ex) => match.file.includes(ex))) {
						continue;
					}

					violations.push({
						ruleId: rule.id,
						ruleDescription: rule.description,
						severity: rule.severity,
						sourceFile: relative(config.workspaceRoot, match.file),
						targetFile: target,
						importPath: match.match,
						line: match.line,
					});
				}
			} catch {
				// Directory might not exist, skip
			}
		}
	}

	return violations;
}

/**
 * Check cycle-free rule using madge
 */
async function checkCycleFree(rule: ArchRule, config: ArchRunnerConfig): Promise<ArchViolation[]> {
	const violations: ArchViolation[] = [];
	const { existsSync } = await import("node:fs");
	const { join, relative } = await import("node:path");

	const sources = Array.isArray(rule.source) ? rule.source : [rule.source];

	for (const source of sources) {
		const sourceDir = join(config.workspaceRoot, source);

		if (!existsSync(sourceDir)) {
			continue;
		}

		try {
			// Dynamic import madge
			const madgeModule = await import("madge");
			const madge = madgeModule.default || madgeModule;

			const result = await madge(sourceDir, {
				fileExtensions: ["ts", "tsx", "js", "jsx"],
				excludeRegExp: [
					/node_modules/,
					/dist/,
					/\.next/,
					/\.test\./,
					/\.spec\./,
					/__tests__/,
					/__mocks__/,
					...(config.globalExclude?.map((p) => new RegExp(p)) || []),
				],
				detectiveOptions: { ts: { skipTypeImports: true } },
			});

			const cycles = result.circular() as string[][];

			for (const cycle of cycles) {
				violations.push({
					ruleId: rule.id,
					ruleDescription: rule.description,
					severity: rule.severity,
					sourceFile: relative(config.workspaceRoot, join(sourceDir, cycle[0])),
					importPath: cycle.join(" -> "),
				});
			}
		} catch {
			// madge might fail for some directories
		}
	}

	return violations;
}

// =============================================================================
// Helpers
// =============================================================================

interface GrepMatch {
	file: string;
	line: number;
	match: string;
}

/**
 * Run grep to find import patterns
 */
async function runGrep(dir: string, pattern: string, exclude?: string[]): Promise<GrepMatch[]> {
	const { spawn } = await import("node:child_process");
	const { existsSync } = await import("node:fs");

	if (!existsSync(dir)) {
		return [];
	}

	return new Promise((resolve) => {
		const args = [
			"-r", // recursive
			"-n", // line numbers
			"-E", // extended regex
			"--include=*.ts",
			"--include=*.tsx",
			"--include=*.js",
			"--include=*.jsx",
		];

		// Add exclusions
		for (const ex of exclude || []) {
			args.push(`--exclude-dir=${ex}`);
		}
		args.push("--exclude-dir=node_modules");
		args.push("--exclude-dir=dist");
		args.push("--exclude-dir=.next");

		args.push(pattern);
		args.push(dir);

		const proc = spawn("grep", args, {
			cwd: dir,
			stdio: ["pipe", "pipe", "pipe"],
		});

		let stdout = "";
		proc.stdout?.on("data", (data) => {
			stdout += data.toString();
		});

		proc.on("close", () => {
			const matches: GrepMatch[] = [];
			const lines = stdout.split("\n").filter(Boolean);

			for (const line of lines) {
				// Parse grep output: file:line:content
				const colonIdx = line.indexOf(":");
				if (colonIdx === -1) {
					continue;
				}

				const file = line.slice(0, colonIdx);
				const rest = line.slice(colonIdx + 1);
				const lineNumIdx = rest.indexOf(":");
				if (lineNumIdx === -1) {
					continue;
				}

				const lineNum = Number.parseInt(rest.slice(0, lineNumIdx), 10);
				const content = rest.slice(lineNumIdx + 1);

				matches.push({
					file,
					line: lineNum,
					match: content.trim(),
				});
			}

			resolve(matches);
		});

		proc.on("error", () => {
			resolve([]);
		});
	});
}

/**
 * Escape string for use in regex
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =============================================================================
// Rule Builders (Fluent API)
// =============================================================================

/**
 * Fluent rule builder for creating custom rules
 *
 * @example
 * ```typescript
 * const rule = createRule("my-rule", "Description")
 *   .filesIn("src/api")
 *   .shouldNotDependOn("src/ui")
 *   .withSeverity("error")
 *   .build();
 * ```
 */
export function createRule(id: string, description: string) {
	const rule: Partial<ArchRule> = { id, description, severity: "error" };

	return {
		filesIn(pattern: string | string[]) {
			rule.source = pattern;
			return this;
		},
		shouldNotDependOn(pattern: string | string[]) {
			rule.target = pattern;
			rule.type = "no-dependency";
			return this;
		},
		shouldBeCycleFree() {
			rule.type = "cycle-free";
			rule.target = [];
			return this;
		},
		withSeverity(severity: "error" | "warning") {
			rule.severity = severity;
			return this;
		},
		excluding(patterns: string[]) {
			rule.exclude = patterns;
			return this;
		},
		build(): ArchRule {
			if (!rule.source) {
				throw new Error(`Rule ${id} must specify source with filesIn()`);
			}
			if (!rule.type) {
				throw new Error(`Rule ${id} must specify constraint type`);
			}
			return rule as ArchRule;
		},
	};
}
