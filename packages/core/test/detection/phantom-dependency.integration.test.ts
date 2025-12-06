import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { PhantomDependencyPlugin } from "../../src/detection/plugins/phantom-dependency";

// Import the cache so we can clear it between tests
import { cache } from "../../src/detection/utils/package-parser";

describe("PhantomDependencyPlugin Integration Tests", () => {
	let plugin: PhantomDependencyPlugin;

	beforeEach(() => {
		plugin = new PhantomDependencyPlugin();
		// Clear the cache between tests to avoid interference
		cache.clear();
	});

	/**
	 * Test with a real package.json file
	 */
	it("should detect phantom dependencies with real package.json", async () => {
		// Create a temporary directory structure
		const tempDir = path.join(process.cwd(), "temp-test");
		const srcDir = path.join(tempDir, "src");

		// Clean up any existing temp directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}

		// Create directory structure
		fs.mkdirSync(tempDir, { recursive: true });
		fs.mkdirSync(srcDir, { recursive: true });

		// Create a real package.json
		const packageJson = {
			name: "test-project",
			version: "1.0.0",
			dependencies: {
				react: "^18.0.0",
				"react-dom": "^18.0.0",
			},
			devDependencies: {
				vitest: "^4.0.0",
			},
		};

		fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(packageJson, null, 2));

		// Create a test file with phantom dependencies
		const testFilePath = path.join(srcDir, "test.js");
		const testContent = `
import lodash from 'lodash';
import express from 'express';
import { something } from 'non-existent-package';

const result = lodash.map([1, 2, 3], x => x * 2);
console.log(result);
`;

		fs.writeFileSync(testFilePath, testContent);

		// Test the plugin
		const result = await plugin.analyze(testContent, testFilePath);

		// Should detect phantom dependencies
		expect(result.score).toBeGreaterThan(0.5);
		expect(result.factors.some((f) => f.includes("phantom dependencies detected"))).toBe(true);
		expect(result.factors.some((f) => f.includes("lodash"))).toBe(true);
		expect(result.factors.some((f) => f.includes("express"))).toBe(true);
		expect(result.factors.some((f) => f.includes("non-existent-package"))).toBe(true);

		// Clean up
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	/**
	 * Test with no phantom dependencies
	 */
	it("should not flag declared dependencies", async () => {
		// Create a temporary directory structure
		const tempDir = path.join(process.cwd(), "temp-test");
		const srcDir = path.join(tempDir, "src");

		// Clean up any existing temp directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}

		// Create directory structure
		fs.mkdirSync(tempDir, { recursive: true });
		fs.mkdirSync(srcDir, { recursive: true });

		// Create a real package.json
		const packageJson = {
			name: "test-project",
			version: "1.0.0",
			dependencies: {
				react: "^18.0.0",
				"react-dom": "^18.0.0",
				lodash: "^4.17.21",
			},
			devDependencies: {
				vitest: "^4.0.0",
			},
		};

		fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(packageJson, null, 2));

		// Create a test file with only declared dependencies
		const testFilePath = path.join(srcDir, "test.js");
		const testContent = `
import React from 'react';
import lodash from 'lodash';

const result = lodash.map([1, 2, 3], x => x * 2);
console.log(result);
`;

		fs.writeFileSync(testFilePath, testContent);

		// Test the plugin
		const result = await plugin.analyze(testContent, testFilePath);

		// Should not detect phantom dependencies
		expect(result.score).toBeLessThan(0.3);

		// Clean up
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	/**
	 * Test with Node.js built-ins
	 */
	it("should skip Node.js built-ins", async () => {
		// Create a temporary directory structure
		const tempDir = path.join(process.cwd(), "temp-test");
		const srcDir = path.join(tempDir, "src");

		// Clean up any existing temp directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}

		// Create directory structure
		fs.mkdirSync(tempDir, { recursive: true });
		fs.mkdirSync(srcDir, { recursive: true });

		// Create a real package.json
		const packageJson = {
			name: "test-project",
			version: "1.0.0",
			dependencies: {
				react: "^18.0.0",
			},
		};

		fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(packageJson, null, 2));

		// Create a test file with Node.js built-ins
		const testFilePath = path.join(srcDir, "test.js");
		const testContent = `
import fs from 'fs';
import path from 'path';
import { something } from 'non-existent-package';

fs.readFileSync('test.txt', 'utf8');
`;

		fs.writeFileSync(testFilePath, testContent);

		// Test the plugin
		const result = await plugin.analyze(testContent, testFilePath);

		// Should only detect the non-existent package, not Node.js built-ins
		expect(result.score).toBeGreaterThan(0.3);
		expect(result.factors.some((f) => f.includes("non-existent-package"))).toBe(true);
		expect(result.factors.some((f) => f.includes("fs"))).toBe(false);
		expect(result.factors.some((f) => f.includes("path"))).toBe(false);

		// Clean up
		fs.rmSync(tempDir, { recursive: true, force: true });
	});
});
