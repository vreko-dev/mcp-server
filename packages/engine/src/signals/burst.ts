/**
 * Burst Detection Signal
 *
 * Detects rapid code changes (AI paste detection) in a transport-agnostic way.
 * No VS Code APIs - pure TypeScript logic.
 *
 * BURST CRITERIA:
 * - Default threshold: 30 characters per 100ms
 * - Sliding window: last 100ms of activity
 * - Cooldown: 500ms between burst triggers per file
 *
 * DETECTION ALGORITHM:
 * 1. Track file change events
 * 2. Calculate chars/ms velocity in 100ms window
 * 3. If velocity > threshold → BURST detected
 * 4. Debounce: 500ms cooldown between burst triggers
 */

export interface ChangeEvent {
	timestamp: number;
	charCount: number;
	filePath: string;
}

export interface BurstEvent {
	filePath: string;
	velocity: number; // chars per millisecond
	charCount: number;
	timestamp: number;
}

export interface BurstDetectorConfig {
	threshold?: number; // chars per 100ms (default: 30)
	windowMs?: number; // detection window (default: 100ms)
	cooldownMs?: number; // cooldown between bursts (default: 500ms)
}

export class BurstDetector {
	private changeHistory: Map<string, ChangeEvent[]> = new Map();
	private cooldowns: Map<string, number> = new Map();
	private threshold: number;
	private readonly WINDOW_MS: number;
	private readonly COOLDOWN_MS: number;

	constructor(config: BurstDetectorConfig = {}) {
		this.threshold = config.threshold ?? 30;
		this.WINDOW_MS = config.windowMs ?? 100;
		this.COOLDOWN_MS = config.cooldownMs ?? 500;
	}

	/**
	 * Process a file change and check for burst detection
	 *
	 * @param filePath - Path to the file that changed
	 * @param charCount - Number of characters changed
	 * @param timestamp - Timestamp of the change (default: now)
	 * @returns BurstEvent if burst detected, null otherwise
	 */
	processChange(filePath: string, charCount: number, timestamp: number = Date.now()): BurstEvent | null {
		// Skip empty changes
		if (charCount === 0) {
			return null;
		}

		// Check cooldown
		const lastBurst = this.cooldowns.get(filePath);
		if (lastBurst && timestamp - lastBurst < this.COOLDOWN_MS) {
			return null; // Still in cooldown
		}

		// Record change
		this.recordChange(filePath, timestamp, charCount);

		// Calculate velocity in current window
		const velocity = this.calculateVelocity(filePath, timestamp);

		// Check if burst detected
		const velocityPer100ms = velocity * this.WINDOW_MS;
		if (velocityPer100ms >= this.threshold) {
			return this.triggerBurst(filePath, velocity, charCount, timestamp);
		}

		return null;
	}

	/**
	 * Record a change event
	 */
	private recordChange(filePath: string, timestamp: number, charCount: number): void {
		const history = this.changeHistory.get(filePath) || [];
		history.push({ timestamp, charCount, filePath });
		this.changeHistory.set(filePath, history);
	}

	/**
	 * Calculate chars/ms velocity in current window
	 */
	private calculateVelocity(filePath: string, now: number): number {
		const history = this.changeHistory.get(filePath) || [];
		const windowStart = now - this.WINDOW_MS;

		let totalChars = 0;
		let earliestTime = now;

		for (const event of history) {
			if (event.timestamp >= windowStart) {
				totalChars += event.charCount;
				earliestTime = Math.min(earliestTime, event.timestamp);
			}
		}

		const duration = now - earliestTime;
		if (duration === 0) {
			// Instant change (large paste) - treat as 1ms for calculation
			return totalChars / 1;
		}

		return totalChars / duration; // chars per millisecond
	}

	/**
	 * Trigger burst event
	 */
	private triggerBurst(filePath: string, velocity: number, charCount: number, timestamp: number): BurstEvent {
		// Set cooldown
		this.cooldowns.set(filePath, timestamp);

		return {
			filePath,
			velocity,
			charCount,
			timestamp,
		};
	}

	/**
	 * Clean up old history (>5 seconds old)
	 * Should be called periodically by the consumer
	 */
	cleanup(): void {
		const now = Date.now();
		const maxAge = 5000; // 5 seconds

		for (const [filePath, history] of this.changeHistory.entries()) {
			const filtered = history.filter((event) => now - event.timestamp < maxAge);

			if (filtered.length === 0) {
				this.changeHistory.delete(filePath);
			} else {
				this.changeHistory.set(filePath, filtered);
			}
		}

		// Clean up old cooldowns
		for (const [filePath, timestamp] of this.cooldowns.entries()) {
			if (now - timestamp > this.COOLDOWN_MS * 2) {
				this.cooldowns.delete(filePath);
			}
		}
	}

	/**
	 * Update burst threshold
	 */
	updateThreshold(threshold: number): void {
		if (threshold <= 0) {
			throw new Error(`Invalid burst threshold: ${threshold}. Must be positive.`);
		}
		this.threshold = threshold;
	}

	/**
	 * Get current threshold
	 */
	getThreshold(): number {
		return this.threshold;
	}

	/**
	 * Check if file is in cooldown
	 */
	isInCooldown(filePath: string): boolean {
		const lastBurst = this.cooldowns.get(filePath);
		if (!lastBurst) {
			return false;
		}
		return Date.now() - lastBurst < this.COOLDOWN_MS;
	}

	/**
	 * Clear all history and cooldowns (for testing)
	 */
	clear(): void {
		this.changeHistory.clear();
		this.cooldowns.clear();
	}
}
