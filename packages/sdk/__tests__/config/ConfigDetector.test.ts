/**
 * Tests for ConfigDetector
 *
 * This test suite validates the platform-agnostic configuration file detection
 * and validation functionality.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IFileSystemProvider } from "../../src/config/ConfigDetector";
import { ConfigDetector } from "../../src/config/ConfigDetector";

describe("ConfigDetector", () => {
	let mockFileSystem: IFileSystemProvider;

	beforeEach(() => {
		// Create a fresh mock for each test
		mockFileSystem = {
			glob: vi.fn(),
			readFile: vi.fn(),
		};
	});

	describe("Detection", () => {
		it("should detect package.json files", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue(["package.json", "packages/core/package.json"]);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const files = await detector.detectConfigFiles();

			expect(files).toHaveLength(2);
			expect(files[0].type).toBe("package.json");
			expect(files[0].name).toBe("package.json");
		});

		it("should detect TypeScript config files", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue(["tsconfig.json", "tsconfig.build.json"]);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const files = await detector.detectConfigFiles();

			expect(files).toHaveLength(2);
			expect(files[0].type).toBe("tsconfig");
			expect(files[1].type).toBe("tsconfig");
		});

		it("should detect env files", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue([".env", ".env.local", ".env.production"]);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const files = await detector.detectConfigFiles();

			expect(files).toHaveLength(3);
			expect(files.every((f) => f.type === "env")).toBe(true);
		});

		it("should detect multiple config types", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue([
				"package.json",
				"tsconfig.json",
				".eslintrc.json",
				"jest.config.js",
				".env",
			]);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const files = await detector.detectConfigFiles();

			expect(files).toHaveLength(5);
			expect(files.map((f) => f.type)).toEqual(["package.json", "tsconfig", "eslint", "jest", "env"]);
		});

		it("should handle no config files found", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue([]);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const files = await detector.detectConfigFiles();

			expect(files).toHaveLength(0);
		});
	});

	describe("Parsing", () => {
		it("should parse valid JSON config", async () => {
			const packageJson = JSON.stringify({
				name: "test-package",
				version: "1.0.0",
				dependencies: { react: "^18.0.0" },
			});

			vi.mocked(mockFileSystem.readFile).mockResolvedValue(packageJson);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.parseConfigFile("/workspace/package.json");

			expect(result.valid).toBe(true);
			expect(result.content).toBeDefined();
			expect((result.content as any).name).toBe("test-package");
		});

		it("should handle invalid JSON", async () => {
			vi.mocked(mockFileSystem.readFile).mockResolvedValue("{ invalid json }");

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.parseConfigFile("/workspace/package.json");

			expect(result.valid).toBe(false);
			expect(result.error).toContain("JSON");
		});

		it("should parse non-JSON files as text", async () => {
			vi.mocked(mockFileSystem.readFile).mockResolvedValue("NODE_ENV=production");

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.parseConfigFile("/workspace/.env");

			expect(result.valid).toBe(true);
			expect(result.content).toBe("NODE_ENV=production");
		});

		it("should extract metadata from package.json", async () => {
			const packageJson = JSON.stringify({
				name: "test-package",
				version: "1.0.0",
				dependencies: { react: "^18.0.0", lodash: "^4.17.0" },
				devDependencies: { vitest: "^1.0.0" },
				scripts: { test: "vitest", build: "tsc" },
			});

			vi.mocked(mockFileSystem.readFile).mockResolvedValue(packageJson);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.parseConfigFile("/workspace/package.json");

			expect(result.metadata).toBeDefined();
			expect(result.metadata?.dependencies).toEqual(["react", "lodash"]);
			expect(result.metadata?.devDependencies).toEqual(["vitest"]);
			expect(result.metadata?.scripts).toEqual(["test", "build"]);
		});
	});

	describe("Validation", () => {
		it("should validate valid package.json", async () => {
			const packageJson = JSON.stringify({
				name: "test-package",
				version: "1.0.0",
			});

			vi.mocked(mockFileSystem.readFile).mockResolvedValue(packageJson);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.validateConfig("/workspace/package.json");

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect missing name in package.json", async () => {
			const packageJson = JSON.stringify({
				version: "1.0.0",
			});

			vi.mocked(mockFileSystem.readFile).mockResolvedValue(packageJson);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.validateConfig("/workspace/package.json");

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("name"))).toBe(true);
		});

		it("should detect missing version in package.json", async () => {
			const packageJson = JSON.stringify({
				name: "test-package",
			});

			vi.mocked(mockFileSystem.readFile).mockResolvedValue(packageJson);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.validateConfig("/workspace/package.json");

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("version"))).toBe(true);
		});

		it("should validate tsconfig.json with warnings", async () => {
			const tsconfig = JSON.stringify({
				compilerOptions: {
					target: 123, // Should be string
				},
			});

			vi.mocked(mockFileSystem.readFile).mockResolvedValue(tsconfig);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const result = await detector.validateConfig("/workspace/tsconfig.json");

			expect(result.valid).toBe(true); // Warnings don't make it invalid
			expect(result.warnings.length).toBeGreaterThan(0);
		});
	});

	describe("Config type determination", () => {
		it("should determine env file type", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue([".env.local"]);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const files = await detector.detectConfigFiles();

			expect(files[0].type).toBe("env");
		});

		it("should determine various config types", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue([
				".eslintrc.json",
				".prettierrc.js",
				"jest.config.ts",
				"vitest.config.js",
				"webpack.config.js",
				"next.config.js",
				"vite.config.ts",
			]);

			const detector = new ConfigDetector("/workspace", mockFileSystem);
			const files = await detector.detectConfigFiles();

			expect(files.map((f) => f.type)).toEqual([
				"eslint",
				"prettier",
				"jest",
				"vitest",
				"webpack",
				"next",
				"vite",
			]);
		});
	});

	describe("Custom exclude patterns", () => {
		it("should use custom exclude patterns", async () => {
			vi.mocked(mockFileSystem.glob).mockResolvedValue([]);

			const detector = new ConfigDetector("/workspace", mockFileSystem, {
				exclude: ["custom/**", "excluded/**"],
			});

			await detector.detectConfigFiles();

			expect(mockFileSystem.glob).toHaveBeenCalledWith(
				expect.any(Array),
				"/workspace",
				expect.objectContaining({
					ignore: ["custom/**", "excluded/**"],
				}),
			);
		});
	});
});
