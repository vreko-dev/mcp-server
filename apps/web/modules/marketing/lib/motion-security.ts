"use client";

/**
 * Motion Security & Stability Framework
 * Implements defense-in-depth for animation system failures
 */

// Security configuration
const SECURITY_CONFIG = {
	MAX_RETRY_ATTEMPTS: 3,
	RETRY_BACKOFF_MS: 1000,
	ERROR_RATE_LIMIT: 5, // Max errors per minute
	CIRCUIT_BREAKER_THRESHOLD: 10, // Failures before disabling motion
	TELEMETRY_SAMPLE_RATE: 0.1, // 10% sampling in production
} as const;

// Circuit breaker state
interface CircuitBreakerState {
	failures: number;
	lastFailure: number;
	isOpen: boolean;
	nextAttempt: number;
}

// Error tracking for rate limiting
interface ErrorTracker {
	count: number;
	windowStart: number;
}

// Security state management
class MotionSecurityManager {
	private static instance: MotionSecurityManager;
	private circuitBreaker: CircuitBreakerState;
	private errorTracker: ErrorTracker;
	private isMotionDisabled = false;

	private constructor() {
		this.circuitBreaker = {
			failures: 0,
			lastFailure: 0,
			isOpen: false,
			nextAttempt: 0,
		};
		this.errorTracker = {
			count: 0,
			windowStart: Date.now(),
		};
	}

	static getInstance(): MotionSecurityManager {
		if (!MotionSecurityManager.instance) {
			MotionSecurityManager.instance = new MotionSecurityManager();
		}
		return MotionSecurityManager.instance;
	}

	/**
	 * Check if motion should be allowed based on security state
	 */
	shouldAllowMotion(): boolean {
		if (this.isMotionDisabled) {
			return false;
		}
		if (this.circuitBreaker.isOpen) {
			// Check if we should try again (exponential backoff)
			if (Date.now() < this.circuitBreaker.nextAttempt) {
				return false;
			}
			// Reset circuit breaker for one attempt
			this.circuitBreaker.isOpen = false;
		}
		return !this.isRateLimited();
	}

	/**
	 * Record a motion system failure
	 */
	recordFailure(error: Error, context?: string): void {
		const now = Date.now();

		// Update circuit breaker
		this.circuitBreaker.failures++;
		this.circuitBreaker.lastFailure = now;

		// Open circuit breaker if threshold exceeded
		if (this.circuitBreaker.failures >= SECURITY_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
			this.circuitBreaker.isOpen = true;
			this.circuitBreaker.nextAttempt =
				now + SECURITY_CONFIG.RETRY_BACKOFF_MS * 2 ** this.circuitBreaker.failures;
			this.reportSecurityEvent("motion_circuit_breaker_open", {
				failures: this.circuitBreaker.failures,
			});
		}

		// Update error rate tracking
		this.updateErrorRate();

		// Report security event (sanitized)
		this.reportSecurityEvent("motion_failure", {
			context,
			errorType: error.constructor.name,
			timestamp: now,
			failures: this.circuitBreaker.failures,
			// Note: Do NOT include error.message or stack trace for security
		});
	}

	/**
	 * Record successful motion operation
	 */
	recordSuccess(): void {
		// Gradually recover circuit breaker
		if (this.circuitBreaker.failures > 0) {
			this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1);
		}
		if (this.circuitBreaker.failures === 0) {
			this.circuitBreaker.isOpen = false;
		}
	}

	/**
	 * Emergency disable motion system
	 */
	emergencyDisableMotion(reason: string): void {
		this.isMotionDisabled = true;
		this.reportSecurityEvent("motion_emergency_disable", { reason });
	}

	/**
	 * Check error rate limiting
	 */
	private isRateLimited(): boolean {
		const now = Date.now();
		const windowDuration = 60000; // 1 minute

		// Reset window if expired
		if (now - this.errorTracker.windowStart > windowDuration) {
			this.errorTracker.count = 0;
			this.errorTracker.windowStart = now;
		}

		return this.errorTracker.count >= SECURITY_CONFIG.ERROR_RATE_LIMIT;
	}

	/**
	 * Update error rate tracking
	 */
	private updateErrorRate(): void {
		const now = Date.now();
		if (now - this.errorTracker.windowStart > 60000) {
			this.errorTracker.count = 1;
			this.errorTracker.windowStart = now;
		} else {
			this.errorTracker.count++;
		}
	}

	/**
	 * Report security events (sanitized for production)
	 */
	private reportSecurityEvent(event: string, data: Record<string, any>): void {
		const sanitizedData = {
			...data,
			userAgent: typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 100) : "unknown",
			url: typeof window !== "undefined" ? window.location.pathname : "unknown",
			timestamp: Date.now(),
		};

		// Development logging (detailed)
		if (process.env.NODE_ENV === "development") {
			console.group(`🛡️ Motion Security Event: ${event}`);
			console.debug("[Motion Security] Data:", sanitizedData);
			console.groupEnd();
		}

		// Production telemetry (sampled and sanitized)
		if (process.env.NODE_ENV === "production") {
			if (Math.random() < SECURITY_CONFIG.TELEMETRY_SAMPLE_RATE) {
				this.sendTelemetry(event, sanitizedData);
			}
		}
	}

	/**
	 * Send telemetry to monitoring system
	 */
	private sendTelemetry(event: string, data: Record<string, any>): void {
		try {
			const payload = {
				type: "motion_security",
				event,
				data,
				timestamp: Date.now(),
			};

			// Use sendBeacon for reliability
			if (navigator?.sendBeacon) {
				navigator.sendBeacon("/api/security/motion-telemetry", JSON.stringify(payload));
			}
		} catch (_error) {
			// Silently fail - do not expose telemetry errors
		}
	}

	/**
	 * Get current security status
	 */
	getSecurityStatus() {
		return {
			isMotionAllowed: this.shouldAllowMotion(),
			circuitBreakerOpen: this.circuitBreaker.isOpen,
			failureCount: this.circuitBreaker.failures,
			isRateLimited: this.isRateLimited(),
			isEmergencyDisabled: this.isMotionDisabled,
		};
	}
}

// Security-aware motion configuration
export const secureMotionConfig = {
	respectReducedMotion: true,
	initial: false, // Prevent hydration mismatches
	animate: "visible",
	transition: {
		duration: 0.3,
		ease: "easeOut",
		// Limit animation complexity for security
		type: "tween",
	},
} as const;

// Feature flag for motion system
export function isMotionEnabled(): boolean {
	// Check user preferences first
	if (typeof window !== "undefined") {
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReducedMotion) {
			return false;
		}
	}

	// Check security manager
	const securityManager = MotionSecurityManager.getInstance();
	return securityManager.shouldAllowMotion();
}

// Secure motion loader with retry logic and sanitized error handling
export async function loadMotionSecurely(): Promise<{
	success: boolean;
	LazyMotion?: any;
	MotionConfig?: any;
	domAnimation?: any;
	error?: string; // Sanitized error message
}> {
	const securityManager = MotionSecurityManager.getInstance();

	if (!securityManager.shouldAllowMotion()) {
		return {
			success: false,
			error: "Motion disabled by security policy",
		};
	}

	let retryCount = 0;

	while (retryCount < SECURITY_CONFIG.MAX_RETRY_ATTEMPTS) {
		try {
			// Use dynamic import with timeout
			const motionModule = (await Promise.race([
				import("motion/react"),
				new Promise((_, reject) => setTimeout(() => reject(new Error("Motion load timeout")), 5000)),
			])) as any;

			// Verify module integrity
			if (!motionModule.LazyMotion || !motionModule.MotionConfig || !motionModule.domAnimation) {
				throw new Error("Invalid motion module structure");
			}

			securityManager.recordSuccess();
			return {
				success: true,
				LazyMotion: motionModule.LazyMotion,
				MotionConfig: motionModule.MotionConfig,
				domAnimation: motionModule.domAnimation,
			};
		} catch (error) {
			retryCount++;
			const sanitizedError = error instanceof Error ? error.constructor.name : "Unknown error";

			securityManager.recordFailure(error instanceof Error ? error : new Error(sanitizedError), "motion_load");

			if (retryCount >= SECURITY_CONFIG.MAX_RETRY_ATTEMPTS) {
				return {
					success: false,
					error: sanitizedError,
				};
			}

			// Exponential backoff
			await new Promise((resolve) =>
				setTimeout(resolve, SECURITY_CONFIG.RETRY_BACKOFF_MS * 2 ** (retryCount - 1)),
			);
		}
	}

	return {
		success: false,
		error: "Max retry attempts exceeded",
	};
}

// Export security manager for external monitoring
export const motionSecurity = MotionSecurityManager.getInstance();

// Types for external use
export type MotionSecurityStatus = ReturnType<typeof MotionSecurityManager.prototype.getSecurityStatus>;
/**
 * Client-side Motion Security Manager
 * Why: Disable or degrade motion under risky conditions while preserving UX.
 * Notes: Telemetry is sampled and sanitized; do not attach PII.
 */
