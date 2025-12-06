/**
 * Unit tests for CooldownCache
 * L1: Pure logic, no VS Code runtime required
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Types for CooldownCache (would normally import from src)
interface CooldownEntry {
	filePath: string;
	protectionLevel: string;
	triggeredAt: number;
	expiresAt: number;
	actionTaken: string;
	snapshotId?: string;
}

/**
 * In-memory cooldown cache implementation
 * This would be in src/storage/CooldownCache.ts
 */
class CooldownCache {
	private cache = new Map<string, CooldownEntry>();
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	constructor(private readonly cleanupIntervalMs: number = 60_000) {}

	start(): void {
		if (this.cleanupInterval) return;
		this.cleanupInterval = setInterval(() => {
			this.removeExpired();
		}, this.cleanupIntervalMs);
	}

	dispose(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.cache.clear();
	}

	private getKey(filePath: string, protectionLevel: string): string {
		return `${filePath}::${protectionLevel}`;
	}

	set(entry: CooldownEntry): void {
		const key = this.getKey(entry.filePath, entry.protectionLevel);
		this.cache.set(key, entry);
	}

	get(filePath: string, protectionLevel: string): CooldownEntry | null {
		const key = this.getKey(filePath, protectionLevel);
		const entry = this.cache.get(key);

		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		return entry;
	}

	isInCooldown(filePath: string, protectionLevel: string): boolean {
		return this.get(filePath, protectionLevel) !== null;
	}

	getRemainingTime(filePath: string, protectionLevel: string): number {
		const entry = this.get(filePath, protectionLevel);
		if (!entry) return 0;
		return Math.max(0, entry.expiresAt - Date.now());
	}

	remove(filePath: string, protectionLevel: string): boolean {
		const key = this.getKey(filePath, protectionLevel);
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	removeExpired(): number {
		const now = Date.now();
		let removed = 0;

		for (const [key, entry] of this.cache) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
				removed++;
			}
		}

		return removed;
	}

	get size(): number {
		return this.cache.size;
	}

	getAll(): CooldownEntry[] {
		const now = Date.now();
		const entries: CooldownEntry[] = [];

		for (const entry of this.cache.values()) {
			if (now <= entry.expiresAt) {
				entries.push(entry);
			}
		}

		return entries;
	}
}

// ============================================
// TESTS
// ============================================

describe("CooldownCache", () => {
	let cache: CooldownCache;

	beforeEach(() => {
		vi.useFakeTimers();
		cache = new CooldownCache(100); // Fast cleanup for tests
	});

	afterEach(() => {
		cache.dispose();
		vi.useRealTimers();
	});

	describe("Basic Operations", () => {
		it("stores and retrieves cooldown entry", () => {
			const entry: CooldownEntry = {
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
			};

			cache.set(entry);

			const retrieved = cache.get("/test/file.ts", "Protected");
			expect(retrieved).toEqual(entry);
		});

		it("returns null for non-existent entry", () => {
			const result = cache.get("/non/existent.ts", "Protected");
			expect(result).toBeNull();
		});

		it("returns null for expired cooldown", () => {
			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now() - 20_000,
				expiresAt: Date.now() - 10_000, // Already expired
				actionTaken: "blocked",
			});

			expect(cache.isInCooldown("/test/file.ts", "Protected")).toBe(false);
			expect(cache.get("/test/file.ts", "Protected")).toBeNull();
		});

		it("removes specific cooldown entry", () => {
			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
			});

			const removed = cache.remove("/test/file.ts", "Protected");

			expect(removed).toBe(true);
			expect(cache.isInCooldown("/test/file.ts", "Protected")).toBe(false);
		});

		it("clears all cooldowns", () => {
			cache.set({
				filePath: "/test/file1.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
			});

			cache.set({
				filePath: "/test/file2.ts",
				protectionLevel: "Watch",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "warned",
			});

			cache.clear();

			expect(cache.size).toBe(0);
			expect(cache.isInCooldown("/test/file1.ts", "Protected")).toBe(false);
			expect(cache.isInCooldown("/test/file2.ts", "Watch")).toBe(false);
		});
	});

	describe("TTL (Time To Live) Logic", () => {
		it("entry expires after TTL", () => {
			const ttl = 5_000; // 5 seconds
			const now = Date.now();

			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: now,
				expiresAt: now + ttl,
				actionTaken: "blocked",
			});

			// Still valid
			expect(cache.isInCooldown("/test/file.ts", "Protected")).toBe(true);

			// Advance time past TTL
			vi.advanceTimersByTime(ttl + 100);

			// Now expired
			expect(cache.isInCooldown("/test/file.ts", "Protected")).toBe(false);
		});

		it("getRemainingTime returns correct value", () => {
			const ttl = 10_000;
			const now = Date.now();

			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: now,
				expiresAt: now + ttl,
				actionTaken: "blocked",
			});

			// Check remaining time
			const remaining = cache.getRemainingTime("/test/file.ts", "Protected");
			expect(remaining).toBeLessThanOrEqual(ttl);
			expect(remaining).toBeGreaterThan(0);

			// Advance time
			vi.advanceTimersByTime(3_000);

			const newRemaining = cache.getRemainingTime("/test/file.ts", "Protected");
			expect(newRemaining).toBeLessThanOrEqual(ttl - 3_000);
		});

		it("getRemainingTime returns 0 for non-existent entry", () => {
			expect(cache.getRemainingTime("/non/existent.ts", "Protected")).toBe(0);
		});

		it("getRemainingTime returns 0 for expired entry", () => {
			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now() - 20_000,
				expiresAt: Date.now() - 10_000,
				actionTaken: "blocked",
			});

			expect(cache.getRemainingTime("/test/file.ts", "Protected")).toBe(0);
		});
	});

	describe("Per-File, Per-Level Isolation", () => {
		it("same file, different levels are isolated", () => {
			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
			});

			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Watch",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 5_000,
				actionTaken: "watched",
			});

			expect(cache.isInCooldown("/test/file.ts", "Protected")).toBe(true);
			expect(cache.isInCooldown("/test/file.ts", "Watch")).toBe(true);
			expect(cache.size).toBe(2);

			// Remove one, other remains
			cache.remove("/test/file.ts", "Protected");
			expect(cache.isInCooldown("/test/file.ts", "Protected")).toBe(false);
			expect(cache.isInCooldown("/test/file.ts", "Watch")).toBe(true);
		});

		it("different files, same level are isolated", () => {
			cache.set({
				filePath: "/test/file1.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
			});

			cache.set({
				filePath: "/test/file2.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 5_000,
				actionTaken: "blocked",
			});

			// Advance past file2's expiry but not file1's
			vi.advanceTimersByTime(6_000);

			expect(cache.isInCooldown("/test/file1.ts", "Protected")).toBe(true);
			expect(cache.isInCooldown("/test/file2.ts", "Protected")).toBe(false);
		});
	});

	describe("Cleanup Logic", () => {
		it("removeExpired removes only expired entries", () => {
			const now = Date.now();

			// Active entry
			cache.set({
				filePath: "/test/active.ts",
				protectionLevel: "Protected",
				triggeredAt: now,
				expiresAt: now + 10_000,
				actionTaken: "blocked",
			});

			// Expired entry
			cache.set({
				filePath: "/test/expired.ts",
				protectionLevel: "Protected",
				triggeredAt: now - 20_000,
				expiresAt: now - 10_000,
				actionTaken: "blocked",
			});

			const removed = cache.removeExpired();

			expect(removed).toBe(1);
			expect(cache.size).toBe(1);
			expect(cache.isInCooldown("/test/active.ts", "Protected")).toBe(true);
			expect(cache.isInCooldown("/test/expired.ts", "Protected")).toBe(false);
		});

		it("periodic cleanup runs on interval", () => {
			cache.start();

			const now = Date.now();

			// Entry that will expire
			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: now,
				expiresAt: now + 50, // Expires in 50ms
				actionTaken: "blocked",
			});

			expect(cache.size).toBe(1);

			// Advance past expiry and cleanup interval (100ms)
			vi.advanceTimersByTime(150);

			// Cleanup should have run
			expect(cache.size).toBe(0);
		});

		it("getAll returns only active entries", () => {
			const now = Date.now();

			cache.set({
				filePath: "/test/active.ts",
				protectionLevel: "Protected",
				triggeredAt: now,
				expiresAt: now + 10_000,
				actionTaken: "blocked",
			});

			cache.set({
				filePath: "/test/expired.ts",
				protectionLevel: "Protected",
				triggeredAt: now - 20_000,
				expiresAt: now - 10_000,
				actionTaken: "blocked",
			});

			const all = cache.getAll();

			expect(all).toHaveLength(1);
			expect(all[0].filePath).toBe("/test/active.ts");
		});
	});

	describe("Edge Cases", () => {
		it("handles empty file path", () => {
			cache.set({
				filePath: "",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
			});

			expect(cache.isInCooldown("", "Protected")).toBe(true);
		});

		it("handles special characters in file path", () => {
			const specialPath = "/test/file with spaces/[brackets]/file.ts";

			cache.set({
				filePath: specialPath,
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
			});

			expect(cache.isInCooldown(specialPath, "Protected")).toBe(true);
		});

		it("handles very long TTL", () => {
			const longTTL = 365 * 24 * 60 * 60 * 1000; // 1 year

			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + longTTL,
				actionTaken: "blocked",
			});

			expect(cache.isInCooldown("/test/file.ts", "Protected")).toBe(true);
		});

		it("overwrites existing entry for same key", () => {
			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 10_000,
				actionTaken: "blocked",
				snapshotId: "snap-1",
			});

			cache.set({
				filePath: "/test/file.ts",
				protectionLevel: "Protected",
				triggeredAt: Date.now(),
				expiresAt: Date.now() + 20_000,
				actionTaken: "warned",
				snapshotId: "snap-2",
			});

			const entry = cache.get("/test/file.ts", "Protected");
			expect(entry?.snapshotId).toBe("snap-2");
			expect(entry?.actionTaken).toBe("warned");
			expect(cache.size).toBe(1);
		});
	});
});
