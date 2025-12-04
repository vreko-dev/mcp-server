/**
 * Motion Guard - Prevents future regressions of MotionProvider issues
 *
 * This module provides runtime validation to ensure motion/react loads correctly
 * and catches any future webpack configuration issues early.
 */

type MotionStatus = "loading" | "ready" | "failed";

class MotionGuard {
	private static instance: MotionGuard;
	private status: MotionStatus = "loading";
	private startTime = Date.now();
	private listeners: Array<(status: MotionStatus) => void> = [];

	private constructor() {
		this.validateMotionImports();
	}

	static getInstance(): MotionGuard {
		if (!MotionGuard.instance) {
			MotionGuard.instance = new MotionGuard();
		}
		return MotionGuard.instance;
	}

	private async validateMotionImports() {
		try {
			// Validate that motion/react imports are available synchronously
			const { LazyMotion, MotionConfig, domAnimation } = await import(
				"motion/react"
			);

			if (!LazyMotion || !MotionConfig || !domAnimation) {
				throw new Error(
					"Motion components are undefined - webpack chunk loading issue detected",
				);
			}

			// Validate that domAnimation features are properly loaded
			if (typeof domAnimation !== "function") {
				throw new Error(
					"domAnimation is not a function - module resolution issue",
				);
			}

			const loadTime = Date.now() - this.startTime;

			// If it takes longer than 100ms, we have a chunk loading issue
			if (loadTime > 100) {
				console.warn(
					`🚨 MotionGuard: Slow motion/react loading detected (${loadTime}ms). Check webpack async chunks.`,
				);
			}

			this.status = "ready";
			console.log(
				`✅ MotionGuard: Motion loaded successfully in ${loadTime}ms`,
			);
		} catch (error) {
			this.status = "failed";
			console.error(
				"🚨 MotionGuard: Critical motion/react loading failure",
				error as Error,
			);

			// In development, provide actionable debugging info
			if (process.env.NODE_ENV === "development") {
				console.error(`
🔧 DEBUGGING STEPS:
1. Check next.config.js webpack.optimization.splitChunks.cacheGroups.animations
2. Ensure chunks is set to "all" not "async"
3. Verify priority is higher than framework (25+)
4. Check browser Network tab for failed chunk requests
        `);
			}
		}

		// Notify all listeners
		for (const listener of this.listeners) {
			listener(this.status);
		}
	}

	onStatusChange(callback: (status: MotionStatus) => void) {
		this.listeners.push(callback);
		// If already resolved, call immediately
		if (this.status !== "loading") {
			callback(this.status);
		}
	}

	getStatus(): MotionStatus {
		return this.status;
	}

	isReady(): boolean {
		return this.status === "ready";
	}

	hasFailed(): boolean {
		return this.status === "failed";
	}
}

// Singleton instance
export const motionGuard = MotionGuard.getInstance();

// Development-only validation hook
export function useMotionValidation() {
	if (process.env.NODE_ENV === "development") {
		// Validate that MotionProvider is not wrapped with suppressHydrationWarning
		if (typeof window !== "undefined") {
			const hasSuppressionWarning = document.querySelector(
				"[suppresshydrationwarning]",
			);
			if (hasSuppressionWarning) {
				console.warn(
					"🚨 MotionGuard: suppressHydrationWarning detected - sign of underlying issue",
				);
			}
		}
	}

	return {
		status: motionGuard.getStatus(),
		isReady: motionGuard.isReady(),
		hasFailed: motionGuard.hasFailed(),
	};
}
