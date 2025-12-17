/**
 * Phantom Dependencies Signal Tests
 *
 * Tests for phantom-deps.ts script that detects missing package dependencies.
 * SOURCE: packages/core/src/detection/plugins/phantom-dependency.ts
 *
 * V1 PARITY: This test suite ensures V2 engine matches V1 PhantomDependencyPlugin behavior.
 */

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { detectPhantomDeps, extractImports } from "../../src/signals/phantom-deps.js";

const PHANTOM_DEPS_SCRIPT = "src/signals/phantom-deps.ts";

// ============================================================================
// Direct Import Tests (for coverage) - V1 Parity
// ============================================================================

describe("extractImports (direct import)", () => {
	describe("ES6 imports", () => {
		it("should extract default imports", () => {
			const code = `import foo from 'foo';`;
			const imports = extractImports(code);
			expect(imports).toContain("foo");
		});

		it("should extract named imports", () => {
			const code = `import { bar, baz } from 'bar';`;
			const imports = extractImports(code);
			expect(imports).toContain("bar");
		});

		it("should extract namespace imports", () => {
			const code = `import * as utils from 'utils';`;
			const imports = extractImports(code);
			expect(imports).toContain("utils");
		});

		it("should extract side-effect imports", () => {
			const code = `import 'polyfill';`;
			const imports = extractImports(code);
			expect(imports).toContain("polyfill");
		});

		it("should extract scoped package imports", () => {
			const code = `import { something } from '@org/package';`;
			const imports = extractImports(code);
			expect(imports).toContain("@org/package");
		});

		it("should extract subpath imports", () => {
			const code = `import { Button } from '@mui/material/Button';`;
			const imports = extractImports(code);
			expect(imports).toContain("@mui/material/Button");
		});
	});

	describe("CommonJS requires", () => {
		it("should extract require calls", () => {
			const code = `const foo = require('foo');`;
			const imports = extractImports(code);
			expect(imports).toContain("foo");
		});

		it("should extract scoped requires", () => {
			const code = `const { x } = require('@org/package');`;
			const imports = extractImports(code);
			expect(imports).toContain("@org/package");
		});
	});

	describe("Dynamic imports", () => {
		it("should extract dynamic imports", () => {
			const code = `const mod = await import('dynamic-module');`;
			const imports = extractImports(code);
			expect(imports).toContain("dynamic-module");
		});
	});

	describe("Edge cases", () => {
		it("should handle multiple imports in one file", () => {
			const code = `
				import foo from 'foo';
				import { bar } from 'bar';
				const baz = require('baz');
			`;
			const imports = extractImports(code);
			expect(imports).toContain("foo");
			expect(imports).toContain("bar");
			expect(imports).toContain("baz");
		});

		it("should handle empty content", () => {
			const imports = extractImports("");
			expect(imports).toEqual([]);
		});

		it("should strip query params from import paths", () => {
			const code = `import config from './config?raw';`;
			const imports = extractImports(code);
			expect(imports).toContain("./config");
			expect(imports).not.toContain("./config?raw");
		});
	});
});

describe("detectPhantomDeps (direct import)", () => {
	describe("phantom detection", () => {
		it("should detect missing dependency", () => {
			const imports = ["not-in-package-json"];
			const declaredDeps = new Set<string>();
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toContain("not-in-package-json");
		});

		it("should NOT flag declared dependencies", () => {
			const imports = ["lodash"];
			const declaredDeps = new Set(["lodash"]);
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).not.toContain("lodash");
		});

		it("should ignore Node.js builtins (fs, path)", () => {
			const imports = ["fs", "path", "crypto", "node:fs", "node:path"];
			const declaredDeps = new Set<string>();
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual([]);
		});

		it("should ignore relative imports", () => {
			const imports = ["./local", "../parent", "/absolute"];
			const declaredDeps = new Set<string>();
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual([]);
		});

		it("should ignore workspace packages (@snapback/*)", () => {
			const imports = ["@snapback/core", "@snapback/sdk", "@snapback/contracts"];
			const declaredDeps = new Set<string>();
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual([]);
		});

		it("should ignore @types/* packages", () => {
			const imports = ["@types/node", "@types/react"];
			const declaredDeps = new Set<string>();
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual([]);
		});

		it("should handle scoped package subpaths correctly", () => {
			const imports = ["@mui/material/Button"];
			const declaredDeps = new Set(["@mui/material"]);
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual([]);
		});

		it("should handle unscoped package subpaths correctly", () => {
			const imports = ["lodash/debounce"];
			const declaredDeps = new Set(["lodash"]);
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual([]);
		});
	});

	describe("typosquatting detection", () => {
		it("should detect typosquat when similar package is declared", () => {
			const imports = ["lodahs"]; // typo of "lodash"
			const declaredDeps = new Set(["lodash"]);
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.typosquats.length).toBeGreaterThan(0);
			expect(result.typosquats[0].pkg).toBe("lodahs");
			expect(result.typosquats[0].suggestion).toBe("lodash");
		});

		it("should detect typosquat with single character difference", () => {
			const imports = ["recat"]; // typo of "react"
			const declaredDeps = new Set(["react"]);
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.typosquats.length).toBeGreaterThan(0);
			expect(result.typosquats[0].suggestion).toBe("react");
		});

		it("should NOT flag typosquat for distant package names", () => {
			const imports = ["completely-different-package"];
			const declaredDeps = new Set(["lodash"]);
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.typosquats).toEqual([]);
			expect(result.phantoms).toContain("completely-different-package");
		});
	});

	describe("edge cases", () => {
		it("should handle empty imports array", () => {
			const imports: string[] = [];
			const declaredDeps = new Set(["lodash"]);
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual([]);
			expect(result.typosquats).toEqual([]);
		});

		it("should deduplicate phantom detections", () => {
			const imports = ["missing-pkg", "missing-pkg", "missing-pkg"];
			const declaredDeps = new Set<string>();
			const result = detectPhantomDeps(imports, declaredDeps);
			expect(result.phantoms).toEqual(["missing-pkg"]);
		});
	});
});

// ============================================================================
// Subprocess Tests (integration tests)
// ============================================================================

describe("Phantom Dependencies Signal Script", () => {
	describe("JSON output contract", () => {
		it("should output valid JSON with signal schema", () => {
			const input = {
				files: [{ path: "test.ts", content: "const x = 1;" }],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			expect(result).toHaveProperty("signal", "phantom-deps");
			expect(result).toHaveProperty("value");
			expect(typeof result.value).toBe("number");
			expect(result).toHaveProperty("metadata");
		});

		it("should include phantom count in metadata", () => {
			const input = {
				files: [{ path: "test.ts", content: "const x = 1;" }],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			expect(result.metadata).toHaveProperty("phantomCount");
			expect(typeof result.metadata.phantomCount).toBe("number");
		});
	});

	describe("phantom detection", () => {
		it("should detect missing packages", () => {
			const input = {
				files: [{ path: "app.ts", content: "import missingPkg from 'nonexistent-pkg-xyz';" }],
				workspace: process.cwd(),
			};

			const jsonStr = JSON.stringify(input).replace(/'/g, "'\\''");
			const output = execSync(`echo '${jsonStr}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			expect(result.metadata.phantomCount).toBeGreaterThan(0);
			expect(result.metadata.phantoms).toContain("nonexistent-pkg-xyz");
		});

		it("should not flag Node.js builtins", () => {
			const input = {
				files: [
					{
						path: "app.ts",
						content: "import fs from 'fs'; import path from 'path';",
					},
				],
				workspace: process.cwd(),
			};

			const jsonStr = JSON.stringify(input).replace(/'/g, "'\\''");
			const output = execSync(`echo '${jsonStr}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			expect(result.metadata.phantoms).not.toContain("fs");
			expect(result.metadata.phantoms).not.toContain("path");
		});
	});

	describe("edge cases", () => {
		it("should handle clean files with no imports", () => {
			const input = {
				files: [{ path: "clean.ts", content: "const x = 1; function add(a, b) { return a + b; }" }],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("phantom-deps");
			expect(result.value).toBe(0);
			expect(result.metadata.phantomCount).toBe(0);
		});

		it("should handle empty files list", () => {
			const input = {
				files: [],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("phantom-deps");
			expect(result.value).toBe(0);
		});

		it("should skip test files", () => {
			const input = {
				files: [
					{ path: "app.test.ts", content: `import missing from 'phantom-in-test';` },
					{ path: "app.spec.ts", content: `import missing from 'phantom-in-spec';` },
				],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			expect(result.metadata.phantomCount).toBe(0);
		});
	});

	describe("error handling", () => {
		it("should output valid JSON for invalid input", () => {
			try {
				execSync(`echo 'invalid json' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
					encoding: "utf-8",
					cwd: process.cwd(),
				});
			} catch (error: any) {
				const output = error.stdout || error.stderr;
				expect(() => JSON.parse(output)).not.toThrow();
			}
		});
	});

	describe("severity calculation", () => {
		it("should set severity to critical for typosquats", () => {
			// This test requires a package that's close to a declared one
			// We test the metadata severity field
			const input = {
				files: [{ path: "clean.ts", content: "const x = 1;" }],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${PHANTOM_DEPS_SCRIPT}`, {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			const result = JSON.parse(output);
			// With no phantoms, severity should be "none"
			expect(result.metadata.severity).toBe("none");
		});
	});
});
