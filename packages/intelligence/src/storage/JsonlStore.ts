/**
 * JSONL Store
 *
 * Atomic JSONL file operations for learnings, violations, and interactions.
 * Uses atomically package for safe writes that prevent corruption.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { writeFile } from "atomically";

/**
 * Load all records from a JSONL file
 */
export function loadJsonl<T>(filepath: string): T[] {
	if (!fs.existsSync(filepath)) {
		return [];
	}
	try {
		return fs
			.readFileSync(filepath, "utf-8")
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as T);
	} catch (e) {
		console.error(`[JsonlStore] Error loading ${filepath}:`, e);
		return [];
	}
}

/**
 * Append a record to a JSONL file (sync)
 */
export function appendJsonl<T>(filepath: string, data: T): void {
	const dir = path.dirname(filepath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.appendFileSync(filepath, `${JSON.stringify(data)}\n`);
}

/**
 * Append a record to a JSONL file (async, atomic)
 */
export async function appendJsonlAsync<T>(filepath: string, data: T): Promise<void> {
	const dir = path.dirname(filepath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	try {
		const existing = fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf-8") : "";
		await writeFile(filepath, `${existing + JSON.stringify(data)}\n`);
	} catch {
		// Fallback to sync append
		fs.appendFileSync(filepath, `${JSON.stringify(data)}\n`);
	}
}

/**
 * Write all records to a JSONL file (atomic replace)
 */
export async function writeJsonl<T>(filepath: string, records: T[]): Promise<void> {
	const dir = path.dirname(filepath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	const content = `${records.map((r) => JSON.stringify(r)).join("\n")}\n`;
	try {
		await writeFile(filepath, content);
	} catch {
		// Fallback to sync write
		fs.writeFileSync(filepath, content);
	}
}

/**
 * Find a record by predicate
 */
export function findInJsonl<T>(filepath: string, predicate: (item: T) => boolean): T | undefined {
	const records = loadJsonl<T>(filepath);
	return records.find(predicate);
}

/**
 * Update a record that matches the predicate
 */
export async function updateInJsonl<T>(
	filepath: string,
	predicate: (item: T) => boolean,
	updater: (item: T) => T,
): Promise<boolean> {
	const records = loadJsonl<T>(filepath);
	let updated = false;

	const newRecords = records.map((record) => {
		if (predicate(record)) {
			updated = true;
			return updater(record);
		}
		return record;
	});

	if (updated) {
		await writeJsonl(filepath, newRecords);
	}

	return updated;
}

/**
 * Count records matching a predicate
 */
export function countInJsonl<T>(filepath: string, predicate?: (item: T) => boolean): number {
	const records = loadJsonl<T>(filepath);
	if (!predicate) {
		return records.length;
	}
	return records.filter(predicate).length;
}

/**
 * Generate a unique ID
 */
export function generateId(prefix = "ID"): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
