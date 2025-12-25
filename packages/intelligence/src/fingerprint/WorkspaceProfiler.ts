/**
 * Workspace Profiler
 *
 * Comprehensive workspace fingerprinting for framework detection,
 * language analysis, and context documentation discovery.
 *
 * @module fingerprint/WorkspaceProfiler
 */

import { access, constants, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import fastGlob from "fast-glob";
import { detectPrimaryFramework, type FrameworkDetectionContext, getFramework } from "../knowledge/registry.js";
import type {
	DetectedFramework,
	DetectedLanguage,
	DetectedPattern,
	ExistingContext,
	ExistingContextFile,
	PackageManagerInfo,
	ProjectStructure,
	WorkspaceProfile,
} from "../knowledge/types.js";
import { GapAnalyzer } from "../patterns/GapAnalyzer.js";
import { PatternDetector } from "../patterns/PatternDetector.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for workspace profiling
 */
export interface WorkspaceProfilerConfig {
	/** Workspace root directory */
	workspaceRoot: string;
	/** Whether to run pattern detection (slower but more complete) */
	detectPatterns?: boolean;
	/** Maximum files to scan for language detection */
	maxFilesForLanguageDetection?: number;
	/** Directories to skip */
	skipDirectories?: string[];
	/** Whether to include hidden files */
	includeHidden?: boolean;
}

// =============================================================================
// WORKSPACE PROFILER
// =============================================================================

/**
 * Workspace Profiler - comprehensive workspace analysis
 *
 * @example
 * ```typescript
 * const profiler = new WorkspaceProfiler({
 *   workspaceRoot: "/path/to/project",
 *   detectPatterns: true,
 * });
 *
 * const profile = await profiler.analyze();
 * console.log(profile.framework);
 * console.log(profile.gaps);
 * ```
 */
export class WorkspaceProfiler {
	private readonly config: Required<WorkspaceProfilerConfig>;

	constructor(config: WorkspaceProfilerConfig) {
		this.config = {
			workspaceRoot: config.workspaceRoot,
			detectPatterns: config.detectPatterns ?? true,
			maxFilesForLanguageDetection: config.maxFilesForLanguageDetection ?? 5000,
			skipDirectories: config.skipDirectories ?? [
				"node_modules",
				".git",
				"dist",
				"build",
				".next",
				".nuxt",
				"coverage",
				".cache",
			],
			includeHidden: config.includeHidden ?? false,
		};
	}

	/**
	 * Analyze the workspace and create a complete profile
	 */
	async analyze(): Promise<WorkspaceProfile> {
		const startTime = Date.now();

		// Run analyses in parallel where possible
		const [packageJson, filePaths, packageManager, existingContext] = await Promise.all([
			this.readPackageJson(),
			this.getFilePaths(),
			this.detectPackageManager(),
			this.analyzeExistingContext(),
		]);

		// Detect framework
		const framework = await this.detectFramework(packageJson, filePaths);

		// Analyze languages
		const languages = await this.analyzeLanguages(filePaths);

		// Analyze project structure
		const structure = await this.analyzeStructure(filePaths);

		// Detect patterns (if enabled)
		let detectedPatterns: DetectedPattern[] = [];
		if (this.config.detectPatterns) {
			detectedPatterns = await this.detectPatterns();
		}

		// Get framework config for gap analysis
		const frameworkConfig = getFramework(framework.id);

		// Analyze gaps
		const gaps = frameworkConfig
			? new GapAnalyzer({ frameworkConfig }).analyzeWorkspace({
					root: this.config.workspaceRoot,
					framework,
					languages,
					packageManager,
					structure,
					existingContext,
					detectedPatterns,
					gaps: [],
					healthScore: 0,
					createdAt: new Date().toISOString(),
				}).gaps
			: [];

		// Calculate health score
		const healthScore = this.calculateHealthScore(existingContext, detectedPatterns, gaps, framework);

		return {
			root: this.config.workspaceRoot,
			framework,
			languages,
			packageManager,
			structure,
			existingContext,
			detectedPatterns,
			gaps,
			healthScore,
			createdAt: new Date().toISOString(),
		};
	}

	/**
	 * Quick scan for framework and basic info only
	 */
	async quickScan(): Promise<Pick<WorkspaceProfile, "framework" | "packageManager" | "languages">> {
		const [packageJson, filePaths, packageManager] = await Promise.all([
			this.readPackageJson(),
			this.getFilePaths(),
			this.detectPackageManager(),
		]);

		const framework = await this.detectFramework(packageJson, filePaths);
		const languages = await this.analyzeLanguages(filePaths);

		return {
			framework,
			packageManager,
			languages,
		};
	}

	// =========================================================================
	// PRIVATE METHODS
	// =========================================================================

	private async readPackageJson(): Promise<Record<string, unknown> | null> {
		const packageJsonPath = join(this.config.workspaceRoot, "package.json");

		try {
			const content = await readFile(packageJsonPath, "utf-8");
			return JSON.parse(content);
		} catch {
			return null;
		}
	}

	private async getFilePaths(): Promise<string[]> {
		const ignorePatterns = this.config.skipDirectories.map((dir) => `**/${dir}/**`);

		const files = await fastGlob("**/*", {
			cwd: this.config.workspaceRoot,
			ignore: ignorePatterns,
			onlyFiles: true,
			dot: this.config.includeHidden,
		});

		return files.slice(0, this.config.maxFilesForLanguageDetection);
	}

	private async detectFramework(
		packageJson: Record<string, unknown> | null,
		filePaths: string[],
	): Promise<DetectedFramework> {
		const context: FrameworkDetectionContext = {
			packageJson: packageJson as FrameworkDetectionContext["packageJson"],
			filePaths,
			checkFileContent: async (pattern, files) => {
				// Simplified file content check
				for (const file of filePaths) {
					if (files.some((f) => file.match(new RegExp(f.replace("*", ".*"))))) {
						try {
							const content = await readFile(join(this.config.workspaceRoot, file), "utf-8");
							if (content.includes(pattern)) {
								return true;
							}
						} catch {
							// Skip unreadable files
						}
					}
				}
				return false;
			},
		};

		return detectPrimaryFramework(context);
	}

	private async detectPackageManager(): Promise<PackageManagerInfo> {
		const checks: Array<{
			file: string;
			name: PackageManagerInfo["name"];
		}> = [
			{ file: "pnpm-lock.yaml", name: "pnpm" },
			{ file: "yarn.lock", name: "yarn" },
			{ file: "bun.lockb", name: "bun" },
			{ file: "package-lock.json", name: "npm" },
		];

		for (const { file, name } of checks) {
			try {
				await access(join(this.config.workspaceRoot, file), constants.F_OK);
				return {
					name,
					lockfile: file,
				};
			} catch {
				// Continue checking
			}
		}

		return { name: "unknown" };
	}

	private async analyzeLanguages(filePaths: string[]): Promise<DetectedLanguage[]> {
		const languageMap: Record<string, { extensions: Set<string>; count: number }> = {};

		// Extension to language mapping
		const extensionToLanguage: Record<string, string> = {
			".ts": "TypeScript",
			".tsx": "TypeScript",
			".js": "JavaScript",
			".jsx": "JavaScript",
			".mjs": "JavaScript",
			".cjs": "JavaScript",
			".py": "Python",
			".rb": "Ruby",
			".go": "Go",
			".rs": "Rust",
			".java": "Java",
			".kt": "Kotlin",
			".swift": "Swift",
			".php": "PHP",
			".cs": "C#",
			".cpp": "C++",
			".c": "C",
			".vue": "Vue",
			".svelte": "Svelte",
			".astro": "Astro",
			".md": "Markdown",
			".mdx": "MDX",
			".css": "CSS",
			".scss": "SCSS",
			".less": "LESS",
			".html": "HTML",
			".json": "JSON",
			".yaml": "YAML",
			".yml": "YAML",
		};

		for (const file of filePaths) {
			const ext = extname(file).toLowerCase();
			const language = extensionToLanguage[ext];

			if (language) {
				if (!languageMap[language]) {
					languageMap[language] = { extensions: new Set(), count: 0 };
				}
				languageMap[language].extensions.add(ext);
				languageMap[language].count++;
			}
		}

		const totalFiles = filePaths.length;
		const languages: DetectedLanguage[] = Object.entries(languageMap)
			.map(([name, data]) => ({
				name,
				percentage: Math.round((data.count / totalFiles) * 100),
				fileCount: data.count,
				extensions: Array.from(data.extensions),
			}))
			.sort((a, b) => b.fileCount - a.fileCount);

		return languages;
	}

	private async analyzeStructure(filePaths: string[]): Promise<ProjectStructure> {
		const sourceDirectories = new Set<string>();
		const testDirectories = new Set<string>();
		const configFiles: string[] = [];

		// Check for monorepo indicators
		let isMonorepo = false;
		let monorepoTool: ProjectStructure["monorepoTool"];

		// Check monorepo files
		const monorepoChecks: Array<{
			file: string;
			tool: ProjectStructure["monorepoTool"];
		}> = [
			{ file: "turbo.json", tool: "turborepo" },
			{ file: "nx.json", tool: "nx" },
			{ file: "lerna.json", tool: "lerna" },
			{ file: "pnpm-workspace.yaml", tool: "pnpm-workspaces" },
		];

		for (const { file, tool } of monorepoChecks) {
			try {
				await access(join(this.config.workspaceRoot, file), constants.F_OK);
				isMonorepo = true;
				monorepoTool = tool;
				break;
			} catch {
				// Continue
			}
		}

		// Analyze file paths
		for (const file of filePaths) {
			const parts = file.split("/");
			const firstDir = parts[0];

			// Source directories
			if (["src", "lib", "app", "apps", "packages", "components"].includes(firstDir)) {
				sourceDirectories.add(firstDir);
			}

			// Test directories
			if (["test", "tests", "__tests__", "e2e", "spec"].includes(firstDir)) {
				testDirectories.add(firstDir);
			}

			// Config files at root
			if (parts.length === 1 && (file.includes("config") || file.includes("rc") || file.startsWith("."))) {
				configFiles.push(file);
			}
		}

		// Estimate lines of code (rough heuristic)
		const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"];
		const codeFiles = filePaths.filter((f) => codeExtensions.includes(extname(f).toLowerCase()));
		const totalLinesEstimate = codeFiles.length * 100; // Rough estimate

		return {
			isMonorepo,
			monorepoTool,
			sourceDirectories: Array.from(sourceDirectories),
			testDirectories: Array.from(testDirectories),
			configFiles: configFiles.slice(0, 20), // Limit config files
			totalFiles: filePaths.length,
			totalLinesEstimate,
		};
	}

	private async analyzeExistingContext(): Promise<ExistingContext> {
		const contextDirs = [".llm-context", ".ai-context", "ai_dev_utils", "docs/llm"];
		let contextPath: string | undefined;
		let hasContextDirectory = false;

		// Find context directory
		for (const dir of contextDirs) {
			try {
				await access(join(this.config.workspaceRoot, dir), constants.F_OK);
				hasContextDirectory = true;
				contextPath = dir;
				break;
			} catch {
				// Continue
			}
		}

		if (!hasContextDirectory || !contextPath) {
			return {
				hasContextDirectory: false,
				files: [],
				qualityScore: 0,
			};
		}

		// Analyze context files
		const contextFiles: ExistingContextFile[] = [];
		const fullContextPath = join(this.config.workspaceRoot, contextPath);

		try {
			const files = await fastGlob("**/*.md", {
				cwd: fullContextPath,
				onlyFiles: true,
			});

			for (const file of files) {
				const filePath = join(fullContextPath, file);

				try {
					const [stats, content] = await Promise.all([stat(filePath), readFile(filePath, "utf-8")]);

					const sections = this.extractSections(content);
					const quality = this.assessFileQuality(content, sections);

					contextFiles.push({
						path: join(contextPath, file),
						size: stats.size,
						lastModified: stats.mtime.toISOString(),
						sections,
						quality,
					});
				} catch {
					// Skip unreadable files
				}
			}
		} catch {
			// Context directory not readable
		}

		// Calculate overall quality score
		const qualityScore = this.calculateContextQuality(contextFiles);

		return {
			hasContextDirectory,
			contextPath,
			files: contextFiles,
			qualityScore,
		};
	}

	private extractSections(content: string): string[] {
		const headingPattern = /^#{1,3}\s+(.+)$/gm;
		const sections: string[] = [];

		let match: RegExpExecArray | null;
		while ((match = headingPattern.exec(content)) !== null) {
			sections.push(match[1].trim());
		}

		return sections;
	}

	private assessFileQuality(content: string, sections: string[]): ExistingContextFile["quality"] {
		if (content.trim().length === 0) {
			return "empty";
		}

		if (content.length < 100 || sections.length < 2) {
			return "needs-improvement";
		}

		// Check for placeholder content
		const placeholderPatterns = [/TODO/i, /FIXME/i, /\[.*\]/, /<.*>/];

		const hasPlaceholders = placeholderPatterns.some((p) => p.test(content));

		if (hasPlaceholders && content.length < 500) {
			return "needs-improvement";
		}

		// Check age (if possible to determine from content)
		// For now, assume good if it has content and sections
		return "good";
	}

	private calculateContextQuality(files: ExistingContextFile[]): number {
		if (files.length === 0) return 0;

		const qualityScores: Record<ExistingContextFile["quality"], number> = {
			good: 100,
			"needs-improvement": 50,
			outdated: 30,
			empty: 0,
		};

		const total = files.reduce((sum, file) => sum + qualityScores[file.quality], 0);

		return Math.round(total / files.length);
	}

	private async detectPatterns(): Promise<DetectedPattern[]> {
		const detector = new PatternDetector({
			workspaceRoot: this.config.workspaceRoot,
			useAst: false, // Use regex for speed
			maxFiles: 500,
		});

		const result = await detector.detect();

		// Convert to DetectedPattern format
		return result.foundPatterns
			.filter((p) => p.isPositive)
			.map((p) => ({
				id: p.id,
				name: p.name,
				category: p.category,
				locations: p.locations,
				strength: p.strength,
			}));
	}

	private calculateHealthScore(
		context: ExistingContext,
		patterns: DetectedPattern[],
		gaps: WorkspaceProfile["gaps"],
		framework: DetectedFramework,
	): number {
		let score = 50; // Base score

		// Context documentation (up to +20)
		if (context.hasContextDirectory) {
			score += 10;
			score += Math.min(10, context.qualityScore / 10);
		}

		// Pattern coverage (up to +20)
		const patternScore = patterns.length * 2;
		score += Math.min(20, patternScore);

		// Gap penalties
		const criticalGaps = gaps.filter((g) => g.severity === "critical").length;
		const highGaps = gaps.filter((g) => g.severity === "high").length;
		score -= criticalGaps * 10;
		score -= highGaps * 5;

		// Framework detection bonus
		if (framework.confidence > 0.8) {
			score += 5;
		}

		return Math.max(0, Math.min(100, Math.round(score)));
	}
}
