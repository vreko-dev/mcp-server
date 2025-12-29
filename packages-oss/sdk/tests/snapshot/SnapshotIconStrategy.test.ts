/**
 * SDK SnapshotIconStrategy Tests
 *
 * Tests snapshot icon classification including:
 * - Protected status (highest priority)
 * - Name keyword matching (conventional commits)
 * - File extension detection
 * - Priority ordering
 * - Performance budgets (<1ms single, <100ms for 10000)
 *
 * @module tests/snapshot/SnapshotIconStrategy.test
 */

import { describe, expect, it } from "vitest";
import { type IconResult, type SnapshotMetadata, SnapshotIconStrategy } from "../../src/snapshot/SnapshotIconStrategy";

describe("SnapshotIconStrategy", () => {
	const strategy = new SnapshotIconStrategy();

	describe("Protected Status (Highest Priority)", () => {
		it("should return lock icon for protected snapshot", () => {
			const metadata: SnapshotMetadata = {
				name: "Regular snapshot",
				files: ["src/app.ts"],
				isProtected: true,
			};

			const result = strategy.classifyIcon(metadata);

			expect(result.icon).toBe("lock");
			expect(result.color).toBe("charts.red");
		});

		it("should prioritize protected status over name keywords", () => {
			const metadata: SnapshotMetadata = {
				name: "fix: Bug fix snapshot",
				files: ["src/app.ts"],
				isProtected: true,
			};

			const result = strategy.classifyIcon(metadata);

			expect(result.icon).toBe("lock");
		});

		it("should prioritize protected status over file types", () => {
			const metadata: SnapshotMetadata = {
				name: "Test snapshot",
				files: ["src/app.test.ts"],
				isProtected: true,
			};

			const result = strategy.classifyIcon(metadata);

			expect(result.icon).toBe("lock");
		});
	});

	describe("Name Keyword Classification", () => {
		describe("Prefix Patterns (Conventional Commits)", () => {
			it("should detect fix: prefix as bug fix", () => {
				const result = strategy.classifyIcon({
					name: "fix: Resolved authentication issue",
					files: ["src/auth.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("bug");
				expect(result.color).toBe("charts.red");
			});

			it("should detect added: prefix as file addition", () => {
				const result = strategy.classifyIcon({
					name: "added: New user component",
					files: ["src/components/User.tsx"],
					isProtected: false,
				});

				expect(result.icon).toBe("file-add");
				expect(result.color).toBe("charts.green");
			});

			it("should detect deleted: prefix as file deletion", () => {
				const result = strategy.classifyIcon({
					name: "deleted: Removed legacy code",
					files: ["src/legacy.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("trash");
				expect(result.color).toBe("charts.red");
			});

			it("should detect refactor: prefix as refactoring", () => {
				const result = strategy.classifyIcon({
					name: "refactor: Improved code structure",
					files: ["src/utils.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("symbol-class");
				expect(result.color).toBe("charts.blue");
			});

			it("should detect docs: prefix as documentation", () => {
				const result = strategy.classifyIcon({
					name: "docs: Updated README",
					files: ["README.md"],
					isProtected: false,
				});

				expect(result.icon).toBe("book");
				expect(result.color).toBe("charts.blue");
			});

			it("should detect style: prefix as style changes", () => {
				const result = strategy.classifyIcon({
					name: "style: Fixed formatting",
					files: ["src/app.css"],
					isProtected: false,
				});

				expect(result.icon).toBe("paintcan");
				expect(result.color).toBe("charts.pink");
			});
		});

		describe("Keyword Matching (Anywhere in Name)", () => {
			it("should detect fix keyword as bug fix", () => {
				const result = strategy.classifyIcon({
					name: "Quick fix for login bug",
					files: ["src/auth.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("bug");
			});

			it("should detect deleted keyword", () => {
				const result = strategy.classifyIcon({
					name: "Deleted old files",
					files: ["src/old.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("trash");
			});

			it("should detect refactored keyword", () => {
				const result = strategy.classifyIcon({
					name: "Refactored authentication module",
					files: ["src/auth.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("symbol-class");
			});

			it("should detect api-changes keyword", () => {
				const result = strategy.classifyIcon({
					name: "Updated api-changes for users",
					files: ["src/api.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("server");
			});

			it("should detect database keyword", () => {
				const result = strategy.classifyIcon({
					name: "Updated database schema",
					files: ["schema.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("database");
			});

			it("should detect migration keyword", () => {
				const result = strategy.classifyIcon({
					name: "Added migration for users",
					files: ["migrations/001_users.sql"],
					isProtected: false,
				});

				expect(result.icon).toBe("database");
			});

			it("should detect dependencies keyword", () => {
				const result = strategy.classifyIcon({
					name: "Updated dependencies",
					files: ["package.json"],
					isProtected: false,
				});

				expect(result.icon).toBe("package");
			});
		});

		describe("Keyword Priority", () => {
			it("should prioritize fix over added", () => {
				const result = strategy.classifyIcon({
					name: "fix: Added missing validation",
					files: ["src/validate.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("bug");
			});

			it("should prioritize deleted over refactored", () => {
				const result = strategy.classifyIcon({
					name: "Refactored and deleted old code",
					files: ["src/old.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("trash");
			});
		});
	});

	describe("File Extension Classification", () => {
		describe("Test Files", () => {
			it("should detect .test.ts files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["src/auth.test.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("beaker");
				expect(result.color).toBe("charts.purple");
			});

			it("should detect .spec.ts files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["src/auth.spec.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("beaker");
			});

			it("should detect __tests__ directory", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["__tests__/auth.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("beaker");
			});

			it("should detect .test.tsx files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["src/Component.test.tsx"],
					isProtected: false,
				});

				expect(result.icon).toBe("beaker");
			});
		});

		describe("Package Files", () => {
			it("should detect package.json", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["package.json"],
					isProtected: false,
				});

				expect(result.icon).toBe("package");
				expect(result.color).toBe("charts.yellow");
			});

			it("should detect package-lock.json", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["package-lock.json"],
					isProtected: false,
				});

				expect(result.icon).toBe("package");
			});

			it("should detect pnpm-lock.yaml", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["pnpm-lock.yaml"],
					isProtected: false,
				});

				expect(result.icon).toBe("package");
			});

			it("should detect yarn.lock", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["yarn.lock"],
					isProtected: false,
				});

				expect(result.icon).toBe("package");
			});
		});

		describe("Config Files", () => {
			it("should detect tsconfig.json", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["tsconfig.json"],
					isProtected: false,
				});

				expect(result.icon).toBe("settings-gear");
			});

			it("should detect .eslintrc.json", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: [".eslintrc.json"],
					isProtected: false,
				});

				expect(result.icon).toBe("settings-gear");
			});

			it("should detect vite.config.ts", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["vite.config.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("settings-gear");
			});

			it("should detect .env files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: [".env.local"],
					isProtected: false,
				});

				expect(result.icon).toBe("settings-gear");
			});
		});

		describe("Documentation Files", () => {
			it("should detect .md files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["README.md"],
					isProtected: false,
				});

				expect(result.icon).toBe("book");
				expect(result.color).toBe("charts.blue");
			});

			it("should detect .mdx files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["docs/guide.mdx"],
					isProtected: false,
				});

				expect(result.icon).toBe("book");
			});

			it("should detect /docs/ directory", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["docs/api.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("book");
			});
		});

		describe("Style Files", () => {
			it("should detect .css files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["src/styles.css"],
					isProtected: false,
				});

				expect(result.icon).toBe("paintcan");
				expect(result.color).toBe("charts.pink");
			});

			it("should detect .scss files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["src/styles.scss"],
					isProtected: false,
				});

				expect(result.icon).toBe("paintcan");
			});

			it("should detect .less files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["src/styles.less"],
					isProtected: false,
				});

				expect(result.icon).toBe("paintcan");
			});
		});

		describe("Database Files", () => {
			it("should detect .sql files", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["db/create_users.sql"],
					isProtected: false,
				});

				expect(result.icon).toBe("database");
				expect(result.color).toBe("charts.orange");
			});

			it("should detect /migrations/ directory", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["migrations/001_init.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("database");
			});

			it("should detect schema.prisma", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["prisma/schema.prisma"],
					isProtected: false,
				});

				expect(result.icon).toBe("database");
			});
		});

		describe("API Files", () => {
			it("should detect .api. in filename", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["src/users.api.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("server");
				expect(result.color).toBe("charts.yellow");
			});

			it("should detect /api/ directory", () => {
				const result = strategy.classifyIcon({
					name: "Changes",
					files: ["api/users.ts"],
					isProtected: false,
				});

				expect(result.icon).toBe("server");
			});
		});
	});

	describe("Fallback Default Icon", () => {
		it("should return default icon for unrecognized files", () => {
			const result = strategy.classifyIcon({
				name: "Some changes",
				files: ["src/app.ts"],
				isProtected: false,
			});

			expect(result.icon).toBe("file-code");
			expect(result.color).toBe("foreground");
		});

		it("should return default icon for empty files array", () => {
			const result = strategy.classifyIcon({
				name: "Changes",
				files: [],
				isProtected: false,
			});

			expect(result.icon).toBe("file-code");
		});
	});

	describe("Helper Methods", () => {
		it("should get icon mapping for specific category", () => {
			const mapping = strategy.getIconMapping("protected");

			expect(mapping).toBeDefined();
			expect(mapping?.icon).toBe("lock");
			expect(mapping?.color).toBe("charts.red");
		});

		it("should return undefined for unknown category", () => {
			const mapping = strategy.getIconMapping("unknown-category");

			expect(mapping).toBeUndefined();
		});

		it("should get all icon mappings", () => {
			const mappings = strategy.getAllIconMappings();

			expect(Object.keys(mappings).length).toBeGreaterThan(0);
			expect(mappings.protected).toBeDefined();
			expect(mappings.default).toBeDefined();
		});
	});

	describe("Performance", () => {
		it("should classify single icon in under 1ms", () => {
			const metadata: SnapshotMetadata = {
				name: "fix: Bug fix",
				files: ["src/auth.test.ts", "package.json", "README.md"],
				isProtected: false,
			};

			const start = performance.now();
			strategy.classifyIcon(metadata);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(1);
		});

		it("should classify 10000 icons in under 100ms", () => {
			const metadata: SnapshotMetadata = {
				name: "fix: Bug fix in module",
				files: ["src/auth.test.ts", "package.json", "README.md", "src/api/users.ts"],
				isProtected: false,
			};

			const start = performance.now();
			for (let i = 0; i < 10000; i++) {
				strategy.classifyIcon(metadata);
			}
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(100);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty name", () => {
			const result = strategy.classifyIcon({
				name: "",
				files: ["src/app.ts"],
				isProtected: false,
			});

			expect(result.icon).toBe("file-code");
		});

		it("should handle case-insensitive keyword matching", () => {
			const result = strategy.classifyIcon({
				name: "FIX: Uppercase fix",
				files: ["src/app.ts"],
				isProtected: false,
			});

			expect(result.icon).toBe("bug");
		});

		it("should handle mixed file types", () => {
			// Test files have priority over package files
			const result = strategy.classifyIcon({
				name: "Changes",
				files: ["package.json", "src/auth.test.ts"],
				isProtected: false,
			});

			expect(result.icon).toBe("beaker");
		});

		it("should handle deeply nested file paths", () => {
			const result = strategy.classifyIcon({
				name: "Changes",
				files: ["apps/web/src/components/__tests__/Button.test.tsx"],
				isProtected: false,
			});

			expect(result.icon).toBe("beaker");
		});
	});
});
