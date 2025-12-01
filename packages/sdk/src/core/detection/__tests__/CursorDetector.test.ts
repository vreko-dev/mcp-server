import { describe, expect, it } from "vitest";
import { CursorDetector, type IEnvironmentProvider } from "../CursorDetector";

const makeEnv = (appName: string): IEnvironmentProvider => ({
	getAppName: () => appName,
	getEnvVar: () => undefined,
});

describe("CursorDetector v1", () => {
	it('detects Cursor when appName includes "cursor" (case-insensitive)', () => {
		const detector = new CursorDetector(makeEnv("Cursor - Insiders"));
		const result = detector.detect();

		expect(result.hasCursor).toBe(true);
		expect(result.confidence).toBe(7.0);
	});

	it("does not detect Cursor in regular VS Code", () => {
		const detector = new CursorDetector(makeEnv("Visual Studio Code"));
		const result = detector.detect();

		expect(result.hasCursor).toBe(false);
		expect(result.confidence).toBe(8.5);
	});

	it("treats ambiguous appName conservatively (no cursor)", () => {
		const detector = new CursorDetector(makeEnv("Code - OSS"));
		const result = detector.detect();

		expect(result.hasCursor).toBe(false);
		expect(result.confidence).toBe(8.5);
	});

	it("is robust to weird casing and whitespace", () => {
		const detector = new CursorDetector(makeEnv("  cUrSoR  "));
		const result = detector.detect();

		expect(result.hasCursor).toBe(true);
	});
});
