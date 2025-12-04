/**
 * Phantom Dependency Detector - Identifies unused dependencies in package.json
 */

export interface PhantomDependencyFinding {
	packageName: string;
	declaredIn: "dependencies" | "devDependencies";
	severity: "low" | "medium";
	ruleId: string;
}

export interface PhantomDependencyResult {
	findings: PhantomDependencyFinding[];
	phantomDeps: string[];
	totalDeps: number;
	usageReport: Record<string, number>;
	riskScore: number;
}

// Framework-specific exceptions (implicitly used)
const FRAMEWORK_EXCEPTIONS: Record<string, string[]> = {
	next: ["react", "react-dom", "next"],
	vite: ["vite"],
	"@vitejs/plugin-react": ["react", "react-dom"],
	nuxt: ["vue", "nuxt"],
	"@angular/core": ["@angular/common", "@angular/platform-browser"],
};

// Build tool and CLI exceptions (not directly imported)
const BUILD_TOOL_EXCEPTIONS = [
	"typescript",
	"tsup",
	"vite",
	"esbuild",
	"webpack",
	"rollup",
	"biome",
	"eslint",
	"prettier",
	"@biomejs/biome",
	"vitest",
	"jest",
	"playwright",
	"@playwright/test",
	"turbo",
	"tsx",
	"node-gyp",
	"@types/node",
	"@changesets/cli",
	"lefthook",
	"@evilmartians/lefthook",
	"commitlint",
	"lint-staged",
];

export class PhantomDependencyDetector {
	/**
	 * Detect unused dependencies by analyzing imports
	 */
	async detect(
		packageJsonContent: string,
		codebaseFiles: Array<{ path: string; content: string }>,
	): Promise<PhantomDependencyResult> {
		const findings: PhantomDependencyFinding[] = [];
		const usageReport: Record<string, number> = {};

		// Parse package.json
		let packageJson: any;
		try {
			packageJson = JSON.parse(packageJsonContent);
		} catch {
			return {
				findings: [],
				phantomDeps: [],
				totalDeps: 0,
				usageReport: {},
				riskScore: 0,
			};
		}

		const dependencies = packageJson.dependencies || {};
		const devDependencies = packageJson.devDependencies || {};
		const allDeps = { ...dependencies, ...devDependencies };
		const totalDeps = Object.keys(allDeps).length;

		// Initialize usage report
		for (const dep of Object.keys(allDeps)) {
			usageReport[dep] = 0;
		}

		// Scan all files for imports
		for (const file of codebaseFiles) {
			// Skip node_modules and build outputs
			if (file.path.includes("node_modules") || file.path.includes("dist/") || file.path.includes("build/")) {
				continue;
			}

			this.scanFileForImports(file.content, usageReport);
		}

		// Determine framework exceptions based on dependencies
		const frameworkExceptions = this.getFrameworkExceptions(allDeps);

		// Find phantom dependencies
		const phantomDeps: string[] = [];
		for (const [dep, usage] of Object.entries(usageReport)) {
			// Skip if used
			if (usage > 0) { continue; }

			// Skip build tools
			if (BUILD_TOOL_EXCEPTIONS.includes(dep)) { continue; }

			// Skip framework exceptions
			if (frameworkExceptions.includes(dep)) { continue; }

			// Skip @types packages (TypeScript type definitions)
			if (dep.startsWith("@types/")) { continue; }

			// Skip transitive dependencies (packages starting with @)
			// This is a heuristic - in production you'd use dependency tree analysis
			if (dep.startsWith("@") && !dep.includes("/")) { continue; }

			// It's a phantom dependency
			phantomDeps.push(dep);

			const declaredIn = dep in dependencies ? "dependencies" : "devDependencies";
			findings.push({
				packageName: dep,
				declaredIn,
				severity: declaredIn === "dependencies" ? "medium" : "low",
				ruleId: "phantom-deps/unused-dependency",
			});
		}

		// Calculate risk score
		const riskScore = this.calculateRiskScore(phantomDeps.length, totalDeps);

		return {
			findings,
			phantomDeps,
			totalDeps,
			usageReport,
			riskScore,
		};
	}

	/**
	 * Scan file content for import/require statements
	 */
	private scanFileForImports(content: string, usageReport: Record<string, number>): void {
		// Match various import patterns
		const patterns = [
			/import\s+.*?from\s+["']([^"']+)["']/g,
			/require\s*\(\s*["']([^"']+)["']\s*\)/g,
			/import\s*\(\s*["']([^"']+)["']\s*\)/g, // Dynamic imports
		];

		for (const pattern of patterns) {
			const matches = content.matchAll(pattern);
			for (const match of matches) {
				const importPath = match[1];

				// Extract package name from import path
				// e.g., "react" from "react"
				// e.g., "@snapback/sdk" from "@snapback/sdk/storage"
				// e.g., "lodash" from "lodash/fp"
				const packageName = this.extractPackageName(importPath);

				if (packageName && packageName in usageReport) {
					usageReport[packageName]++;
				}
			}
		}
	}

	/**
	 * Extract package name from import path
	 */
	private extractPackageName(importPath: string): string {
		// Skip relative imports
		if (importPath.startsWith(".")) {
			return "";
		}

		// Handle scoped packages (@org/package)
		if (importPath.startsWith("@")) {
			const parts = importPath.split("/");
			if (parts.length >= 2) {
				return `${parts[0]}/${parts[1]}`;
			}
			return parts[0];
		}

		// Handle regular packages
		const parts = importPath.split("/");
		return parts[0];
	}

	/**
	 * Get framework-specific exceptions
	 */
	private getFrameworkExceptions(allDeps: Record<string, string>): string[] {
		const exceptions: string[] = [];

		for (const [framework, deps] of Object.entries(FRAMEWORK_EXCEPTIONS)) {
			if (framework in allDeps) {
				exceptions.push(...deps);
			}
		}

		return exceptions;
	}

	/**
	 * Calculate risk score (0-10)
	 */
	private calculateRiskScore(phantomCount: number, totalCount: number): number {
		if (totalCount === 0) { return 0; }

		const ratio = phantomCount / totalCount;

		// Risk levels:
		// 0-10%: Low (score 0-3)
		// 10-25%: Medium (score 3-6)
		// 25%+: High (score 6-10)

		if (ratio <= 0.1) {
			return ratio * 30; // 0-3
		}
		if (ratio <= 0.25) {
			return 3 + (ratio - 0.1) * 20; // 3-6
		}
		return Math.min(10, 6 + (ratio - 0.25) * 13.3); // 6-10
	}
}
