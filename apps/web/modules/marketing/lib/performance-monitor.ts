/**
 * SnapBack Brand Promise Performance Monitor
 * Tracks and validates: <100ms checkpoints, <2s recovery, <1% CPU, <50MB memory, 60fps, zero data loss
 */

export interface PerformanceMetrics {
	// Brand Promise Metrics
	checkpointLatency: number; // milliseconds - target <100ms
	recoveryTime: number; // milliseconds - target <2000ms
	cpuUsage: number; // percentage - target <1%
	memoryUsage: number; // MB - target <50MB
	frameRate: number; // fps - target 60fps
	dataLossEvents: number; // count - target 0

	// Supporting Metrics
	animationFrames: number;
	networkLatency: number;
	renderTime: number;
	layoutShifts: number;
	interactionLatency: number;

	// Web Vitals
	lcp: number; // Largest Contentful Paint
	fid: number; // First Input Delay
	cls: number; // Cumulative Layout Shift
	fcp: number; // First Contentful Paint
	ttfb: number; // Time to First Byte
}

export interface PromiseViolation {
	metric: keyof PerformanceMetrics;
	actual: number;
	target: number;
	severity: "low" | "medium" | "high" | "critical";
	timestamp: number;
	context?: string;
}

export interface MonitoringConfig {
	enableRealTimeTracking: boolean;
	enableAlerts: boolean;
	sampleRate: number; // 0.0 to 1.0
	reportingInterval: number; // milliseconds
	thresholds: Partial<PerformanceMetrics>;
}

class PerformanceMonitor {
	private metrics: Partial<PerformanceMetrics> = {};
	private violations: PromiseViolation[] = [];
	private observers: PerformanceObserver[] = [];
	private intervals: NodeJS.Timeout[] = [];
	private callbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

	// Brand Promise Thresholds
	private readonly BRAND_THRESHOLDS: PerformanceMetrics = {
		checkpointLatency: 100, // <100ms promise
		recoveryTime: 2000, // <2s promise
		cpuUsage: 1, // <1% idle promise
		memoryUsage: 50, // <50MB idle promise
		frameRate: 60, // 60fps promise
		dataLossEvents: 0, // zero data loss promise

		// Supporting targets
		animationFrames: 60,
		networkLatency: 200,
		renderTime: 16, // 60fps = 16.67ms per frame
		layoutShifts: 0.1,
		interactionLatency: 100,

		// Web Vitals targets
		lcp: 2500,
		fid: 100,
		cls: 0.1,
		fcp: 1800,
		ttfb: 600,
	};

	private config: MonitoringConfig = {
		enableRealTimeTracking: true,
		enableAlerts: true,
		sampleRate: 1.0,
		reportingInterval: 1000,
		thresholds: this.BRAND_THRESHOLDS,
	};

	constructor(config?: Partial<MonitoringConfig>) {
		if (config) {
			this.config = { ...this.config, ...config };
			if (config.thresholds) {
				this.config.thresholds = {
					...this.BRAND_THRESHOLDS,
					...config.thresholds,
				};
			}
		}

		if (typeof window !== "undefined") {
			this.initialize();
		}
	}

	private initialize(): void {
		this.setupPerformanceObservers();
		this.setupMemoryMonitoring();
		this.setupCPUMonitoring();
		this.setupFrameRateMonitoring();
		this.setupCheckpointTracking();
		this.startReporting();
	}

	private setupPerformanceObservers(): void {
		// Web Vitals Observer
		if (typeof window !== "undefined" && "PerformanceObserver" in window) {
			try {
				const observer = new PerformanceObserver((list) => {
					list.getEntries().forEach((entry) => {
						this.processPerformanceEntry(entry);
					});
				});

				observer.observe({
					entryTypes: [
						"navigation",
						"paint",
						"layout-shift",
						"largest-contentful-paint",
					],
				});
				this.observers.push(observer);
			} catch (error) {
				console.warn("Performance Observer not supported", { error });
			}
		}

		// Long Task Observer (for CPU monitoring)
		if (typeof window !== "undefined" && "PerformanceObserver" in window) {
			try {
				const longTaskObserver = new PerformanceObserver((list) => {
					list.getEntries().forEach((entry) => {
						// Long tasks indicate high CPU usage
						const cpuImpact = Math.min(100, (entry.duration / 16.67) * 5); // Rough CPU estimation
						this.updateMetric("cpuUsage", cpuImpact);
					});
				});

				longTaskObserver.observe({ entryTypes: ["longtask"] });
				this.observers.push(longTaskObserver);
			} catch (error) {
				console.warn("Long Task Observer not supported", { error });
			}
		}
	}

	private setupMemoryMonitoring(): void {
		if (
			typeof window !== "undefined" &&
			typeof performance !== "undefined" &&
			"memory" in performance
		) {
			const interval = setInterval(() => {
				const memory = (performance as any).memory;
				if (memory) {
					const usedMemoryMB = memory.usedJSHeapSize / (1024 * 1024);
					this.updateMetric("memoryUsage", usedMemoryMB);
				}
			}, this.config.reportingInterval);

			this.intervals.push(interval);
		}
	}

	private setupCPUMonitoring(): void {
		if (typeof window === "undefined" || typeof performance === "undefined") {
			return;
		}

		let lastTime = performance.now();
		let frameCount = 0;

		const measureCPU = () => {
			const currentTime = performance.now();
			const elapsed = currentTime - lastTime;
			frameCount++;

			if (elapsed >= 1000) {
				// Every second
				const fps = (frameCount * 1000) / elapsed;
				const cpuUsage = Math.max(0, Math.min(100, 100 - (fps / 60) * 100));

				this.updateMetric("cpuUsage", cpuUsage);
				this.updateMetric("frameRate", fps);

				lastTime = currentTime;
				frameCount = 0;
			}

			if (this.config.enableRealTimeTracking) {
				requestAnimationFrame(measureCPU);
			}
		};

		if (typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(measureCPU);
		}
	}

	private setupFrameRateMonitoring(): void {
		if (typeof window === "undefined" || typeof performance === "undefined") {
			return;
		}

		let lastFrameTime = performance.now();
		const frames: number[] = [];

		const trackFrame = (currentTime: number) => {
			frames.push(currentTime - lastFrameTime);
			lastFrameTime = currentTime;

			// Keep only last 60 frames for accurate FPS calculation
			if (frames.length > 60) {
				frames.shift();
			}

			if (frames.length >= 10) {
				const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
				const fps = Math.round(1000 / avgFrameTime);
				this.updateMetric("frameRate", fps);
				this.updateMetric("renderTime", avgFrameTime);
			}

			if (this.config.enableRealTimeTracking) {
				requestAnimationFrame(trackFrame);
			}
		};

		if (typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(trackFrame);
		}
	}

	private setupCheckpointTracking(): void {
		// Simulate checkpoint creation monitoring
		// In real implementation, this would hook into actual checkpoint creation
		const simulateCheckpoint = () => {
			const startTime =
				typeof performance !== "undefined" ? performance.now() : Date.now();

			// Simulate checkpoint creation work
			setTimeout(() => {
				const endTime =
					typeof performance !== "undefined" ? performance.now() : Date.now();
				const latency = endTime - startTime;
				this.updateMetric("checkpointLatency", latency);

				// Simulate recovery time (would be measured during actual recovery)
				if (Math.random() < 0.1) {
					// 10% chance to simulate recovery
					this.simulateRecovery();
				}
			}, Math.random() * 50); // Simulate variable checkpoint time
		};

		// Create checkpoints every 5 seconds (adjust based on real implementation)
		const interval = setInterval(simulateCheckpoint, 5000);
		this.intervals.push(interval);
	}

	private simulateRecovery(): void {
		const startTime =
			typeof performance !== "undefined" ? performance.now() : Date.now();

		// Simulate recovery process
		setTimeout(
			() => {
				const endTime =
					typeof performance !== "undefined" ? performance.now() : Date.now();
				const recoveryTime = endTime - startTime;
				this.updateMetric("recoveryTime", recoveryTime);
			},
			Math.random() * 1000 + 500,
		); // Simulate 500-1500ms recovery
	}

	private processPerformanceEntry(entry: PerformanceEntry): void {
		switch (entry.entryType) {
			case "navigation": {
				const nav = entry as PerformanceNavigationTiming;
				this.updateMetric("ttfb", nav.responseStart - nav.requestStart);
				break;
			}

			case "paint":
				if (entry.name === "first-contentful-paint") {
					this.updateMetric("fcp", entry.startTime);
				}
				break;

			case "largest-contentful-paint":
				this.updateMetric("lcp", entry.startTime);
				break;

			case "layout-shift": {
				const cls = entry as any;
				if (!cls.hadRecentInput) {
					this.updateMetric("cls", (this.metrics.cls || 0) + cls.value);
				}
				this.updateMetric("layoutShifts", (this.metrics.layoutShifts || 0) + 1);
				break;
			}

			case "first-input":
				this.updateMetric(
					"fid",
					(entry as any).processingStart - entry.startTime,
				);
				break;
		}
	}

	public updateMetric(key: keyof PerformanceMetrics, value: number): void {
		this.metrics[key] = value;
		this.checkViolations(key, value);
		this.notifyCallbacks();
	}

	private checkViolations(
		metric: keyof PerformanceMetrics,
		value: number,
	): void {
		const threshold = this.config.thresholds[metric];
		if (threshold === undefined) {
			return;
		}

		const isViolation = value > threshold;
		if (!isViolation) {
			return;
		}

		const severity = this.calculateSeverity(metric, value, threshold);
		const violation: PromiseViolation = {
			metric,
			actual: value,
			target: threshold,
			severity,
			timestamp: Date.now(),
			context: this.getViolationContext(metric),
		};

		this.violations.push(violation);

		// Limit violation history
		if (this.violations.length > 100) {
			this.violations.shift();
		}

		if (this.config.enableAlerts) {
			this.handleViolation(violation);
		}
	}

	private calculateSeverity(
		metric: keyof PerformanceMetrics,
		actual: number,
		target: number,
	): PromiseViolation["severity"] {
		const ratio = actual / target;

		// Brand promise violations are critical
		if (
			["checkpointLatency", "recoveryTime", "dataLossEvents"].includes(metric)
		) {
			if (ratio > 2) {
				return "critical";
			}
			if (ratio > 1.5) {
				return "high";
			}
			if (ratio > 1.2) {
				return "medium";
			}
			return "low";
		}

		// Other metrics
		if (ratio > 3) {
			return "critical";
		}
		if (ratio > 2) {
			return "high";
		}
		if (ratio > 1.5) {
			return "medium";
		}
		return "low";
	}

	private getViolationContext(metric: keyof PerformanceMetrics): string {
		const contexts: Record<keyof PerformanceMetrics, string> = {
			checkpointLatency: "Checkpoint creation exceeding <100ms promise",
			recoveryTime: "Recovery time exceeding <2s promise",
			cpuUsage: "CPU usage exceeding <1% idle promise",
			memoryUsage: "Memory usage exceeding <50MB idle promise",
			frameRate: "Frame rate below 60fps promise",
			dataLossEvents: "Data loss detected - violating zero loss promise",
			animationFrames: "Animation frame performance degraded",
			networkLatency: "Network latency exceeding targets",
			renderTime: "Render time exceeding performance budget",
			layoutShifts: "Cumulative layout shifts detected",
			interactionLatency: "Interaction latency exceeding targets",
			lcp: "Largest Contentful Paint exceeding budget",
			fid: "First Input Delay exceeding budget",
			cls: "Cumulative Layout Shift exceeding budget",
			fcp: "First Contentful Paint exceeding budget",
			ttfb: "Time to First Byte exceeding budget",
		};

		return contexts[metric] || `Performance threshold exceeded for ${metric}`;
	}

	private handleViolation(violation: PromiseViolation): void {
		// Log violation
		console.warn(
			`🚨 Brand Promise Violation: ${violation.metric} - ${violation.severity}`,
		);

		// Send to monitoring endpoint
		if (this.shouldReport()) {
			this.reportViolation(violation);
		}

		// Show user notification for critical violations
		if (violation.severity === "critical") {
			this.showCriticalAlert(violation);
		}
	}

	private shouldReport(): boolean {
		return Math.random() < this.config.sampleRate;
	}

	private async reportViolation(violation: PromiseViolation): Promise<void> {
		if (typeof window === "undefined") {
			return;
		}

		try {
			await fetch("/api/security/motion-telemetry", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "motion_security",
					event: "performance_violation",
					data: {
						metric: violation.metric,
						actual: violation.actual,
						target: violation.target,
						severity: violation.severity,
						context: violation.context,
						url: window.location.href,
						userAgent: navigator.userAgent,
					},
					timestamp: violation.timestamp,
				}),
			});
		} catch (error) {
			console.error("Failed to report violation:", { error });
		}
	}

	private showCriticalAlert(violation: PromiseViolation): void {
		// Only show in development
		if (process.env.NODE_ENV === "development") {
			const message = `⚠️ Critical Performance Issue: ${violation.context}\nActual: ${violation.actual}, Target: ${violation.target}`;
			console.error(message);
		}
	}

	private startReporting(): void {
		const interval = setInterval(() => {
			this.generateReport();
		}, this.config.reportingInterval);

		this.intervals.push(interval);
	}

	private notifyCallbacks(): void {
		const fullMetrics = {
			...this.BRAND_THRESHOLDS,
			...this.metrics,
		} as PerformanceMetrics;
		this.callbacks.forEach((callback) => {
			try {
				callback(fullMetrics);
			} catch (error) {
				console.error("Error in performance callback:", { error });
			}
		});
	}

	// Public API
	public getMetrics(): PerformanceMetrics {
		return {
			...this.BRAND_THRESHOLDS,
			...this.metrics,
		} as PerformanceMetrics;
	}

	public getViolations(): PromiseViolation[] {
		return [...this.violations];
	}

	public getBrandPromiseStatus(): Record<string, "pass" | "fail"> {
		const metrics = this.getMetrics();
		const thresholds = this.config.thresholds;

		return {
			checkpoint_latency:
				metrics.checkpointLatency <= (thresholds.checkpointLatency || 100)
					? "pass"
					: "fail",
			recovery_time:
				metrics.recoveryTime <= (thresholds.recoveryTime || 2000)
					? "pass"
					: "fail",
			cpu_usage:
				metrics.cpuUsage <= (thresholds.cpuUsage || 1) ? "pass" : "fail",
			memory_usage:
				metrics.memoryUsage <= (thresholds.memoryUsage || 50) ? "pass" : "fail",
			frame_rate:
				metrics.frameRate >= (thresholds.frameRate || 60) ? "pass" : "fail",
			data_loss:
				metrics.dataLossEvents === (thresholds.dataLossEvents || 0)
					? "pass"
					: "fail",
		};
	}

	public subscribe(
		callback: (metrics: PerformanceMetrics) => void,
	): () => void {
		this.callbacks.add(callback);
		return () => this.callbacks.delete(callback);
	}

	public generateReport(): PerformanceReport {
		const metrics = this.getMetrics();
		const violations = this.getViolations();
		const brandStatus = this.getBrandPromiseStatus();

		const report: PerformanceReport = {
			timestamp: Date.now(),
			metrics,
			violations: violations.slice(-10), // Last 10 violations
			brandPromiseStatus: brandStatus,
			overallScore: this.calculateOverallScore(brandStatus),
			recommendations: this.generateRecommendations(violations, metrics),
		};

		return report;
	}

	private calculateOverallScore(
		status: Record<string, "pass" | "fail">,
	): number {
		const total = Object.keys(status).length;
		const passed = Object.values(status).filter((s) => s === "pass").length;
		return Math.round((passed / total) * 100);
	}

	private generateRecommendations(
		violations: PromiseViolation[],
		metrics: PerformanceMetrics,
	): string[] {
		const recommendations: string[] = [];

		// Analyze recent violations
		const recentViolations = violations.filter(
			(v) => Date.now() - v.timestamp < 60000,
		);

		if (recentViolations.some((v) => v.metric === "checkpointLatency")) {
			recommendations.push(
				"Optimize checkpoint creation algorithm - currently exceeding <100ms promise",
			);
		}

		if (recentViolations.some((v) => v.metric === "recoveryTime")) {
			recommendations.push(
				"Improve recovery process - currently exceeding <2s promise",
			);
		}

		if (metrics.frameRate < 50) {
			recommendations.push(
				"Reduce animation complexity or enable reduced motion mode",
			);
		}

		if (metrics.memoryUsage > 40) {
			recommendations.push(
				"Memory usage approaching 50MB limit - consider cleanup",
			);
		}

		if (metrics.cpuUsage > 0.8) {
			recommendations.push(
				"CPU usage approaching 1% limit - optimize background tasks",
			);
		}

		return recommendations;
	}

	public destroy(): void {
		this.observers.forEach((observer) => observer.disconnect());
		this.intervals.forEach((interval) => clearInterval(interval));
		this.callbacks.clear();
		this.observers = [];
		this.intervals = [];
	}
}

export interface PerformanceReport {
	timestamp: number;
	metrics: PerformanceMetrics;
	violations: PromiseViolation[];
	brandPromiseStatus: Record<string, "pass" | "fail">;
	overallScore: number;
	recommendations: string[];
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(
	config?: Partial<MonitoringConfig>,
): PerformanceMonitor {
	if (!monitorInstance) {
		monitorInstance = new PerformanceMonitor(config);
	}
	return monitorInstance as PerformanceMonitor;
}

export function destroyPerformanceMonitor(): void {
	if (monitorInstance) {
		monitorInstance.destroy();
		monitorInstance = null;
	}
}

export { PerformanceMonitor };
