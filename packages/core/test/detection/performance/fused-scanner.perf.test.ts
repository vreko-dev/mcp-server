import { beforeEach, describe, expect, it } from "vitest";
import { FusedScanner } from "@snapback-core/detection/scanner/FusedScanner";

// Generate a test fixture with realistic code patterns
function generateFixture(lines: number): string {
	const linesArray: string[] = [];

	// Add some realistic code patterns
	const imports = [
		"import React from 'react';",
		"import { useState, useEffect } from 'react';",
		"import lodash from 'lodash';",
		"import express from 'express';",
		"import { readFile } from 'fs';",
		"import path from 'path';",
	];

	const secretPatterns = [
		"const apiKey = 'AKIAABCDEFGHIJKLMNOP';",
		"const githubToken = 'ghp_abcdefghijklmnopqrstuvwxyz123456';",
		"const openaiKey = 'sk-abcdefghijklmnopqrstuvwxyz123456789012';",
		"const dbUrl = 'postgres://user:password@localhost:5432/mydb';",
		"const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';",
	];

	const codePatterns = [
		"function calculateSum(a, b) { return a + b; }",
		"const result = await fetch('https://api.example.com/data');",
		"if (user.role === 'admin') { allowAccess(); }",
		"for (let i = 0; i < items.length; i++) { processItem(items[i]); }",
		"const data = JSON.parse(response);",
		"try { riskyOperation(); } catch (error) { handleError(error); }",
	];

	// Add imports
	linesArray.push("// Imports");
	linesArray.push(...imports);
	linesArray.push("");

	// Add lines of mixed content
	for (let i = 0; i < lines; i++) {
		// Occasionally add secret patterns (1 in 50 lines)
		if (i % 50 === 0 && Math.floor(i / 50) < secretPatterns.length) {
			linesArray.push(secretPatterns[Math.floor(i / 50)]);
		}
		// Add regular code patterns
		else {
			const patternIndex = i % codePatterns.length;
			linesArray.push(codePatterns[patternIndex]);
		}

		// Add some comments occasionally
		if (i % 25 === 0) {
			linesArray.push("// This is a comment");
		}

		// Add some empty lines occasionally
		if (i % 10 === 0) {
			linesArray.push("");
		}
	}

	return linesArray.join("\n");
}

describe("FusedScanner Performance", () => {
	let scanner: FusedScanner;

	beforeEach(() => {
		scanner = new FusedScanner();

		// Register patterns that match our test content
		scanner.register({
			id: "aws_key",
			regex: /AKIA[A-Z0-9]{16}/g,
			matchEverywhere: true,
		});

		scanner.register({
			id: "github_token",
			regex: /ghp_[a-zA-Z0-9]{36}/g,
			matchEverywhere: true,
		});

		scanner.register({
			id: "openai_key",
			regex: /sk-[a-zA-Z0-9]{32,}/g,
			matchEverywhere: true,
		});

		scanner.register({
			id: "postgresql_connection",
			regex: /postgres(ql)?:\/\/[^\s"']+/g,
			matchEverywhere: true,
		});

		scanner.register({
			id: "jwt_token",
			regex: /eyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*/g,
			matchEverywhere: true,
		});

		scanner.register({
			id: "import_statement",
			regex: /import\s+.*?\s+from\s+["'][^"']*["']/g,
			matchEverywhere: true,
		});
	});

	it("should process 500 lines fixture within performance threshold", () => {
		const fixture = generateFixture(500);

		// Measure execution time
		const startTime = performance.now();
		const results = scanner.scan(fixture);
		const endTime = performance.now();

		const executionTime = endTime - startTime;

		console.log(`FusedScanner processed ${fixture.length} characters in ${executionTime.toFixed(2)}ms`);
		console.log(`Found ${results.length} matches`);

		// Assert that execution time is under 80ms (p95 requirement)
		expect(executionTime).toBeLessThan(80);

		// Verify that we found expected patterns
		expect(results.length).toBeGreaterThan(0);
	});

	it("should maintain consistent performance across multiple runs", () => {
		const fixture = generateFixture(500);
		const times: number[] = [];

		// Run the scan 5 times and collect timing data
		for (let i = 0; i < 5; i++) {
			const startTime = performance.now();
			scanner.scan(fixture);
			const endTime = performance.now();
			times.push(endTime - startTime);
		}

		// Calculate statistics
		const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);

		console.log("Performance across 5 runs:");
		console.log(`  Average: ${avgTime.toFixed(2)}ms`);
		console.log(`  Min: ${minTime.toFixed(2)}ms`);
		console.log(`  Max: ${maxTime.toFixed(2)}ms`);

		// Assert that all runs are under 80ms
		for (const time of times) {
			expect(time).toBeLessThan(80);
		}
	});

	it("should demonstrate reasonable scaling", () => {
		// Test with different sizes of content
		const sizes = [100, 200, 500];
		const times: number[] = [];

		for (const size of sizes) {
			const content = generateFixture(size);

			const startTime = performance.now();
			scanner.scan(content);
			const endTime = performance.now();

			times.push(endTime - startTime);
		}

		// Log the results
		console.log("Scaling performance:");
		for (let i = 0; i < sizes.length; i++) {
			console.log(`  ${sizes[i]} lines: ${times[i].toFixed(2)}ms`);
		}

		// Basic check that larger content takes more time
		// But it should generally scale in a reasonable way
		expect(times[2]).toBeGreaterThan(times[0]);
	});
});
