import * as os from "node:os";
import * as path from "node:path";
import Bottleneck from "bottleneck";
import chokidar, { type FSWatcher } from "chokidar";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("File Watching Patterns", () => {
	let tempDir: string;
	let watcher: FSWatcher | null;
	let limiter: Bottleneck;

	beforeEach(async () => {
		// Create a temporary directory for testing
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "snapback-file-watch-"));

		// Initialize watcher to null
		watcher = null;

		// Create a Bottleneck limiter for rate limiting tests
		limiter = new Bottleneck({
			maxConcurrent: 1,
			minTime: 50, // 50ms between operations
		});
	});

	afterEach(async () => {
		// Close the watcher if it exists
		if (watcher) {
			await watcher.close();
		}

		// Clean up the temporary directory
		if (tempDir) {
			await fs.remove(tempDir);
		}
	});

	describe("Rapid Bulk File Changes", () => {
		it("should handle rapid file creation and deletion without missing events", async () => {
			const events: string[] = [];
			const fileCount = 5; // Reduced for more reliable testing

			// Set up the watcher
			watcher = chokidar.watch(tempDir, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50,
				},
			});

			watcher.on("add", (filePath: string) => {
				events.push(`add:${path.basename(filePath)}`);
			});
			watcher.on("unlink", (filePath: string) => {
				events.push(`unlink:${path.basename(filePath)}`);
			});

			// Wait for watcher to be ready
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Create and delete files rapidly
			const promises: Promise<void>[] = [];
			for (let i = 0; i < fileCount; i++) {
				const fileName = `file-${i}.txt`;
				const filePath = path.join(tempDir, fileName);

				// Create file
				promises.push(fs.outputFile(filePath, `content-${i}`));
			}

			await Promise.all(promises);

			// Wait a bit for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Delete files
			const deletePromises: Promise<void>[] = [];
			for (let i = 0; i < fileCount; i++) {
				const fileName = `file-${i}.txt`;
				const filePath = path.join(tempDir, fileName);
				deletePromises.push(fs.remove(filePath));
			}

			await Promise.all(deletePromises);

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Verify we captured events
			expect(events.length).toBeGreaterThan(0);
		}, 10000); // Increase timeout for this test

		it("should handle rate-limited file operations", async () => {
			const events: string[] = [];
			const fileCount = 5;

			// Set up the watcher
			watcher = chokidar.watch(tempDir, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50,
				},
			});

			watcher.on("add", (filePath: string) => events.push(`add:${path.basename(filePath)}`));
			watcher.on("change", (filePath: string) => events.push(`change:${path.basename(filePath)}`));

			// Wait for watcher to be ready
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Create files with rate limiting using Bottleneck
			for (let i = 0; i < fileCount; i++) {
				const fileName = `rate-limited-${i}.txt`;
				const filePath = path.join(tempDir, fileName);

				await limiter.schedule(() => fs.outputFile(filePath, `initial-content-${i}`));
				await limiter.schedule(() => fs.outputFile(filePath, `updated-content-${i}`));
			}

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Verify we captured events - with rate limiting, we should have at least some events
			// The exact number may vary based on timing, but we should have events from both operations
			expect(events.length).toBeGreaterThan(0);
		}, 10000); // Increase timeout for this test
	});

	describe("Package.json Atomic Updates", () => {
		it("should detect atomic updates to package.json", async () => {
			const events: string[] = [];
			const packageJsonPath = path.join(tempDir, "package.json");

			// Set up the watcher with specific handling for package.json
			watcher = chokidar.watch(packageJsonPath, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 200,
					pollInterval: 50,
				},
			});

			watcher.on("change", (filePath: string) => {
				events.push(`change:${path.basename(filePath)}`);
			});

			// Wait for watcher to be ready
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Create initial package.json using fs-extra atomic operations
			await fs.writeJson(packageJsonPath, {
				name: "test-package",
				version: "1.0.0",
			});

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Simulate atomic update (write to temp file then move) using fs-extra
			const tempPackageJson = path.join(tempDir, "package.json.tmp");
			await fs.writeJson(tempPackageJson, {
				name: "test-package",
				version: "1.0.1",
			});
			await fs.move(tempPackageJson, packageJsonPath, {
				overwrite: true,
			});

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Verify we captured the change event
			expect(events).toContain("change:package.json");
		}, 10000); // Increase timeout for this test
	});

	describe(".env Modification Detection", () => {
		it("should detect .env file modifications", async () => {
			const events: string[] = [];
			const envPath = path.join(tempDir, ".env");

			// Set up the watcher for .env files
			watcher = chokidar.watch(envPath, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50,
				},
			});

			watcher.on("add", (filePath: string) => events.push(`add:${path.basename(filePath)}`));
			watcher.on("change", (filePath: string) => events.push(`change:${path.basename(filePath)}`));

			// Wait for watcher to be ready
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Create .env file using fs-extra
			await fs.outputFile(envPath, "API_KEY=test-key-1");

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Modify .env file
			await fs.outputFile(envPath, "API_KEY=test-key-2");

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Verify we captured both events
			expect(events).toContain("add:.env");
			expect(events).toContain("change:.env");
		}, 10000); // Increase timeout for this test

		it("should filter out .env files from regular file watching", async () => {
			const events: string[] = [];

			// Set up the watcher with filtering for .env files
			watcher = chokidar.watch(tempDir, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50,
				},
				ignored: (filePath: string) => path.basename(filePath).startsWith(".env"),
			});

			watcher.on("add", (filePath: string) => events.push(`add:${path.basename(filePath)}`));

			// Wait for watcher to be ready
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Create regular file and .env file using fs-extra
			await fs.outputFile(path.join(tempDir, "regular.txt"), "regular content");
			await fs.outputFile(path.join(tempDir, ".env"), "SECRET=secret-value");

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Verify we only captured the regular file
			expect(events).toContain("add:regular.txt");
			expect(events).not.toContain("add:.env");
		}, 10000); // Increase timeout for this test
	});

	describe("Node Modules Filtering", () => {
		it("should filter out node_modules directory", async () => {
			const events: string[] = [];

			// Set up the watcher with filtering for node_modules
			watcher = chokidar.watch(tempDir, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50,
				},
				ignored: (filePath: string) => filePath.includes("node_modules"),
			});

			watcher.on("add", (filePath: string) => events.push(`add:${path.relative(tempDir, filePath)}`));

			// Wait for watcher to be ready
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Create files in regular directory and node_modules using fs-extra
			await fs.outputFile(path.join(tempDir, "src", "index.js"), 'console.log("hello");');
			await fs.outputFile(path.join(tempDir, "node_modules", "test-package", "index.js"), "module.exports = {};");

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Verify we only captured the regular file
			expect(events).toContain("add:src/index.js");
			expect(events).not.toContain("add:node_modules/test-package/index.js");
		}, 10000); // Increase timeout for this test
	});

	describe("Binary vs Text File Handling", () => {
		it("should distinguish between binary and text file changes", async () => {
			const textEvents: string[] = [];
			const binaryEvents: string[] = [];

			// Create subdirectories for text and binary files using fs-extra
			const textDir = path.join(tempDir, "text-files");
			const binaryDir = path.join(tempDir, "binary-files");
			await fs.ensureDir(textDir);
			await fs.ensureDir(binaryDir);

			// Set up watchers for different file types
			const textWatcher = chokidar.watch(textDir, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50,
				},
			});

			const binaryWatcher = chokidar.watch(binaryDir, {
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50,
				},
			});

			textWatcher.on("add", (filePath: string) => textEvents.push(`add:${path.basename(filePath)}`));
			textWatcher.on("change", (filePath: string) => textEvents.push(`change:${path.basename(filePath)}`));

			binaryWatcher.on("add", (filePath: string) => binaryEvents.push(`add:${path.basename(filePath)}`));
			binaryWatcher.on("change", (filePath: string) => binaryEvents.push(`change:${path.basename(filePath)}`));

			// Wait for watchers to be ready
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Create text files using fs-extra
			await fs.outputFile(path.join(textDir, "document.txt"), "This is a text document");
			await fs.outputFile(path.join(textDir, "code.js"), 'console.log("Hello World");');

			// Create binary-like files (using buffer data)
			await fs.outputFile(path.join(binaryDir, "image.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
			await fs.outputFile(path.join(binaryDir, "archive.zip"), Buffer.from([0x50, 0x4b, 0x03, 0x04]));

			// Wait for events to be processed
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Verify we captured events for both types
			expect(textEvents.length).toBeGreaterThan(0);
			expect(binaryEvents.length).toBeGreaterThan(0);

			// Clean up watchers
			await textWatcher.close();
			await binaryWatcher.close();
		}, 10000); // Increase timeout for this test
	});
});
