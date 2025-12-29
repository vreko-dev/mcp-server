/**
 * SnapshotIconStrategy.ts
 *
 * Platform-agnostic snapshot icon classification based on operation type.
 * Classifies snapshots into visual icons using priority-based detection.
 *
 * Features:
 * - Priority-based detection (protected > name keywords > file extensions)
 * - Pre-compiled regex patterns for performance
 * - Conventional commit prefix matching
 * - File type detection (test, config, docs, style, API, database)
 *
 * @module snapshot/SnapshotIconStrategy
 * @performance Icon classification < 1ms, 10000 classifications < 100ms
 *
 * @example
 * ```typescript
 * import { SnapshotIconStrategy } from '@snapback-oss/sdk';
 *
 * const strategy = new SnapshotIconStrategy();
 *
 * // Protected snapshot
 * strategy.classifyIcon({
 *   name: 'Critical feature',
 *   files: ['src/app.ts'],
 *   isProtected: true
 * }); // { icon: 'lock', color: 'charts.red' }
 *
 * // Test file snapshot
 * strategy.classifyIcon({
 *   name: 'Test changes',
 *   files: ['src/app.test.ts'],
 *   isProtected: false
 * }); // { icon: 'beaker', color: 'charts.purple' }
 * ```
 */

import * as path from "node:path";

/**
 * Result of icon classification containing the icon name and theme color
 *
 * The icon names are VS Code codicon names (e.g., 'lock', 'beaker', 'file-code')
 * The color values are VS Code theme color IDs (e.g., 'charts.red', 'foreground')
 */
export interface IconResult {
	/** Codicon name (e.g., 'lock', 'beaker', 'file-code') */
	icon: string;
	/** Theme color ID (e.g., 'charts.red', 'charts.purple', 'foreground') */
	color: string;
}

/**
 * Metadata describing a snapshot for icon classification
 */
export interface SnapshotMetadata {
	/** Snapshot name/description */
	name: string;
	/** List of file paths included in the snapshot */
	files: string[];
	/** Whether the snapshot is protected from deletion */
	isProtected: boolean;
}

/**
 * Icon mapping configuration (internal)
 */
interface IconMapping {
	icon: string;
	color: string;
}

/**
 * SnapshotIconStrategy classifies snapshots into visual icons based on operation type.
 *
 * Classification priority:
 * 1. Protected status (highest priority)
 * 2. Name keyword matching (conventional commits, operation keywords)
 * 3. File extension detection
 * 4. Fallback default icon
 *
 * Performance: Icon classification < 1ms, 10000 classifications < 100ms
 */
export class SnapshotIconStrategy {
	/**
	 * Icon mapping configuration with codicon names and theme colors
	 */
	private static readonly ICON_MAP: Record<string, IconMapping> = {
		"file-add": { icon: "file-add", color: "charts.green" },
		"file-delete": { icon: "trash", color: "charts.red" },
		"test-changes": { icon: "beaker", color: "charts.purple" },
		"update-deps": { icon: "package", color: "charts.yellow" },
		"config-change": {
			icon: "settings-gear",
			color: "debugConsole.warningForeground",
		},
		refactor: { icon: "symbol-class", color: "charts.blue" },
		"fix-bug": { icon: "bug", color: "charts.red" },
		"docs-update": { icon: "book", color: "charts.blue" },
		"style-changes": { icon: "paintcan", color: "charts.pink" },
		"api-changes": { icon: "server", color: "charts.yellow" },
		database: { icon: "database", color: "charts.orange" },
		protected: { icon: "lock", color: "charts.red" },
		default: { icon: "file-code", color: "foreground" },
	};

	/**
	 * Pre-compiled regex patterns for performance optimization
	 */
	private static readonly TEST_FILE_REGEX = /\.(test|spec)\.(ts|js|tsx|jsx)$/i;
	private static readonly CONFIG_FILE_REGEX = /\.(config\.(ts|js)|eslintrc|prettierrc|env)/i;
	private static readonly STYLE_FILE_REGEX = /\.(css|scss|less|sass)$/i;
	private static readonly DOC_FILE_REGEX = /\.(md|mdx)$/i;
	private static readonly SQL_FILE_REGEX = /\.sql$/i;
	private static readonly SCHEMA_FILE_REGEX = /schema\.(sql|prisma|ts|js)/i;
	private static readonly API_FILE_REGEX = /\.api\./i;

	/**
	 * Package lock file patterns
	 */
	private static readonly PACKAGE_FILES = new Set([
		"package.json",
		"package-lock.json",
		"yarn.lock",
		"pnpm-lock.yaml",
	]);

	/**
	 * Config file patterns
	 */
	private static readonly CONFIG_FILES = new Set(["tsconfig.json", ".eslintrc.json", ".prettierrc"]);

	/**
	 * Keyword sets for name-based classification
	 */
	private static readonly BUG_FIX_KEYWORDS = ["fix", "bugfix"];
	private static readonly REFACTOR_KEYWORDS = ["refactor", "refactored"];
	private static readonly ADDITION_KEYWORDS = ["added", "created", "file-add"];
	private static readonly DELETION_KEYWORDS = ["deleted", "removed", "file-delete"];
	private static readonly DOC_KEYWORDS = ["docs", "documentation", "docs-update"];
	private static readonly STYLE_KEYWORDS = ["style", "styling", "style-changes"];
	private static readonly API_KEYWORDS = ["api-changes", "endpoint"];
	private static readonly DATABASE_KEYWORDS = ["database", "db", "migration", "schema"];
	private static readonly PACKAGE_KEYWORDS = ["update-deps", "dependencies"];
	private static readonly CONFIG_KEYWORDS = ["config-change"];

	/**
	 * Classifies a snapshot into an appropriate icon based on its metadata.
	 *
	 * Detection logic priority order:
	 * 1. Protected status (highest priority)
	 * 2. Name keywords (bug fix, deletion, refactor, etc.)
	 * 3. File extensions (test files, package files, config files, etc.)
	 * 4. Fallback to default icon
	 *
	 * @param metadata - The snapshot metadata to classify
	 * @returns IconResult containing the codicon name and theme color
	 */
	classifyIcon(metadata: SnapshotMetadata): IconResult {
		// Priority 1: Protected status (highest priority)
		if (metadata.isProtected) {
			return SnapshotIconStrategy.ICON_MAP.protected;
		}

		// Priority 2: Name-based keyword matching
		const nameResult = this.classifyByName(metadata.name);
		if (nameResult) {
			return nameResult;
		}

		// Priority 3: File extension-based classification
		const fileResult = this.classifyByFiles(metadata.files);
		if (fileResult) {
			return fileResult;
		}

		// Priority 4: Fallback to default icon
		return SnapshotIconStrategy.ICON_MAP.default;
	}

	/**
	 * Get the icon mapping for a specific category
	 *
	 * @param category - The category key (e.g., 'protected', 'test-changes')
	 * @returns IconMapping or undefined if not found
	 */
	getIconMapping(category: string): IconMapping | undefined {
		return SnapshotIconStrategy.ICON_MAP[category];
	}

	/**
	 * Get all available icon mappings
	 *
	 * @returns Record of all icon mappings
	 */
	getAllIconMappings(): Record<string, IconMapping> {
		return { ...SnapshotIconStrategy.ICON_MAP };
	}

	/**
	 * Classifies based on name keywords with priority ordering.
	 *
	 * @param name - The snapshot name
	 * @returns IconResult if keyword matched, null otherwise
	 */
	private classifyByName(name: string): IconResult | null {
		const lowerName = name.toLowerCase();

		// Priority 0: Check for prefix patterns (conventional commit style)
		if (this.matchesPrefixKeyword(lowerName, SnapshotIconStrategy.ADDITION_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["file-add"];
		}
		if (this.matchesPrefixKeyword(lowerName, SnapshotIconStrategy.BUG_FIX_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["fix-bug"];
		}
		if (this.matchesPrefixKeyword(lowerName, SnapshotIconStrategy.DELETION_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["file-delete"];
		}
		if (this.matchesPrefixKeyword(lowerName, SnapshotIconStrategy.REFACTOR_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP.refactor;
		}
		if (this.matchesPrefixKeyword(lowerName, SnapshotIconStrategy.DOC_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["docs-update"];
		}
		if (this.matchesPrefixKeyword(lowerName, SnapshotIconStrategy.STYLE_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["style-changes"];
		}
		if (this.matchesPrefixKeyword(lowerName, SnapshotIconStrategy.CONFIG_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["config-change"];
		}

		// Priority 1: Bug fixes
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.BUG_FIX_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["fix-bug"];
		}

		// Priority 2: Deletions
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.DELETION_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["file-delete"];
		}

		// Priority 3: Refactors
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.REFACTOR_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP.refactor;
		}

		// Priority 4: API changes
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.API_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["api-changes"];
		}

		// Priority 5: Database operations
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.DATABASE_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP.database;
		}

		// Priority 6: Docs
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.DOC_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["docs-update"];
		}

		// Priority 7: Style
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.STYLE_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["style-changes"];
		}

		// Priority 8: Additions
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.ADDITION_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["file-add"];
		}

		// Priority 9: Package
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.PACKAGE_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["update-deps"];
		}

		// Priority 10: Config
		if (this.matchesKeyword(lowerName, SnapshotIconStrategy.CONFIG_KEYWORDS)) {
			return SnapshotIconStrategy.ICON_MAP["config-change"];
		}

		return null;
	}

	/**
	 * Classifies based on file extensions and paths.
	 *
	 * @param files - The list of file paths
	 * @returns IconResult if file pattern matched, null otherwise
	 */
	private classifyByFiles(files: string[]): IconResult | null {
		if (!files || files.length === 0) {
			return null;
		}

		// Priority 1: Test files
		if (this.containsTestFiles(files)) {
			return SnapshotIconStrategy.ICON_MAP["test-changes"];
		}

		// Priority 2: Package files
		if (this.containsPackageFiles(files)) {
			return SnapshotIconStrategy.ICON_MAP["update-deps"];
		}

		// Priority 3: Config files
		if (this.containsConfigFiles(files)) {
			return SnapshotIconStrategy.ICON_MAP["config-change"];
		}

		// Priority 4: Documentation files
		if (this.containsDocFiles(files)) {
			return SnapshotIconStrategy.ICON_MAP["docs-update"];
		}

		// Priority 5: Style files
		if (this.containsStyleFiles(files)) {
			return SnapshotIconStrategy.ICON_MAP["style-changes"];
		}

		// Priority 6: Database files
		if (this.containsDatabaseFiles(files)) {
			return SnapshotIconStrategy.ICON_MAP.database;
		}

		// Priority 7: API files
		if (this.containsApiFiles(files)) {
			return SnapshotIconStrategy.ICON_MAP["api-changes"];
		}

		return null;
	}

	/**
	 * Checks if name matches any keyword (case-insensitive).
	 */
	private matchesKeyword(name: string, keywords: readonly string[]): boolean {
		return keywords.some((k) => name.includes(k));
	}

	/**
	 * Checks if name starts with keyword followed by colon (conventional commit format).
	 */
	private matchesPrefixKeyword(name: string, keywords: readonly string[]): boolean {
		return keywords.some((k) => name.startsWith(`${k}:`));
	}

	/**
	 * Checks if files contain test files.
	 */
	private containsTestFiles(files: string[]): boolean {
		return files.some((file) => {
			const fileName = path.basename(file);
			const lowerFile = file.toLowerCase();
			return SnapshotIconStrategy.TEST_FILE_REGEX.test(fileName) || lowerFile.includes("__tests__");
		});
	}

	/**
	 * Checks if files contain package lock files.
	 */
	private containsPackageFiles(files: string[]): boolean {
		return files.some((file) => {
			const fileName = path.basename(file);
			return SnapshotIconStrategy.PACKAGE_FILES.has(fileName);
		});
	}

	/**
	 * Checks if files contain configuration files.
	 */
	private containsConfigFiles(files: string[]): boolean {
		return files.some((file) => {
			const fileName = path.basename(file);
			const lowerFile = file.toLowerCase();
			return (
				SnapshotIconStrategy.CONFIG_FILE_REGEX.test(fileName) ||
				SnapshotIconStrategy.CONFIG_FILES.has(fileName) ||
				lowerFile.includes(".env")
			);
		});
	}

	/**
	 * Checks if files contain documentation files.
	 */
	private containsDocFiles(files: string[]): boolean {
		return files.some((file) => {
			const fileName = path.basename(file);
			const lowerFile = file.toLowerCase();
			return (
				SnapshotIconStrategy.DOC_FILE_REGEX.test(fileName) ||
				lowerFile.includes("/docs/") ||
				lowerFile.startsWith("docs/")
			);
		});
	}

	/**
	 * Checks if files contain style files.
	 */
	private containsStyleFiles(files: string[]): boolean {
		return files.some((file) => {
			const fileName = path.basename(file);
			return SnapshotIconStrategy.STYLE_FILE_REGEX.test(fileName);
		});
	}

	/**
	 * Checks if files contain database files.
	 */
	private containsDatabaseFiles(files: string[]): boolean {
		return files.some((file) => {
			const fileName = path.basename(file);
			const lowerFile = file.toLowerCase();
			return (
				SnapshotIconStrategy.SQL_FILE_REGEX.test(fileName) ||
				SnapshotIconStrategy.SCHEMA_FILE_REGEX.test(fileName) ||
				lowerFile.includes("/migrations/") ||
				lowerFile.startsWith("migrations/") ||
				lowerFile.includes("/schema/") ||
				lowerFile.startsWith("schema/")
			);
		});
	}

	/**
	 * Checks if files contain API files.
	 */
	private containsApiFiles(files: string[]): boolean {
		return files.some((file) => {
			const fileName = path.basename(file);
			const lowerFile = file.toLowerCase();
			return (
				SnapshotIconStrategy.API_FILE_REGEX.test(fileName) ||
				lowerFile.includes("/api/") ||
				lowerFile.startsWith("api/")
			);
		});
	}
}
